// Global variables
let graph;
let bloomPass;
let bloomEnabled = true;
let highlightNodes = new Set();
let highlightLinks = new Set();
let hoverNode = null;
let graphData = { nodes: [], links: [] };

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initGraph();
  loadData();
  
  // Event listeners
  document.getElementById('refresh-btn').addEventListener('click', loadData);
  document.getElementById('toggle-bloom').addEventListener('click', toggleBloomEffect);
});

// Initialize the 3D force graph
function initGraph() {
  graph = ForceGraph3D({ controlType: 'orbit' })
    (document.getElementById('graph-container'))
    .backgroundColor('#000020')
    .nodeLabel(node => getNodeLabel(node))
    .nodeColor(node => getNodeColor(node))
    .nodeRelSize(12) // Increased node size
    // Make links much more visible
    .linkWidth(link => highlightLinks.has(link) ? 5 : 2.5)
    .linkDirectionalParticles(link => highlightLinks.has(link) ? 8 : 4)
    .linkDirectionalParticleWidth(4)
    .linkDirectionalParticleSpeed(d => d.strength * 0.01) // Particle speed based on strength
    .linkColor(link => getLinkColor(link))
    // Use link strength for link opacity and width
    .linkOpacity(1.0) // Increased opacity
    .linkCurvature(0) // No curvature, straight links
    .linkThreeObjectExtend(true)
    .linkThreeObject(link => {
      // Create text sprite for link labels
      if (typeof SpriteText !== 'undefined') {
        const sprite = new SpriteText(link.type);
        sprite.color = 'white'; // Brighter color
        sprite.textHeight = 2.0; // Larger text
        return sprite;
      }
      return null;
    })
    // Use strength for force simulation with stronger parameters
    .d3Force('link', d3.forceLink()
      .id(d => d.id)
      .distance(link => {
        // Stronger links = shorter distance, weaker = longer
        // strength 1 => 50, strength 0 => 200
        const s = typeof link.strength === 'number' ? link.strength : 0.5;
        return 200 - 150 * s;
      })
      .strength(link => link.strength * 2) // Multiply strength for more effect
    )
    .d3Force('charge', d3.forceManyBody()
      .strength(-300) // Stronger repulsion for better spacing
      .distanceMax(300) // Limit the distance of effect
    )
    .d3Force('center', d3.forceCenter())
    .d3Force('collide', d3.forceCollide(node => 15 + (node.val || 1) * 5)) // Prevent node overlap based on node size
    .linkPositionUpdate((sprite, { start, end }) => {
      if (!sprite) return;
      
      // Position the text sprite at the middle of the link
      const middlePos = {
        x: start.x + (end.x - start.x) / 2,
        y: start.y + (end.y - start.y) / 2,
        z: start.z + (end.z - start.z) / 2
      };
      
      Object.assign(sprite.position, middlePos);
    })
    .onNodeHover(node => {
      // Handle node hover
      if ((!node && !highlightNodes.size) || (node && hoverNode === node)) return;
      
      highlightNodes.clear();
      highlightLinks.clear();
      
      if (node) {
        highlightNodes.add(node);
        
        // Highlight connected nodes and links
        graphData.links.forEach(link => {
          if (link.source.id === node.id || link.target.id === node.id) {
            highlightLinks.add(link);
            highlightNodes.add(link.source.id === node.id ? link.target : link.source);
          }
        });
        
        // Show info panel
        showNodeInfo(node);
      } else {
        // Hide info panel
        hideNodeInfo();
      }
      
      hoverNode = node || null;
      updateHighlight();
    })
    .onNodeClick(node => {
      // Center view on node
      graph.centerAt(node.x, node.y, node.z, 1000);
      graph.zoom(1.5, 1000);
    });
  
  // Add bloom effect
  try {
    if (typeof THREE !== 'undefined' && THREE.UnrealBloomPass) {
      bloomPass = new THREE.UnrealBloomPass();
      bloomPass.strength = 1.5;
      bloomPass.radius = 1;
      bloomPass.threshold = 0.1;
      graph.postProcessingComposer().addPass(bloomPass);
      console.log('Bloom effect added successfully');
    } else {
      console.warn('THREE.UnrealBloomPass not available, skipping bloom effect');
      bloomEnabled = false;
    }
  } catch (error) {
    console.error('Error adding bloom effect:', error);
    bloomEnabled = false;
  }
}

