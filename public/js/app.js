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
    .linkCurvature(0.25) // Add curvature to links for better visibility
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
      .distance(link => 80 / (link.strength || 0.5)) // Stronger links = closer nodes
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
  
  fetch('/api/graph')
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
  // Store the original data
  graphData = {
    nodes: data.nodes.map(node => ({
      ...node,
      // Set node size based on number of associated memory nodes
      val: node.memoryNodes ? Math.max(1, Math.min(5, node.memoryNodes.length * 0.5)) : 1
    })),
    links: data.links
  };
  
  console.log('Processed graph data:', graphData);
  console.log(`Nodes: ${graphData.nodes.length}, Links: ${graphData.links.length}`);
}

// Get node label for tooltips
function getNodeLabel(node) {
  if (!node) return '';
  
  // For tag nodes, show the tag name and number of associated memory nodes
  return `Tag: ${node.tag}\nAssociated Memories: ${node.memoryNodes ? node.memoryNodes.length : 0}`;
}

// Get node color based on tag name and highlight state
function getNodeColor(node) {
  if (highlightNodes.has(node)) {
    return node === hoverNode ? '#ff5500' : '#ff8800';
  }
  
  // Generate a consistent color based on the tag name
  const tagColors = {
    'MCP': '#4488ff',
    'Model_Context_Protocol': '#4488ff',
    'research_topic': '#44aaff',
    'technical': '#22ccff',
    'personal_practice': '#aa44ff',
    'executive_agency': '#ff44aa',
    'memory_tool': '#44dd88',
    'primary_executive': '#dd88ff',
    'time_perception': '#ff88dd',
    'AI_limitations': '#88ddff',
    'memory_systems': '#88ffdd',
    'persistence': '#ddff88',
    'consciousness': '#ffdd88',
    'dimensionality': '#dd88ff'
  };
  
  // Use predefined color if available, otherwise generate one based on the tag name
  if (tagColors[node.tag]) {
    return tagColors[node.tag];
  }
  
  // Generate a color based on the tag name
  let hash = 0;
  for (let i = 0; i < node.tag.length; i++) {
    hash = node.tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to RGB
  const r = (hash & 0xFF0000) >> 16;
  const g = (hash & 0x00FF00) >> 8;
  const b = hash & 0x0000FF;
  
  return `rgb(${r}, ${g}, ${b})`;
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
  
  // Set node ID (tag name)
  nodeId.textContent = `Node: ${node.tag}`;
  
  // Set related tags (from connected nodes)
  nodeTags.innerHTML = '';
  
  // Find all connected tags
  const connectedTags = new Set();
  graphData.links.forEach(link => {
    if (link.source.id === node.id) {
      connectedTags.add(link.target.tag);
    } else if (link.target.id === node.id) {
      connectedTags.add(link.source.tag);
    }
  });
  
  // Add connected tags to the display
  connectedTags.forEach(tag => {
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.textContent = tag;
    nodeTags.appendChild(tagElement);
  });
  
  // Set content - show associated memory nodes
  if (node.memoryNodes && node.memoryNodes.length > 0) {
    // Create a summary of the associated memory nodes
    const contentSummary = node.memoryNodes.map(memNode => {
      // Get a preview of the content
      const contentPreview = memNode.content.length > 100 
        ? memNode.content.substring(0, 100) + '...' 
        : memNode.content;
      
      return `Memory ID: ${memNode.id}\n${contentPreview}\n`;
    }).join('\n---\n\n');
    
    nodeContent.textContent = contentSummary;
  } else {
    nodeContent.textContent = 'No associated memory nodes found.';
  }
  
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
      bloomPass.strength = 1.5;
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
