/**
 * Reference Plane Module
 * 
 * Adds a grid-based reference plane to the graph to provide visual orientation
 * of "up" and "down" in the 3D space.
 */

import store from '../../state/store.js';

/**
 * Create and add a reference plane to the 3D force graph
 * @param {Object} graph - The 3D force graph instance
 * @param {Object} options - Configuration options for the plane
 */
export function addReferencePlane(graph, options = {}) {
  // Default options with reasonable values
  const config = {
    size: options.size || 1000,           // Size of the grid
    divisions: options.divisions || 50,    // Number of grid divisions
    color1: options.color1 || 0x444466,    // Main grid color
    color2: options.color2 || 0x222244,    // Secondary grid color
    planeColor: options.planeColor || 0x080820, // Color of the plane
    planeOpacity: options.planeOpacity || 0.1, // Opacity of the plane
    position: options.position || { x: 0, y: -200, z: 0 }, // Position below the graph
    visible: options.visible !== undefined ? options.visible : true, // Visibility
    autoAdjust: options.autoAdjust !== undefined ? options.autoAdjust : true // Auto-adjust position
  };

  console.log('Adding reference plane to graph');

  // Access the Three.js scene
  const scene = graph.scene();
  
  // Check if THREE is available
  if (typeof THREE === 'undefined') {
    console.error('THREE.js is not available. Cannot create reference plane.');
    return;
  }

  // Create a grid helper for the ground plane
  const gridHelper = new THREE.GridHelper(config.size, config.divisions, config.color1, config.color2);
  gridHelper.position.set(config.position.x, config.position.y, config.position.z);
  gridHelper.visible = config.visible;
  gridHelper.name = 'gridHelper'; // For identification
  
  // Create a semi-transparent plane for better visual reference
  const planeGeometry = new THREE.PlaneGeometry(config.size, config.size);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: config.planeColor,
    transparent: true,
    opacity: config.planeOpacity,
    side: THREE.DoubleSide
  });
  
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = Math.PI / 2; // Rotate to be horizontal
  plane.position.set(config.position.x, config.position.y, config.position.z);
  plane.visible = config.visible;
  plane.name = 'referencePlane'; // For identification
  
  // Add to scene
  scene.add(gridHelper);
  scene.add(plane);
  
  // Setup auto-adjustment interval if enabled
  let autoAdjustInterval = null;
  if (config.autoAdjust) {
    // Store the interval ID so we can clear it later if needed
    autoAdjustInterval = setInterval(() => {
      const { graphData, referencePlane } = store.getState();
      if (graphData && referencePlane?.visible) {
        // Check if we need to adjust the plane position
        const adjustNeeded = checkIfAdjustmentNeeded(graphData, referencePlane);
        if (adjustNeeded) {
          positionPlaneBelowNodes(graphData, 100);
        }
      }
    }, 2000); // Check every 2 seconds
  }
  
  // Store references in the store
  store.update({
    referencePlane: {
      grid: gridHelper,
      plane: plane,
      visible: config.visible,
      autoAdjust: config.autoAdjust,
      autoAdjustInterval: autoAdjustInterval
    }
  });
  
  // Make sure to refresh the view
  graph.refresh();
  
  return {
    grid: gridHelper,
    plane: plane
  };
}

/**
 * Toggle the visibility of the reference plane
 * @returns {boolean} New visibility state
 */
export function toggleReferencePlane() {
  const { referencePlane } = store.getState();
  
  if (!referencePlane) {
    console.warn('Reference plane not found. Create it first with addReferencePlane().');
    return false;
  }
  
  // Toggle visibility
  const newVisibility = !referencePlane.visible;
  
  referencePlane.grid.visible = newVisibility;
  referencePlane.plane.visible = newVisibility;
  
  // Handle interval based on visibility
  if (newVisibility) {
    // If turning on and auto-adjust is enabled but no interval is running, start it
    if (referencePlane.autoAdjust && !referencePlane.autoAdjustInterval) {
      const autoAdjustInterval = setInterval(() => {
        const { graphData, referencePlane } = store.getState();
        if (graphData && referencePlane?.visible) {
          const adjustNeeded = checkIfAdjustmentNeeded(graphData, referencePlane);
          if (adjustNeeded) {
            positionPlaneBelowNodes(graphData, 100);
          }
        }
      }, 2000); // Check every 2 seconds
      
      // Update the interval in the state
      store.update({
        referencePlane: {
          ...referencePlane,
          visible: newVisibility,
          autoAdjustInterval: autoAdjustInterval
        }
      });
    } else {
      // Just update visibility in state
      store.update({
        referencePlane: {
          ...referencePlane,
          visible: newVisibility
        }
      });
    }
  } else {
    // If turning off, clear the interval if it exists
    if (referencePlane.autoAdjustInterval) {
      clearInterval(referencePlane.autoAdjustInterval);
      
      // Update state
      store.update({
        referencePlane: {
          ...referencePlane,
          visible: newVisibility,
          autoAdjustInterval: null
        }
      });
    } else {
      // Just update visibility in state
      store.update({
        referencePlane: {
          ...referencePlane,
          visible: newVisibility
        }
      });
    }
  }
  
  // If making visible, immediately position the plane below all nodes
  if (newVisibility) {
    const { graphData } = store.getState();
    if (graphData && graphData.nodes && graphData.nodes.length > 0) {
      positionPlaneBelowNodes(graphData, 100);
    }
  }
  
  // Refresh the graph to show changes
  const graph = store.get('graph');
  if (graph) {
    graph.refresh();
  }
  
  return newVisibility;
}

