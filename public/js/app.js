// Global variables
let graph;
let bloomPass;
let bloomEnabled = true;
let showSummariesOnNodes = true; // Track if summaries should be shown on nodes (ON by default)
let showEdgeLabels = false; // Track if edge labels should be shown (OFF by default)
let zoomOnSelect = false; // Track if camera should zoom to selected node (OFF by default)
let showHelpCard = true; // Track if help card should be shown (ON by default)
let highlightNodes = new Set(); // Combined set of highlighted nodes
let highlightLinks = new Set(); // Combined set of highlighted links
let selectedHighlightNodes = new Set(); // Only nodes highlighted due to selection
let selectedHighlightLinks = new Set(); // Only links highlighted due to selection
let hoverHighlightNodes = new Set(); // Only nodes highlighted due to hover
let hoverHighlightLinks = new Set(); // Only links highlighted due to hover
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
  // Add a UI hint for linking - positioned in the upper left
  const hint = document.createElement('div');
  hint.id = 'link-hint';
  hint.style.position = 'fixed';
  hint.style.top = '10px';
  hint.style.left = '10px';
  hint.style.background = 'rgba(0,0,0,0.7)';
  hint.style.color = '#fff';
  hint.style.padding = '12px 16px';
  hint.style.borderRadius = '6px';
  hint.style.zIndex = 999; // Lower z-index than controls
  hint.style.fontSize = '14px';
  hint.style.lineHeight = '1.4';
  hint.style.maxWidth = '400px';
  hint.style.display = 'block'; // Ensure it's visible by default
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
  
  // Add domain legend container
  const domainLegend = document.createElement('div');
  domainLegend.id = 'domain-legend';
  domainLegend.style.position = 'fixed';
  domainLegend.style.bottom = '10px';
  domainLegend.style.right = '10px';
  domainLegend.style.background = 'rgba(0,0,0,0.7)';
  domainLegend.style.color = '#fff';
  domainLegend.style.padding = '12px 16px';
  domainLegend.style.borderRadius = '6px';
  domainLegend.style.zIndex = 999;
  domainLegend.style.fontSize = '14px';
  domainLegend.style.lineHeight = '1.6';
  domainLegend.style.maxWidth = '300px';
  domainLegend.style.maxHeight = '40vh'; // Reduced from 60vh to be more compact
  domainLegend.style.overflowY = 'auto';
  domainLegend.innerHTML = '<strong>Domain Colors:</strong><br><div id="domain-colors-list"></div>';
  document.body.appendChild(domainLegend);

  initGraph();
  loadData();
  
  // Get the original controls container
  const originalControls = document.getElementById('controls');
  
  // Remove any existing styles or contents
  originalControls.innerHTML = '';
  
  // Make sure the original controls container is positioned in the lower left
  originalControls.style.position = 'fixed';
  originalControls.style.bottom = '10px';
  originalControls.style.left = '10px';
  originalControls.style.zIndex = 1000;
  
  // Create a new controls container with proper vertical layout that sizes to content
  const controlsWrapper = document.createElement('div');
  controlsWrapper.id = 'controls-wrapper';
  controlsWrapper.style.display = 'flex';
  controlsWrapper.style.flexDirection = 'column';
  controlsWrapper.style.gap = '6px'; // Slightly reduced gap for tighter layout
  controlsWrapper.style.zIndex = 1001; // Higher z-index than the hint
  controlsWrapper.style.width = '200px'; // Reduced width for vertical layout
  controlsWrapper.style.padding = '10px';
  controlsWrapper.style.backgroundColor = 'rgba(0,0,0,0.4)'; // Semi-transparent background
  controlsWrapper.style.borderRadius = '6px';
  controlsWrapper.style.boxSizing = 'border-box';
  controlsWrapper.style.marginBottom = '0'; // Ensure it's at the bottom edge
  
  // Add the new wrapper to the original controls
  originalControls.appendChild(controlsWrapper);
  
  // Use the wrapper for all controls
  const controls = controlsWrapper;
  
  // Unified button styling function
  const styleButton = (button, isOn) => {
    button.style.padding = '8px 12px';
    button.style.borderRadius = '4px';
    button.style.border = 'none';
    button.style.width = '100%';
    button.style.textAlign = 'left';
    button.style.cursor = 'pointer';
    button.style.fontWeight = '500';
    button.style.backgroundColor = isOn ? '#3388ff' : '#525252'; // Blue for on, gray for off
    button.style.color = 'white';
  };
  
  // Create a new refresh button
  const refreshBtn = document.createElement('button');
  refreshBtn.id = 'refresh-btn';
  refreshBtn.textContent = 'Refresh Data';
  styleButton(refreshBtn, true);
  refreshBtn.addEventListener('click', loadData);
  controls.appendChild(refreshBtn);
  
  // Create a new toggle button for bloom effect
  const bloomToggle = document.createElement('button');
  bloomToggle.id = 'toggle-bloom';
  bloomToggle.textContent = 'Bloom Effect: ON';
  styleButton(bloomToggle, true);
  bloomToggle.addEventListener('click', toggleBloomEffect);
  controls.appendChild(bloomToggle);
  
  // Add a toggle button for database file watching
  const watcherToggle = document.createElement('button');
  watcherToggle.id = 'toggle-watcher';
  watcherToggle.textContent = 'DB Watcher: ON';
  styleButton(watcherToggle, true);
  watcherToggle.addEventListener('click', toggleDatabaseWatcher);
  controls.appendChild(watcherToggle);
  
  // Add a toggle button for showing summaries on nodes
  const summariesToggle = document.createElement('button');
  summariesToggle.id = 'toggle-summaries';
  summariesToggle.textContent = 'Node Summaries: ON';
  styleButton(summariesToggle, true);  // ON by default
  summariesToggle.addEventListener('click', toggleSummariesOnNodes);
  controls.appendChild(summariesToggle);
  
  // Add a toggle button for showing edge labels
  const edgeLabelsToggle = document.createElement('button');
  edgeLabelsToggle.id = 'toggle-edge-labels';
  edgeLabelsToggle.textContent = 'Edge Labels: OFF';
  styleButton(edgeLabelsToggle, false);  // OFF by default
  edgeLabelsToggle.addEventListener('click', toggleEdgeLabels);
  controls.appendChild(edgeLabelsToggle);
  
  // Add a toggle button for domain legend
  const domainLegendToggle = document.createElement('button');
  domainLegendToggle.id = 'toggle-domain-legend';
  domainLegendToggle.textContent = 'Domain Legend: ON';
  styleButton(domainLegendToggle, true);
  domainLegendToggle.addEventListener('click', toggleDomainLegend);
  controls.appendChild(domainLegendToggle);
  
  // Add a toggle button for zoom on select
  const zoomToggle = document.createElement('button');
  zoomToggle.id = 'toggle-zoom';
  zoomToggle.textContent = 'Zoom on Select: OFF';
  styleButton(zoomToggle, false);  // OFF by default
  zoomToggle.addEventListener('click', toggleZoomOnSelect);
  controls.appendChild(zoomToggle);
  
  // Add a toggle button for the help card
  const helpCardToggle = document.createElement('button');
  helpCardToggle.id = 'toggle-help-card';
  helpCardToggle.textContent = 'Help Card: ON';
  styleButton(helpCardToggle, true);  // ON by default
  helpCardToggle.addEventListener('click', toggleHelpCard);
  controls.appendChild(helpCardToggle);
  
  // Add a database update indicator
  const dbUpdateIndicator = document.createElement('div');
  dbUpdateIndicator.id = 'db-update-indicator';
  dbUpdateIndicator.textContent = 'DB Updated';
  dbUpdateIndicator.style.backgroundColor = 'rgba(51, 136, 255, 0.7)'; // Match blue toggle color
  dbUpdateIndicator.style.color = 'white';
  dbUpdateIndicator.style.padding = '8px 12px';
  dbUpdateIndicator.style.borderRadius = '4px';
  dbUpdateIndicator.style.marginTop = '12px';
  dbUpdateIndicator.style.marginBottom = '4px'; // Add bottom margin
  dbUpdateIndicator.style.textAlign = 'center';
  dbUpdateIndicator.style.fontWeight = '500';
  dbUpdateIndicator.style.width = '100%'; // Match width of buttons
  dbUpdateIndicator.style.boxSizing = 'border-box'; // Include padding in width calculation
  dbUpdateIndicator.style.display = 'none'; // Hidden by default
  controls.appendChild(dbUpdateIndicator);
  
  // Add CSS for the blinking effect
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { background-color: rgba(51, 136, 255, 0.7); }
      50% { background-color: rgba(51, 136, 255, 1); }
      100% { background-color: rgba(51, 136, 255, 0.7); }
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
      // Clear hover highlights but keep selection highlights
      hoverHighlightNodes.clear();
      hoverHighlightLinks.clear();
      updateCombinedHighlights();
      updateHighlight();
    }
  });
  
  window.addEventListener('keyup', (event) => {
    if (event.key === 'Control') {
      controlKeyPressed = false;
      // Clear hover highlights but keep selection highlights
      hoverHighlightNodes.clear();
      hoverHighlightLinks.clear();
      updateCombinedHighlights();
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
    // Clear hover highlights but keep selection highlights
    hoverHighlightNodes.clear();
    hoverHighlightLinks.clear();
    updateCombinedHighlights();
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
    .nodeThreeObject(node => {
      // Only create text sprites for summaries when enabled
      // Return null for the sphere to use the default rendering
      if (showSummariesOnNodes && node.content_summary && typeof SpriteText !== 'undefined') {
        // Format summary to show approximately two lines of text
        // First, truncate to a reasonable length
        let summaryText = node.content_summary;
        if (summaryText.length > 80) {
          summaryText = summaryText.substring(0, 80) + '...';
        }
        
        // Insert a line break around the middle to create two lines
        const midPoint = Math.floor(summaryText.length / 2);
        // Find a space near the middle to break at
        let breakPoint = summaryText.indexOf(' ', midPoint - 10);
        if (breakPoint === -1 || breakPoint > midPoint + 10) {
          // If no suitable space found, just break at the midpoint
          breakPoint = midPoint;
        }
        
        // Insert line break
        summaryText = summaryText.substring(0, breakPoint) + '\n' + summaryText.substring(breakPoint + 1);
        
        // Create a group to hold the sprite
        const group = new THREE.Group();
        
        const sprite = new SpriteText(summaryText);
        sprite.color = '#ffffff';
        sprite.textHeight = 2.5;
        sprite.backgroundColor = 'rgba(0,0,0,0.8)'; // Increased opacity for better contrast
        sprite.padding = 3; // Increased padding
        // Add a subtle text shadow effect for better readability
        if (sprite.material) {
          sprite.material.userData = { 
            outlineWidth: 0.1,
            outlineColor: '#000000'
          };
        }
        
        // Position the sprite in the group
        // We'll use the group to position it relative to the camera
        sprite.position.set(0, 0, 0);
        group.add(sprite);
        
        // Add a special update function to the group to make it face the camera
        // and position it slightly in front of the node
        group.onBeforeRender = (renderer, scene, camera) => {
          // Get the direction vector from the node to the camera
          const nodePos = new THREE.Vector3(node.x, node.y, node.z);
          const cameraPos = new THREE.Vector3().copy(camera.position);
          const direction = new THREE.Vector3().subVectors(cameraPos, nodePos).normalize();
          
          // Position the group in front of the node (half radius + 5%)
          // Node radius is determined by nodeRelSize (12) and node.val
          const nodeRadius = 12 * (node.val || 1);
          const offset = nodeRadius * 0.55; // Half radius + 5%
          
          // Set the group position
          group.position.copy(direction).multiplyScalar(offset);
          
          // Position the text above the node in local space
          sprite.position.y = nodeRadius * 0.2; // Slight upward offset
        };
        
        return group;
      }
      
      // Return null to use the default node rendering
      return null;
    })
    .nodeThreeObjectExtend(true) // Extend default nodes with our custom objects
    // Make links much more visible
    .linkWidth(link => highlightLinks.has(link) ? 5 : 2.5)
    .linkDirectionalParticles(link => Math.round((link.strength || 0.5) * 8))
    .linkDirectionalParticleWidth(4)
    .linkDirectionalParticleSpeed(d => d.strength * 0.00167) // Particle speed reduced by 6x (0.01/6)
    .linkColor(link => getLinkColor(link))
    // Use link strength for link opacity and width
    .linkOpacity(1.0) // Increased opacity
    .linkCurvature(0) // No curvature, straight links
    .linkLabel(link => `${link.type} (${link.strength.toFixed(2)})`) // Add label for links
    .linkThreeObjectExtend(true)
    .linkThreeObject(link => {
      // Create text sprite for link labels only if edge labels are enabled
      if (showEdgeLabels && typeof SpriteText !== 'undefined') {
        const sprite = new SpriteText(link.type);
        sprite.color = 'white'; // Brighter color
        sprite.textHeight = 4.0; // Increased text size
        sprite.backgroundColor = 'rgba(0,0,0,0.7)'; // More opaque background for better contrast
        sprite.padding = 3; // Increased padding for better readability
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
      if ((node && hoverNode === node)) return;
      
      // If control key is pressed, we're in link deletion mode, so don't highlight nodes
      if (controlKeyPressed) {
        hoverNode = node || null;
        return;
      }
      
      // Always clear hover highlights
      hoverHighlightNodes.clear();
      hoverHighlightLinks.clear();
      
      if (node) {
        // Add hover node to hover highlight set
        hoverHighlightNodes.add(node);
        
        // Add connected nodes and links to hover highlight set
        graphData.links.forEach(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          if (sourceId === node.id || targetId === node.id) {
            hoverHighlightLinks.add(link);
            hoverHighlightNodes.add(sourceId === node.id ? link.target : link.source);
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
      
      // Update combined highlight sets
      updateCombinedHighlights();
      // Update the visualization
      updateHighlight();
    })
    .onLinkHover(link => {
      // Only highlight links when Control key is pressed
      if (controlKeyPressed) {
        // Clear hover link highlights first
        hoverHighlightLinks.clear();
        
        // Add the hovered link to hover highlights
        if (link) {
          hoverHighlightLinks.add(link);
        }
        
        hoverLink = link || null;
        
        // Update combined highlights and visualization
        updateCombinedHighlights();
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
                  // Clear selection highlights
                  selectedHighlightNodes.clear();
                  selectedHighlightLinks.clear();
                  updateCombinedHighlights();
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
        updateCombinedHighlights();
        updateHighlight();
      } else {
        // Regular click behavior (non-shift)
        if (selectedNode && node.id === selectedNode.id) {
          // Deselect if already selected
          selectedNode = null;
          hideNodeInfo();
          // Clear all selection highlights
          selectedHighlightNodes.clear();
          selectedHighlightLinks.clear();
        } else {
          // Clear previous selection highlights if selecting a new node
          selectedHighlightNodes.clear();
          selectedHighlightLinks.clear();
          
          selectedNode = node;
          
          // Add the selected node to selection highlights
          selectedHighlightNodes.add(node);
          
          // Add connected nodes and links to selection highlights
          graphData.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            
            if (sourceId === node.id || targetId === node.id) {
              selectedHighlightLinks.add(link);
              selectedHighlightNodes.add(sourceId === node.id ? link.target : link.source);
            }
          });
          
          showNodeInfo(node);
        }
        
        // Update the combined highlight sets
        updateCombinedHighlights();
        updateHighlight();

        // Center view on node only if zoom on select is enabled
        if (zoomOnSelect) {
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
      bloomPass.strength = 0.8;  // Reduced from 1.5 to reduce overexposure
      bloomPass.radius = 0.8;    // Slightly reduced from 1
      bloomPass.threshold = 0.2; // Increased from 0.1 to reduce bloom on darker areas
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
      
      // Update the domain color legend after data is loaded
      updateDomainColorLegend();
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
  // Use content_summary if available, otherwise fall back to truncated content
  const displayText = node.content_summary || 
    (node.content.length > 80 ? node.content.substring(0, 80) + '...' : node.content);
  return `Memory: ${displayText}\nTags: ${node.tags ? node.tags.join(', ') : ''}`;
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
  
  // Check if node is highlighted (this includes both hover and selection highlights)
  if (highlightNodes.has(node)) {
    // If this is the selected node, use a deeper tone of the hover color (like the hovered node)
    if (selectedNode && node.id === selectedNode.id) {
      return '#ff5500'; // Use the deeper orange tone that the hovered node uses
    }
    // For hovered node use deeper tone, for related nodes use lighter tone
    return node === hoverNode ? '#ff5500' : '#ff8800';
  }
  
  // Use domain for color with consistent mapping
  if (node.group) {
    // Define a colorPalette (only once) for all domains
    // Use a global map to ensure consistent colors across updates
    if (!window.domainColors) {
      window.domainColors = new Map();
      window.colorIndex = 0;
      
      // Save the color palette as a global variable so we only define it once
      window.domainColorPalette = [
        'rgba(66, 133, 244, 0.85)',  // Google Blue
        'rgba(219, 68, 55, 0.85)',   // Google Red
        'rgba(244, 180, 0, 0.85)',   // Google Yellow
        'rgba(15, 157, 88, 0.85)',   // Google Green
        'rgba(171, 71, 188, 0.85)',  // Purple
        'rgba(255, 87, 34, 0.85)',   // Deep Orange
        'rgba(3, 169, 244, 0.85)',   // Light Blue
        'rgba(0, 150, 136, 0.85)',   // Teal
        'rgba(255, 152, 0, 0.85)',   // Orange
        'rgba(156, 39, 176, 0.85)',  // Deep Purple
        'rgba(233, 30, 99, 0.85)',   // Pink
        'rgba(33, 150, 243, 0.85)',  // Blue
        'rgba(76, 175, 80, 0.85)',   // Green
        'rgba(255, 193, 7, 0.85)',   // Amber
        'rgba(121, 85, 72, 0.85)',   // Brown
        'rgba(96, 125, 139, 0.85)'   // Blue Grey
      ];
    }
    
    // Get or assign color for this domain
    if (!window.domainColors.has(node.group)) {
      // Use modulo to cycle through colors if we have more domains than colors
      const colorIdx = window.colorIndex % window.domainColorPalette.length;
      window.domainColors.set(node.group, window.domainColorPalette[colorIdx]);
      window.colorIndex++;
      
      // Log assigned color for debugging
      console.log(`Assigned color ${window.domainColorPalette[colorIdx]} to domain: ${node.group}`);
      
      // Update the domain color legend whenever a new domain is added
      updateDomainColorLegend();
    }
    
    return window.domainColors.get(node.group);
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
  
  // Add summary section if available
  let summaryElement = document.getElementById('node-summary');
  if (summaryElement) {
    summaryElement.remove(); // Remove existing summary if present
  }
  
  if (node.content_summary) {
    summaryElement = document.createElement('div');
    summaryElement.id = 'node-summary';
    summaryElement.className = 'summary';
    summaryElement.textContent = node.content_summary;
    // Insert summary before full content
    nodeContent.parentNode.insertBefore(summaryElement, nodeContent);
  }
  
  // Set up copy to clipboard functionality
  copyButton.onclick = function() {
    // Prepare content to copy (combine ID, tags, summary, and content)
    const tagsText = node.tags && node.tags.length > 0 ? 
      `Tags: ${node.tags.join(', ')}` : 'Tags: None';
    
    const summaryText = node.content_summary ? 
      `Summary: ${node.content_summary}\n\n` : '';
    
    const textToCopy = `${nodeId.textContent}\n${tagsText}\n\n${summaryText}${node.content}`;
    
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

// Function to update combined highlight sets
function updateCombinedHighlights() {
  // Clear combined sets
  highlightNodes.clear();
  highlightLinks.clear();
  
  // Add all selected highlights first
  selectedHighlightNodes.forEach(node => highlightNodes.add(node));
  selectedHighlightLinks.forEach(link => highlightLinks.add(link));
  
  // Then add hover highlights
  hoverHighlightNodes.forEach(node => highlightNodes.add(node));
  hoverHighlightLinks.forEach(link => highlightLinks.add(link));
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
      bloomPass.strength = 0.8;  // Use the reduced strength value
      bloomPass.radius = 0.8;    // Use the reduced radius value
      bloomPass.threshold = 0.2; // Use the increased threshold value
      console.log('Bloom effect enabled with reduced intensity');
    } else {
      bloomPass.strength = 0;
      console.log('Bloom effect disabled');
    }
    
    // Update the button appearance with new color scheme
    const toggleButton = document.getElementById('toggle-bloom');
    if (toggleButton) {
      toggleButton.textContent = `Bloom Effect: ${bloomEnabled ? 'ON' : 'OFF'}`;
      toggleButton.style.backgroundColor = bloomEnabled ? '#3388ff' : '#525252'; // Blue when on, gray when off
    }
  } catch (error) {
    console.error('Error toggling bloom effect:', error);
  }
}

// Toggle summaries on nodes
function toggleSummariesOnNodes() {
  showSummariesOnNodes = !showSummariesOnNodes;
  
  // Update the button appearance
  const toggleButton = document.getElementById('toggle-summaries');
  if (toggleButton) {
    toggleButton.textContent = `Node Summaries: ${showSummariesOnNodes ? 'ON' : 'OFF'}`;
    toggleButton.style.backgroundColor = showSummariesOnNodes ? '#3388ff' : '#525252'; // Blue when on, gray when off
  }
  
  console.log(`Summaries on nodes ${showSummariesOnNodes ? 'enabled' : 'disabled'}`);
  
  // Update the graph to reflect the new setting
  // This forces a re-render of all nodes
  graph.refresh();
}

// Toggle edge labels
function toggleEdgeLabels() {
  showEdgeLabels = !showEdgeLabels;
  
  // Update the button appearance
  const toggleButton = document.getElementById('toggle-edge-labels');
  if (toggleButton) {
    toggleButton.textContent = `Edge Labels: ${showEdgeLabels ? 'ON' : 'OFF'}`;
    toggleButton.style.backgroundColor = showEdgeLabels ? '#3388ff' : '#525252'; // Blue when on, gray when off
  }
  
  console.log(`Edge labels ${showEdgeLabels ? 'enabled' : 'disabled'}`);
  
  // Update the graph to reflect the new setting
  graph.refresh();
}

// Toggle domain legend visibility
function toggleDomainLegend() {
  const domainLegend = document.getElementById('domain-legend');
  const isVisible = domainLegend.style.display !== 'none';
  
  // Toggle visibility
  domainLegend.style.display = isVisible ? 'none' : 'block';
  
  // Update the button appearance
  const toggleButton = document.getElementById('toggle-domain-legend');
  if (toggleButton) {
    toggleButton.textContent = `Domain Legend: ${isVisible ? 'OFF' : 'ON'}`;
    toggleButton.style.backgroundColor = isVisible ? '#525252' : '#3388ff'; // Blue when on, gray when off
  }
  
  console.log(`Domain legend ${isVisible ? 'hidden' : 'shown'}`);
}

// Toggle zoom on select behavior
function toggleZoomOnSelect() {
  zoomOnSelect = !zoomOnSelect;
  
  // Update the button appearance
  const toggleButton = document.getElementById('toggle-zoom');
  if (toggleButton) {
    toggleButton.textContent = `Zoom on Select: ${zoomOnSelect ? 'ON' : 'OFF'}`;
    toggleButton.style.backgroundColor = zoomOnSelect ? '#3388ff' : '#525252'; // Blue when on, gray when off
  }
  
  console.log(`Zoom on select ${zoomOnSelect ? 'enabled' : 'disabled'}`);
}

// Toggle help card visibility
function toggleHelpCard() {
  showHelpCard = !showHelpCard;
  
  // Get the help card element
  const helpCard = document.getElementById('link-hint');
  
  // Toggle visibility
  if (helpCard) {
    helpCard.style.display = showHelpCard ? 'block' : 'none';
  }
  
  // Update the button appearance
  const toggleButton = document.getElementById('toggle-help-card');
  if (toggleButton) {
    toggleButton.textContent = `Help Card: ${showHelpCard ? 'ON' : 'OFF'}`;
    toggleButton.style.backgroundColor = showHelpCard ? '#3388ff' : '#525252'; // Blue when on, gray when off
  }
  
  console.log(`Help card ${showHelpCard ? 'shown' : 'hidden'}`);
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
    toggleButton.style.backgroundColor = '#3388ff'; // Blue background
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
    toggleButton.style.backgroundColor = '#525252'; // Gray background
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

// Update the domain color legend in the UI
function updateDomainColorLegend() {
  const legendContainer = document.getElementById('domain-colors-list');
  if (!legendContainer) return;
  
  // Clear existing legend items
  legendContainer.innerHTML = '';
  
  // No domains yet
  if (!window.domainColors || window.domainColors.size === 0) {
    legendContainer.innerHTML = '<em>No domains loaded yet</em>';
    return;
  }
  
  // Sort domains alphabetically for consistent display
  const domains = Array.from(window.domainColors.keys()).sort();
  
  // Create a legend item for each domain
  domains.forEach(domain => {
    const color = window.domainColors.get(domain);
    const legendItem = document.createElement('div');
    legendItem.style.marginBottom = '6px';
    legendItem.style.display = 'flex';
    legendItem.style.alignItems = 'center';
    
    // Create color swatch
    const colorSwatch = document.createElement('span');
    colorSwatch.style.display = 'inline-block';
    colorSwatch.style.width = '12px';
    colorSwatch.style.height = '12px';
    colorSwatch.style.backgroundColor = color;
    colorSwatch.style.marginRight = '8px';
    colorSwatch.style.borderRadius = '3px';
    
    // Create domain name label
    const domainLabel = document.createElement('span');
    domainLabel.textContent = domain;
    domainLabel.style.flexGrow = '1';
    domainLabel.style.whiteSpace = 'nowrap';
    domainLabel.style.overflow = 'hidden';
    domainLabel.style.textOverflow = 'ellipsis';
    
    // Add elements to legend item
    legendItem.appendChild(colorSwatch);
    legendItem.appendChild(domainLabel);
    legendContainer.appendChild(legendItem);
  });
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
