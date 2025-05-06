/**
 * Node Linking Module
 * 
 * Handles creating links between nodes.
 */

import store from '../../state/store.js';
import * as eventBus from '../../utils/eventBus.js';

/**
 * Create a promise for creating a link between two nodes
 * @param {Object} source - The source node
 * @param {Object} target - The target node
 * @returns {Promise} - Promise that resolves when link is created
 */
export function createLinkPromise(source, target) {
  // Check if link already exists
  const { graphData } = store.getState();
  const linkExists = graphData.links.some(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    return (sourceId === source.id && targetId === target.id) || 
           (sourceId === target.id && targetId === source.id);
  });
  
  // Skip if link already exists
  if (linkExists) {
    console.log(`Link between ${source.id} and ${target.id} already exists, skipping`);
    return Promise.resolve({ success: false, error: 'Edge already exists' });
  }
  
  // Prepare link data
  const linkData = {
    source: source.id,
    target: target.id,
    type: 'relates_to',
    strength: 0.7,
    domain: source.domain || target.domain
  };
  
  // First create a temporary local link for immediate visual feedback
  const tempLink = {
    ...linkData,
    id: `temp_${source.id}_${target.id}` // Temporary ID until we get the real one
  };
  
  // Add to graph data
  graphData.links.push(tempLink);
  
  // Update the graph visualization
  const { graph } = store.getState();
  if (graph) {
    graph.graphData(graphData);
  }
  
  // Create link via API
  return fetch('/api/edges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(linkData)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log(`Link created between ${source.id} and ${target.id}`);
      
      // Update the temporary link with the real ID
      if (result.id) {
        const linkIndex = graphData.links.findIndex(l => 
          l.id === `temp_${source.id}_${target.id}`
        );
        
        if (linkIndex !== -1) {
          graphData.links[linkIndex].id = result.id;
          
          // Update the graph visualization
          if (graph) {
            graph.graphData(graphData);
          }
        }
      }
      
      return {
        success: true,
        data: {
          ...linkData,
          id: result.id || `temp_${source.id}_${target.id}`
        }
      };
    } else {
      console.error('Failed to create link:', result.error);
      
      // Remove the temporary link
      const linkIndex = graphData.links.findIndex(l => 
        l.id === `temp_${source.id}_${target.id}`
      );
      
      if (linkIndex !== -1) {
        graphData.links.splice(linkIndex, 1);
        
        // Update the graph visualization
        if (graph) {
          graph.graphData(graphData);
        }
      }
      
      return { success: false, error: result.error || 'Unknown error' };
    }
  })
  .catch(error => {
    console.error('Error creating link:', error);
    
    // Remove the temporary link
    const linkIndex = graphData.links.findIndex(l => 
      l.id === `temp_${source.id}_${target.id}`
    );
    
    if (linkIndex !== -1) {
      graphData.links.splice(linkIndex, 1);
      
      // Update the graph visualization
      if (graph) {
        graph.graphData(graphData);
      }
    }
    
    return { success: false, error: error.toString() };
  });
}

/**
 * Link all selected nodes to each other
 */
export function handleLinkAllSelected() {
  const { multiSelectedNodes } = store.getState();
  
  // Check if we have at least 2 nodes
  if (multiSelectedNodes.length < 2) {
    console.warn('Need at least 2 nodes to create links');
    return;
  }
  
  console.log(`Creating links between ${multiSelectedNodes.length} nodes`);
  
  // Create an array of promises for creating each link
  const linkPromises = [];
  
  // For each pair of nodes
  for (let i = 0; i < multiSelectedNodes.length; i++) {
    for (let j = i + 1; j < multiSelectedNodes.length; j++) {
      const source = multiSelectedNodes[i];
      const target = multiSelectedNodes[j];
      
      // Create a promise for creating this link
      linkPromises.push(createLinkPromise(source, target));
    }
  }
  
  // Wait for all links to be created
  Promise.all(linkPromises)
    .then(results => {
      const successCount = results.filter(result => result.success).length;
      const skipCount = results.filter(result => !result.success && result.error === 'Edge already exists').length;
      const errorCount = results.filter(result => !result.success && result.error !== 'Edge already exists').length;
      
      console.log(`Created ${successCount} links, skipped ${skipCount} existing links, ${errorCount} errors`);
      
      // Find successful link creations
      const successfulLinks = results.filter(result => result.success).map(result => result.data);
      
      // Add the successful links to the graph data visually first
      const { graphData, graph } = store.getState();
      successfulLinks.forEach(linkData => {
        graphData.links.push(linkData);
      });
      
      // Update the graph visualization immediately
      if (graph) {
        graph.graphData(graphData);
        
        // Store the updated graph data
        store.set('graphData', graphData);
        
        // Reload full data from server after a short delay
        setTimeout(() => {
          // Emit event to reload graph data
          eventBus.emit('graph:reload', { preservePositions: true, skipLinks: true });
        }, 500);
      }
      
      // Show success message
      alert(`Created ${successCount} links, skipped ${skipCount} existing links, ${errorCount} errors`);
    })
    .catch(error => {
      console.error('Error creating links:', error);
      alert('Error creating links: ' + error);
    });
}

export default {
  createLinkPromise,
  handleLinkAllSelected
};