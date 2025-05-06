/**
 * Link Management Module
 * 
 * Handles creation, deletion, and modification of links between nodes.
 */

import store from '../state/store.js';
import { updateCombinedHighlights, updateHighlight } from '../utils/helpers.js';
import { showCustomConfirmDialog } from './nodeInteractions.js';

/**
 * Toggle link creation mode
 * @param {Object} sourceNode - Optional source node to start link creation from
 */
export function toggleLinkCreationMode(sourceNode = null) {
  const { linkCreationMode, linkSourceNode } = store.getState();
  
  if (linkCreationMode) {
    // Exiting link creation mode
    console.log('Exiting link creation mode');
    
    store.update({
      linkCreationMode: false,
      linkSourceNode: null
    });
    
    // Hide any help or UI indicators
    const linkHint = document.getElementById('link-hint');
    if (linkHint) {
      linkHint.style.display = 'none';
    }
  } else {
    // Entering link creation mode
    console.log('Entering link creation mode' + (sourceNode ? ` from node ${sourceNode.id}` : ''));
    
    store.update({
      linkCreationMode: true,
      linkSourceNode: sourceNode
    });
    
    // Show help indicator if available
    const linkHint = document.getElementById('link-hint');
    if (linkHint) {
      linkHint.style.display = 'block';
      linkHint.innerHTML = sourceNode 
        ? `<strong>Link Creation Mode:</strong> Click on a target node to create a link from "${sourceNode.id}". Press ESC to cancel.`
        : `<strong>Link Creation Mode Active:</strong> Select a source node, then a target node. Press ESC to cancel.`;
    }
  }
}

/**
 * Create a link between two nodes
 * @param {Object} source - Source node
 * @param {Object} target - Target node
 */
export function handleCreateLink(source, target) {
  // Check that we have valid source and target
  if (!source || !target) {
    console.error('Invalid source or target node for link creation');
    return;
  }
  
  // Check that source and target are different nodes
  if (source.id === target.id) {
    console.warn('Cannot create a link from a node to itself');
    return;
  }
  
  console.log(`Creating link from ${source.id} to ${target.id}`);
  
  // Clear link creation mode if active
  if (store.get('linkCreationMode')) {
    toggleLinkCreationMode();
  }
  
  // Create link data
  const linkData = {
    source_id: source.id,
    target_id: target.id,
    type: 'relates_to', // Default type
    strength: 0.5, // Default strength
    domain: source.domain || target.domain // Use one of the node's domains if available
  };
  
  // Send API request to create the link
  fetch('/api/edges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(linkData)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('Link created successfully, reloading data');
      
      // Reload data to reflect the new link
      const loadData = require('./graph').loadData;
      loadData(true); // preserve positions
    } else {
      console.error('Failed to create link:', result.error || 'Unknown error');
      
      if (result.error && result.error.includes('Edge already exists')) {
        alert('Link already exists between these nodes');
      } else {
        alert('Failed to create link: ' + (result.error || 'Unknown error'));
      }
    }
  })
  .catch(error => {
    console.error('Error creating link:', error);
    alert('Error creating link: ' + error);
  });
}

/**
 * Delete a link
 * @param {Object} link - The link to delete
 */
export function handleDeleteLink(link) {
  console.log('Deleting link:', link);
  
  // Get source and target IDs
  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
  const targetId = typeof link.target === 'object' ? link.target.id : link.target;
  
  // Show confirmation dialog
  showCustomConfirmDialog(
    `Are you sure you want to delete link from "${sourceId}" to "${targetId}"?`,
    () => {
      // Construct API endpoint
      let apiEndpoint = `/api/edges/${link.id}`;
      
      // If no link ID, use source and target IDs
      if (!link.id) {
        apiEndpoint = `/api/edges?source=${sourceId}&target=${targetId}`;
      }
      
      // Delete the link via API
      fetch(apiEndpoint, {
        method: 'DELETE'
      })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          console.log('Link deleted successfully');
          
          // Remove the link from our graph data
          const { graphData } = store.getState();
          const linkIndex = graphData.links.findIndex(l => {
            const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
            
            return (lSourceId === sourceId && lTargetId === targetId) ||
                   (l.id && l.id === link.id);
          });
          
          if (linkIndex !== -1) {
            // Remove the link
            graphData.links.splice(linkIndex, 1);
            
            // Update the graph
            const { graph } = store.getState();
            if (graph) {
              graph.graphData(graphData);
            }
            
            // Update state
            store.set('graphData', graphData);
            
            // Clear this link from any selections
            clearLinkFromSelections(link);
          }
        } else {
          console.error('Failed to delete link:', result.error);
          alert('Failed to delete link: ' + (result.error || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Error deleting link:', error);
        alert('Error deleting link: ' + error);
      });
    }
  );
}

