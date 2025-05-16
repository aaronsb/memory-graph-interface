/**
 * Node and Edge Router
 * 
 * Handles routes related to creating, updating, and deleting nodes and edges
 */

const express = require('express');
const router = express.Router();
const dbService = require('../db/dbService');

/**
 * @route   POST /nodes/update-domain
 * @desc    Update a node's domain
 * @access  Public
 */
router.post('/nodes/update-domain', (req, res) => {
  console.log('==== [API] POST /api/nodes/update-domain request received ====');
  console.log('[API] Request body:', JSON.stringify(req.body, null, 2));
  
  // Extract nodeId from either nodeId or node_id
  const nodeId = req.body.nodeId || req.body.node_id;
  const domain = req.body.domain;
  const pruneEdges = req.body.pruneEdges === true;
  
  console.log('[API] Extracted parameters:', {
    nodeId,
    domain,
    pruneEdges
  });
  
  // Validate required fields
  if (!nodeId || !domain) {
    console.log('[API] POST /api/nodes/update-domain error: Missing required fields');
    console.log('  nodeId:', nodeId);
    console.log('  domain:', domain);
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // First, check if the domain exists in DOMAINS
  const checkDomainQuery = `SELECT id FROM DOMAINS WHERE id = ?`;
  
  dbService.executeWithRetry((db, callback) => {
    db.get(checkDomainQuery, [domain], callback);
  }, 3, (domainErr, existingDomain) => {
    // If there's an error checking the domain, or the domain doesn't exist,
    // we should create it first
    if (domainErr) {
      console.warn('[API] Warning: Error checking domain existence:', domainErr.message);
      console.warn('[API] Will attempt to update node domain anyway');
    } else if (!existingDomain) {
      console.warn(`[API] Warning: Domain '${domain}' doesn't exist in DOMAINS`);
      console.warn('[API] Will create domain and then update node');
      
      // Create the domain first
      const createDomainTimestamp = new Date().toISOString();
      const createDomainQuery = `
        INSERT INTO DOMAINS (id, name, description, created, lastAccess)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      dbService.executeWithRetry((db, callback) => {
        db.run(createDomainQuery, [domain, domain, '', createDomainTimestamp, createDomainTimestamp], function(err) {
          if (err) {
            console.warn('[API] Warning: Could not create domain:', err.message);
          } else {
            console.log(`[API] Created new domain '${domain}' on-the-fly`);
          }
          callback(null);
        });
      }, 3);
    }
    
    // Check if node exists
    const checkNodeQuery = `SELECT id, domain FROM MEMORY_NODES WHERE id = ?`;
    
    dbService.executeWithRetry((db, callback) => {
      db.get(checkNodeQuery, [nodeId], callback);
    }, 3, (err, node) => {
      if (err) {
        console.error('[API] Error checking node:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (!node) {
        console.log('[API] Error: Node does not exist');
        return res.status(404).json({ error: 'Node not found' });
      }
      
      // No need to update if domain is the same
      if (node.domain === domain) {
        console.log('[API] Node already has the requested domain, no update needed');
        return res.json({ success: true, changed: false });
      }
      
      // Update the node's domain
      const updateQuery = `UPDATE MEMORY_NODES SET domain = ? WHERE id = ?`;
      
      dbService.executeWithRetry((db, callback) => {
        db.run(updateQuery, [domain, nodeId], function(err) {
          if (err) {
            callback(err);
          } else {
            callback(null, { changes: this.changes });
          }
        });
      }, 3, (err, result) => {
        if (err) {
          console.error('[API] Error updating node domain:', err.message);
          return res.status(500).json({ error: err.message });
        }
        
        console.log(`[API] Updated domain for node ${nodeId} from ${node.domain} to ${domain}`);
        console.log('  Changes:', result.changes);
        
        // If pruneEdges is true, delete edges to nodes in different domains
        if (pruneEdges) {
          console.log(`[API] Pruning edges for node ${nodeId} to nodes in different domains`);
          
          // Get all nodes in other domains
          const getNodesInOtherDomainsQuery = `
            SELECT id FROM MEMORY_NODES 
            WHERE domain != ? AND id != ?
          `;
          
          dbService.executeWithRetry((db, callback) => {
            db.all(getNodesInOtherDomainsQuery, [domain, nodeId], callback);
          }, 3, (nodesErr, otherDomainNodes) => {
            if (nodesErr) {
              console.error('[API] Error getting nodes in other domains:', nodesErr.message);
              // Continue without pruning
              return res.json({ 
                success: true, 
                changed: true, 
                nodeId,
                oldDomain: node.domain,
                newDomain: domain,
                edgesPruned: false,
                pruneError: nodesErr.message
              });
            }
            
            // If no nodes in other domains, no need to prune
            if (otherDomainNodes.length === 0) {
              console.log('[API] No nodes in other domains, no pruning needed');
              return res.json({ 
                success: true, 
                changed: true, 
                nodeId,
                oldDomain: node.domain,
                newDomain: domain,
                edgesPruned: false
              });
            }
            
            // Get the IDs of nodes in other domains
            const otherNodeIds = otherDomainNodes.map(n => n.id);
            
            // Prepare placeholders for the SQL query
            const placeholders = otherNodeIds.map(() => '?').join(', ');
            
            // Delete edges where either source or target is the node being updated
            // and the other end is a node in a different domain
            const deleteEdgesQuery = `
              DELETE FROM MEMORY_EDGES 
              WHERE (source = ? AND target IN (${placeholders}))
                 OR (target = ? AND source IN (${placeholders}))
            `;
            
            // Prepare parameters for the query
            const params = [nodeId, ...otherNodeIds, nodeId, ...otherNodeIds];
            
            dbService.executeWithRetry((db, callback) => {
              db.run(deleteEdgesQuery, params, function(err) {
                if (err) {
                  callback(err);
                } else {
                  callback(null, { changes: this.changes });
                }
              });
            }, 3, (deleteErr, deleteResult) => {
              if (deleteErr) {
                console.error('[API] Error pruning edges:', deleteErr.message);
                return res.json({ 
                  success: true, 
                  changed: true, 
                  nodeId,
                  oldDomain: node.domain,
                  newDomain: domain,
                  edgesPruned: false,
                  pruneError: deleteErr.message
                });
              }
              
              console.log(`[API] Pruned ${deleteResult.changes} edges to nodes in different domains`);
              
              // Success response with pruning info
              res.json({ 
                success: true, 
                changed: true, 
                nodeId,
                oldDomain: node.domain,
                newDomain: domain,
                edgesPruned: true,
                edgesPrunedCount: deleteResult.changes
              });
            });
          });
        } else {
          // No pruning needed, return success response
          res.json({ 
            success: true, 
            changed: true, 
            nodeId,
            oldDomain: node.domain,
            newDomain: domain,
            edgesPruned: false
          });
        }
      });
    });
  });
});

/**
 * @route   POST /edges
 * @desc    Create a new edge between nodes
 * @access  Public
 */
router.post('/edges', (req, res) => {
  console.log('==== [API] POST /api/edges request received ====');
  console.log('[API] Request body:', JSON.stringify(req.body, null, 2));
  
  const { source, target, type, strength, domain } = req.body;
  
  // Validate required fields
  if (!source || !target || !type || typeof strength !== 'number' || !domain) {
    console.log('[API] POST /api/edges error: Missing or invalid required fields');
    console.log('  source:', source);
    console.log('  target:', target);
    console.log('  type:', type);
    console.log('  strength:', strength);
    console.log('  domain:', domain);
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }
  
  // Use Promise-based approach with executeWithRetry for cleaner nested queries
  const checkNodesExist = () => {
    return new Promise((resolve, reject) => {
      const checkNodesQuery = `
        SELECT id FROM MEMORY_NODES WHERE id IN (?, ?)
      `;
      
      dbService.executeWithRetry((db, callback) => {
        db.all(checkNodesQuery, [source, target], callback);
      }, 3, (err, nodes) => {
        if (err) {
          console.error('[API] Error checking nodes:', err.message);
          reject(err);
        } else if (nodes.length < 2) {
          console.log('[API] Error: One or both nodes do not exist');
          console.log('  Found nodes:', nodes.map(n => n.id));
          reject(new Error('One or both nodes do not exist'));
        } else {
          resolve();
        }
      });
    });
  };
  
  const checkEdgeExists = () => {
    return new Promise((resolve, reject) => {
      const checkEdgeQuery = `
        SELECT id FROM MEMORY_EDGES 
        WHERE (source = ? AND target = ?) OR (source = ? AND target = ?)
      `;
      
      dbService.executeWithRetry((db, callback) => {
        db.get(checkEdgeQuery, [source, target, target, source], callback);
      }, 3, (err, existingEdge) => {
        if (err) {
          console.error('[API] Error checking existing edge:', err.message);
          reject(err);
        } else if (existingEdge) {
          console.log('[API] Edge already exists:', existingEdge.id);
          reject({ status: 409, message: 'Edge already exists', id: existingEdge.id });
        } else {
          resolve();
        }
      });
    });
  };
  
  const createEdge = () => {
    return new Promise((resolve, reject) => {
      const id = `${source}-${target}-${type}`;
      const timestamp = new Date().toISOString();
      const query = `
        INSERT INTO MEMORY_EDGES (id, source, target, type, strength, timestamp, domain)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      console.log('[API] Inserting edge into MEMORY_EDGES:', { id, source, target, type, strength, timestamp, domain });
      
      dbService.executeWithRetry((db, callback) => {
        db.run(query, [id, source, target, type, strength, timestamp, domain], function(err) {
          if (err) {
            callback(err);
          } else {
            callback(null, { id, changes: this.changes, lastID: this.lastID });
          }
        });
      }, 3, (err, result) => {
        if (err) {
          console.error('[API] Error inserting edge:', err.message);
          reject(err);
        } else {
          console.log('[API] Edge inserted successfully:', id);
          console.log('  Changes:', result.changes);
          console.log('  Last ID:', result.lastID);
          resolve(result);
        }
      });
    });
  };
  
  // Execute the operations in sequence
  checkNodesExist()
    .then(checkEdgeExists)
    .then(createEdge)
    .then(result => {
      res.json({ success: true, id: result.id });
    })
    .catch(err => {
      if (err.status === 409) {
        return res.status(409).json({ error: err.message, id: err.id });
      }
      return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
    });
});

/**
 * @route   POST /edges/update-strength
 * @desc    Update an edge's strength
 * @access  Public
 */
router.post('/edges/update-strength', (req, res) => {
  console.log('==== [API] POST /api/edges/update-strength request received ====');
  console.log('[API] Request body:', JSON.stringify(req.body, null, 2));
  
  const { source, target, newStrength } = req.body;
  
  // Validate required fields
  if (!source || !target || typeof newStrength !== 'number' || newStrength < 0 || newStrength > 1) {
    console.log('[API] POST /api/edges/update-strength error: Missing or invalid required fields');
    console.log('  source:', source);
    console.log('  target:', target);
    console.log('  newStrength:', newStrength);
    return res.status(400).json({ error: 'Missing or invalid required fields (strength must be between 0 and 1)' });
  }
  
  // Step 1: Check if the edge exists
  const checkEdgeQuery = `
    SELECT id, strength FROM MEMORY_EDGES 
    WHERE (source = ? AND target = ?) OR (source = ? AND target = ?)
  `;
  
  dbService.executeWithRetry((db, callback) => {
    db.get(checkEdgeQuery, [source, target, target, source], callback);
  }, 3, (err, edge) => {
    if (err) {
      console.error('[API] Error checking edge:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (!edge) {
      console.log('[API] Error: Edge does not exist');
      return res.status(404).json({ error: 'Edge not found' });
    }
    
    // No need to update if strength is the same (within a small epsilon)
    if (Math.abs(edge.strength - newStrength) < 0.001) {
      console.log('[API] Edge already has the requested strength, no update needed');
      return res.json({ success: true, changed: false });
    }
    
    // Step 2: Update the edge's strength
    const updateQuery = `
      UPDATE MEMORY_EDGES SET strength = ? 
      WHERE (source = ? AND target = ?) OR (source = ? AND target = ?)
    `;
    
    dbService.executeWithRetry((db, callback) => {
      db.run(updateQuery, [newStrength, source, target, target, source], function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null, { changes: this.changes });
        }
      });
    }, 3, (err, result) => {
      if (err) {
        console.error('[API] Error updating edge strength:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`[API] Updated strength for edge between ${source} and ${target} from ${edge.strength} to ${newStrength}`);
      console.log('  Changes:', result.changes);
      
      res.json({ 
        success: true, 
        changed: true, 
        edge: edge.id,
        oldStrength: edge.strength,
        newStrength: newStrength
      });
    });
  });
});

/**
 * @route   POST /edges/update-type
 * @desc    Update an edge's type
 * @access  Public
 */
router.post('/edges/update-type', (req, res) => {
  console.log('==== [API] POST /api/edges/update-type request received ====');
  console.log('[API] Request body:', JSON.stringify(req.body, null, 2));
  
  const { source, target, newType } = req.body;
  
  // Validate required fields
  if (!source || !target || !newType) {
    console.log('[API] POST /api/edges/update-type error: Missing required fields');
    console.log('  source:', source);
    console.log('  target:', target);
    console.log('  newType:', newType);
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Step 1: Check if the edge exists
  const checkEdgeQuery = `
    SELECT id, type FROM MEMORY_EDGES 
    WHERE (source = ? AND target = ?) OR (source = ? AND target = ?)
  `;
  
  dbService.executeWithRetry((db, callback) => {
    db.get(checkEdgeQuery, [source, target, target, source], callback);
  }, 3, (err, edge) => {
    if (err) {
      console.error('[API] Error checking edge:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (!edge) {
      console.log('[API] Error: Edge does not exist');
      return res.status(404).json({ error: 'Edge not found' });
    }
    
    // No need to update if type is the same
    if (edge.type === newType) {
      console.log('[API] Edge already has the requested type, no update needed');
      return res.json({ success: true, changed: false });
    }
    
    // Step 2: Update the edge's type
    const updateQuery = `
      UPDATE MEMORY_EDGES SET type = ? 
      WHERE (source = ? AND target = ?) OR (source = ? AND target = ?)
    `;
    
    dbService.executeWithRetry((db, callback) => {
      db.run(updateQuery, [newType, source, target, target, source], function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null, { changes: this.changes });
        }
      });
    }, 3, (err, result) => {
      if (err) {
        console.error('[API] Error updating edge type:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`[API] Updated type for edge between ${source} and ${target} from ${edge.type} to ${newType}`);
      console.log('  Changes:', result.changes);
      
      res.json({ 
        success: true, 
        changed: true, 
        edge: edge.id,
        oldType: edge.type,
        newType: newType
      });
    });
  });
});

/**
 * @route   DELETE /edges/:source/:target
 * @desc    Delete an edge between two nodes
 * @access  Public
 */
router.delete('/edges/:source/:target', (req, res) => {
  console.log('==== [API] DELETE /api/edges/:source/:target request received ====');
  const { source, target } = req.params;
  
  console.log('[API] Deleting edge between source:', source, 'and target:', target);
  
  if (!source || !target) {
    console.log('[API] DELETE /api/edges error: Missing source or target');
    return res.status(400).json({ error: 'Missing source or target' });
  }
  
  // Delete the edge in either direction (source->target or target->source)
  const query = `
    DELETE FROM MEMORY_EDGES 
    WHERE (source = ? AND target = ?) OR (source = ? AND target = ?)
  `;
  
  dbService.executeWithRetry((db, callback) => {
    db.run(query, [source, target, target, source], function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  }, 3, (err, result) => {
    if (err) {
      console.error('[API] Error deleting edge:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (result.changes === 0) {
      console.log('[API] No edge found to delete');
      return res.status(404).json({ error: 'Edge not found' });
    }
    
    console.log('[API] Edge deleted successfully');
    console.log('  Changes:', result.changes);
    
    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, deleted: result.changes });
  });
});

/**
 * @route   DELETE /nodes/:id
 * @desc    Delete a node and its associated edges and tags
 * @access  Public
 */
router.delete('/nodes/:id', (req, res) => {
  console.log('==== [API] DELETE /api/nodes/:id request received ====');
  const { id } = req.params;
  
  console.log('[API] Deleting node with ID:', id);
  
  if (!id) {
    console.log('[API] DELETE /api/nodes error: Missing node ID');
    return res.status(400).json({ error: 'Missing node ID' });
  }
  
  // Use a transaction to ensure data integrity
  dbService.executeWithRetry((db, callback) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // First, delete the edges connected to this node
      db.run('DELETE FROM MEMORY_EDGES WHERE source = ? OR target = ?', [id, id], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return callback(err);
        }
        
        console.log(`[API] Deleted ${this.changes} edges connected to node ${id}`);
        
        // Next, delete the tags associated with this node
        db.run('DELETE FROM MEMORY_TAGS WHERE nodeId = ?', [id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return callback(err);
          }
          
          console.log(`[API] Deleted ${this.changes} tags associated with node ${id}`);
          
          // Finally, delete the node itself
          db.run('DELETE FROM MEMORY_NODES WHERE id = ?', [id], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return callback(err);
            }
            
            const nodeChanges = this.changes;
            console.log(`[API] Deleted node ${id}, changes: ${nodeChanges}`);
            
            // Commit the transaction
            db.run('COMMIT', function(err) {
              if (err) {
                db.run('ROLLBACK');
                return callback(err);
              }
              
              callback(null, { changes: nodeChanges });
            });
          });
        });
      });
    });
  }, 3, (err, result) => {
    if (err) {
      console.error('[API] Error deleting node:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (result.changes === 0) {
      console.log('[API] No node found to delete');
      return res.status(404).json({ error: 'Node not found' });
    }
    
    console.log('[API] Node deleted successfully');
    console.log('  Changes:', result.changes);
    
    res.json({ success: true, deleted: result.changes });
  });
});

