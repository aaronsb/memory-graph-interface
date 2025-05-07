/**
 * Drag Handling Module
 * 
 * Handles node dragging behavior and dynamic link creation during drag.
 */

import store from '../../state/store.js';
import { disableForcesDuringDrag, restoreForces } from './forceManagement.js';
import { updateHighlight } from '../../utils/helpers.js';
import * as eventBus from '../../utils/eventBus.js';

/**
 * Set up drag handling for the graph
 * @param {Object} graph - The 3D force graph instance
 */
export function setupDragHandling(graph) {
  // Node drag handling
  graph.onNodeDrag((node, translate) => {
    // Store the dragged node in state
    store.set('draggedNode', node);
    
    // Reduce forces during drag to make positioning easier
    disableForcesDuringDrag(graph);
    
    // Find potential link targets during drag
    findPotentialLinkTarget(graph, node);
  });
  
  // Node drag end handling
  graph.onNodeDragEnd(node => {
    console.log('Node drag ended:', node.id);
    store.set('draggedNode', null);
    
    // Get the potential link target
    const potentialLinkTarget = store.get('potentialLinkTarget');
    
    if (potentialLinkTarget) {
      createLinkAfterDrag(graph, node, potentialLinkTarget);
    } else {
      console.log('No nodes found within threshold distance');
      restoreForces(graph);
    }
    
    // Clear potential link target
    store.set('potentialLinkTarget', null);
    updateHighlight();
    
    // Emit event for node movement to update reference plane
    eventBus.emit('graph:nodesMoved');
  });
}

/**
 * Find potential link target during node drag
 * @param {Object} graph - The 3D force graph instance
 * @param {Object} node - The node being dragged
 */
function findPotentialLinkTarget(graph, node) {
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
}

/**
 * Create a link after drag is completed
 * @param {Object} graph - The 3D force graph instance
 * @param {Object} sourceNode - The source node (dragged node)
 * @param {Object} targetNode - The target node (drop target)
 */
function createLinkAfterDrag(graph, sourceNode, targetNode) {
  console.log('Found closest node within threshold:', targetNode.id);
  
  // Create link data
  const linkData = {
    source: sourceNode.id,
    target: targetNode.id,
    type: 'relates_to',
    strength: 0.7,
    domain: sourceNode.domain || targetNode.domain
  };
  
  // Create the link visually FIRST before the API call
  const newLink = {
    source: sourceNode.id,
    target: targetNode.id,
    type: 'relates_to',
    strength: 0.7,
    domain: sourceNode.domain || targetNode.domain,
    id: `temp_${sourceNode.id}_${targetNode.id}` // Temporary ID until we get the real one
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
        const linkIndex = graphData.links.findIndex(l => l.id === `temp_${sourceNode.id}_${targetNode.id}`);
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
      const linkIndex = graphData.links.findIndex(l => l.id === `temp_${sourceNode.id}_${targetNode.id}`);
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
}

export default {
  setupDragHandling
};