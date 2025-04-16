const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Connect to the SQLite database
const db = new sqlite3.Database('./memory-graph.db', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to the memory-graph database');
  }
});

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
  
  db.all(query, [], (err, nodes) => {
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
  
  db.all(query, [], (err, edges) => {
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
  
  // Check if nodes exist
  const checkNodesQuery = `
    SELECT id FROM MEMORY_NODES WHERE id IN (?, ?)
  `;
  
  db.all(checkNodesQuery, [source, target], (err, nodes) => {
    if (err) {
      console.error('[API] Error checking nodes:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (nodes.length < 2) {
      console.log('[API] Error: One or both nodes do not exist');
      console.log('  Found nodes:', nodes.map(n => n.id));
      return res.status(400).json({ error: 'One or both nodes do not exist' });
    }
    
    // Check if edge already exists
    const checkEdgeQuery = `
      SELECT id FROM MEMORY_EDGES 
      WHERE (source = ? AND target = ?) OR (source = ? AND target = ?)
    `;
    
    db.get(checkEdgeQuery, [source, target, target, source], (err, existingEdge) => {
      if (err) {
        console.error('[API] Error checking existing edge:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (existingEdge) {
        console.log('[API] Edge already exists:', existingEdge.id);
        return res.status(409).json({ error: 'Edge already exists', id: existingEdge.id });
      }
      
      // Create new edge
      const id = `${source}-${target}-${type}`;
      const timestamp = new Date().toISOString();
      const query = `
        INSERT INTO MEMORY_EDGES (id, source, target, type, strength, timestamp, domain)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      console.log('[API] Inserting edge into MEMORY_EDGES:', { id, source, target, type, strength, timestamp, domain });
      
      db.run(query, [id, source, target, type, strength, timestamp, domain], function (err) {
        if (err) {
          console.error('[API] Error inserting edge:', err.message);
          return res.status(500).json({ error: err.message });
        }
        
        console.log('[API] Edge inserted successfully:', id);
        console.log('  Changes:', this.changes);
        console.log('  Last ID:', this.lastID);
        
        res.json({ success: true, id });
      });
    });
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
  
  db.all(query, [], (err, tags) => {
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
  db.run(query, values, function (err) {
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
  
  db.run(query, [source, target, target, source], function(err) {
    if (err) {
      console.error('[API] Error deleting edge:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      console.log('[API] No edge found to delete');
      return res.status(404).json({ error: 'Edge not found' });
    }
    
    console.log('[API] Edge deleted successfully');
    console.log('  Changes:', this.changes);
    
    res.json({ success: true, deleted: this.changes });
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

  db.all(nodesQuery, [], (err, memoryNodes) => {
    if (err) {
      console.error('Error fetching memory nodes:', err.message);
      return res.status(500).json({ error: err.message });
    }

    db.all(tagsQuery, [], (err, tagRecords) => {
      if (err) {
        console.error('Error fetching tags:', err.message);
        return res.status(500).json({ error: err.message });
      }

      db.all(edgesQuery, [], (err, edgeRecords) => {
        if (err) {
          console.error('Error fetching edges:', err.message);
          return res.status(500).json({ error: err.message });
        }

        db.all(domainRefsQuery, [], (err, domainRefs) => {
          if (err) {
            console.error('Error fetching domain refs:', err.message);
            return res.status(500).json({ error: err.message });
          }

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
        });
      });
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
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
