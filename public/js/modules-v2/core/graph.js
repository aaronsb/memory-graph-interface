/**
 * Core Graph Module
 * 
 * Handles graph initialization, data loading, and core visualization functionality.
 */

import store from '../state/store.js';
import { getNodeLabel, getNodeColor, getLinkColor, updateHighlight, updateCombinedHighlights } from '../utils/helpers.js';
import { showContextMenu, hideContextMenu } from '../ui/contextMenu.js';
import { handleViewNodeDetails, handleMultiSelectNode, handleDeleteNode, showCustomConfirmDialog } from './nodeInteractions.js';
import { toggleLinkCreationMode, handleCreateLink, handleDeleteLink } from './linkManagement.js';
import { collectAllDomains, updateDomainColorLegend } from './domainManagement.js';
import * as eventBus from '../utils/eventBus.js';

/**
 * Initialize the 3D force graph
 */
export function initGraph() {
  console.log('Initializing 3D force graph');
  
  // Create the 3D force graph
  const graph = ForceGraph3D({ controlType: 'orbit' })
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
    
    // Node 3D object customization
    .nodeThreeObject(node => {
      // Get state to check if summaries should be shown
      const { showSummariesOnNodes } = store.getState();
      
      // Only create text sprites for summaries when enabled
      if (showSummariesOnNodes && node.content_summary && typeof SpriteText !== 'undefined') {
        // Format summary to show approximately two lines of text
        let summaryText = node.content_summary;
        if (summaryText.length > 80) {
          summaryText = summaryText.substring(0, 80) + '...';
        }
        
        // Create a group to hold the sprite
        const group = new THREE.Group();
        
        // Create the sprite text
        const sprite = new SpriteText(summaryText);
        sprite.color = '#ffffff';
        sprite.textHeight = 2.5;
        sprite.backgroundColor = 'rgba(0,0,0,0.8)';
        sprite.padding = 3;
        
        // Add outline effect if possible
        if (sprite.material) {
          sprite.material.userData = {
            outlineWidth: 0.1,
            outlineColor: '#000000'
          };
        }
        
        // Position the sprite at 0,0,0 in the group
        sprite.position.set(0, 0, 0);
        group.add(sprite);
        
        // Add a custom render function to position the sprite relative to the node
        group.onBeforeRender = function(renderer, scene, camera) {
          // Get node's world position
          const nodePosition = new THREE.Vector3(node.x, node.y, node.z);
          
          // Get camera position
          const cameraPosition = new THREE.Vector3().copy(camera.position);
          
          // Calculate direction vector from node to camera
          const direction = new THREE.Vector3().subVectors(cameraPosition, nodePosition).normalize();
          
          // Scale the offset based on node size
          const nodeSize = 12 * (node.val || 1);
          const offset = 0.55 * nodeSize;
          
          // Position the group in the direction of the camera
          group.position.copy(direction).multiplyScalar(offset);
          
          // Orient the text to face the camera
          sprite.position.y = 0.2 * nodeSize;
        };
        
        return group;
      }
      
      // Default to normal sphere rendering
      return null;
    })
    
    // Set node object extension to true to allow for both custom and default rendering
    .nodeThreeObjectExtend(true)
    
    // Link styling
    .linkWidth(link => {
      const { highlightLinks } = store.getState();
      return highlightLinks.has(link) ? 5 : 2.5;
    })
    .linkDirectionalParticles(link => {
      // More particles for stronger links
      return Math.round(8 * (link.strength || 0.5));
    })
    .linkDirectionalParticleWidth(4)
    .linkDirectionalParticleSpeed(link => 0.00167 * link.strength)
    .linkColor(link => getLinkColor(link))
    .linkOpacity(1)
    .linkCurvature(0)
    
    // Link labels
    .linkLabel(link => `${link.type} (${link.strength.toFixed(2)})`)
    .linkThreeObjectExtend(true)
    .linkThreeObject(link => {
      const { showEdgeLabels } = store.getState();
      
      if (showEdgeLabels && typeof SpriteText !== 'undefined') {
        const sprite = new SpriteText(link.type);
        sprite.color = 'white';
        sprite.textHeight = 4;
        sprite.backgroundColor = 'rgba(0,0,0,0.7)';
        sprite.padding = 3;
        return sprite;
      }
      
      return null;
    })
    
    // Position link objects (labels)
    .linkPositionUpdate((sprite, { start, end }) => {
      if (sprite) {
        // Position the sprite at the middle of the link
        const middlePos = {
          x: start.x + (end.x - start.x) / 2,
          y: start.y + (end.y - start.y) / 2,
          z: start.z + (end.z - start.z) / 2
        };
        Object.assign(sprite.position, middlePos);
      }
    })
    
    // D3-force configuration
    .d3Force('link', d3.forceLink().id(d => d.id)
      .distance(link => 200 - 150 * (typeof link.strength === 'number' ? link.strength : 0.5))
      .strength(link => 2 * link.strength)
    )
    .d3Force('charge', d3.forceManyBody()
      .strength(store.get('originalChargeStrength'))
      .distanceMax(300)
    )
    .d3Force('center', d3.forceCenter())
    .d3Force('collide', d3.forceCollide(node => 15 + 5 * (node.val || 1)))
    
    // Node hover handling
    .onNodeHover(node => {
      // Store current state
      const { 
        controlKeyPressed,
        hoverHighlightNodes,
        hoverHighlightLinks,
        graphData,
        hoverNode
      } = store.getState();
      
      // If control key is pressed, we're in a special selection mode
      if (controlKeyPressed) {
        store.set('hoverNode', node || null);
        return;
      }
      
      // Only update if the hovered node has changed
      if (node && hoverNode === node) return;
      
      // Clear previous hovered items
      hoverHighlightNodes.clear();
      hoverHighlightLinks.clear();
      
      if (node) {
        // Add the hovered node to highlights
        hoverHighlightNodes.add(node);
        
        // Add connected nodes and links to hover highlight set
        graphData.links.forEach(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          if (sourceId === node.id || targetId === node.id) {
            hoverHighlightLinks.add(link);
            
            // Also highlight connected nodes
            const connectedNode = sourceId === node.id ? 
              (typeof link.target === 'object' ? link.target : 
                graphData.nodes.find(n => n.id === targetId)) : 
              (typeof link.source === 'object' ? link.source : 
                graphData.nodes.find(n => n.id === sourceId));
            
            if (connectedNode) {
              hoverHighlightNodes.add(connectedNode);
            }
          }
        });
      }
      
      // Update state with new hover highlights
      store.update({
        hoverNode: node || null,
        hoverHighlightNodes: new Set(hoverHighlightNodes),
        hoverHighlightLinks: new Set(hoverHighlightLinks)
      });
      
      // Update visual highlights
      updateCombinedHighlights();
      updateHighlight();
    })
    
    // Link hover handling
    .onLinkHover(link => {
      store.set('hoverLink', link || null);
    })
    
    // Node click handling
    .onNodeClick((node, event) => {
      const { multiSelectActive } = store.getState();
      
      // Ensure node object is valid
      if (!node) {
        console.log('No valid node object provided to onNodeClick');
        return;
      }
      
      // Log the node for debugging
      console.log('Node clicked:', node.id);
      
      // Check if shift key is pressed or multi-select mode is active
      if (event.shiftKey || multiSelectActive) {
        handleMultiSelectNode(node);
        return;
      }
      
      // Handle control+click for node deletion
      if (store.get('controlKeyPressed')) {
        console.log('Control-click detected on node:', node.id);
        handleDeleteNode(node);
        return;
      }
      
      // Handle alt+click for link creation between selected nodes
      if (event.altKey) {
        console.log('Alt-click detected on node:', node.id);
        
        const selectedNodes = store.get('selectedNodes');
        const index = selectedNodes.findIndex(n => n.id === node.id);
        
        if (index !== -1) {
          // Node already selected, remove it
          selectedNodes.splice(index, 1);
          console.log('Node removed from selection:', node.id);
        } else {
          // Node not selected, add it
          selectedNodes.push(node);
          console.log('Node added to selection:', node.id);
        }
        
        // If we now have exactly 2 nodes selected, create a link
        if (selectedNodes.length === 2) {
          const sourceNode = selectedNodes[0];
          const targetNode = selectedNodes[1];
          handleCreateLink(sourceNode, targetNode);
          
          // Clear selection after creating link
          store.set('selectedNodes', []);
        }
        
        // Update highlights
        updateCombinedHighlights();
        updateHighlight();
        return;
      }
      
      // Default node click behavior - show node details or deselect if already selected
      handleViewNodeDetails(node);
    })
    
    // Link click handling
    .onLinkClick((link, event) => {
      // Handle control+click for link deletion
      if (store.get('controlKeyPressed') && store.get('hoverLink') === link) {
        console.log('Control-click detected on link:', link);
        handleDeleteLink(link);
      }
    })
    
    // Node drag handling
    .onNodeDrag((node, translate) => {
      store.set('draggedNode', node);
      
      // Reduce repulsion forces during drag to make positioning easier
      if (!store.get('repulsionReduced')) {
        console.log('Drag started, disabling all forces');
        
        // Disable forces during drag
        graph.d3Force('charge').strength(0);
        
        const linkForce = graph.d3Force('link');
        if (linkForce) linkForce.strength(0);
        
        graph.d3Force('center').strength(0);
        graph.d3Force('collide').radius(0);
        
        // Apply changes
        graph.d3ReheatSimulation();
        
        // Update state
        store.set('repulsionReduced', true);
      }
      
      const graphData = store.get('graphData');
      const nodeSize = 12 * (node.val || 1);
      
      // Find potential link target (closest node within threshold)
      let closestNode = null;
      let closestDistance = Infinity;
      
      for (const otherNode of graphData.nodes) {
        // Skip the dragged node
        if (otherNode.id === node.id) continue;
        
        // Skip if already linked
        const alreadyLinked = graphData.links.some(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return (sourceId === node.id && targetId === otherNode.id) || 
                 (sourceId === otherNode.id && targetId === node.id);
        });
        
        if (alreadyLinked) continue;
        
        // Calculate distance
        const dx = node.x - otherNode.x;
        const dy = node.y - otherNode.y;
        const dz = node.z - otherNode.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        // Get other node's size
        const otherNodeSize = 12 * (otherNode.val || 1);
        
        // Use a larger threshold for potential link target
        const thresholdFactor = store.get('potentialLinkTarget') === otherNode ? 2.5 : 2.0;
        
        // Check if this node is closer than current closest and within threshold
        if (distance < closestDistance && distance < (nodeSize + otherNodeSize) * thresholdFactor) {
          closestDistance = distance;
          closestNode = otherNode;
        }
      }
      
      // Update potential link target
      const potentialLinkTarget = store.get('potentialLinkTarget');
      if (potentialLinkTarget !== closestNode) {
        console.log('Potential link target changed:', 
                    potentialLinkTarget ? potentialLinkTarget.id : 'none', 
                    '→', 
                    closestNode ? closestNode.id : 'none');
        
        // Update the stored potential link target
        store.set('potentialLinkTarget', closestNode);
        
        if (closestNode && !store.get('temporaryLinkFormed')) {
          console.log('Potential link formed with node:', closestNode.id);
          store.set('temporaryLinkFormed', true);
        } else if (!closestNode && store.get('temporaryLinkFormed')) {
          console.log('Potential link lost');
          store.set('temporaryLinkFormed', false);
        }
        
        // Update visualization to show/hide tentative link
        updateHighlight();
      }
    })
    
    // Node drag end handling
    .onNodeDragEnd(node => {
      console.log('Node drag ended:', node.id);
      store.set('draggedNode', null);
      
      // Get the potential link target
      const potentialLinkTarget = store.get('potentialLinkTarget');
      
      if (potentialLinkTarget) {
        console.log('Found closest node within threshold:', potentialLinkTarget.id);
        
        // Create link data
        const linkData = {
          source: node.id,
          target: potentialLinkTarget.id,
          type: 'relates_to',
          strength: 0.7,
          domain: node.domain || potentialLinkTarget.domain
        };
        
        // Create the link visually FIRST before the API call
        const newLink = {
          source: node.id,
          target: potentialLinkTarget.id,
          type: 'relates_to',
          strength: 0.7,
          domain: node.domain || potentialLinkTarget.domain,
          id: `temp_${node.id}_${potentialLinkTarget.id}` // Temporary ID until we get the real one
        };
        
        // Add the link to the graph data immediately for visual feedback
        const graphData = store.get('graphData');
        graphData.links.push(newLink);
        
        // Update the graph visualization immediately
        graph.graphData(graphData);
        
        console.log('[API] Sending POST /api/edges', linkData);
        
        // Create the link via API
        fetch('/api/edges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(linkData)
        })
        .then(response => {
          console.log('[API] Received response for POST /api/edges', response);
          return response.json();
        })
        .then(result => {
          console.log('[API] Response JSON for POST /api/edges', result);
          
          if (result.success) {
            console.log('Link created successfully');
            
            // Update the temporary link with the real ID
            if (result.id) {
              const linkIndex = graphData.links.findIndex(l => l.id === `temp_${node.id}_${potentialLinkTarget.id}`);
              if (linkIndex !== -1) {
                graphData.links[linkIndex].id = result.id;
                graph.graphData(graphData);
              }
            }
            
            // Wait a bit before restoring forces (but don't reload data)
            setTimeout(() => {
              restoreForces(graph);
            }, 500);
          } else {
            // Remove the temporary link if the API call failed
            const linkIndex = graphData.links.findIndex(l => l.id === `temp_${node.id}_${potentialLinkTarget.id}`);
            if (linkIndex !== -1) {
              graphData.links.splice(linkIndex, 1);
              graph.graphData(graphData);
            }
            
            restoreForces(graph);
            console.error('Failed to create link:', result.error || 'Unknown error');
            alert('Failed to create link: ' + (result.error || 'Unknown error'));
          }
        })
        .catch(error => {
          restoreForces(graph);
          console.error('[API] Error creating link:', error);
          alert('Error creating link: ' + error);
        });
      } else {
        console.log('No nodes found within threshold distance');
        restoreForces(graph);
      }
      
      // Clear potential link target
      store.set('potentialLinkTarget', null);
      updateHighlight();
    });
  
  // Set up bloom effect if available
  if (typeof THREE !== 'undefined' && 
      typeof THREE.UnrealBloomPass !== 'undefined' && 
      typeof THREE.EffectComposer !== 'undefined') {
    
    console.log('Setting up bloom effect');
    
    // Create bloom pass with moderate settings
    const bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8, // strength
      0.8, // radius
      0.2  // threshold
    );
    
    // Add to composer
    graph.postProcessingComposer().addPass(bloomPass);
    
    // Update state
    store.update({
      graph,
      bloomPass
    });
    
    console.log('Bloom effect added successfully');
  } else {
    console.warn('THREE.UnrealBloomPass not available, skipping bloom effect');
    
    // Update state without bloom
    store.update({
      graph,
      bloomEnabled: false
    });
  }
  
  return graph;
}

