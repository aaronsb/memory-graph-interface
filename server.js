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
  console.log('API request received for /api/graph');
  
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
      
      // Create a map of memory nodes for reference
      const memoryNodeMap = {};
      memoryNodes.forEach(node => {
        memoryNodeMap[node.id] = {
          id: node.id,
          content: node.content,
          domain: node.domain,
          path: node.path
        };
      });
      
      // Create a map of tags and their associated memory nodes
      const tagMap = {};
      tagRecords.forEach(record => {
        if (!tagMap[record.tag]) {
          tagMap[record.tag] = {
            id: record.tag,
            tag: record.tag,
            memoryNodes: []
          };
        }
        
        if (memoryNodeMap[record.nodeId]) {
          tagMap[record.tag].memoryNodes.push(memoryNodeMap[record.nodeId]);
        }
      });
      
      // Convert tag map to array of nodes
      const tagNodes = Object.values(tagMap);
      
      // Create links between tags that appear in the same memory node
      const tagLinks = [];
      const tagPairCounts = {}; // Track co-occurrence counts
      
      // First pass: count co-occurrences of tag pairs
      memoryNodes.forEach(memoryNode => {
        // Get all tags for this memory node
        const nodeTags = tagRecords
          .filter(record => record.nodeId === memoryNode.id)
          .map(record => record.tag);
        
        // Count co-occurrences for each pair of tags
        for (let i = 0; i < nodeTags.length; i++) {
          for (let j = i + 1; j < nodeTags.length; j++) {
            const source = nodeTags[i];
            const target = nodeTags[j];
            
            // Create a unique ID for this tag pair
            const pairId = [source, target].sort().join('-');
            
            if (!tagPairCounts[pairId]) {
              tagPairCounts[pairId] = {
                source,
                target,
                count: 0,
                memoryNodes: new Set()
              };
            }
            
            tagPairCounts[pairId].count++;
            tagPairCounts[pairId].memoryNodes.add(memoryNode.id);
          }
        }
      });
      
      // Second pass: create links with strength based on co-occurrence count
      Object.entries(tagPairCounts).forEach(([pairId, data]) => {
        // Calculate strength based on co-occurrence count (normalized between 0.3 and 1.0)
        // More co-occurrences = stronger link
        const maxCount = Math.max(...Object.values(tagPairCounts).map(d => d.count));
        const minStrength = 0.3;
        const maxStrength = 1.0;
        const strength = minStrength + (data.count / maxCount) * (maxStrength - minStrength);
        
        tagLinks.push({
          id: pairId,
          source: tagMap[data.source],
          target: tagMap[data.target],
          type: 'co-occurrence',
          strength: strength,
          count: data.count,
          memoryNodes: Array.from(data.memoryNodes)
        });
      });
      
      console.log(`Processed ${tagNodes.length} tag nodes and ${tagLinks.length} tag links`);
      
      // Return the graph data
      res.json({
        nodes: tagNodes,
        links: tagLinks
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