/**
 * Clear a link from all selection sets
 * @param {Object} link - The link to clear
 */
function clearLinkFromSelections(link) {
  const { 
    highlightLinks,
    selectedHighlightLinks,
    hoverHighlightLinks
  } = store.getState();
  
  // Remove from highlight sets
  highlightLinks.delete(link);
  selectedHighlightLinks.delete(link);
  hoverHighlightLinks.delete(link);
  
  // Update state
  store.update({
    highlightLinks: new Set(highlightLinks),
    selectedHighlightLinks: new Set(selectedHighlightLinks),
    hoverHighlightLinks: new Set(hoverHighlightLinks)
  });
  
  // Update visual highlighting
  updateCombinedHighlights();
  updateHighlight();
}

/**
 * Change the strength of a link
 * @param {Object} link - The link to change
 * @param {number} newStrength - The new strength value (0-1)
 */
export function handleChangeStrength(link, newStrength) {
  console.log(`Changing link strength to ${newStrength} for link:`, link);
  
  // Validate strength value
  newStrength = Math.max(0, Math.min(1, newStrength));
  
  // Get source and target IDs
  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
  const targetId = typeof link.target === 'object' ? link.target.id : link.target;
  
  // Prepare the update data
  const updateData = {
    source_id: sourceId,
    target_id: targetId,
    strength: newStrength
  };
  
  // Update via API
  fetch('/api/edges/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('Link strength updated successfully');
      
      // Update the link in our graph data
      const { graphData } = store.getState();
      const linkIndex = graphData.links.findIndex(l => {
        const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
        
        return (lSourceId === sourceId && lTargetId === targetId) ||
               (l.id && l.id === link.id);
      });
      
      if (linkIndex !== -1) {
        // Update the link
        graphData.links[linkIndex].strength = newStrength;
        
        // Update the graph
        const { graph } = store.getState();
        if (graph) {
          // Force physics simulation to respect new strength
          graph.d3Force('link')
            .distance(link => 200 - 150 * (typeof link.strength === 'number' ? link.strength : 0.5))
            .strength(link => 2 * link.strength);
          
          graph.graphData(graphData);
          graph.d3ReheatSimulation();
        }
        
        // Update state
        store.set('graphData', graphData);
      }
    } else {
      console.error('Failed to update link strength:', result.error);
      alert('Failed to update link strength: ' + (result.error || 'Unknown error'));
    }
  })
  .catch(error => {
    console.error('Error updating link strength:', error);
    alert('Error updating link strength: ' + error);
  });
}

/**
 * Change the type of a link
 * @param {Object} link - The link to change
 * @param {string} newType - The new link type
 */
export function handleChangeLinkType(link, newType) {
  console.log(`Changing link type to ${newType} for link:`, link);
  
  // Get source and target IDs
  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
  const targetId = typeof link.target === 'object' ? link.target.id : link.target;
  
  // Prepare the update data
  const updateData = {
    source_id: sourceId,
    target_id: targetId,
    type: newType
  };
  
  // Update via API
  fetch('/api/edges/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('Link type updated successfully');
      
      // Update the link in our graph data
      const { graphData } = store.getState();
      const linkIndex = graphData.links.findIndex(l => {
        const lSourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const lTargetId = typeof l.target === 'object' ? l.target.id : l.target;
        
        return (lSourceId === sourceId && lTargetId === targetId) ||
               (l.id && l.id === link.id);
      });
      
      if (linkIndex !== -1) {
        // Update the link
        graphData.links[linkIndex].type = newType;
        
        // Update the graph
        const { graph } = store.getState();
        if (graph) {
          graph.graphData(graphData);
        }
        
        // Update state
        store.set('graphData', graphData);
      }
    } else {
      console.error('Failed to update link type:', result.error);
      alert('Failed to update link type: ' + (result.error || 'Unknown error'));
    }
  })
  .catch(error => {
    console.error('Error updating link type:', error);
    alert('Error updating link type: ' + error);
  });
}