/**
 * @route   POST /nodes/delete-batch
 * @desc    Delete multiple nodes and their associated edges and tags in a single transaction
 * @access  Public
 */
router.post('/nodes/delete-batch', (req, res) => {
  console.log('==== [API] POST /api/nodes/delete-batch request received ====');
  const { nodeIds } = req.body;
  
  console.log('[API] Deleting nodes with IDs:', nodeIds);
  
  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    console.log('[API] POST /api/nodes/delete-batch error: Missing or invalid node IDs');
    return res.status(400).json({ error: 'Missing or invalid node IDs' });
  }
  
  // Use a single transaction for all deletions
  dbService.executeWithRetry((db, callback) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      let totalEdgesDeleted = 0;
      let totalTagsDeleted = 0;
      let totalNodesDeleted = 0;
      let errors = [];
      
      // Process each node deletion in sequence within the same transaction
      const processNextNode = (index) => {
        if (index >= nodeIds.length) {
          // All nodes processed, commit the transaction
          db.run('COMMIT', function(err) {
            if (err) {
              db.run('ROLLBACK');
              return callback(err);
            }
            
            callback(null, {
              nodesDeleted: totalNodesDeleted,
              edgesDeleted: totalEdgesDeleted,
              tagsDeleted: totalTagsDeleted,
              errors: errors
            });
          });
          return;
        }
        
        const nodeId = nodeIds[index];
        
        // Delete edges for this node
        db.run('DELETE FROM MEMORY_EDGES WHERE source = ? OR target = ?', [nodeId, nodeId], function(err) {
          if (err) {
            errors.push(`Failed to delete edges for node ${nodeId}: ${err.message}`);
            processNextNode(index + 1);
            return;
          }
          
          totalEdgesDeleted += this.changes;
          console.log(`[API] Deleted ${this.changes} edges connected to node ${nodeId}`);
          
          // Delete tags for this node
          db.run('DELETE FROM MEMORY_TAGS WHERE nodeId = ?', [nodeId], function(err) {
            if (err) {
              errors.push(`Failed to delete tags for node ${nodeId}: ${err.message}`);
              processNextNode(index + 1);
              return;
            }
            
            totalTagsDeleted += this.changes;
            console.log(`[API] Deleted ${this.changes} tags associated with node ${nodeId}`);
            
            // Delete the node itself
            db.run('DELETE FROM MEMORY_NODES WHERE id = ?', [nodeId], function(err) {
              if (err) {
                errors.push(`Failed to delete node ${nodeId}: ${err.message}`);
                processNextNode(index + 1);
                return;
              }
              
              totalNodesDeleted += this.changes;
              console.log(`[API] Deleted node ${nodeId}, changes: ${this.changes}`);
              
              // Process next node
              processNextNode(index + 1);
            });
          });
        });
      };
      
      // Start processing from the first node
      processNextNode(0);
    });
  }, 3, (err, result) => {
    if (err) {
      console.error('[API] Error deleting nodes:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('[API] Batch deletion completed');
    console.log('  Nodes deleted:', result.nodesDeleted);
    console.log('  Edges deleted:', result.edgesDeleted);
    console.log('  Tags deleted:', result.tagsDeleted);
    if (result.errors.length > 0) {
      console.log('  Errors:', result.errors);
    }
    
    res.json({
      success: true,
      nodesDeleted: result.nodesDeleted,
      edgesDeleted: result.edgesDeleted,
      tagsDeleted: result.tagsDeleted,
      errors: result.errors
    });
  });
});

