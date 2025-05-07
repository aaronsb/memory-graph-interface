/**
 * Data Loading Module
 * 
 * Handles loading and processing graph data from the API.
 */

import store from '../../state/store.js';
import { temporarilyReduceForces } from './forceManagement.js';
import { positionPlaneBelowNodes } from './referencePlane.js';

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
  const currentLinks = skipLinks ? (graphData?.links || []) : [];
  
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
    // Set a timeout to handle the case where the fetch takes too long
    const timeoutId = setTimeout(() => {
      console.warn('Data loading timeout - using empty data');
      document.getElementById('loading-indicator').style.display = 'none';
      
      // Create and process empty data
      const emptyData = { 
        nodes: [], 
        links: [] 
      };
      
      processGraphData(emptyData, {}, false);
      resolve(emptyData);
    }, 3000); // 3 second timeout
    
    // Fetch data from API
    fetch('/api/graph/memory')
      .then(response => {
        console.log('Response received:', response.status);
        return response.json();
      })
      .then(data => {
        clearTimeout(timeoutId); // Clear the timeout
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
        clearTimeout(timeoutId); // Clear the timeout
        console.error('Error loading graph data:', error);
        
        // Hide the loading indicator instead of showing an error
        document.getElementById('loading-indicator').style.display = 'none';
        
        // Create and process empty data
        const emptyData = { 
          nodes: [], 
          links: [] 
        };
        
        processGraphData(emptyData, {}, false);
        
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
        
        // Resolve with empty data instead of rejecting
        resolve(emptyData);
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
  
  // Position the reference plane below the lowest node, with offset
  if (nodes.length > 0 && store.get('referencePlane')?.visible) {
    positionPlaneBelowNodes(newGraphData, 100);
  }
  
  // Update graph visualization
  if (preservePositions) {
    // Use reduced charge strength initially to prevent explosive expansion
    const originalChargeStrength = store.get('originalChargeStrength');
    
    // Use helper from forceManagement
    if (typeof temporarilyReduceForces === 'function') {
      temporarilyReduceForces(graph, 1000);
    } else {
      // Fallback if helper not available
      graph.d3Force('charge').strength(originalChargeStrength * 0.3);
      
      // Update the graph
      graph.graphData(newGraphData);
      
      // Restore full charge strength after a delay
      setTimeout(() => {
        graph.d3Force('charge').strength(originalChargeStrength);
        graph.d3ReheatSimulation();
      }, 1000);
    }
    
    // Update graph data after force adjustment
    graph.graphData(newGraphData);
  } else {
    // Just update the graph
    graph.graphData(newGraphData);
  }
}

/**
 * Reload specific nodes or links without reloading the entire graph
 * @param {Array} nodeIds - Array of node IDs to reload
 * @param {Array} linkIds - Array of link IDs to reload
 * @returns {Promise} - A promise that resolves when data loading is complete
 */
export function reloadSpecificData(nodeIds = [], linkIds = []) {
  if (nodeIds.length === 0 && linkIds.length === 0) {
    return Promise.resolve(); // Nothing to reload
  }
  
  return new Promise((resolve, reject) => {
    // Build query string
    const nodeParams = nodeIds.map(id => `node=${encodeURIComponent(id)}`).join('&');
    const linkParams = linkIds.map(id => `link=${encodeURIComponent(id)}`).join('&');
    const queryString = nodeParams + (nodeParams && linkParams ? '&' : '') + linkParams;
    
    // Fetch specific data
    fetch(`/api/graph/elements?${queryString}`)
      .then(response => response.json())
      .then(data => {
        // Get current graph data
        const { graphData, graph } = store.getState();
        
        // Update nodes
        if (data.nodes && data.nodes.length > 0) {
          // Remove old nodes
          graphData.nodes = graphData.nodes.filter(node => !nodeIds.includes(node.id));
          
          // Add new nodes
          data.nodes.forEach(newNode => {
            // Find corresponding position in current graph if it exists
            const oldNode = graphData.nodes.find(n => n.id === newNode.id);
            if (oldNode) {
              // Preserve position and velocity
              newNode.x = oldNode.x;
              newNode.y = oldNode.y;
              newNode.z = oldNode.z;
              newNode.vx = oldNode.vx;
              newNode.vy = oldNode.vy;
              newNode.vz = oldNode.vz;
            }
            
            // Add to graph data
            graphData.nodes.push(newNode);
          });
        }
        
        // Update links
        if (data.links && data.links.length > 0) {
          // Remove old links
          graphData.links = graphData.links.filter(link => !linkIds.includes(link.id));
          
          // Add new links
          graphData.links.push(...data.links);
        }
        
        // Update the graph
        if (graph) {
          graph.graphData(graphData);
        }
        
        // Update state
        store.set('graphData', graphData);
        
        // Reposition reference plane if visible
        if (store.get('referencePlane')?.visible) {
          positionPlaneBelowNodes(graphData, 100);
        }
        
        resolve(data);
      })
      .catch(error => {
        console.error('Error reloading specific data:', error);
        reject(error);
      });
  });
}

export default {
  loadData,
  processGraphData,
  reloadSpecificData
};