/**
 * Restore forces after node drag
 * @param {Object} graph - The 3D graph instance
 */
function restoreForces(graph) {
  const originalChargeStrength = store.get('originalChargeStrength');
  
  // Restore forces
  graph.d3Force('charge').strength(originalChargeStrength);
  
  graph.d3Force('collide').radius(node => 15 + 5 * (node.val || 1));
  
  const linkForce = graph.d3Force('link');
  if (linkForce) {
    linkForce.strength(link => 2 * link.strength || 1);
  }
  
  graph.d3Force('center').strength(1);
  
  // Apply changes
  graph.d3ReheatSimulation();
  
  // Update state
  store.update({
    temporaryLinkFormed: false,
    repulsionReduced: false
  });
}

/**
 * Load graph data from the API
 * @param {boolean} preservePositions - Whether to preserve current node positions
 * @param {boolean} skipLinks - Whether to skip loading links (useful when manually adding links)
 * @returns {Promise} - A promise that resolves when data loading is complete
 */
export function loadData(preservePositions = false, skipLinks = false) {
  document.getElementById('loading-indicator').style.display = 'block';
  console.log('Fetching graph data...', skipLinks ? '(skipping links)' : '');
  
  // Store current positions if preserving
  const currentPositions = {};
  const graphData = store.get('graphData');
  const currentLinks = skipLinks ? graphData.links : [];
  
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
  
  // Return a promise that resolves when the data loading is complete
  return new Promise((resolve, reject) => {
    // Fetch data from API
    fetch('/api/graph/memory')
      .then(response => {
        console.log('Response received:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('Data received:', data);
        
        // If skipLinks is true, replace links in the data with the stored links
        if (skipLinks) {
          data.links = currentLinks;
          console.log('Using stored links instead of fetched links');
        }
        
        // Process the data
        processGraphData(data, currentPositions, preservePositions);
        
        // Hide loading indicator
        document.getElementById('loading-indicator').style.display = 'none';
        
        // Update domain colors (now handled by the caller)
        
        // Fetch link types
        if (typeof fetchLinkTypes === 'function') {
          fetchLinkTypes().then(types => {
            console.log(`Loaded ${types.length} link types for context menus`);
          }).catch(error => {
            console.warn('Error fetching link types, will use defaults:', error);
          });
        }
        
        // Resolve the promise with the data
        resolve(data);
      })
      .catch(error => {
        console.error('Error loading graph data:', error);
        
        // Hide the loading indicator instead of showing an error
        document.getElementById('loading-indicator').style.display = 'none';
        
        // Check if we need to show an error to the user
        if (!skipLinks) {
          // Only show error for full data loads, not for link-only operations
          const errorIndicator = document.createElement('div');
          errorIndicator.textContent = 'Error loading data. Please try again.';
          errorIndicator.style.position = 'fixed';
          errorIndicator.style.bottom = '10px';
          errorIndicator.style.right = '10px';
          errorIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
          errorIndicator.style.color = 'white';
          errorIndicator.style.padding = '10px';
          errorIndicator.style.borderRadius = '5px';
          errorIndicator.style.zIndex = 1000;
          document.body.appendChild(errorIndicator);
          
          // Remove after 3 seconds
          setTimeout(() => {
            if (document.body.contains(errorIndicator)) {
              document.body.removeChild(errorIndicator);
            }
          }, 3000);
        }
        
        // Reject the promise with the error
        reject(error);
      });
  });
}

/**
 * Process graph data and update visualization
 * @param {Object} data - Data from API
 * @param {Object} currentPositions - Current node positions to preserve
 * @param {boolean} preservePositions - Whether to preserve positions
 */
export function processGraphData(data, currentPositions = {}, preservePositions = false) {
  // Convert API data to graph format
  const { graph } = store.getState();
  
  // Process nodes
  const nodes = data.nodes.map(node => {
    const graphNode = {
      ...node,
      group: node.domain,
      // Scale node size based on tags
      val: node.tags && node.tags.length ? Math.min(5, node.tags.length) : 1
    };
    
    // Apply position if preserving positions
    if (preservePositions && currentPositions[node.id]) {
      const pos = currentPositions[node.id];
      graphNode.x = pos.x;
      graphNode.y = pos.y;
      graphNode.z = pos.z;
      graphNode.vx = pos.vx * 0.1; // Dampen velocity
      graphNode.vy = pos.vy * 0.1;
      graphNode.vz = pos.vz * 0.1;
      
      // Temporarily fix position to prevent jumping
      graphNode.fx = pos.x;
      graphNode.fy = pos.y;
      graphNode.fz = pos.z;
      
      // Release fixed position after a delay
      setTimeout(() => {
        if (graphNode.fx !== undefined) {
          graphNode.fx = undefined;
          graphNode.fy = undefined;
          graphNode.fz = undefined;
        }
      }, 1500);
    } else {
      // Random initial position
      graphNode.x = (Math.random() - 0.5) * 400;
      graphNode.y = (Math.random() - 0.5) * 400;
      graphNode.z = (Math.random() - 0.5) * 400;
    }
    
    return graphNode;
  });
  
  // Process links
  const links = data.links;
  
  // Update graph data
  const newGraphData = { nodes, links };
  
  // Log info
  console.log('Processed memory-centric graph data:', newGraphData);
  console.log(`Nodes: ${nodes.length}, Links: ${links.length}`);
  
  // Update store
  store.set('graphData', newGraphData);
  
  // Update graph visualization
  if (preservePositions) {
    // Use reduced charge strength initially to prevent explosive expansion
    graph.d3Force('charge').strength(originalChargeStrength * 0.3);
    
    // Update the graph
    graph.graphData(newGraphData);
    
    // Restore full charge strength after a delay
    setTimeout(() => {
      graph.d3Force('charge').strength(originalChargeStrength);
      graph.d3ReheatSimulation();
    }, 1000);
  } else {
    // Just update the graph
    graph.graphData(newGraphData);
  }
}

// Set up event listeners for cross-module communication
eventBus.on('graph:reload', ({ preservePositions = false, skipLinks = false }) => {
  loadData(preservePositions, skipLinks);
});

// Module exports
export default {
  initGraph,
  loadData,
  processGraphData
};