/**
 * @route   POST /tags
 * @desc    Add one or more tags to a node
 * @access  Public
 */
router.post('/tags', (req, res) => {
  const { nodeId, tags } = req.body;
  if (!nodeId || !tags || !Array.isArray(tags) || tags.length === 0) {
    return res.status(400).json({ error: 'Missing nodeId or tags' });
  }
  
  const placeholders = tags.map(() => '(?, ?)').join(', ');
  const values = [];
  tags.forEach(tag => {
    values.push(nodeId, tag);
  });
  
  const query = `INSERT OR IGNORE INTO MEMORY_TAGS (nodeId, tag) VALUES ${placeholders}`;
  
  dbService.executeWithRetry((db, callback) => {
    db.run(query, values, function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  }, 3, (err, result) => {
    if (err) {
      console.error('Error adding tags:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, added: tags.length });
  });
});

/**
 * @route   PUT /nodes/:id
 * @desc    Update a node's content
 * @access  Public
 */
router.put('/nodes/:id', (req, res) => {
  console.log('==== [API] PUT /api/nodes/:id request received ====');
  console.log('[API] Node ID:', req.params.id);
  console.log('[API] Request body:', JSON.stringify(req.body, null, 2));
  
  const nodeId = req.params.id;
  const { content } = req.body;
  
  // Validate required fields
  if (!nodeId || content === undefined) {
    console.log('[API] PUT /api/nodes/:id error: Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Update the node content
  const updateQuery = `UPDATE MEMORY_NODES SET content = ? WHERE id = ?`;
  
  dbService.executeWithRetry((db, callback) => {
    db.run(updateQuery, [content, nodeId], function(err) {
      if (err) {
        callback(err);
      } else {
        callback(null, { changes: this.changes });
      }
    });
  }, 3, (err, result) => {
    if (err) {
      console.error('[API] Error updating node content:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (result.changes === 0) {
      console.log('[API] Node not found:', nodeId);
      return res.status(404).json({ error: 'Node not found' });
    }
    
    console.log('[API] Node content updated successfully:', nodeId);
    res.json({ success: true, nodeId });
  });
});

module.exports = router;