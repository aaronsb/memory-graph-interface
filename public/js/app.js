// Global variables
let graph;
let bloomPass;
let bloomEnabled = true;
let highlightNodes = new Set();
let highlightLinks = new Set();
let hoverNode = null;
let hoverLink = null; // Track the link being hovered
let selectedNode = null;
let selectedNodes = []; // Array to store shift-clicked nodes
let graphData = { nodes: [], links: [] };
let draggedNode = null; // Track the node being dragged
let potentialLinkTarget = null; // Track potential link target during drag
let originalChargeStrength = -300; // Store original charge strength
let temporaryLinkFormed = false; // Track if a temporary link is formed
let repulsionReduced = false; // Track if repulsion has been reduced during drag
let controlKeyPressed = false; // Track if Control key is pressed
let mouseButtonPressed = false; // Track if mouse button is pressed
let dbWatcherActive = true; // Track if database file watcher is active
let dbWatcherInterval = null; // Store the interval ID for database checking

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Add a UI hint for linking - positioned to avoid overlap with controls
  const hint = document.createElement('div');
  hint.id = 'link-hint';
  hint.style.position = 'fixed';
  hint.style.bottom = '10px';
  hint.style.left = '10px';
  hint.style.background = 'rgba(0,0,0,0.7)';
  hint.style.color = '#fff';
  hint.style.padding = '12px 16px';
  hint.style.borderRadius = '6px';
  hint.style.zIndex = 999; // Lower z-index than controls
  hint.style.fontSize = '14px';
  hint.style.lineHeight = '1.4';
  hint.style.maxWidth = '400px';
  hint.innerHTML = `
    <strong>Memory Graph Interaction:</strong><br>
    • <span style="color:#00ff00">Shift-click</span> two nodes to create a link between them<br>
    • <span style="color:#ffff00">Drag</span> a node near another to auto-link them<br>
    • <span style="color:#3388ff">Click</span> a node to select it and view details<br>
    • <span style="color:#ff5500">Hover</span> over nodes to see connections<br>
    • <span style="color:#ff00ff">Control-click</span> a link to delete it<br>
    • <span style="color:#ff00ff">Control-click</span> a node to delete it and its connections
  `;
  document.body.appendChild(hint);

  initGraph();
  loadData();
  
  // Event listeners
  document.getElementById('refresh-btn').addEventListener('click', loadData);
  document.getElementById('toggle-bloom').addEventListener('click', toggleBloomEffect);
  
  // Create a controls container with better layout
  const controls = document.getElementById('controls');
  
  // Create a flex container for the buttons
  controls.style.display = 'flex';
  controls.style.flexDirection = 'column';
  controls.style.gap = '8px';
  controls.style.zIndex = 1001; // Higher z-index than the hint
  controls.style.position = 'absolute';
  controls.style.bottom = '180px'; // Position above the hint
  controls.style.left = '10px';
  controls.style.width = '400px'; // Match width with hint
  
  // Create a row for the main controls
  const mainControls = document.createElement('div');
  mainControls.style.display = 'flex';
  mainControls.style.gap = '8px';
  controls.appendChild(mainControls);
  
  // Move existing buttons to the main controls row
  mainControls.appendChild(document.getElementById('refresh-btn'));
  mainControls.appendChild(document.getElementById('toggle-bloom'));
  
  // Add a toggle button for database file watching
  const watcherToggle = document.createElement('button');
  watcherToggle.id = 'toggle-watcher';
  watcherToggle.textContent = 'DB Watcher: ON';
  watcherToggle.style.backgroundColor = '#2a9852'; // Green background
  watcherToggle.addEventListener('click', toggleDatabaseWatcher);
  mainControls.appendChild(watcherToggle);
  
  // Add a database update indicator
  const dbUpdateIndicator = document.createElement('div');
  dbUpdateIndicator.id = 'db-update-indicator';
  dbUpdateIndicator.textContent = 'DB Updated';
  dbUpdateIndicator.style.backgroundColor = 'rgba(40, 167, 69, 0.6)';
  dbUpdateIndicator.style.color = 'white';
  dbUpdateIndicator.style.padding = '8px 12px';
  dbUpdateIndicator.style.borderRadius = '4px';
  dbUpdateIndicator.style.marginTop = '8px';
  dbUpdateIndicator.style.textAlign = 'center';
  dbUpdateIndicator.style.display = 'none'; // Hidden by default
  controls.appendChild(dbUpdateIndicator);
  
  // Add CSS for the blinking effect
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { background-color: rgba(40, 167, 69, 0.6); }
      50% { background-color: rgba(40, 167, 69, 1); }
      100% { background-color: rgba(40, 167, 69, 0.6); }
    }
    .pulse-animation {
      animation: pulse 1s ease-in-out 3;
    }
  `;
  document.head.appendChild(style);
  
  // Start the database file watcher
  startDatabaseWatcher();
  
  // Add event listeners for Control key
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Control') {
      controlKeyPressed = true;
      updateHighlight();
    }
  });
  
  window.addEventListener('keyup', (event) => {
    if (event.key === 'Control') {
      controlKeyPressed = false;
      updateHighlight();
    }
  });
  
  // Track mouse button state
  window.addEventListener('mousedown', () => {
    mouseButtonPressed = true;
  });
  
  window.addEventListener('mouseup', () => {
    mouseButtonPressed = false;
  });
  
  // Clear control key state when window loses focus
  window.addEventListener('blur', () => {
    controlKeyPressed = false;
    mouseButtonPressed = false;
    updateHighlight();
  });
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
    .linkDirectionalParticles(link => Math.round((link.strength || 0.5) * 8))
    .linkDirectionalParticleWidth(4)
    .linkDirectionalParticleSpeed(d => d.strength * 0.01) // Particle speed based on strength
    .linkColor(link => getLinkColor(link))
    // Use link strength for link opacity and width
    .linkOpacity(1.0) // Increased opacity
    .linkCurvature(0) // No curvature, straight links
    .linkLabel(link => `${link.type} (${link.strength.toFixed(2)})`) // Add label for links
    .linkThreeObjectExtend(true)
    .linkThreeObject(link => {
      // Create text sprite for link labels
      if (typeof SpriteText !== 'undefined') {
        const sprite = new SpriteText(link.type);
        sprite.color = 'white'; // Brighter color
        sprite.textHeight = 4.0; // Increased text size (was 2.0)
        sprite.backgroundColor = 'rgba(0,0,0,0.3)'; // Semi-transparent background for better readability
        sprite.padding = 2; // Add some padding around the text
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
      .strength(originalChargeStrength) // Stronger repulsion for better spacing
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
      
      // If control key is pressed, we're in link deletion mode, so don't highlight nodes
      if (controlKeyPressed) {
        hoverNode = node || null;
        return;
      }
      
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
        
        // Show info panel only if no node is currently selected
        if (!selectedNode) {
          showNodeInfo(node);
        }
      } else {
        // Hide info panel only if no node is currently selected
        if (!selectedNode) {
          hideNodeInfo();
        }
      }
      
      hoverNode = node || null;
      updateHighlight();
    })
    .onLinkHover(link => {
      // Only highlight links when Control key is pressed
      if (controlKeyPressed) {
        highlightLinks.clear();
        
        if (link) {
          highlightLinks.add(link);
        }
        
        hoverLink = link || null;
        updateHighlight();
      }
    })
    .onNodeClick((node, event) => {
      // Check if control key is pressed for node deletion
      if (controlKeyPressed) {
        console.log('Control-click detected on node:', node.id);
        
        // Show custom confirmation dialog
        showCustomConfirmDialog(
          `Are you sure you want to delete this memory node and all its connections?\n\nMemory ID: ${node.id}`,
          () => {
            // Yes callback
            console.log(`[API] Deleting node with ID: ${node.id}`);
            
            // Delete the node via API
            fetch(`/api/nodes/${node.id}`, {
              method: 'DELETE'
            })
            .then(res => {
              console.log('[API] Received response for DELETE /api/nodes', res);
              return res.json();
            })
            .then(result => {
              console.log('[API] Response JSON for DELETE /api/nodes', result);
              if (result.success) {
                // If the deleted node was selected, clear the selection
                if (selectedNode && selectedNode.id === node.id) {
                  selectedNode = null;
                  hideNodeInfo();
                }
                
                // Remove the node from selectedNodes if it's there
                const nodeIndex = selectedNodes.findIndex(n => n.id === node.id);
                if (nodeIndex !== -1) {
                  selectedNodes.splice(nodeIndex, 1);
                }
                
                // Reload data with position preservation
                loadData(true);
                console.log('Node deleted successfully');
              } else {
                alert('Failed to delete node: ' + (result.error || 'Unknown error'));
              }
            })
            .catch(err => {
              console.error('[API] Error deleting node:', err);
              alert('Error deleting node: ' + err);
            });
          }
        );
        return; // Exit early to prevent other click behaviors
      }
      
      // Check if shift key is pressed for multi-selection
      if (event.shiftKey) {
        console.log('Shift-click detected on node:', node.id);
        
        // If node is already in selectedNodes, remove it
        const nodeIndex = selectedNodes.findIndex(n => n.id === node.id);
        if (nodeIndex !== -1) {
          selectedNodes.splice(nodeIndex, 1);
          console.log('Node removed from selection:', node.id);
        } else {
          // Add node to selection
          selectedNodes.push(node);
          console.log('Node added to selection:', node.id);
        }
        
        // If we have exactly 2 nodes selected, create a link between them
        if (selectedNodes.length === 2) {
          const source = selectedNodes[0];
          const target = selectedNodes[1];
          console.log('Creating link between nodes:', source.id, 'and', target.id);
          
          // Create link via API
          const linkPayload = {
            source: source.id,
            target: target.id,
            type: 'relates_to',
            strength: 0.7,
            domain: source.domain
          };
          
          console.log('[API] Sending POST /api/edges', linkPayload);
          fetch('/api/edges', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(linkPayload)
          })
          .then(res => {
            console.log('[API] Received response for POST /api/edges', res);
            return res.json();
          })
          .then(result => {
            console.log('[API] Response JSON for POST /api/edges', result);
            if (result.success) {
              // Clear selection and reload data with position preservation
              selectedNodes = [];
              loadData(true);
              console.log('Link created successfully, selection cleared');
            } else {
              alert('Failed to create link: ' + (result.error || 'Unknown error'));
            }
          })
          .catch(err => {
            console.error('[API] Error creating link:', err);
            alert('Error creating link: ' + err);
          });
        }
        
        // Update highlight to show selected nodes
        updateHighlight();
      } else {
        // Regular click behavior (non-shift)
        if (selectedNode && node.id === selectedNode.id) {
          // Deselect if already selected
          selectedNode = null;
          hideNodeInfo();
        } else {
          selectedNode = node;
          showNodeInfo(node);
        }
        updateHighlight();

        // Center view on node (using lookAt instead of centerAt)
        try {
          // Use the camera controls to look at the node
          // Increased distance for a more zoomed-out view (4x further away)
          const distance = 160; // Was 40, increased to zoom out
          const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
          
          if (graph.cameraPosition) {
            graph.cameraPosition(
              { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
              node, // lookAt
              2000  // transition duration (slightly faster)
            );
          } else {
            console.warn('graph.cameraPosition not available, cannot center view');
          }
        } catch (err) {
          console.error('Error centering view on node:', err);
        }
      }
    })
    .onLinkClick((link, event) => {
      // Only handle link clicks when Control key is pressed
      if (controlKeyPressed && hoverLink === link) {
        console.log('Control-click detected on link:', link);
        
        // Get source and target IDs
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        // Show custom confirmation dialog
        showCustomConfirmDialog(
          `Are you sure you want to delete this link?\n\nFrom: ${sourceId}\nTo: ${targetId}`,
          () => {
            // Yes callback
            console.log(`[API] Deleting link between ${sourceId} and ${targetId}`);
            
            // Immediately clear the highlight to provide visual feedback
            highlightLinks.clear();
            updateHighlight();
            
            fetch(`/api/edges/${sourceId}/${targetId}`, {
              method: 'DELETE'
            })
            .then(res => {
              console.log('[API] Received response for DELETE /api/edges', res);
              return res.json();
            })
            .then(result => {
              console.log('[API] Response JSON for DELETE /api/edges', result);
              if (result.success) {
                // Reload data with position preservation
                loadData(true);
                console.log('Link deleted successfully');
              } else {
                alert('Failed to delete link: ' + (result.error || 'Unknown error'));
              }
            })
            .catch(err => {
              console.error('[API] Error deleting link:', err);
              alert('Error deleting link: ' + err);
            });
          }
        );
      }
    })
    .onNodeDrag((node, translate) => {
      // Track the node being dragged
      draggedNode = node;
      
      // Completely disable all forces when dragging starts (first time only)
      if (!repulsionReduced) {
        console.log('Drag started, disabling all forces');
        
        // Disable charge (repulsion) force
        graph.d3Force('charge').strength(0);
        
        // Disable link force
        const linkForce = graph.d3Force('link');
        if (linkForce) {
          linkForce.strength(0);
        }
        
        // Disable center force
        graph.d3Force('center').strength(0);
        
        // Disable collision force
        graph.d3Force('collide').radius(0);
        
        // Pause the simulation to prevent any movement
        graph.d3ReheatSimulation();
        
        repulsionReduced = true;
      }
      
      // Calculate threshold based on node radius
      // Base node size is 12 (nodeRelSize), and node.val affects size
      const nodeRadius = 12 * (node.val || 1);
      
      let closestNode = null;
      let minDist = Infinity;
      let withinThreshold = false;
      
      // Use different thresholds for forming and breaking links (hysteresis)
      // If we already have a potential link target, use a larger threshold to maintain it
      const linkFormThresholdFactor = 2.0; // More generous threshold for forming links
      const linkBreakThresholdFactor = 2.5; // Even larger threshold for breaking links
      
      for (const other of graphData.nodes) {
        if (other.id === node.id) continue;
        
        // Check if already linked
        const alreadyLinked = graphData.links.some(
          l => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return (sourceId === node.id && targetId === other.id) ||
                   (sourceId === other.id && targetId === node.id);
          }
        );
        
        if (alreadyLinked) continue;
        
        // Euclidean distance
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dz = node.z - other.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Calculate other node's radius
        const otherRadius = 12 * (other.val || 1);
        
        // Determine which threshold to use based on whether this node is already the potential target
        const thresholdFactor = (potentialLinkTarget === other) ? 
          linkBreakThresholdFactor : linkFormThresholdFactor;
        
        // Adjust threshold to be the sum of both node radii times the appropriate factor
        const adjustedThreshold = (nodeRadius + otherRadius) * thresholdFactor;
        
        if (dist < minDist && dist < adjustedThreshold) {
          minDist = dist;
          closestNode = other;
          withinThreshold = true;
        }
      }
      
      // Update potential link target
      if (potentialLinkTarget !== closestNode) {
        potentialLinkTarget = closestNode;
        
        // If we have a new potential target, mark it for visualization only
        if (closestNode && !temporaryLinkFormed) {
          console.log('Potential link formed');
          temporaryLinkFormed = true;
        } 
        // If no potential target but we had one before
        else if (!closestNode && temporaryLinkFormed) {
          console.log('Potential link lost');
          temporaryLinkFormed = false;
        }
        
        updateHighlight(); // Update visualization to show potential link
      }
    })
    .onNodeDragEnd(node => {
      console.log('Node drag ended:', node.id);
      
      // Reset drag tracking
      draggedNode = null;
      
      // Use the potential link target that was identified during drag
      let closestNode = potentialLinkTarget;
      
      if (closestNode) {
        console.log(`Found closest node within threshold: ${closestNode.id}`);
        
        // Keep the reduced repulsion until after the link is created
        
        // Create link via API
        const linkPayload = {
          source: node.id,
          target: closestNode.id,
          type: 'relates_to',
          strength: 0.7,
          domain: node.domain || closestNode.domain // Use either domain, preferring the dragged node's
        };
        
        console.log('[API] Sending POST /api/edges', linkPayload);
        
        fetch('/api/edges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(linkPayload)
        })
        .then(res => {
          console.log('[API] Received response for POST /api/edges', res);
          return res.json();
        })
        .then(result => {
          console.log('[API] Response JSON for POST /api/edges', result);
          if (result.success) {
            console.log('Link created successfully, reloading data');
            
            // Delay restoring normal forces until after the link is created and data is reloaded
            // This gives the user time to see the link before the nodes move away
            setTimeout(() => {
            // Restore normal forces
            graph.d3Force('charge').strength(originalChargeStrength);
            graph.d3Force('collide').radius(node => 15 + (node.val || 1) * 5);
            
            // Restore link force
            const linkForce = graph.d3Force('link');
            if (linkForce) {
              linkForce.strength(link => link.strength * 2 || 1);
            }
            
            // Restore center force
            graph.d3Force('center').strength(1);
            
            // Reheat the simulation
            graph.d3ReheatSimulation();
            
            temporaryLinkFormed = false;
            repulsionReduced = false;
            }, 500); // 500ms delay
            
            loadData(true);
          } else {
            // Restore normal forces immediately if link creation failed
            graph.d3Force('charge').strength(originalChargeStrength);
            graph.d3Force('collide').radius(node => 15 + (node.val || 1) * 5);
            
            // Restore link force
            const linkForce = graph.d3Force('link');
            if (linkForce) {
              linkForce.strength(link => link.strength * 2 || 1);
            }
            
            // Restore center force
            graph.d3Force('center').strength(1);
            
            // Reheat the simulation
            graph.d3ReheatSimulation();
            
            temporaryLinkFormed = false;
            repulsionReduced = false;
            
            console.error('Failed to create link:', result.error || 'Unknown error');
            alert('Failed to create link: ' + (result.error || 'Unknown error'));
          }
        })
        .catch(err => {
          // Restore normal forces immediately if there was an error
          graph.d3Force('charge').strength(originalChargeStrength);
          graph.d3Force('collide').radius(node => 15 + (node.val || 1) * 5);
          
          // Restore link force
          const linkForce = graph.d3Force('link');
          if (linkForce) {
            linkForce.strength(link => link.strength * 2 || 1);
          }
          
          // Restore center force
          graph.d3Force('center').strength(1);
          
          // Reheat the simulation
          graph.d3ReheatSimulation();
          
          temporaryLinkFormed = false;
          repulsionReduced = false;
          
          console.error('[API] Error creating link:', err);
          alert('Error creating link: ' + err);
        });
      } else {
        console.log('No nodes found within threshold distance');
        
        // Restore normal forces immediately if no link is being created
        graph.d3Force('charge').strength(originalChargeStrength);
        graph.d3Force('collide').radius(node => 15 + (node.val || 1) * 5);
        
        // Restore link force
        const linkForce = graph.d3Force('link');
        if (linkForce) {
          linkForce.strength(link => link.strength * 2 || 1);
        }
        
        // Restore center force
        graph.d3Force('center').strength(1);
        
        // Reheat the simulation
        graph.d3ReheatSimulation();
        
        temporaryLinkFormed = false;
        repulsionReduced = false;
      }
      
      // Reset potential link target
      potentialLinkTarget = null;
      updateHighlight();
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
function loadData(preservePositions = false) {
  document.getElementById('loading-indicator').style.display = 'block';
  console.log('Fetching graph data...');
  
  // Store current node positions if preserving positions
  const currentPositions = {};
  if (preservePositions && graphData && graphData.nodes) {
    graphData.nodes.forEach(node => {
      if (node.x !== undefined && node.y !== undefined && node.z !== undefined) {
        currentPositions[node.id] = {
          x: node.x,
          y: node.y,
          z: node.z,
          vx: node.vx || 0,
          vy: node.vy || 0,
          vz: node.vz || 0
        };
      }
    });
    console.log('Stored positions for', Object.keys(currentPositions).length, 'nodes');
  }
  
  fetch('/api/graph/memory')
    .then(response => {
      console.log('Response received:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Data received:', data);
      
      // Process the data
      processGraphData(data, currentPositions, preservePositions);
      
      // Update the graph with a cool-down factor to reduce movement
      console.log('Updating graph with data:', graphData);
      
      // Apply cool-down factor if preserving positions
      if (preservePositions) {
        // Reduce the simulation intensity to minimize node movement
        graph.d3Force('charge').strength(originalChargeStrength * 0.3); // Reduce charge force
        
        // Apply the updated data
        graph.graphData(graphData);
        
        // Gradually restore normal forces after a short delay
        setTimeout(() => {
          graph.d3Force('charge').strength(originalChargeStrength);
          graph.d3ReheatSimulation();
        }, 1000);
      } else {
        // Normal update for initial load
        graph.graphData(graphData);
      }
      
      // Hide loading indicator
      document.getElementById('loading-indicator').style.display = 'none';
    })
    .catch(error => {
      console.error('Error loading graph data:', error);
      document.getElementById('loading-indicator').textContent = 'Error loading data. Please try again.';
    });
}

// Process the graph data
function processGraphData(data, currentPositions = {}, preservePositions = false) {
  // For memory-centric: nodes are memories, links are edges
  graphData = {
    nodes: data.nodes.map(node => {
      // Start with the basic node data
      const processedNode = {
        ...node,
        group: node.domain, // Use domain as group for clustering and coloring
        val: (node.tags && node.tags.length) ? Math.min(5, node.tags.length) : 1 // Node size by tag count
      };
      
      // If preserving positions and we have stored position for this node, use it
      if (preservePositions && currentPositions[node.id]) {
        const pos = currentPositions[node.id];
        processedNode.x = pos.x;
        processedNode.y = pos.y;
        processedNode.z = pos.z;
        processedNode.vx = pos.vx * 0.1; // Dampen velocity to reduce movement
        processedNode.vy = pos.vy * 0.1;
        processedNode.vz = pos.vz * 0.1;
        processedNode.fx = pos.x; // Temporarily fix position
        processedNode.fy = pos.y;
        processedNode.fz = pos.z;
        
        // Schedule releasing the fixed position after a short delay
        setTimeout(() => {
          if (processedNode.fx !== undefined) {
            processedNode.fx = undefined;
            processedNode.fy = undefined;
            processedNode.fz = undefined;
          }
        }, 1500);
      } else {
        // For new nodes or initial load, randomize position
        processedNode.x = (Math.random() - 0.5) * 400;
        processedNode.y = (Math.random() - 0.5) * 400;
        processedNode.z = (Math.random() - 0.5) * 400;
      }
      
      return processedNode;
    }),
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
  // Highlight potential link target during drag
  if (potentialLinkTarget && node.id === potentialLinkTarget.id) {
    return '#00ffff'; // Cyan for potential link target
  }
  
  // Highlight node being dragged
  if (draggedNode && node.id === draggedNode.id) {
    return '#ffff00'; // Yellow for dragged node
  }
  
  // Highlight if selected for shift-click linking
  if (selectedNodes.some(n => n.id === node.id)) {
    return '#00ff00'; // Bright green for shift-click selection
  }
  
  // Legacy support for window._linkSelection
  if (window._linkSelection && window._linkSelection.includes(node)) {
    return '#00ff00'; // Bright green for selection
  }
  
  // Highlight if selected (persistent)
  if (selectedNode && node.id === selectedNode.id) {
    return '#3388ff'; // Blue for selected node
  }
  
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
    // If control is pressed and this link is highlighted, use a distinct color for deletion
    if (controlKeyPressed && hoverLink === link) {
      return '#ff00ff'; // Magenta for deletion
    }
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
  const copyButton = document.getElementById('copy-to-clipboard');

  // Set node ID (memory id)
  nodeId.textContent = `Memory ID: ${node.id}`;
  
  // Set up copy to clipboard functionality
  copyButton.onclick = function() {
    // Prepare content to copy (combine ID, tags, and content)
    const tagsText = node.tags && node.tags.length > 0 ? 
      `Tags: ${node.tags.join(', ')}` : 'Tags: None';
    
    const textToCopy = `${nodeId.textContent}\n${tagsText}\n\n${node.content}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Visual feedback that copy was successful
        const originalText = copyButton.textContent;
        copyButton.textContent = '✓';
        copyButton.style.color = '#00ff00';
        
        // Reset after a short delay
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.style.color = '';
        }, 1500);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy to clipboard');
      });
  };

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

  // Add tag input UI
  let tagInputDiv = document.getElementById('tag-input-div');
  if (!tagInputDiv) {
    tagInputDiv = document.createElement('div');
    tagInputDiv.id = 'tag-input-div';
    tagInputDiv.style.marginTop = '10px';
    nodeTags.parentNode.appendChild(tagInputDiv);
  }
  tagInputDiv.innerHTML = `
    <input id="tag-input" type="text" placeholder="Add tags (comma or space separated)" style="width: 70%; padding: 4px;"/>
    <button id="add-tag-btn" style="margin-left: 6px;">Add Tag(s)</button>
    <span id="tag-add-status" style="margin-left: 8px; color: #0f0;"></span>
  `;
  document.getElementById('add-tag-btn').onclick = function () {
    const input = document.getElementById('tag-input').value.trim();
    if (!input) return;
    // Split by comma or space, filter out empty
    const tags = input.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) return;
    fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: node.id, tags })
    })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        document.getElementById('tag-add-status').textContent = 'Tags added!';
        setTimeout(() => { document.getElementById('tag-add-status').textContent = ''; }, 1200);
        loadData(true);
      } else {
        document.getElementById('tag-add-status').textContent = 'Failed to add tags';
      }
    })
    .catch(() => {
      document.getElementById('tag-add-status').textContent = 'Error adding tags';
    });
  };

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
  // Create a temporary virtual link between dragged node and potential target
  let virtualLinks = [];
  if (draggedNode && potentialLinkTarget) {
    virtualLinks = [{
      source: draggedNode,
      target: potentialLinkTarget,
      type: 'potential_link',
      color: '#00ffff', // Cyan
      strength: 0.7
    }];
  }
  
  // Update the graph visualization
  graph
    .nodeColor(graph.nodeColor())
    .linkWidth(link => {
      if (link.type === 'potential_link') return 4; // Thicker for potential links
      return highlightLinks.has(link) ? 5 : 2.5;
    })
    .linkDirectionalParticles(link => {
      if (link.type === 'potential_link') return 8; // More particles for potential links
      return Math.round((link.strength || 0.5) * 8);
    })
    .linkColor(link => {
      if (link.type === 'potential_link') return link.color;
      return getLinkColor(link);
    });
  
  // Add or remove the virtual link
  const currentLinks = graph.graphData().links;
  const virtualLinkExists = currentLinks.some(link => link.type === 'potential_link');
  
  if (virtualLinks.length > 0 && !virtualLinkExists) {
    // Add virtual link
    graph.graphData({
      nodes: graph.graphData().nodes,
      links: [...currentLinks, ...virtualLinks]
    });
  } else if (virtualLinks.length === 0 && virtualLinkExists) {
    // Remove virtual link
    graph.graphData({
      nodes: graph.graphData().nodes,
      links: currentLinks.filter(link => link.type !== 'potential_link')
    });
  }
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

