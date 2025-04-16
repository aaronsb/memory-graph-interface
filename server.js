const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Track the last modification time of the database file
let lastDatabaseModTime = null;

// Serve static files
app.use(express.static('public'));

// Database connection management
let db;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 500; // 500ms initial delay

/**
 * Connect to the database with exponential backoff retry logic
 * @param {boolean} isReconnect - Whether this is a reconnection attempt
 * @param {function} callback - Optional callback to execute after connection
 */
function connectToDatabase(isReconnect = false, callback = null) {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    console.log('Connection attempt already in progress, skipping');
    return;
  }
  
  isConnecting = true;
  
  // Close existing connection if it exists
  if (db) {
    try {
      db.close();
    } catch (err) {
      console.error('Error closing existing database connection:', err.message);
    }
  }
  
  console.log(`${isReconnect ? 'Re' : ''}connecting to database (attempt ${reconnectAttempts + 1})...`);
  
  // Create a new connection
  db = new sqlite3.Database('./memory-graph.db', (err) => {
    isConnecting = false;
    
    if (err) {
      console.error('Error connecting to the database:', err.message);
      
      // Implement exponential backoff for reconnection
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);
        console.log(`Will retry connection in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        
        setTimeout(() => {
          connectToDatabase(true, callback);
        }, delay);
      } else {
        console.error(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Giving up.`);
        reconnectAttempts = 0; // Reset for future attempts
      }
    } else {
      console.log(`Successfully ${isReconnect ? 're' : ''}connected to the memory-graph database`);
      reconnectAttempts = 0; // Reset reconnect counter on success
      
      // Configure the database connection
      db.configure('busyTimeout', 5000); // Wait up to 5 seconds when the database is locked
      
      // Execute callback if provided
      if (callback && typeof callback === 'function') {
        callback();
      }
    }
  });
}

/**
 * Execute a database operation with automatic reconnection on failure
 * @param {function} operation - Function that takes the db object and executes the operation
 * @param {number} maxRetries - Maximum number of retries
 * @param {function} callback - Callback to execute after operation completes or fails
 */
