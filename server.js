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