/**
 * Fetch available link types from API
 * @returns {Promise<Array>} - Array of link types
 */
export function fetchLinkTypes() {
  return fetch('/api/link-types')
    .then(response => response.json())
    .then(data => {
      if (data.success && Array.isArray(data.types)) {
        const linkTypes = data.types;
        
        // Update state
        store.set('allLinkTypes', linkTypes);
        
        return linkTypes;
      } else {
        // Return default types if API call fails
        const defaultTypes = ['relates_to', 'synthesizes', 'supports', 'refines', 'references'];
        store.set('allLinkTypes', defaultTypes);
        return defaultTypes;
      }
    })
    .catch(error => {
      console.error('Error fetching link types:', error);
      
      // Return default types on error
      const defaultTypes = ['relates_to', 'synthesizes', 'supports', 'refines', 'references'];
      store.set('allLinkTypes', defaultTypes);
      return defaultTypes;
    });
}

/**
 * Get link types for the current pagination page
 * @returns {Array} - Array of link types for the current page
 */
export function getCurrentPageLinkTypes() {
  const allLinkTypes = store.get('allLinkTypes') || [];
  const currentPage = store.get('currentLinkTypePage') || 0;
  const pageSize = 10;
  
  const start = currentPage * pageSize;
  const end = Math.min(start + pageSize, allLinkTypes.length);
  
  return allLinkTypes.slice(start, end);
}

/**
 * Navigate to the next page of link types
 */
export function nextLinkTypePage() {
  const { currentLinkTypePage = 0, allLinkTypes = [] } = store.getState();
  const pageSize = 10;
  const totalPages = Math.ceil(allLinkTypes.length / pageSize);
  
  if (currentLinkTypePage < totalPages - 1) {
    store.set('currentLinkTypePage', currentLinkTypePage + 1);
  }
}

/**
 * Navigate to the previous page of link types
 */
export function prevLinkTypePage() {
  const currentLinkTypePage = store.get('currentLinkTypePage') || 0;
  
  if (currentLinkTypePage > 0) {
    store.set('currentLinkTypePage', currentLinkTypePage - 1);
  }
}

/**
 * Get pagination info for link types
 * @returns {Object} - Pagination info object
 */
export function getLinkTypePaginationInfo() {
  const allLinkTypes = store.get('allLinkTypes') || [];
  const currentPage = store.get('currentLinkTypePage') || 0;
  const pageSize = 10;
  const totalPages = Math.ceil(allLinkTypes.length / pageSize);
  
  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems: allLinkTypes.length
  };
}

/**
 * Create a promise for link creation (for batch operations)
 * @param {Object} source - Source node
 * @param {Object} target - Target node
 * @returns {Promise} - Promise that resolves when link is created
 */
export function createLinkPromise(source, target) {
  return new Promise(resolve => {
    // Create link data
    const linkPayload = {
      source_id: source.id,
      target_id: target.id,
      type: 'relates_to', // Default type
      strength: 0.5, // Default strength
      domain: source.domain || target.domain // Use one of the node's domains if available
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

// Export module
export default {
  toggleLinkCreationMode,
  handleCreateLink,
  handleDeleteLink,
  handleChangeStrength,
  handleChangeLinkType,
  fetchLinkTypes,
  getCurrentPageLinkTypes,
  nextLinkTypePage,
  prevLinkTypePage,
  getLinkTypePaginationInfo,
  createLinkPromise
};