/**
 * Force Management Module
 * 
 * Handles management of physical forces in the 3D force graph.
 */

import store from '../../state/store.js';

/**
 * Restore forces after node drag
 * @param {Object} graph - The 3D graph instance
 */
export function restoreForces(graph) {
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
 * Disable forces during drag operations
 * @param {Object} graph - The 3D graph instance
 */
export function disableForcesDuringDrag(graph) {
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
}

/**
 * Adjust forces based on graph parameters
 * @param {Object} graph - The 3D graph instance
 * @param {Object} params - Parameters for force adjustment
 */
export function adjustForces(graph, params = {}) {
  const { 
    chargeStrength, 
    linkDistance,
    linkStrength,
    collideRadius
  } = params;
  
  // Update charge force if specified
  if (chargeStrength !== undefined) {
    graph.d3Force('charge').strength(chargeStrength);
  }
  
  // Update link force parameters if specified
  const linkForce = graph.d3Force('link');
  if (linkForce) {
    if (linkDistance !== undefined) {
      linkForce.distance(linkDistance);
    }
    
    if (linkStrength !== undefined) {
      linkForce.strength(linkStrength);
    }
  }
  
  // Update collision radius if specified
  if (collideRadius !== undefined) {
    graph.d3Force('collide').radius(collideRadius);
  }
  
  // Apply changes
  graph.d3ReheatSimulation();
}

/**
 * Temporarily reduce forces for a specified duration
 * @param {Object} graph - The 3D graph instance
 * @param {number} duration - Duration in milliseconds
 */
export function temporarilyReduceForces(graph, duration = 1000) {
  const originalChargeStrength = store.get('originalChargeStrength');
  
  // Reduce charge strength
  graph.d3Force('charge').strength(originalChargeStrength * 0.3);
  
  // Apply changes
  graph.d3ReheatSimulation();
  
  // Restore forces after duration
  setTimeout(() => {
    graph.d3Force('charge').strength(originalChargeStrength);
    graph.d3ReheatSimulation();
  }, duration);
}

export default {
  restoreForces,
  disableForcesDuringDrag,
  adjustForces,
  temporarilyReduceForces
};