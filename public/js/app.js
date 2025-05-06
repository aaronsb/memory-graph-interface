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

// Multi-node selection variables (shift+click)
let multiSelectActive = false; // Whether multi-select mode is active
let multiSelectedNodes = []; // Array of nodes selected with shift+click
let multiSelectHighlightNodes = new Set(); // Set of nodes highlighted due to multi-selection

// Context menu variables
let contextMenuActive = false;
let contextMenuNode = null;
let contextMenuLink = null;
let contextMenuPosition = { x: 0, y: 0 };

// Link creation mode state
let linkCreationMode = false;
let linkSourceNode = null;

// Domain management
let allDomains = []; // Array to store all available domains
let currentDomainPage = 0; // Current page in domain pagination
const DOMAINS_PER_PAGE = 10; // Number of domains to show per page

// Link type management
let allLinkTypes = []; // Array to store all available link types
let currentLinkTypePage = 0; // Current page in link type pagination
const LINK_TYPES_PER_PAGE = 10; // Number of link types to show per page
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
    • <span style="color:#00ff00">Alt-click</span> two nodes to create a link between them<br>
    • <span style="color:#ffff00">Drag</span> a node near another to auto-link them<br>
    • <span style="color:#55dd55">Shift-click</span> nodes to add to multi-select panel<br>
    • <span style="color:#3388ff">Click</span> a node to select it and view details<br>
    • <span style="color:#ff5500">Hover</span> over nodes to see connections<br>
    • <span style="color:#ff00ff">Control-click</span> a link to delete it<br>
    • <span style="color:#ff00ff">Control-click</span> a node to delete it and its connections<br>
    • <span style="color:#ffffff">Right-click</span> for context menu on nodes and links
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
    
    // If in link creation mode, exit it when window loses focus
    if (linkCreationMode) {
      toggleLinkCreationMode();
    }
    
    // Hide context menu if it's open
    if (contextMenuActive) {
      hideContextMenu();
    }
  });
  
  // Add document-level event listeners for the context menu
  
  // Hide context menu on regular click outside the menu
  document.addEventListener('click', (event) => {
    if (contextMenuActive && !document.getElementById('context-menu').contains(event.target)) {
      hideContextMenu();
    }
  });
  
  // Hide context menu and cancel link creation on ESC key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      // Hide context menu if active
      if (contextMenuActive) {
        hideContextMenu();
      }
      
      // Cancel link creation mode if active
      if (linkCreationMode) {
        toggleLinkCreationMode();
      }
    }
  });
  
  // Prevent default right-click behavior only when needed
  document.addEventListener('contextmenu', (event) => {
    // Allow default context menu in input fields and other interactive elements
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.isContentEditable) {
      return true;
    }
    
    // If it's from the graph container, let the 3D graph's handler deal with it
    if (document.getElementById('graph-container').contains(event.target)) {
      return false; // Prevent default, our 3D graph will handle it
    }
    
    // For other parts of the app, prevent default but don't show our custom menu
    if (['context-menu', 'controls', 'info-panel'].some(id => 
        document.getElementById(id)?.contains(event.target))) {
      event.preventDefault();
      hideContextMenu();
      return false;
    }
    
    // Allow default browser context menu elsewhere
    return true;
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
    
    // Add right-click handling for context menu
    .onNodeRightClick((node, event) => {
      event.preventDefault();
      const { clientX, clientY } = event;
      showContextMenu(clientX, clientY, node, null);
      return false;
    })
    .onLinkRightClick((link, event) => {
      event.preventDefault();
      const { clientX, clientY } = event;
      showContextMenu(clientX, clientY, null, link);
      return false;
    })
    .onBackgroundRightClick((event) => {
      event.preventDefault();
      const { clientX, clientY } = event;
      showContextMenu(clientX, clientY);
      return false;
    })
    
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
        
        // No longer show info panel on hover - require explicit click instead
      } else {
        // Don't hide info panel on hover out - only hide on explicit deselection
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
      // Check if we're in link creation mode
      if (linkCreationMode && linkSourceNode) {
        // If the clicked node is not the source node
        if (node.id !== linkSourceNode.id) {
          // Create link between source node and this node
          handleCreateLink(linkSourceNode, node);
        } else {
          // Cancel link creation if source node is clicked again
          toggleLinkCreationMode();
        }
        return; // Exit early to prevent other click behaviors
      }
      
      // Check if control key is pressed for node deletion
      if (controlKeyPressed) {
        console.log('Control-click detected on node:', node.id);
        handleDeleteNode(node);
        return; // Exit early to prevent other click behaviors
      }
      
      // Check if alt key is pressed for multi-selection
      if (event.altKey) {
        console.log('Alt-click detected on node:', node.id);
        
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
          handleCreateLink(source, target);
          selectedNodes = []; // Clear the selection after creating the link
        }
        
        // Update highlight to show selected nodes
        updateCombinedHighlights();
        updateHighlight();
      } else if (event.shiftKey) {
        // Shift+click behavior for multi-node selection
        console.log('Shift-click detected on node:', node.id);
        handleMultiSelectNode(node);
      } else {
        // Regular click behavior (non-alt, non-shift)
        handleViewNodeDetails(node);
      }
    })
    .onLinkClick((link, event) => {
      // Only handle link clicks when Control key is pressed
      if (controlKeyPressed && hoverLink === link) {
        console.log('Control-click detected on link:', link);
        handleDeleteLink(link);
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
      
      // Fetch link types for context menu
      fetchLinkTypes()
        .then(types => {
          console.log(`Loaded ${types.length} link types for context menus`);
        })
        .catch(err => {
          console.warn('Error fetching link types, will use defaults:', err);
        });
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
  
  // Update selection panel position if it's visible
  if (multiSelectActive) {
    updateSelectionPanelPosition();
  }
}

// Hide the info panel
function hideNodeInfo() {
  document.getElementById('info-panel').style.display = 'none';
  
  // Update selection panel position if it's visible
  if (multiSelectActive) {
    updateSelectionPanelPosition();
  }
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

// Show context menu at the specified position
function showContextMenu(x, y, node = null, link = null) {
  const contextMenu = document.getElementById('context-menu');
  if (!contextMenu) return;
  
  // Clear previous menu items
  contextMenu.innerHTML = '';
  
  // Set context menu position variables
  contextMenuPosition = { x, y };
  contextMenuNode = node;
  contextMenuLink = link;
  contextMenuActive = true;
  
  // Position the menu near the cursor but ensure it stays within viewport
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  
  // Populate menu items based on context
  populateContextMenu(contextMenu, node, link);
  
  // Show the menu
  contextMenu.style.display = 'block';
  
  // Check if menu goes off-screen and adjust position if needed
  const menuRect = contextMenu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  if (menuRect.right > viewportWidth) {
    contextMenu.style.left = `${x - menuRect.width}px`;
  }
  
  if (menuRect.bottom > viewportHeight) {
    contextMenu.style.top = `${y - menuRect.height}px`;
  }
  
  console.log(`Context menu shown for ${node ? 'node ' + node.id : (link ? 'link' : 'background')}`);
}

// Create a domain submenu with pagination
function createDomainSubmenu(node) {
  // Always make sure we have the most up-to-date domain list
  collectAllDomains();
  
  // Create a submenu container
  const submenu = document.createElement('div');
  submenu.className = 'context-submenu';
  
  // Add a header showing current domain with its color
  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  
  // Get color for current domain
  let currentDomainColor = '#cccccc'; // Default gray if not found
  if (node.domain && window.domainColors && window.domainColors.has(node.domain)) {
    currentDomainColor = window.domainColors.get(node.domain);
  }
  
  // Create color square if node has a domain
  if (node.domain) {
    const colorSquare = document.createElement('span');
    colorSquare.style.display = 'inline-block';
    colorSquare.style.width = '12px';
    colorSquare.style.height = '12px';
    colorSquare.style.backgroundColor = currentDomainColor;
    colorSquare.style.marginRight = '8px';
    colorSquare.style.borderRadius = '3px';
    header.appendChild(colorSquare);
  }
  
  // Add text
  const headerText = document.createElement('span');
  headerText.textContent = `Current Domain: ${node.domain || 'None'}`;
  header.appendChild(headerText);
  
  submenu.appendChild(header);
  
  // Get current page domains
  const currentPageDomains = getCurrentPageDomains();
  
  // If no domains found
  if (currentPageDomains.length === 0) {
    const noDomainsItem = document.createElement('div');
    noDomainsItem.className = 'context-menu-item';
    noDomainsItem.textContent = 'No domains available';
    noDomainsItem.style.fontStyle = 'italic';
    noDomainsItem.style.opacity = '0.7';
    submenu.appendChild(noDomainsItem);
  } else {
    // Add each domain as a menu item
    currentPageDomains.forEach(domain => {
      const domainItem = document.createElement('div');
      domainItem.className = 'context-menu-item';
      domainItem.style.display = 'flex';
      domainItem.style.alignItems = 'center';
      
      // Get domain color from our palette
      let domainColor = '#cccccc'; // Default gray if not found
      if (window.domainColors && window.domainColors.has(domain)) {
        domainColor = window.domainColors.get(domain);
      } else if (window.domainColorPalette) {
        // Assign a color if it doesn't exist yet
        const colorIdx = window.colorIndex % window.domainColorPalette.length;
        domainColor = window.domainColorPalette[colorIdx];
        if (!window.domainColors) window.domainColors = new Map();
        window.domainColors.set(domain, domainColor);
        window.colorIndex = (window.colorIndex + 1) % window.domainColorPalette.length;
      }
      
      // Create color square
      const colorSquare = document.createElement('span');
      colorSquare.style.display = 'inline-block';
      colorSquare.style.width = '12px';
      colorSquare.style.height = '12px';
      colorSquare.style.backgroundColor = domainColor;
      colorSquare.style.marginRight = '8px';
      colorSquare.style.borderRadius = '3px';
      domainItem.appendChild(colorSquare);
      
      // Add domain text
      const domainText = document.createElement('span');
      domainText.style.flexGrow = '1';
      
      // Mark the current domain
      if (domain === node.domain) {
        domainText.innerHTML = `${domain} <span style="margin-left: 6px; color: #55ff55;">✓</span>`;
        domainText.style.fontWeight = 'bold';
      } else {
        domainText.textContent = domain;
      }
      domainItem.appendChild(domainText);
      
      // Handle click to change domain
      domainItem.addEventListener('click', () => {
        handleChangeDomain(node, domain);
        hideContextMenu();
      });
      
      submenu.appendChild(domainItem);
    });
  }
  
  // Add pagination controls if there are more domains than fit on one page
  if (allDomains.length > DOMAINS_PER_PAGE) {
    // Add a separator
    const separator = document.createElement('div');
    separator.className = 'context-menu-separator';
    submenu.appendChild(separator);
    
    // Add pagination info
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    paginationInfo.textContent = getDomainPaginationInfo();
    submenu.appendChild(paginationInfo);
    
    // Add pagination controls container
    const paginationControls = document.createElement('div');
    paginationControls.className = 'submenu-pagination';
    
    // Add previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button';
    prevButton.textContent = '« Previous';
    prevButton.disabled = currentDomainPage === 0;
    prevButton.addEventListener('click', (event) => {
      // This stops the click from bubbling up and closing the context menu
      event.stopPropagation();
      if (prevDomainPage()) {
        // Replace the current submenu with a new one
        const parentItem = submenu.parentNode;
        submenu.remove();
        const newSubMenu = createDomainSubmenu(node);
        parentItem.appendChild(newSubMenu);
      }
    });
    paginationControls.appendChild(prevButton);
    
    // Add next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button';
    nextButton.textContent = 'Next »';
    nextButton.disabled = currentDomainPage >= Math.ceil(allDomains.length / DOMAINS_PER_PAGE) - 1;
    nextButton.addEventListener('click', (event) => {
      // This stops the click from bubbling up and closing the context menu
      event.stopPropagation();
      if (nextDomainPage()) {
        // Replace the current submenu with a new one
        const parentItem = submenu.parentNode;
        submenu.remove();
        const newSubMenu = createDomainSubmenu(node);
        parentItem.appendChild(newSubMenu);
      }
    });
    paginationControls.appendChild(nextButton);
    
    submenu.appendChild(paginationControls);
  }
  
  return submenu;
}

// Populate the context menu with items based on what was right-clicked
function populateContextMenu(contextMenu, node, link) {
  // Different menu items depending on what was clicked
  if (node) {
    // Add header showing what node was clicked
    const header = document.createElement('div');
    header.className = 'context-menu-header';
    header.textContent = `Node: ${node.id.substring(0, 20)}${node.id.length > 20 ? '...' : ''}`;
    contextMenu.appendChild(header);
    
    // View details
    const viewDetailsItem = document.createElement('div');
    viewDetailsItem.className = 'context-menu-item';
    viewDetailsItem.textContent = 'View Details';
    viewDetailsItem.addEventListener('click', () => {
      handleViewNodeDetails(node);
      hideContextMenu();
    });
    contextMenu.appendChild(viewDetailsItem);
    
    // Create link from this node
    const createLinkItem = document.createElement('div');
    createLinkItem.className = 'context-menu-item';
    createLinkItem.textContent = 'Create Link...';
    createLinkItem.addEventListener('click', () => {
      toggleLinkCreationMode(node);
      hideContextMenu();
    });
    contextMenu.appendChild(createLinkItem);
    
    // Add Change Domain submenu
    const changeDomainItem = document.createElement('div');
    changeDomainItem.className = 'context-menu-item has-submenu';
    changeDomainItem.textContent = 'Change Domain';
    const domainSubmenu = createDomainSubmenu(node);
    changeDomainItem.appendChild(domainSubmenu);
    contextMenu.appendChild(changeDomainItem);
    
    // Add Tags
    const addTagsItem = document.createElement('div');
    addTagsItem.className = 'context-menu-item';
    addTagsItem.textContent = 'Add Tags...';
    addTagsItem.addEventListener('click', () => {
      handleShowTagInput(node);
      hideContextMenu();
    });
    contextMenu.appendChild(addTagsItem);
    
    // Add separator
    const separator = document.createElement('div');
    separator.className = 'context-menu-separator';
    contextMenu.appendChild(separator);
    
    // Delete node
    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item danger';
    deleteItem.textContent = 'Delete Node';
    deleteItem.addEventListener('click', () => {
      handleDeleteNode(node);
      hideContextMenu();
    });
    contextMenu.appendChild(deleteItem);
    
  } else if (link) {
    // Add header showing what link was clicked
    const header = document.createElement('div');
    header.className = 'context-menu-header';
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    header.textContent = `Link: ${sourceId.substring(0, 10)}... → ${targetId.substring(0, 10)}...`;
    contextMenu.appendChild(header);
    
    // Link information - current type
    const linkTypeItem = document.createElement('div');
    linkTypeItem.className = 'context-menu-item has-submenu';
    linkTypeItem.textContent = `Type: ${link.type || 'Unknown'}`;
    contextMenu.appendChild(linkTypeItem);
    
    // Create and add the link type submenu
    const linkTypeSubmenu = createLinkTypeSubmenu(link);
    linkTypeItem.appendChild(linkTypeSubmenu);
    
    // Link strength with interactive submenu
    const linkStrengthItem = document.createElement('div');
    linkStrengthItem.className = 'context-menu-item has-submenu';
    linkStrengthItem.textContent = `Strength: ${(link.strength || 0).toFixed(2)}`;
    contextMenu.appendChild(linkStrengthItem);
    
    // Create and add the strength submenu
    const strengthSubmenu = createStrengthSubmenu(link);
    linkStrengthItem.appendChild(strengthSubmenu);
    
    // Add separator
    const separator = document.createElement('div');
    separator.className = 'context-menu-separator';
    contextMenu.appendChild(separator);
    
    // Delete link
    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item danger';
    deleteItem.textContent = 'Delete Link';
    deleteItem.addEventListener('click', () => {
      handleDeleteLink(link);
      hideContextMenu();
    });
    contextMenu.appendChild(deleteItem);
    
  } else {
    // Background click - general actions
    const header = document.createElement('div');
    header.className = 'context-menu-header';
    header.textContent = 'Memory Graph';
    contextMenu.appendChild(header);
    
    // Refresh data
    const refreshItem = document.createElement('div');
    refreshItem.className = 'context-menu-item';
    refreshItem.textContent = 'Refresh Data';
    refreshItem.addEventListener('click', () => {
      loadData();
      hideContextMenu();
    });
    contextMenu.appendChild(refreshItem);
  }
}

// Hide the context menu
function hideContextMenu() {
  const contextMenu = document.getElementById('context-menu');
  if (!contextMenu) return;
  
  contextMenu.style.display = 'none';
  contextMenuActive = false;
  contextMenuNode = null;
  contextMenuLink = null;
  
  console.log('Context menu hidden');
}

// Handler functions for node and link actions - abstracted to be shared between click actions and context menu

// Handle viewing node details
function handleViewNodeDetails(node) {
  // Set the selected node
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

// Handle showing tag input for a node
function handleShowTagInput(node) {
  // First, select the node
  if (selectedNode !== node) {
    handleViewNodeDetails(node);
  }
  
  // Focus the tag input
  setTimeout(() => {
    const tagInput = document.getElementById('tag-input');
    if (tagInput) {
      tagInput.focus();
    }
  }, 100);
}

// Handle deleting a node
function handleDeleteNode(node) {
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
}

// Handle deleting a link
function handleDeleteLink(link) {
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

// Toggle link creation mode
function toggleLinkCreationMode(sourceNode = null) {
  // If turning off link creation mode
  if (linkCreationMode && !sourceNode) {
    linkCreationMode = false;
    linkSourceNode = null;
    
    // Clear any visual indicators
    selectedHighlightNodes.clear();
    updateCombinedHighlights();
    updateHighlight();
    
    // Update UI to show that link creation mode is off
    const notificationContainer = document.getElementById('notification-container');
    if (notificationContainer) {
      notificationContainer.style.display = 'none';
    }
    
    console.log('Link creation mode disabled');
    return;
  }
  
  // If turning on link creation mode with a source node
  if (sourceNode) {
    linkCreationMode = true;
    linkSourceNode = sourceNode;
    
    // Hide context menu if it's open
    if (contextMenuActive) {
      hideContextMenu();
    }
    
    // Highlight the source node
    selectedHighlightNodes.clear();
    selectedHighlightNodes.add(sourceNode);
    updateCombinedHighlights();
    updateHighlight();
    
    // Show UI notification
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
      // Create container if it doesn't exist
      notificationContainer = document.createElement('div');
      notificationContainer.id = 'notification-container';
      notificationContainer.style.position = 'fixed';
      notificationContainer.style.top = '80px';
      notificationContainer.style.left = '50%';
      notificationContainer.style.transform = 'translateX(-50%)';
      notificationContainer.style.background = 'rgba(0, 160, 0, 0.9)';
      notificationContainer.style.color = 'white';
      notificationContainer.style.padding = '10px 16px';
      notificationContainer.style.borderRadius = '5px';
      notificationContainer.style.zIndex = '1000';
      notificationContainer.style.fontWeight = 'bold';
      notificationContainer.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
      document.body.appendChild(notificationContainer);
    }
    
    notificationContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>Link creation mode: Click another node to create a link</span>
        <button id="cancel-link-creation" style="background: #444; border: none; color: white; padding: 3px 8px; border-radius: 3px; cursor: pointer;">Cancel</button>
      </div>
    `;
    notificationContainer.style.display = 'block';
    
    // Add cancel button handler
    document.getElementById('cancel-link-creation').addEventListener('click', (event) => {
      event.stopPropagation();
      toggleLinkCreationMode();
    });
    
    console.log('Link creation mode enabled with source node:', sourceNode.id);
  }
}

// Handle changing a node's domain
function handleChangeDomain(node, newDomain) {
  if (!node || !newDomain) {
    console.warn('Invalid domain change attempt - missing node or domain');
    return;
  }
  
  // No change needed if the domain is the same
  if (node.domain === newDomain) {
    console.log('Node is already in domain:', newDomain);
    return;
  }
  
  console.log(`Changing node ${node.id} domain from ${node.domain} to ${newDomain}`);
  
  // Prepare the request payload
  const payload = {
    nodeId: node.id,
    domain: newDomain
  };
  
  // Send request to update domain
  fetch('/api/nodes/update-domain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => {
    console.log('[API] Received response for POST /api/nodes/update-domain', res);
    return res.json();
  })
  .then(result => {
    console.log('[API] Response JSON for update domain:', result);
    if (result.success) {
      // Clear any selection and reload data with position preservation
      loadData(true);
      console.log('Domain updated successfully');
    } else {
      alert('Failed to update domain: ' + (result.error || 'Unknown error'));
    }
  })
  .catch(err => {
    console.error('[API] Error updating domain:', err);
    alert('Error updating domain: ' + err);
  });
}

// Handle creating a link between two nodes
function handleCreateLink(source, target) {
  if (!source || !target || source.id === target.id) {
    console.warn('Invalid link creation attempt - missing nodes or same node:', source, target);
    return;
  }
  
  console.log('Creating link between nodes:', source.id, 'and', target.id);
  
  // Create link via API
  const linkPayload = {
    source: source.id,
    target: target.id,
    type: 'relates_to',
    strength: 0.7,
    domain: source.domain || target.domain // Use either domain, preferring source
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
      loadData(true);
      console.log('Link created successfully');
    } else {
      // Don't throw an alert for already existing links, just show a console message
      if (result.error && result.error.includes('Edge already exists')) {
        console.log('Link already exists, no changes made');
      } else {
        alert('Failed to create link: ' + (result.error || 'Unknown error'));
      }
    }
    
    // Turn off link creation mode
    toggleLinkCreationMode();
  })
  .catch(err => {
    console.error('[API] Error creating link:', err);
    alert('Error creating link: ' + err);
    
    // Turn off link creation mode
    toggleLinkCreationMode();
  });
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

// Get all available domains from nodes
function collectAllDomains() {
  // Start by collecting domains from the graph data
  const domainSet = new Set();
  
  // Add domains from graph nodes
  if (graphData && graphData.nodes) {
    graphData.nodes.forEach(node => {
      if (node.domain) {
        domainSet.add(node.domain);
      }
    });
  }
  
  // Convert to sorted array
  allDomains = Array.from(domainSet).sort();
  console.log(`Collected ${allDomains.length} domains from graph data`);
  
  // Reset to first page when domain list changes
  currentDomainPage = 0;
  
  return allDomains;
}

// Get domains for the current pagination page
function getCurrentPageDomains() {
  const startIndex = currentDomainPage * DOMAINS_PER_PAGE;
  return allDomains.slice(startIndex, startIndex + DOMAINS_PER_PAGE);
}

// Navigate to the next page of domains
function nextDomainPage() {
  const maxPage = Math.ceil(allDomains.length / DOMAINS_PER_PAGE) - 1;
  if (currentDomainPage < maxPage) {
    currentDomainPage++;
    return true;
  }
  return false;
}

// Navigate to the previous page of domains
function prevDomainPage() {
  if (currentDomainPage > 0) {
    currentDomainPage--;
    return true;
  }
  return false;
}

// Get current pagination info text
function getDomainPaginationInfo() {
  const totalPages = Math.ceil(allDomains.length / DOMAINS_PER_PAGE);
  const startItem = currentDomainPage * DOMAINS_PER_PAGE + 1;
  const endItem = Math.min((currentDomainPage + 1) * DOMAINS_PER_PAGE, allDomains.length);
  return `${startItem}-${endItem} of ${allDomains.length} domains (Page ${currentDomainPage + 1}/${totalPages})`;
}

// Fetch all link types from the API
function fetchLinkTypes() {
  console.log('Fetching link types from API...');
  
  return fetch('/api/link-types')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch link types: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(types => {
      console.log(`Received ${types.length} link types from API`);
      
      // Store the link types
      allLinkTypes = types.sort();
      
      // Reset to first page
      currentLinkTypePage = 0;
      
      return allLinkTypes;
    })
    .catch(error => {
      console.error('Error fetching link types:', error);
      // Return a default set of link types if there's an error
      return ['relates_to', 'synthesizes', 'supports', 'refines'];
    });
}

// Get link types for the current pagination page
function getCurrentPageLinkTypes() {
  const startIndex = currentLinkTypePage * LINK_TYPES_PER_PAGE;
  return allLinkTypes.slice(startIndex, startIndex + LINK_TYPES_PER_PAGE);
}

// Navigate to the next page of link types
function nextLinkTypePage() {
  const maxPage = Math.ceil(allLinkTypes.length / LINK_TYPES_PER_PAGE) - 1;
  if (currentLinkTypePage < maxPage) {
    currentLinkTypePage++;
    return true;
  }
  return false;
}

// Navigate to the previous page of link types
function prevLinkTypePage() {
  if (currentLinkTypePage > 0) {
    currentLinkTypePage--;
    return true;
  }
  return false;
}

// Get current pagination info text for link types
function getLinkTypePaginationInfo() {
  const totalPages = Math.ceil(allLinkTypes.length / LINK_TYPES_PER_PAGE);
  const startItem = currentLinkTypePage * LINK_TYPES_PER_PAGE + 1;
  const endItem = Math.min((currentLinkTypePage + 1) * LINK_TYPES_PER_PAGE, allLinkTypes.length);
  return `${startItem}-${endItem} of ${allLinkTypes.length} types (Page ${currentLinkTypePage + 1}/${totalPages})`;
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
  
  // Also update our allDomains array while we're at it
  allDomains = domains;
  
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

// Create a strength adjustment submenu for links
function createStrengthSubmenu(link) {
  // Create a submenu container
  const submenu = document.createElement('div');
  submenu.className = 'context-submenu strength-submenu';
  submenu.style.width = '220px'; // Wider to accommodate the slider
  
  // Add a header showing current strength
  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.textContent = `Current Strength: ${(link.strength || 0).toFixed(2)}`;
  submenu.appendChild(header);
  
  // Create a container for the strength slider
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'strength-slider-container';
  sliderContainer.style.padding = '15px 12px';
  sliderContainer.style.position = 'relative';
  
  // Create visual slider track
  const sliderTrack = document.createElement('div');
  sliderTrack.className = 'strength-slider-track';
  sliderTrack.style.width = '100%';
  sliderTrack.style.height = '6px';
  sliderTrack.style.backgroundColor = 'rgba(60, 60, 80, 0.7)';
  sliderTrack.style.borderRadius = '3px';
  sliderTrack.style.position = 'relative';
  sliderContainer.appendChild(sliderTrack);
  
  // Create slider handle
  const sliderHandle = document.createElement('div');
  sliderHandle.className = 'strength-slider-handle';
  sliderHandle.style.width = '16px';
  sliderHandle.style.height = '16px';
  sliderHandle.style.backgroundColor = '#3388ff';
  sliderHandle.style.borderRadius = '50%';
  sliderHandle.style.position = 'absolute';
  sliderHandle.style.top = '50%';
  sliderHandle.style.transform = 'translate(-50%, -50%)';
  sliderHandle.style.cursor = 'pointer';
  sliderHandle.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.3)';
  
  // Position the handle based on current strength
  const strength = link.strength || 0;
  const handlePosition = strength * 100;
  sliderHandle.style.left = `${handlePosition}%`;
  
  // Create active track (colored portion)
  const activeTrack = document.createElement('div');
  activeTrack.className = 'strength-slider-active';
  activeTrack.style.height = '100%';
  activeTrack.style.width = `${handlePosition}%`;
  activeTrack.style.backgroundColor = '#3388ff';
  activeTrack.style.borderRadius = '3px';
  activeTrack.style.position = 'absolute';
  activeTrack.style.left = '0';
  activeTrack.style.top = '0';
  sliderTrack.appendChild(activeTrack);
  sliderTrack.appendChild(sliderHandle);
  
  // Value display
  const valueDisplay = document.createElement('div');
  valueDisplay.className = 'strength-value';
  valueDisplay.textContent = strength.toFixed(2);
  valueDisplay.style.textAlign = 'center';
  valueDisplay.style.marginTop = '10px';
  valueDisplay.style.fontSize = '14px';
  valueDisplay.style.fontWeight = 'bold';
  
  // Numeric input for direct value entry
  const inputContainer = document.createElement('div');
  inputContainer.className = 'strength-input-container';
  inputContainer.style.display = 'flex';
  inputContainer.style.alignItems = 'center';
  inputContainer.style.justifyContent = 'center';
  inputContainer.style.marginTop = '10px';
  
  const inputLabel = document.createElement('span');
  inputLabel.textContent = 'Set value: ';
  inputLabel.style.marginRight = '5px';
  
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.max = '1';
  input.step = '0.01';
  input.value = strength.toFixed(2);
  input.style.width = '60px';
  input.style.backgroundColor = 'rgba(40, 40, 60, 0.7)';
  input.style.color = 'white';
  input.style.border = '1px solid #3388ff';
  input.style.borderRadius = '3px';
  input.style.padding = '3px 5px';
  input.style.textAlign = 'center';
  
  const applyButton = document.createElement('button');
  applyButton.textContent = 'Apply';
  applyButton.style.marginLeft = '5px';
  applyButton.style.padding = '3px 8px';
  applyButton.style.background = '#3388ff';
  applyButton.style.border = 'none';
  applyButton.style.borderRadius = '3px';
  applyButton.style.color = 'white';
  applyButton.style.cursor = 'pointer';
  
  // Add event listener for the Apply button
  applyButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const newStrength = parseFloat(input.value);
    if (!isNaN(newStrength) && newStrength >= 0 && newStrength <= 1) {
      handleChangeStrength(link, newStrength);
      hideContextMenu();
    } else {
      alert('Please enter a valid strength value between 0 and 1');
    }
  });
  
  // Add event listener for Enter key on input
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.stopPropagation();
      applyButton.click();
    }
  });
  
  inputContainer.appendChild(inputLabel);
  inputContainer.appendChild(input);
  inputContainer.appendChild(applyButton);
  
  // Instructions for wheel adjustment
  const wheelInstruction = document.createElement('div');
  wheelInstruction.className = 'wheel-instruction';
  wheelInstruction.textContent = 'Use mouse wheel to adjust';
  wheelInstruction.style.textAlign = 'center';
  wheelInstruction.style.fontSize = '12px';
  wheelInstruction.style.color = '#aaa';
  wheelInstruction.style.marginTop = '5px';
  
  // Add mouse wheel event for adjustment
  submenu.addEventListener('wheel', (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Calculate new strength based on wheel direction
    // Delta is normalized, so we use a small increment/decrement
    const delta = event.deltaY > 0 ? -0.01 : 0.01;
    let newStrength = parseFloat((strength + delta).toFixed(2));
    
    // Clamp the value between 0 and 1
    newStrength = Math.max(0, Math.min(1, newStrength));
    
    // Update the slider and input
    updateStrengthUI(sliderHandle, activeTrack, valueDisplay, input, newStrength);
    
    // If wheel event stopped, save the change
    clearTimeout(submenu.wheelTimer);
    submenu.wheelTimer = setTimeout(() => {
      handleChangeStrength(link, newStrength);
    }, 500);
  });
  
  // Add the elements to the submenu
  sliderContainer.appendChild(valueDisplay);
  sliderContainer.appendChild(inputContainer);
  sliderContainer.appendChild(wheelInstruction);
  submenu.appendChild(sliderContainer);
  
  // Make the slider interactive
  let isDragging = false;
  
  // Function to handle slider movement
  const handleSliderMove = (event) => {
    if (!isDragging) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // Calculate the relative position within the track
    const rect = sliderTrack.getBoundingClientRect();
    let x = event.clientX - rect.left;
    
    // Clamp the position within the track
    x = Math.max(0, Math.min(x, rect.width));
    
    // Calculate strength from position (0-1 range)
    const newStrength = parseFloat((x / rect.width).toFixed(2));
    
    // Update the UI elements
    updateStrengthUI(sliderHandle, activeTrack, valueDisplay, input, newStrength);
  };
  
  // Function to handle slider release
  const handleSliderRelease = () => {
    if (!isDragging) return;
    isDragging = false;
    
    // Remove the event listeners when not dragging
    document.removeEventListener('mousemove', handleSliderMove);
    document.removeEventListener('mouseup', handleSliderRelease);
    
    // Save the change
    const newStrength = parseFloat(valueDisplay.textContent);
    handleChangeStrength(link, newStrength);
  };
  
  // Add event listeners for dragging
  sliderHandle.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    isDragging = true;
    
    // Add event listeners for move and release
    document.addEventListener('mousemove', handleSliderMove);
    document.addEventListener('mouseup', handleSliderRelease);
  });
  
  // Allow clicking on the track to jump to a position
  sliderTrack.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Calculate the relative position within the track
    const rect = sliderTrack.getBoundingClientRect();
    let x = event.clientX - rect.left;
    
    // Clamp the position within the track
    x = Math.max(0, Math.min(x, rect.width));
    
    // Calculate strength from position (0-1 range)
    const newStrength = parseFloat((x / rect.width).toFixed(2));
    
    // Update the UI elements
    updateStrengthUI(sliderHandle, activeTrack, valueDisplay, input, newStrength);
    
    // Save the change
    handleChangeStrength(link, newStrength);
  });
  
  return submenu;
}

// Update the UI elements for the strength slider
function updateStrengthUI(handle, activeTrack, valueDisplay, input, strength) {
  // Position the handle
  handle.style.left = `${strength * 100}%`;
  
  // Update the active track width
  activeTrack.style.width = `${strength * 100}%`;
  
  // Update the value display
  valueDisplay.textContent = strength.toFixed(2);
  
  // Update the input field
  input.value = strength.toFixed(2);
}

// Handle changing a link's strength
function handleChangeStrength(link, newStrength) {
  if (!link || typeof newStrength !== 'number' || newStrength < 0 || newStrength > 1) {
    console.warn('Invalid strength change attempt - missing link or invalid strength value');
    return;
  }
  
  // No change needed if the strength is very close to the current value
  if (Math.abs(link.strength - newStrength) < 0.01) {
    console.log('Link already has similar strength:', newStrength);
    return;
  }
  
  // Get source and target IDs
  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
  const targetId = typeof link.target === 'object' ? link.target.id : link.target;
  
  console.log(`Changing link between ${sourceId} and ${targetId} from strength ${link.strength.toFixed(2)} to ${newStrength.toFixed(2)}`);
  
  // Prepare the request payload
  const payload = {
    source: sourceId,
    target: targetId,
    newStrength: newStrength
  };
  
  // Send request to update link strength
  fetch('/api/edges/update-strength', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => {
    console.log('[API] Received response for POST /api/edges/update-strength', res);
    return res.json();
  })
  .then(result => {
    console.log('[API] Response JSON for update link strength:', result);
    if (result.success) {
      // Clear any selection and reload data with position preservation
      loadData(true);
      console.log('Link strength updated successfully');
    } else {
      alert('Failed to update link strength: ' + (result.error || 'Unknown error'));
    }
  })
  .catch(err => {
    console.error('[API] Error updating link strength:', err);
    alert('Error updating link strength: ' + err);
  });
}

// Create a link type submenu with pagination
function createLinkTypeSubmenu(link) {
  // Ensure we have the link types
  if (allLinkTypes.length === 0) {
    // Fetch link types if we don't have them yet
    fetchLinkTypes();
    
    // Use a default set for now
    allLinkTypes = ['relates_to', 'synthesizes', 'supports', 'refines'];
  }
  
  // Create a submenu container
  const submenu = document.createElement('div');
  submenu.className = 'context-submenu';
  
  // Add a header showing current link type
  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.textContent = `Current Type: ${link.type || 'Unknown'}`;
  submenu.appendChild(header);
  
  // Get current page link types
  const currentPageTypes = getCurrentPageLinkTypes();
  
  // If no link types found
  if (currentPageTypes.length === 0) {
    const noTypesItem = document.createElement('div');
    noTypesItem.className = 'context-menu-item';
    noTypesItem.textContent = 'No link types available';
    noTypesItem.style.fontStyle = 'italic';
    noTypesItem.style.opacity = '0.7';
    submenu.appendChild(noTypesItem);
  } else {
    // Add each link type as a menu item
    currentPageTypes.forEach(type => {
      const typeItem = document.createElement('div');
      typeItem.className = 'context-menu-item';
      
      // Mark the current type
      if (type === link.type) {
        typeItem.innerHTML = `${type} <span style="margin-left: 6px; color: #55ff55;">✓</span>`;
        typeItem.style.fontWeight = 'bold';
      } else {
        typeItem.textContent = type;
      }
      
      // Handle click to change link type
      typeItem.addEventListener('click', () => {
        handleChangeLinkType(link, type);
        hideContextMenu();
      });
      
      submenu.appendChild(typeItem);
    });
  }
  
  // Add pagination controls if there are more types than fit on one page
  if (allLinkTypes.length > LINK_TYPES_PER_PAGE) {
    // Add a separator
    const separator = document.createElement('div');
    separator.className = 'context-menu-separator';
    submenu.appendChild(separator);
    
    // Add pagination info
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    paginationInfo.textContent = getLinkTypePaginationInfo();
    submenu.appendChild(paginationInfo);
    
    // Add pagination controls container
    const paginationControls = document.createElement('div');
    paginationControls.className = 'submenu-pagination';
    
    // Add previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button';
    prevButton.textContent = '« Previous';
    prevButton.disabled = currentLinkTypePage === 0;
    prevButton.addEventListener('click', (event) => {
      // This stops the click from bubbling up and closing the context menu
      event.stopPropagation();
      if (prevLinkTypePage()) {
        // Replace the current submenu with a new one
        const parentItem = submenu.parentNode;
        submenu.remove();
        const newSubMenu = createLinkTypeSubmenu(link);
        parentItem.appendChild(newSubMenu);
      }
    });
    paginationControls.appendChild(prevButton);
    
    // Add next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button';
    nextButton.textContent = 'Next »';
    nextButton.disabled = currentLinkTypePage >= Math.ceil(allLinkTypes.length / LINK_TYPES_PER_PAGE) - 1;
    nextButton.addEventListener('click', (event) => {
      // This stops the click from bubbling up and closing the context menu
      event.stopPropagation();
      if (nextLinkTypePage()) {
        // Replace the current submenu with a new one
        const parentItem = submenu.parentNode;
        submenu.remove();
        const newSubMenu = createLinkTypeSubmenu(link);
        parentItem.appendChild(newSubMenu);
      }
    });
    paginationControls.appendChild(nextButton);
    
    submenu.appendChild(paginationControls);
  }
  
  return submenu;
}

// Handle changing a link's type
function handleChangeLinkType(link, newType) {
  if (!link || !newType) {
    console.warn('Invalid link type change attempt - missing link or type');
    return;
  }
  
  // No change needed if the type is the same
  if (link.type === newType) {
    console.log('Link already has type:', newType);
    return;
  }
  
  // Get source and target IDs
  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
  const targetId = typeof link.target === 'object' ? link.target.id : link.target;
  
  console.log(`Changing link between ${sourceId} and ${targetId} from type ${link.type} to ${newType}`);
  
  // Prepare the request payload
  const payload = {
    source: sourceId,
    target: targetId,
    newType: newType
  };
  
  // Send request to update link type
  fetch('/api/edges/update-type', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => {
    console.log('[API] Received response for POST /api/edges/update-type', res);
    return res.json();
  })
  .then(result => {
    console.log('[API] Response JSON for update link type:', result);
    if (result.success) {
      // Clear any selection and reload data with position preservation
      loadData(true);
      console.log('Link type updated successfully');
    } else {
      alert('Failed to update link type: ' + (result.error || 'Unknown error'));
    }
  })
  .catch(err => {
    console.error('[API] Error updating link type:', err);
    alert('Error updating link type: ' + err);
  });
}

// ================= Multi-node Selection Functions =================

// Update the position of the selection panel based on info panel visibility
function updateSelectionPanelPosition() {
  const infoPanel = document.getElementById('info-panel');
  const selectionPanel = document.getElementById('selection-panel');
  
  if (!selectionPanel) return;
  
  // Check if info panel is visible
  const infoPanelVisible = infoPanel && infoPanel.style.display === 'block';
  
  // Position selection panel based on info panel visibility
  if (infoPanelVisible) {
    // Move selection panel to the left of the info panel
    selectionPanel.style.right = '420px'; // Position to the left of the info panel
  } else {
    // Position selection panel at the far right (same position as info panel would be)
    selectionPanel.style.right = '10px';
  }
}

// Handle shift+click selection of a node
function handleMultiSelectNode(node) {
  if (!node) return;
  
  // Toggle multi-select mode
  if (!multiSelectActive) {
    multiSelectActive = true;
    multiSelectedNodes = []; // Reset the selection
    multiSelectHighlightNodes.clear();
    showSelectionPanel(); // Show the panel when first node is selected
  }
  
  // Check if node is already in the selection list
  const existingIndex = multiSelectedNodes.findIndex(n => n.id === node.id);
  
  if (existingIndex !== -1) {
    // Remove the node if it's already selected
    multiSelectedNodes.splice(existingIndex, 1);
    multiSelectHighlightNodes.delete(node);
    console.log('Node removed from multi-selection:', node.id);
  } else {
    // Add the node to the selection
    multiSelectedNodes.push(node);
    multiSelectHighlightNodes.add(node);
    console.log('Node added to multi-selection:', node.id);
  }
  
  // Update the visual highlights
  updateCombinedHighlights();
  updateHighlight();
  
  // Update the selection panel
  updateSelectionPanel();
}

// Show the multi-selection panel
function showSelectionPanel() {
  const selectionPanel = document.getElementById('selection-panel');
  if (!selectionPanel) return;
  
  // Show selection panel
  selectionPanel.style.display = 'block';
  
  // Position the panel properly based on info panel visibility
  updateSelectionPanelPosition();
  
  // Setup event listeners for the panel buttons if first time
  setupSelectionPanelListeners();
  
  // Update the panel contents
  updateSelectionPanel();
}

// Hide the multi-selection panel
function hideSelectionPanel() {
  const selectionPanel = document.getElementById('selection-panel');
  if (!selectionPanel) return;
  
  selectionPanel.style.display = 'none';
  
  // Clear the selection
  multiSelectActive = false;
  multiSelectedNodes = [];
  multiSelectHighlightNodes.clear();
  
  // Update highlights
  updateCombinedHighlights();
  updateHighlight();
}

// Set up listeners for the selection panel
function setupSelectionPanelListeners() {
  // Add listener for close button
  const closeButton = document.getElementById('selection-close');
  if (closeButton) {
    closeButton.addEventListener('click', hideSelectionPanel);
  }
  
  // Add listener for clear selection button
  const clearButton = document.getElementById('clear-selection-btn');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      multiSelectedNodes = [];
      multiSelectHighlightNodes.clear();
      updateCombinedHighlights();
      updateHighlight();
      updateSelectionPanel();
    });
  }
  
  // Add listener for link all button
  const linkButton = document.getElementById('link-selected-btn');
  if (linkButton) {
    linkButton.addEventListener('click', handleLinkAllSelected);
  }
  
  // Add listener for copy button
  const copyButton = document.getElementById('selection-copy');
  if (copyButton) {
    copyButton.addEventListener('click', () => {
      if (multiSelectedNodes.length === 0) return;
      
      // Prepare content to copy
      const content = multiSelectedNodes.map(node => {
        return `Node ID: ${node.id}\nDomain: ${node.domain || 'None'}\nContent: ${node.content_summary || node.content.substring(0, 100) + '...'}\n`;
      }).join('\n---\n\n');
      
      // Copy to clipboard
      navigator.clipboard.writeText(content)
        .then(() => {
          // Visual feedback
          copyButton.textContent = '✓';
          copyButton.style.color = '#00ff00';
          
          // Reset after delay
          setTimeout(() => {
            copyButton.textContent = '📋';
            copyButton.style.color = '';
          }, 1500);
        })
        .catch(err => {
          console.error('Failed to copy content:', err);
          alert('Failed to copy content to clipboard');
        });
    });
  }
}

// Update the selection panel with current selected nodes
function updateSelectionPanel() {
  const selectionList = document.getElementById('selection-list');
  const selectionCount = document.getElementById('selection-count');
  
  if (!selectionList || !selectionCount) return;
  
  // Update count
  selectionCount.textContent = multiSelectedNodes.length.toString();
  
  // Clear the current list
  selectionList.innerHTML = '';
  
  // If no nodes selected, show a message
  if (multiSelectedNodes.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'selection-empty-message';
    emptyMessage.textContent = 'No nodes selected. Use Shift+click to select nodes.';
    emptyMessage.style.fontStyle = 'italic';
    emptyMessage.style.opacity = '0.7';
    emptyMessage.style.textAlign = 'center';
    emptyMessage.style.padding = '10px';
    selectionList.appendChild(emptyMessage);
    return;
  }
  
  // Add each selected node to the list
  multiSelectedNodes.forEach(node => {
    const item = document.createElement('div');
    item.className = 'selection-item';
    
    // Get node color from domain
    let nodeColor = '#cccccc';
    if (node.domain && window.domainColors && window.domainColors.has(node.domain)) {
      nodeColor = window.domainColors.get(node.domain);
    }
    
    // Create color indicator
    const colorIndicator = document.createElement('span');
    colorIndicator.style.width = '12px';
    colorIndicator.style.height = '12px';
    colorIndicator.style.borderRadius = '50%';
    colorIndicator.style.backgroundColor = nodeColor;
    colorIndicator.style.display = 'inline-block';
    colorIndicator.style.marginRight = '8px';
    
    // Add text content (truncated)
    const textContent = document.createElement('span');
    textContent.className = 'selection-item-text';
    textContent.title = node.content_summary || node.content;
    
    // Limit text to a reasonable length
    const displayText = node.content_summary || node.content;
    textContent.textContent = displayText.length > 60 ? 
      displayText.substring(0, 60) + '...' : displayText;
    
    // Add remove button
    const removeBtn = document.createElement('span');
    removeBtn.className = 'selection-item-remove';
    removeBtn.textContent = '✖';
    removeBtn.title = 'Remove from selection';
    removeBtn.addEventListener('click', event => {
      // Stop propagation to prevent other handlers
      event.stopPropagation();
      
      // Remove the node from selection
      handleMultiSelectNode(node);
    });
    
    // Add everything to the item
    item.appendChild(colorIndicator);
    item.appendChild(textContent);
    item.appendChild(removeBtn);
    
    // Handle click on the item to show node details
    item.addEventListener('click', () => {
      // Show details in the regular info panel without changing selection
      showNodeInfo(node);
    });
    
    // Add the item to the list
    selectionList.appendChild(item);
  });
  
  // Update the link button state
  const linkButton = document.getElementById('link-selected-btn');
  if (linkButton) {
    linkButton.disabled = multiSelectedNodes.length < 2;
    linkButton.title = multiSelectedNodes.length < 2 ? 
      'Select at least 2 nodes to link' : 'Create links between all selected nodes';
  }
}

// Handle creating links between all selected nodes
function handleLinkAllSelected() {
  if (multiSelectedNodes.length < 2) {
    alert('Select at least 2 nodes to create links');
    return;
  }
  
  showCustomConfirmDialog(
    `Are you sure you want to create links between all ${multiSelectedNodes.length} selected nodes? This will create ${(multiSelectedNodes.length * (multiSelectedNodes.length - 1)) / 2} links.`,
    () => {
      // Create all possible links between the selected nodes
      let linkCreationPromises = [];
      
      // For each pair of nodes
      for (let i = 0; i < multiSelectedNodes.length; i++) {
        for (let j = i + 1; j < multiSelectedNodes.length; j++) {
          const source = multiSelectedNodes[i];
          const target = multiSelectedNodes[j];
          
          // Add a promise to create this link
          linkCreationPromises.push(
            createLinkPromise(source, target)
          );
        }
      }
      
      // Process all the link creation promises
      Promise.all(linkCreationPromises)
        .then(results => {
          const successCount = results.filter(r => r.success).length;
          const failCount = results.length - successCount;
          
          alert(`Created ${successCount} links. ${failCount > 0 ? `${failCount} links already existed or failed.` : ''}`);
          
          // Reload the graph data
          loadData(true);
        })
        .catch(err => {
          console.error('Error creating multiple links:', err);
          alert('Error creating links: ' + err);
        });
    }
  );
}

// Create a promise for link creation to allow bulk operations
function createLinkPromise(source, target) {
  return new Promise((resolve, reject) => {
    // Skip if source and target are the same
    if (source.id === target.id) {
      resolve({ success: false, error: 'Cannot link node to itself' });
      return;
    }
    
    // Create link payload
    const linkPayload = {
      source: source.id,
      target: target.id,
      type: 'relates_to',
      strength: 0.7,
      domain: source.domain || target.domain
    };
    
    // Send the API request
    fetch('/api/edges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linkPayload)
    })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        resolve({ success: true, id: result.id });
      } else if (result.error && result.error.includes('Edge already exists')) {
        resolve({ success: false, error: 'Edge already exists' });
      } else {
        resolve({ success: false, error: result.error || 'Unknown error' });
      }
    })
    .catch(err => {
      resolve({ success: false, error: err.toString() });
    });
  });
}

// Update the combined highlight sets to include multi-selection highlights
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
  
  // Add multi-select highlights last
  multiSelectHighlightNodes.forEach(node => highlightNodes.add(node));
}