// Load data from the API
function loadData() {
  document.getElementById('loading-indicator').style.display = 'block';
  console.log('Fetching graph data...');
  
  fetch('/api/graph/memory')
    .then(response => {
      console.log('Response received:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Data received:', data);
      
      // Process the data
      processGraphData(data);
      
      // Update the graph
      console.log('Updating graph with data:', graphData);
      graph.graphData(graphData);
      
      // Hide loading indicator
      document.getElementById('loading-indicator').style.display = 'none';
    })
    .catch(error => {
      console.error('Error loading graph data:', error);
      document.getElementById('loading-indicator').textContent = 'Error loading data. Please try again.';
    });
}

// Process the graph data
function processGraphData(data) {
  // For memory-centric: nodes are memories, links are edges
  graphData = {
    nodes: data.nodes.map(node => ({
      ...node,
      group: node.tags && node.tags.length > 0 ? node.tags[0] : node.domain, // Use first tag or domain as group
      val: (node.tags && node.tags.length) ? Math.min(5, node.tags.length) : 1, // Node size by tag count
      // Randomize initial 3D position to help force layout escape a plane
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400,
      z: (Math.random() - 0.5) * 400
    })),
    links: data.links
  };

  console.log('Processed memory-centric graph data:', graphData);
  console.log(`Nodes: ${graphData.nodes.length}, Links: ${graphData.links.length}`);
}

// Get node label for tooltips
function getNodeLabel(node) {
  if (!node) return '';
  // For memory nodes, show content preview and tags
  const preview = node.content.length > 80 ? node.content.substring(0, 80) + '...' : node.content;
  return `Memory: ${preview}\nTags: ${node.tags ? node.tags.join(', ') : ''}`;
}

// Get node color based on tag name and highlight state
function getNodeColor(node) {
  if (highlightNodes.has(node)) {
    return node === hoverNode ? '#ff5500' : '#ff8800';
  }
  // Use group (first tag or domain) for color
  if (node.group) {
    // Hash group to color
    let hash = 0;
    for (let i = 0; i < node.group.length; i++) {
      hash = node.group.charCodeAt(i) + ((hash << 5) - hash);
    }
    const r = (hash & 0xFF0000) >> 16;
    const g = (hash & 0x00FF00) >> 8;
    const b = hash & 0x0000FF;
    return `rgb(${(r+128)%256}, ${(g+128)%256}, ${(b+128)%256})`;
  }
  return '#cccccc';
}

// Get link color based on type and highlight state
function getLinkColor(link) {
  if (highlightLinks.has(link)) {
    return '#ffffff';
  }
  
  // Color based on relationship type
  switch (link.type) {
    case 'relates_to':
      return 'rgba(120, 170, 255, 0.6)';
    case 'synthesizes':
      return 'rgba(255, 180, 120, 0.6)';
    case 'supports':
      return 'rgba(120, 255, 170, 0.6)';
    case 'refines':
      return 'rgba(220, 120, 255, 0.6)';
    default:
      return 'rgba(180, 180, 180, 0.4)';
  }
}

// Show node information in the info panel
function showNodeInfo(node) {
  const infoPanel = document.getElementById('info-panel');
  const nodeId = document.getElementById('node-id');
  const nodeTags = document.getElementById('node-tags');
  const nodeContent = document.getElementById('node-content');

  // Set node ID (memory id)
  nodeId.textContent = `Memory ID: ${node.id}`;

  // Set tags
  nodeTags.innerHTML = '';
  if (node.tags && node.tags.length > 0) {
    node.tags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'tag';
      tagElement.textContent = tag;
      nodeTags.appendChild(tagElement);
    });
  } else {
    nodeTags.textContent = 'No tags';
  }

  // Set content
  nodeContent.textContent = node.content;

  // Show the panel
  infoPanel.style.display = 'block';
}

// Hide the info panel
function hideNodeInfo() {
  document.getElementById('info-panel').style.display = 'none';
}

// Update highlighted nodes and links
function updateHighlight() {
  // Update the graph visualization
  graph
    .nodeColor(graph.nodeColor())
    .linkWidth(graph.linkWidth())
    .linkDirectionalParticles(graph.linkDirectionalParticles())
    .linkColor(graph.linkColor());
}

// Toggle bloom effect
function toggleBloomEffect() {
  if (!bloomPass) {
    console.warn('Bloom effect not available');
    return;
  }
  
  bloomEnabled = !bloomEnabled;
  
  try {
    if (bloomEnabled) {
      bloomPass.strength = 4;
      console.log('Bloom effect enabled');
    } else {
      bloomPass.strength = 0;
      console.log('Bloom effect disabled');
    }
  } catch (error) {
    console.error('Error toggling bloom effect:', error);
  }
}

// Refresh data every 30 seconds
setInterval(loadData, 30000);