// Function to check if the database file has been modified
function checkDatabaseStatus() {
  fetch('/api/db-status')
    .then(response => response.json())
    .then(data => {
      if (data.changed) {
        console.log('Database file has been modified, refreshing data...');
        // Use loadData(true) to preserve node positions
        loadData(true);
        
        // Show the update indicator
        const indicator = document.getElementById('db-update-indicator');
        indicator.style.display = 'block';
        
        // Add the pulse animation
        indicator.classList.add('pulse-animation');
        
        // Update the timestamp
        const timestamp = new Date().toLocaleTimeString();
        indicator.textContent = `DB Updated at ${timestamp}`;
        
        // Remove the animation class after it completes
        setTimeout(() => {
          indicator.classList.remove('pulse-animation');
          
          // Keep the indicator visible
          indicator.style.display = 'block';
        }, 3000);
      }
    })
    .catch(error => {
      console.error('Error checking database status:', error);
    });
}

// Start the database file watcher
function startDatabaseWatcher() {
  if (dbWatcherInterval) {
    clearInterval(dbWatcherInterval);
  }
  
  // Check for database changes every 5 seconds
  dbWatcherInterval = setInterval(checkDatabaseStatus, 5000);
  dbWatcherActive = true;
  
  // Update the toggle button
  const toggleButton = document.getElementById('toggle-watcher');
  if (toggleButton) {
    toggleButton.textContent = 'DB Watcher: ON';
    toggleButton.style.backgroundColor = '#2a9852'; // Green background
  }
  
  console.log('Database file watcher started');
}

