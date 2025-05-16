/**
 * Graph Router
 * 
 * Handles routes related to memory graph data
 */

const express = require('express');
const router = express.Router();
const dbService = require('../db/dbService');

/**
 * @route   GET /nodes
 * @desc    Get all memory nodes
 * @access  Public
 */
router.get('/nodes', (req, res) => {
  const query = `
    SELECT 
      n.id, 
      n.content, 
      n.domain,
      n.path
    FROM MEMORY_NODES n
  `;
  
  dbService.executeWithRetry((db, callback) => {
    db.all(query, [], callback);
  }, 3, (err, nodes) => {
    if (err) {
      console.error('Error fetching nodes:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    res.json(nodes);
  });
});

/**
 * @route   GET /edges
 * @desc    Get all memory edges
 * @access  Public
 */
router.get('/edges', (req, res) => {
  const query = `
    SELECT 
      e.id,
      e.source,
      e.target,
      e.type,
      e.strength,
      e.domain
    FROM MEMORY_EDGES e
  `;
  
  dbService.executeWithRetry((db, callback) => {
    db.all(query, [], callback);
  }, 3, (err, edges) => {
    if (err) {
      console.error('Error fetching edges:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    res.json(edges);
  });
});

/**
 * @route   GET /tags
 * @desc    Get all memory tags
 * @access  Public
 */
router.get('/tags', (req, res) => {
  const query = `
    SELECT 
      t.nodeId,
      t.tag
    FROM MEMORY_TAGS t
  `;
  
  dbService.executeWithRetry((db, callback) => {
    db.all(query, [], callback);
  }, 3, (err, tags) => {
    if (err) {
      console.error('Error fetching tags:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    res.json(tags);
  });
});

/**
 * @route   GET /link-types
 * @desc    Get all unique link types
 * @access  Public
 */
router.get('/link-types', (req, res) => {
  console.log('==== [API] GET /api/link-types request received ====');
  
  const query = `
    SELECT DISTINCT type
    FROM MEMORY_EDGES
    ORDER BY type ASC
  `;
  
  dbService.executeWithRetry((db, callback) => {
    db.all(query, [], callback);
  }, 3, (err, types) => {
    if (err) {
      console.error('Error fetching link types:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    // Transform the result into a simple array of strings
    const linkTypes = types.map(t => t.type).filter(Boolean);
    console.log(`[API] Found ${linkTypes.length} distinct link types`);
    
    res.json(linkTypes);
  });
});

/**
 * @route   GET /domains
 * @desc    Get all domains
 * @access  Public
 */
router.get('/domains', (req, res) => {
  console.log('==== [API] GET /api/domains request received ====');
  
  const query = `
    SELECT id, name, description, created, lastAccess
    FROM DOMAINS
    ORDER BY name ASC
  `;
  
  dbService.executeWithRetry((db, callback) => {
    db.all(query, [], callback);
  }, 3, (err, domains) => {
    if (err) {
      console.error('[API] Error fetching domains:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`[API] Found ${domains.length} domains`);
    res.json(domains);
  });
});

/**
 * @route   POST /domains/create
 * @desc    Create a new domain
 * @access  Public
 */
router.post('/domains/create', (req, res) => {
  console.log('==== [API] POST /api/domains/create request received ====');
  console.log('[API] Request body:', JSON.stringify(req.body, null, 2));
  
  const { domain } = req.body;
  
  // Validate required fields
  if (!domain) {
    console.log('[API] POST /api/domains/create error: Missing domain name');
    return res.status(400).json({ error: 'Missing domain name' });
  }
  
  // Check if domain exists in DOMAINS table, create if not
  const checkDomainQuery = `
    SELECT id FROM DOMAINS WHERE id = ?
  `;
  
  dbService.executeWithRetry((db, callback) => {
    db.get(checkDomainQuery, [domain], callback);
  }, 3, (err, existingDomain) => {
    if (err) {
      console.error('[API] Error checking domain:', err.message);
      // Continue anyway, the error might be transient
    }
    
    // If domain already exists, return success
    if (existingDomain) {
      console.log(`[API] Domain '${domain}' already exists`);
      return res.json({ success: true, created: false, message: 'Domain already exists' });
    }
    
    // Create the domain
    const timestamp = new Date().toISOString();
    const insertQuery = `
      INSERT INTO DOMAINS (id, name, description, created, lastAccess)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    dbService.executeWithRetry((db, callback) => {
      db.run(insertQuery, [domain, domain, '', timestamp, timestamp], function(err) {
        if (err) {
          callback(err);
        } else {
          callback(null, { changes: this.changes });
        }
      });
    }, 3, (insertErr, result) => {
      if (insertErr) {
        console.error('[API] Error creating domain:', insertErr.message);
        return res.status(500).json({ error: insertErr.message });
      }
      
      console.log(`[API] Created domain '${domain}' successfully`);
      res.json({ success: true, created: true, domain });
    });
  });
});

/**
 * @route   GET /domains/:domainId/export
 * @desc    Export a memory domain with all its nodes and edges
 * @access  Public
 */
router.get('/domains/:domainId/export', (req, res) => {
  console.log('==== [API] GET /api/domains/:domainId/export request received ====');
  const { domainId } = req.params;
  
  console.log('[API] Exporting domain:', domainId);
  
  if (!domainId) {
    console.log('[API] Export error: Missing domain ID');
    return res.status(400).json({ error: 'Missing domain ID' });
  }
  
  // First, get domain info
  const domainQuery = `
    SELECT id, name, description, created, lastAccess
    FROM DOMAINS
    WHERE id = ?
  `;
  
  dbService.executeWithRetry((db, callback) => {
    db.get(domainQuery, [domainId], callback);
  }, 3, (err, domain) => {
    if (err) {
      console.error('[API] Error fetching domain:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (!domain) {
      console.log('[API] Domain not found');
      return res.status(404).json({ error: 'Domain not found' });
    }
    
    // Get all nodes in this domain
    const nodesQuery = `
      SELECT id, content, content_summary, path, timestamp
      FROM MEMORY_NODES
      WHERE domain = ?
    `;
    
    const tagsQuery = `
      SELECT t.nodeId, t.tag
      FROM MEMORY_TAGS t
      INNER JOIN MEMORY_NODES n ON t.nodeId = n.id
      WHERE n.domain = ?
    `;
    
    // Get edges within this domain (exclude cross-domain edges)
    const edgesQuery = `
      SELECT e.id, e.source, e.target, e.type, e.strength, e.timestamp
      FROM MEMORY_EDGES e
      INNER JOIN MEMORY_NODES n1 ON e.source = n1.id
      INNER JOIN MEMORY_NODES n2 ON e.target = n2.id
      WHERE e.domain = ? AND n1.domain = ? AND n2.domain = ?
    `;
    
    // Execute all queries
    Promise.all([
      new Promise((resolve, reject) => {
        dbService.executeWithRetry((db, callback) => {
          db.all(nodesQuery, [domainId], callback);
        }, 3, (err, nodes) => {
          if (err) reject(err);
          else resolve(nodes);
        });
      }),
      new Promise((resolve, reject) => {
        dbService.executeWithRetry((db, callback) => {
          db.all(tagsQuery, [domainId], callback);
        }, 3, (err, tags) => {
          if (err) reject(err);
          else resolve(tags);
        });
      }),
      new Promise((resolve, reject) => {
        dbService.executeWithRetry((db, callback) => {
          db.all(edgesQuery, [domainId, domainId, domainId], callback);
        }, 3, (err, edges) => {
          if (err) reject(err);
          else resolve(edges);
        });
      })
    ])
    .then(([nodes, tags, edges]) => {
      // Group tags by nodeId
      const tagsByNode = {};
      tags.forEach(tag => {
        if (!tagsByNode[tag.nodeId]) {
          tagsByNode[tag.nodeId] = [];
        }
        tagsByNode[tag.nodeId].push(tag.tag);
      });
      
      // Add tags to nodes
      const nodesWithTags = nodes.map(node => ({
        ...node,
        tags: tagsByNode[node.id] || []
      }));
      
      // Create export object
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        domain: domain,
        nodes: nodesWithTags,
        edges: edges
      };
      
      console.log(`[API] Exported domain '${domainId}' with ${nodes.length} nodes and ${edges.length} edges`);
      
      // Set appropriate headers for download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${domainId}-export.json"`);
      res.json(exportData);
    })
    .catch(err => {
      console.error('[API] Error exporting domain:', err.message);
      res.status(500).json({ error: err.message });
    });
  });
});

/**
 * @route   POST /domains/import
 * @desc    Import a memory domain from JSON file
 * @access  Public
 */
router.post('/domains/import', (req, res) => {
  console.log('==== [API] POST /api/domains/import request received ====');
  
  const importData = req.body;
  
  // Validate import data structure
  if (!importData || !importData.domain || !importData.nodes || !importData.edges) {
    console.log('[API] Import error: Invalid import data structure');
    return res.status(400).json({ error: 'Invalid import data structure' });
  }
  
  const { domain: domainInfo, nodes, edges } = importData;
  
  // Begin transaction to ensure atomicity
  dbService.executeWithRetry((db, callback) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      let createdNodes = 0;
      let updatedNodes = 0;
      let createdEdges = 0;
      let skippedEdges = 0;
      let errors = [];
      
      // Step 1: Check if domain exists, create or update it
      const checkDomainQuery = `SELECT id FROM DOMAINS WHERE id = ?`;
      
      db.get(checkDomainQuery, [domainInfo.id], (err, existingDomain) => {
        if (err) {
          db.run('ROLLBACK');
          return callback(err);
        }
        
        // Create or update domain
        const timestamp = new Date().toISOString();
        if (!existingDomain) {
          const createDomainQuery = `
            INSERT INTO DOMAINS (id, name, description, created, lastAccess)
            VALUES (?, ?, ?, ?, ?)
          `;
          
          db.run(createDomainQuery, [
            domainInfo.id,
            domainInfo.name,
            domainInfo.description || '',
            domainInfo.created || timestamp,
            timestamp
          ], (err) => {
            if (err && !err.message.includes('UNIQUE constraint failed')) {
              errors.push(`Failed to create domain: ${err.message}`);
            }
            console.log(`[API] Created domain '${domainInfo.id}'`);
          });
        } else {
          // Update lastAccess
          db.run('UPDATE DOMAINS SET lastAccess = ? WHERE id = ?', [timestamp, domainInfo.id]);
          console.log(`[API] Domain '${domainInfo.id}' already exists, updating lastAccess`);
        }
        
        // Step 2: Import nodes
        // First check if node exists
        const checkNodeQuery = `SELECT id FROM MEMORY_NODES WHERE id = ?`;
        const updateNodeQuery = `
          UPDATE MEMORY_NODES 
          SET content = ?, content_summary = ?, path = ?
          WHERE id = ?
        `;
        const insertNodeQuery = `
          INSERT INTO MEMORY_NODES (id, content, content_summary, domain, path, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const nodePromises = nodes.map(node => {
          return new Promise((resolve) => {
            // First check if node exists
            db.get(checkNodeQuery, [node.id], (err, existingNode) => {
              if (err) {
                errors.push(`Failed to check node ${node.id}: ${err.message}`);
                resolve();
                return;
              }
              
              if (existingNode) {
                // Update existing node
                db.run(updateNodeQuery, [
                  node.content,
                  node.content_summary || null,
                  node.path || null,
                  node.id
                ], function(err) {
                  if (err) {
                    errors.push(`Failed to update node ${node.id}: ${err.message}`);
                  } else {
                    updatedNodes++;
                  }
                  
                  // Import tags for this node
                  if (node.tags && node.tags.length > 0) {
                    const tagQuery = `INSERT OR IGNORE INTO MEMORY_TAGS (nodeId, tag) VALUES (?, ?)`;
                    node.tags.forEach(tag => {
                      db.run(tagQuery, [node.id, tag], (tagErr) => {
                        if (tagErr) {
                          errors.push(`Failed to import tag '${tag}' for node ${node.id}: ${tagErr.message}`);
                        }
                      });
                    });
                  }
                  
                  resolve();
                });
              } else {
                // Insert new node
                db.run(insertNodeQuery, [
                  node.id,
                  node.content,
                  node.content_summary || null,
                  domainInfo.id,
                  node.path || null,
                  node.timestamp || timestamp
                ], function(err) {
                  if (err) {
                    errors.push(`Failed to import node ${node.id}: ${err.message}`);
                  } else {
                    createdNodes++;
                  }
                  
                  // Import tags for this node
                  if (node.tags && node.tags.length > 0) {
                    const tagQuery = `INSERT OR IGNORE INTO MEMORY_TAGS (nodeId, tag) VALUES (?, ?)`;
                    node.tags.forEach(tag => {
                      db.run(tagQuery, [node.id, tag], (tagErr) => {
                        if (tagErr) {
                          errors.push(`Failed to import tag '${tag}' for node ${node.id}: ${tagErr.message}`);
                        }
                      });
                    });
                  }
                  
                  resolve();
                });
              }
            });
          });
        });
        
        Promise.all(nodePromises).then(() => {
          // Step 3: Import edges
          const insertEdgeQuery = `
            INSERT OR IGNORE INTO MEMORY_EDGES (id, source, target, type, strength, timestamp, domain)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          
          const edgePromises = edges.map(edge => {
            return new Promise((resolve) => {
              db.run(insertEdgeQuery, [
                edge.id,
                edge.source,
                edge.target,
                edge.type,
                edge.strength,
                edge.timestamp || timestamp,
                domainInfo.id
              ], function(err) {
                if (err) {
                  if (err.message.includes('FOREIGN KEY constraint failed')) {
                    skippedEdges++;
                  } else {
                    errors.push(`Failed to import edge ${edge.id}: ${err.message}`);
                  }
                } else if (this.changes > 0) {
                  createdEdges++;
                }
                resolve();
              });
            });
          });
          
          Promise.all(edgePromises).then(() => {
            // Commit transaction
            db.run('COMMIT', (err) => {
              if (err) {
                db.run('ROLLBACK');
                return callback(err);
              }
              
              callback(null, {
                success: true,
                domain: domainInfo.id,
                stats: {
                  nodesImported: createdNodes,
                  nodesUpdated: updatedNodes,
                  edgesImported: createdEdges,
                  edgesSkipped: skippedEdges,
                  errors: errors.length
                },
                errors: errors
              });
            });
          });
        });
      });
    });
  }, 3, (err, result) => {
    if (err) {
      console.error('[API] Import failed:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('[API] Import completed:', result);
    res.json(result);
  });
});

/**
 * @route   GET /graph/memory
 * @desc    Get memory-centric graph data
 * @access  Public
 */
router.get('/graph/memory', (req, res) => {
  console.log('API request received for /api/graph/memory');

  const nodesQuery = `
    SELECT 
      n.id, 
      n.content,
      n.content_summary, 
      n.domain,
      n.path
    FROM MEMORY_NODES n
  `;

  const tagsQuery = `
    SELECT 
      t.nodeId,
      t.tag
    FROM MEMORY_TAGS t
  `;

  const edgesQuery = `
    SELECT 
      e.id,
      e.source,
      e.target,
      e.type,
      e.strength,
      e.domain
    FROM MEMORY_EDGES e
  `;

  const domainRefsQuery = `
    SELECT 
      nodeId,
      domain,
      targetDomain,
      targetNodeId,
      description,
      bidirectional
    FROM DOMAIN_REFS
  `;

  // Use Promise-based approach with our executeWithRetry function for cleaner nested queries
  const getMemoryNodes = () => {
    return new Promise((resolve, reject) => {
      dbService.executeWithRetry((db, callback) => {
        db.all(nodesQuery, [], callback);
      }, 3, (err, nodes) => {
        if (err) reject(err);
        else resolve(nodes);
      });
    });
  };

  const getTagRecords = () => {
    return new Promise((resolve, reject) => {
      dbService.executeWithRetry((db, callback) => {
        db.all(tagsQuery, [], callback);
      }, 3, (err, tags) => {
        if (err) reject(err);
        else resolve(tags);
      });
    });
  };

  const getEdgeRecords = () => {
    return new Promise((resolve, reject) => {
      dbService.executeWithRetry((db, callback) => {
        db.all(edgesQuery, [], callback);
      }, 3, (err, edges) => {
        if (err) reject(err);
        else resolve(edges);
      });
    });
  };

  const getDomainRefs = () => {
    return new Promise((resolve, reject) => {
      dbService.executeWithRetry((db, callback) => {
        db.all(domainRefsQuery, [], callback);
      }, 3, (err, refs) => {
        if (err) reject(err);
        else resolve(refs);
      });
    });
  };

  // Execute all queries in parallel and process results
  Promise.all([
    getMemoryNodes(),
    getTagRecords(),
    getEdgeRecords(),
    getDomainRefs()
  ])
  .then(([memoryNodes, tagRecords, edgeRecords, domainRefs]) => {
    // Attach tags to each memory node
    const nodeMap = {};
    memoryNodes.forEach(node => {
      nodeMap[node.id] = {
        id: node.id,
        content: node.content,
        content_summary: node.content_summary,
        domain: node.domain,
        path: node.path,
        tags: []
      };
    });
    
    tagRecords.forEach(record => {
      if (nodeMap[record.nodeId]) {
        nodeMap[record.nodeId].tags.push(record.tag);
      }
    });

    // Prepare nodes and links for the graph
    const nodes = Object.values(nodeMap);
    const links = edgeRecords.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      strength: edge.strength,
      domain: edge.domain
    }));

    // Add cross-domain refs as links (type: 'cross_domain')
    domainRefs.forEach(ref => {
      // Only add if both nodes exist
      if (nodeMap[ref.nodeId] && nodeMap[ref.targetNodeId]) {
        links.push({
          id: `crossdomain-${ref.nodeId}-${ref.targetNodeId}`,
          source: ref.nodeId,
          target: ref.targetNodeId,
          type: 'cross_domain',
          strength: 0.7,
          domain: ref.domain,
          targetDomain: ref.targetDomain,
          description: ref.description
        });
        // If bidirectional, add reverse link
        if (ref.bidirectional) {
          links.push({
            id: `crossdomain-${ref.targetNodeId}-${ref.nodeId}`,
            source: ref.targetNodeId,
            target: ref.nodeId,
            type: 'cross_domain',
            strength: 0.7,
            domain: ref.targetDomain,
            targetDomain: ref.domain,
            description: ref.description
          });
        }
      }
    });

    console.log(`Processed ${nodes.length} memory nodes and ${links.length} links (including cross-domain)`);

    res.json({
      nodes,
      links
    });
  })
  .catch(err => {
    console.error('Error fetching graph data:', err.message);
    res.status(500).json({ error: err.message });
  });
});

module.exports = router;