/**
 * Updates the position or configuration of the reference plane
 * @param {Object} options - New configuration options 
 */
export function updateReferencePlane(options = {}) {
  const { referencePlane } = store.getState();
  
  if (!referencePlane) {
    console.warn('Reference plane not found. Create it first with addReferencePlane().');
    return;
  }
  
  // Update position if provided
  if (options.position) {
    referencePlane.grid.position.set(
      options.position.x || referencePlane.grid.position.x,
      options.position.y || referencePlane.grid.position.y,
      options.position.z || referencePlane.grid.position.z
    );
    
    referencePlane.plane.position.set(
      options.position.x || referencePlane.plane.position.x,
      options.position.y || referencePlane.plane.position.y,
      options.position.z || referencePlane.plane.position.z
    );
  }
  
  // Update visibility if provided
  if (options.visible !== undefined) {
    referencePlane.grid.visible = options.visible;
    referencePlane.plane.visible = options.visible;
    
    // Update state
    store.update({
      referencePlane: {
        ...referencePlane,
        visible: options.visible
      }
    });
  }
  
  // Refresh the graph to show changes
  const graph = store.get('graph');
  if (graph) {
    graph.refresh();
  }
}

/**
 * Check if the reference plane needs to be adjusted based on node positions
 * @param {Object} graphData - The graph data with nodes
 * @param {Object} referencePlane - The reference plane object from store
 * @param {number} minOffset - Minimum required offset (default: 50)
 * @returns {boolean} - Whether adjustment is needed
 */
function checkIfAdjustmentNeeded(graphData, referencePlane, minOffset = 50) {
  if (!graphData || !graphData.nodes || graphData.nodes.length === 0 || !referencePlane) {
    return false;
  }
  
  // Find the lowest node in the graph (most negative y value)
  let lowestY = graphData.nodes[0]?.y || 0;
  
  graphData.nodes.forEach(node => {
    if (node.y !== undefined && node.y < lowestY) {
      lowestY = node.y;
    }
  });
  
  // Get current plane position
  const currentPlaneY = referencePlane.grid.position.y;
  
  // Check if any node is below or too close to the plane
  if (lowestY <= currentPlaneY || lowestY - currentPlaneY < minOffset) {
    console.log('Plane adjustment needed: lowest node at', lowestY, 'plane at', currentPlaneY);
    return true;
  }
  
  return false;
}

/**
 * Position the reference plane below the lowest node in the graph
 * @param {Object} graphData - The graph data with nodes
 * @param {number} offset - Additional distance below the lowest node (default: 50)
 */
export function positionPlaneBelowNodes(graphData, offset = 50) {
  const { referencePlane } = store.getState();
  
  if (!referencePlane) {
    console.warn('Reference plane not found. Create it first with addReferencePlane().');
    return;
  }
  
  // Find the lowest node in the graph (most negative y value)
  let lowestY = 0;
  
  if (graphData && graphData.nodes && graphData.nodes.length > 0) {
    // Initialize with the first node's y position
    lowestY = graphData.nodes[0]?.y || 0;
    
    // Iterate through all nodes to find the lowest y value
    graphData.nodes.forEach(node => {
      if (node.y !== undefined && node.y < lowestY) {
        lowestY = node.y;
      }
    });
  }
  
  // Position the plane below the lowest node with additional offset
  const planeY = lowestY - offset;
  
  // Update both the grid and plane positions
  referencePlane.grid.position.y = planeY;
  referencePlane.plane.position.y = planeY;
  
  // Update state
  store.update({
    referencePlane: {
      ...referencePlane,
      position: {
        x: referencePlane.grid.position.x,
        y: planeY,
        z: referencePlane.grid.position.z
      }
    }
  });
  
  console.log(`Positioned reference plane at y=${planeY} (lowest node: ${lowestY}, offset: ${offset})`);
  
  // Refresh the graph to show changes
  const graph = store.get('graph');
  if (graph) {
    graph.refresh();
  }
}

/**
 * Clean up resources used by reference plane (useful when unloading the page)
 */
export function cleanupReferencePlane() {
  const { referencePlane } = store.getState();
  
  if (!referencePlane) {
    return;
  }
  
  // Clear auto-adjust interval if it exists
  if (referencePlane.autoAdjustInterval) {
    clearInterval(referencePlane.autoAdjustInterval);
  }
  
  // Remove plane from scene if possible
  const graph = store.get('graph');
  if (graph) {
    const scene = graph.scene();
    if (scene) {
      if (referencePlane.grid) scene.remove(referencePlane.grid);
      if (referencePlane.plane) scene.remove(referencePlane.plane);
      graph.refresh();
    }
  }
  
  // Clear from store
  store.update({
    referencePlane: null
  });
}

export default {
  addReferencePlane,
  toggleReferencePlane,
  updateReferencePlane,
  positionPlaneBelowNodes,
  cleanupReferencePlane
};