// Stop the database file watcher
function stopDatabaseWatcher() {
  if (dbWatcherInterval) {
    clearInterval(dbWatcherInterval);
    dbWatcherInterval = null;
  }
  
  dbWatcherActive = false;
  
  // Update the toggle button
  const toggleButton = document.getElementById('toggle-watcher');
  if (toggleButton) {
    toggleButton.textContent = 'DB Watcher: OFF';
    toggleButton.style.backgroundColor = '#982a2a'; // Red background
  }
  
  console.log('Database file watcher stopped');
}

// Toggle the database file watcher
function toggleDatabaseWatcher() {
  if (dbWatcherActive) {
    stopDatabaseWatcher();
  } else {
    startDatabaseWatcher();
  }
}

// Show custom confirmation dialog with Yes/No buttons
function showCustomConfirmDialog(message, yesCallback) {
  const dialog = document.getElementById('custom-confirm-dialog');
  const messageEl = document.getElementById('confirm-message');
  const yesBtn = document.getElementById('confirm-yes-btn');
  const noBtn = document.getElementById('confirm-no-btn');
  
  // Set the message
  messageEl.textContent = message;
  
  // Set up event handlers
  const closeDialog = () => {
    dialog.style.display = 'none';
    yesBtn.removeEventListener('click', handleYes);
    noBtn.removeEventListener('click', handleNo);
  };
  
  const handleYes = () => {
    closeDialog();
    if (yesCallback && typeof yesCallback === 'function') {
      yesCallback();
    }
  };
  
  const handleNo = () => {
    closeDialog();
  };
  
  yesBtn.addEventListener('click', handleYes);
  noBtn.addEventListener('click', handleNo);
  
  // Show the dialog
  dialog.style.display = 'block';
}