function executeWithRetry(operation, maxRetries = 3, callback = null) {
  let retries = 0;
  
  function attempt() {
    if (!db) {
      console.log('No database connection, connecting first...');
      connectToDatabase(false, () => attempt());
      return;
    }
    
    try {
      operation(db, (err, result) => {
        if (err && (err.message.includes('SQLITE_BUSY') || 
                    err.message.includes('SQLITE_LOCKED') || 
                    err.message.includes('database is locked'))) {
          
          if (retries < maxRetries) {
            retries++;
            const delay = BASE_RECONNECT_DELAY * Math.pow(2, retries - 1);
            console.log(`Database busy/locked, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
            
            setTimeout(attempt, delay);
          } else {
            console.error(`Failed operation after ${maxRetries} retries:`, err.message);
            if (callback) callback(err);
          }
        } else if (err) {
          console.error('Database operation error:', err.message);
          if (callback) callback(err);
        } else {
          if (callback) callback(null, result);
        }
      });
    } catch (err) {
      console.error('Unexpected error during database operation:', err.message);
      
      if (retries < maxRetries) {
        retries++;
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, retries - 1);
        console.log(`Unexpected error, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
        
        setTimeout(attempt, delay);
      } else {
        console.error(`Failed operation after ${maxRetries} retries:`, err.message);
        if (callback) callback(err);
      }
    }
  }
  
  attempt();
}

// Connect to the SQLite database
connectToDatabase();

// API endpoint to get all nodes
app.get('/api/nodes', (req, res) => {
  const query = `
    SELECT 
      n.id, 
      n.content, 
      n.domain,
      n.path
    FROM MEMORY_NODES n
  `;
  
  executeWithRetry((db, callback) => {
    db.all(query, [], callback);
  }, 3, (err, nodes) => {
    if (err) {
      console.error('Error fetching nodes:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    res.json(nodes);
  });
});

// API endpoint to get all edges
app.get('/api/edges', (req, res) => {
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
  
  executeWithRetry((db, callback) => {
    db.all(query, [], callback);
  }, 3, (err, edges) => {
    if (err) {
      console.error('Error fetching edges:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    res.json(edges);
  });
});

// API endpoint to add a new edge (link) between two nodes
app.use(express.json());
app.post('/api/edges', (req, res) => {
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
      
      executeWithRetry((db, callback) => {
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
      
      executeWithRetry((db, callback) => {
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
      
      executeWithRetry((db, callback) => {
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

// API endpoint to get all tags
app.get('/api/tags', (req, res) => {
  const query = `
    SELECT 
      t.nodeId,
      t.tag
    FROM MEMORY_TAGS t
  `;
  
  executeWithRetry((db, callback) => {
    db.all(query, [], callback);
  }, 3, (err, tags) => {
    if (err) {
      console.error('Error fetching tags:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    res.json(tags);
  });
});

// API endpoint to add one or more tags to a node
app.post('/api/tags', (req, res) => {
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
  
  executeWithRetry((db, callback) => {
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

// API endpoint to delete an edge between two nodes
app.delete('/api/edges/:source/:target', (req, res) => {
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
  
  executeWithRetry((db, callback) => {
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
    
    res.json({ success: true, deleted: result.changes });
  });
});

// API endpoint to delete a node and its associated edges and tags
app.delete('/api/nodes/:id', (req, res) => {
  console.log('==== [API] DELETE /api/nodes/:id request received ====');
  const { id } = req.params;
  
  console.log('[API] Deleting node with ID:', id);
  
  if (!id) {
    console.log('[API] DELETE /api/nodes error: Missing node ID');
    return res.status(400).json({ error: 'Missing node ID' });
  }
  
  // Use a transaction to ensure data integrity
  executeWithRetry((db, callback) => {
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

// API endpoint to get graph data with tags as nodes
app.get('/api/graph', (req, res) => {
  // ...existing code unchanged...
});

/**
 * NEW: API endpoint to get memory-centric graph (nodes = memories, links = edges, tags as array, includes cross-domain refs)
 */
app.get('/api/graph/memory', (req, res) => {
  console.log('API request received for /api/graph/memory');

  const nodesQuery = `
    SELECT 
      n.id, 
      n.content, 
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
      executeWithRetry((db, callback) => {
        db.all(nodesQuery, [], callback);
      }, 3, (err, nodes) => {
        if (err) reject(err);
        else resolve(nodes);
      });
    });
  };

  const getTagRecords = () => {
    return new Promise((resolve, reject) => {
      executeWithRetry((db, callback) => {
        db.all(tagsQuery, [], callback);
      }, 3, (err, tags) => {
        if (err) reject(err);
        else resolve(tags);
      });
    });
  };

  const getEdgeRecords = () => {
    return new Promise((resolve, reject) => {
      executeWithRetry((db, callback) => {
        db.all(edgesQuery, [], callback);
      }, 3, (err, edges) => {
        if (err) reject(err);
        else resolve(edges);
      });
    });
  };

  const getDomainRefs = () => {
    return new Promise((resolve, reject) => {
      executeWithRetry((db, callback) => {
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

// API endpoint to check if the database file has been modified
app.get('/api/db-status', (req, res) => {
  fs.stat('./memory-graph.db', (err, stats) => {
    if (err) {
      console.error('Error checking database file:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    const currentModTime = stats.mtime.getTime();
    
    // Initialize lastDatabaseModTime if it's null
    if (lastDatabaseModTime === null) {
      lastDatabaseModTime = currentModTime;
      return res.json({ changed: false });
    }
    
    // Check if the file has been modified
    const hasChanged = currentModTime > lastDatabaseModTime;
    
    // If the file has changed, update the last modification time and reconnect to the database
    if (hasChanged) {
      console.log('Database file has been modified. Last mod time:', new Date(lastDatabaseModTime).toISOString());
      console.log('Current mod time:', new Date(currentModTime).toISOString());
      
      lastDatabaseModTime = currentModTime;
      
      // Reconnect to the database to ensure we have the latest data
      connectToDatabase(true, () => {
        console.log('Reconnected to the memory-graph database after external modification');
      });
    }
    
    res.json({ changed: hasChanged });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  
  // Initialize the last modification time when the server starts
  fs.stat('./memory-graph.db', (err, stats) => {
    if (err) {
      console.error('Error getting initial database file stats:', err.message);
    } else {
      lastDatabaseModTime = stats.mtime.getTime();
      console.log('Initial database modification time:', new Date(lastDatabaseModTime).toISOString());
    }
  });
});

// Close the database connection when the process is terminated
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing the database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
