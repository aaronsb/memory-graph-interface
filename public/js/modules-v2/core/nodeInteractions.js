/**
 * Node Interactions Module
 * 
 * Handles user interactions with nodes, including viewing details,
 * deleting nodes, multi-selection, and tag management.
 */

import store from '../state/store.js';
import { updateCombinedHighlights, updateHighlight } from '../utils/helpers.js';

/**
 * Show details for a node in the info panel
 * @param {Object} node - The node to show details for
 */
export function handleViewNodeDetails(node) {
  console.log('Viewing details for node:', node.id);
  
  // Update state
  store.set('selectedNode', node);
  
  // Clear previous selection
  const { selectedHighlightNodes, selectedHighlightLinks } = store.getState();
  selectedHighlightNodes.clear();
  selectedHighlightLinks.clear();
  
  if (node) {
    // Add newly selected node
    selectedHighlightNodes.add(node);
    
    // Add links connected to this node
    const { graphData } = store.getState();
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === node.id || targetId === node.id) {
        selectedHighlightLinks.add(link);
      }
    });
    
    // Show info panel
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) {
      // Set node ID in panel header
      const nodeIdElement = document.getElementById('node-id');
      if (nodeIdElement) {
        nodeIdElement.textContent = node.id;
      }
      
      // Set node content
      const nodeContent = document.getElementById('node-content');
      if (nodeContent) {
        // Use content_summary if available, otherwise use content
        nodeContent.innerHTML = node.content || '';
      }
      
      // Set node tags
      const nodeTags = document.getElementById('node-tags');
      if (nodeTags) {
        nodeTags.innerHTML = '';
        
        if (node.tags && node.tags.length > 0) {
          node.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = tag;
            nodeTags.appendChild(tagElement);
          });
        }
        
        // Add summary if available
        if (node.content_summary) {
          const summaryDiv = document.createElement('div');
          summaryDiv.className = 'summary';
          summaryDiv.textContent = node.content_summary;
          nodeTags.appendChild(summaryDiv);
        }
      }
      
      // Show the panel
      infoPanel.style.display = 'block';
    }
    
    // If auto-zoom is enabled, zoom to the node
    const { zoomOnSelect, graph } = store.getState();
    if (zoomOnSelect && graph) {
      graph.centerAt(node.x, node.y, node.z, 1000);
      graph.zoom(1.5, 1000);
    }
  } else {
    // Hide info panel if no node is selected
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) {
      infoPanel.style.display = 'none';
    }
  }
  
  // Update state with new selection
  store.update({
    selectedHighlightNodes: new Set(selectedHighlightNodes),
    selectedHighlightLinks: new Set(selectedHighlightLinks)
  });
  
  // Update visual highlighting
  updateCombinedHighlights();
  updateHighlight();
}

/**
 * Handle multi-selection of a node (shift+click)
 * @param {Object} node - The node to add to multi-selection
 */
export function handleMultiSelectNode(node) {
  console.log('Multi-selecting node:', node.id);
  
  // Get multi-selection state
  const { multiSelectedNodes, multiSelectHighlightNodes } = store.getState();
  
  // Check if node is already selected
  const index = multiSelectedNodes.findIndex(n => n.id === node.id);
  
  if (index !== -1) {
    // Node already selected, remove it
    multiSelectedNodes.splice(index, 1);
    multiSelectHighlightNodes.delete(node);
    console.log('Removed node from multi-selection:', node.id);
  } else {
    // Node not selected, add it
    multiSelectedNodes.push(node);
    multiSelectHighlightNodes.add(node);
    console.log('Added node to multi-selection:', node.id);
  }
  
  // Update state
  store.update({
    multiSelectActive: multiSelectedNodes.length > 0,
    multiSelectedNodes: [...multiSelectedNodes],
    multiSelectHighlightNodes: new Set(multiSelectHighlightNodes)
  });
  
  // Update visual highlighting
  updateCombinedHighlights();
  updateHighlight();
  
  // Show selection panel if not already shown
  showSelectionPanel();
  
  // Update selection panel contents
  updateSelectionPanel();
}

/**
 * Show the tag input for a node
 * @param {Object} node - The node to add tags to
 */
export function handleShowTagInput(node) {
  console.log('Showing tag input for node:', node.id);
  
  // First, ensure the info panel is shown for this node
  handleViewNodeDetails(node);
  
  // Get the node tags element
  const nodeTags = document.getElementById('node-tags');
  if (!nodeTags) return;
  
  // Check if input already exists
  if (document.getElementById('tag-input')) return;
  
  // Create a tag input container
  const inputContainer = document.createElement('div');
  inputContainer.className = 'tag-input-container';
  inputContainer.style.marginTop = '10px';
  inputContainer.style.display = 'flex';
  
  // Create the input element
  const input = document.createElement('input');
  input.id = 'tag-input';
  input.type = 'text';
  input.placeholder = 'Add tag...';
  input.style.flex = '1';
  input.style.padding = '8px';
  input.style.backgroundColor = 'rgba(40, 40, 60, 0.7)';
  input.style.color = '#fff';
  input.style.border = '1px solid rgba(100, 100, 255, 0.3)';
  input.style.borderRadius = '4px';
  input.style.marginRight = '5px';
  
  // Create the add button
  const addButton = document.createElement('button');
  addButton.id = 'add-tag-btn';
  addButton.textContent = 'Add';
  addButton.style.padding = '8px 12px';
  addButton.style.backgroundColor = '#2a5298';
  addButton.style.color = '#fff';
  addButton.style.border = 'none';
  addButton.style.borderRadius = '4px';
  addButton.style.cursor = 'pointer';
  
  // Add button click handler
  addButton.onclick = function() {
    const tagValue = input.value.trim();
    if (tagValue) {
      // Add the tag to the node
      addTagToNode(node, tagValue);
      
      // Clear the input
      input.value = '';
      
      // Focus back on the input
      input.focus();
    }
  };
  
  // Add keydown handler for Enter key
  input.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      addButton.click();
    }
  });
  
  // Append elements to container
  inputContainer.appendChild(input);
  inputContainer.appendChild(addButton);
  
  // Add to the DOM
  nodeTags.appendChild(inputContainer);
  
  // Focus on the input
  input.focus();
}

/**
 * Add a tag to a node
 * @param {Object} node - The node to add the tag to
 * @param {string} tag - The tag to add
 */
export function addTagToNode(node, tag) {
  console.log('Adding tag to node:', node.id, tag);
  
  // Ensure node has a tags array
  if (!node.tags) {
    node.tags = [];
  }
  
  // Check if tag already exists
  if (node.tags.includes(tag)) {
    console.log('Tag already exists on node');
    return;
  }
  
  // Add the tag
  node.tags.push(tag);
  
  // Update the node via API
  fetch('/api/tags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      node_id: node.id,
      tag
    })
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('Tag added successfully');
      
      // Refresh the node details display
      handleViewNodeDetails(node);
    } else {
      console.error('Failed to add tag:', result.error);
      
      // Remove the tag from the local node object
      const index = node.tags.indexOf(tag);
      if (index !== -1) {
        node.tags.splice(index, 1);
      }
    }
  })
  .catch(error => {
    console.error('Error adding tag:', error);
    
    // Remove the tag from the local node object
    const index = node.tags.indexOf(tag);
    if (index !== -1) {
      node.tags.splice(index, 1);
    }
  });
}

/**
 * Delete a node
 * @param {Object} node - The node to delete
 */
export function handleDeleteNode(node) {
  console.log('Deleting node:', node.id);
  
  // Show confirmation dialog
  showCustomConfirmDialog(
    `Are you sure you want to delete node "${node.id}"?`,
    () => {
      // User confirmed deletion
      fetch(`/api/nodes/${node.id}`, {
        method: 'DELETE'
      })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          console.log('Node deleted successfully');
          
          // Remove the node from our graph data
          const { graphData } = store.getState();
          const nodeIndex = graphData.nodes.findIndex(n => n.id === node.id);
          
          if (nodeIndex !== -1) {
            // Remove the node
            graphData.nodes.splice(nodeIndex, 1);
            
            // Remove any links connected to this node
            graphData.links = graphData.links.filter(link => {
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              
              return sourceId !== node.id && targetId !== node.id;
            });
            
            // Update the graph
            const { graph } = store.getState();
            if (graph) {
              graph.graphData(graphData);
            }
            
            // Update state
            store.set('graphData', graphData);
            
            // If this was the selected node, clear selection
            if (store.get('selectedNode')?.id === node.id) {
              handleViewNodeDetails(null);
            }
            
            // Clear this node from any selections
            clearNodeFromSelections(node);
          }
        } else {
          console.error('Failed to delete node:', result.error);
          alert('Failed to delete node: ' + (result.error || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('Error deleting node:', error);
        alert('Error deleting node: ' + error);
      });
    }
  );
}

/**
 * Clear a node from all selection sets
 * @param {Object} node - The node to clear
 */
function clearNodeFromSelections(node) {
  const { 
    highlightNodes,
    selectedHighlightNodes,
    hoverHighlightNodes,
    multiSelectHighlightNodes,
    multiSelectedNodes
  } = store.getState();
  
  // Remove from highlight sets
  highlightNodes.delete(node);
  selectedHighlightNodes.delete(node);
  hoverHighlightNodes.delete(node);
  multiSelectHighlightNodes.delete(node);
  
  // Remove from multi-selected nodes array
  const index = multiSelectedNodes.findIndex(n => n.id === node.id);
  if (index !== -1) {
    multiSelectedNodes.splice(index, 1);
  }
  
  // Update state
  store.update({
    highlightNodes: new Set(highlightNodes),
    selectedHighlightNodes: new Set(selectedHighlightNodes),
    hoverHighlightNodes: new Set(hoverHighlightNodes),
    multiSelectHighlightNodes: new Set(multiSelectHighlightNodes),
    multiSelectedNodes: [...multiSelectedNodes]
  });
  
  // Update visual highlighting
  updateCombinedHighlights();
  updateHighlight();
}

/**
 * Show a custom confirmation dialog
 * @param {string} message - The message to show
 * @param {Function} yesCallback - The callback to call if the user confirms
 */
export function showCustomConfirmDialog(message, yesCallback) {
  // Get the dialog element
  const dialog = document.getElementById('custom-confirm-dialog');
  const messageElement = document.getElementById('confirm-message');
  const yesButton = document.getElementById('confirm-yes-btn');
  const noButton = document.getElementById('confirm-no-btn');
  
  if (!dialog || !messageElement || !yesButton || !noButton) {
    // Fallback to browser confirm if elements not found
    if (confirm(message)) {
      yesCallback();
    }
    return;
  }
  
  // Set the message
  messageElement.textContent = message;
  
  // Set up the yes button
  yesButton.onclick = function() {
    dialog.style.display = 'none';
    yesCallback();
  };
  
  // Set up the no button
  noButton.onclick = function() {
    dialog.style.display = 'none';
  };
  
  // Show the dialog
  dialog.style.display = 'block';
}

/**
 * Show the selection panel for multi-select
 */
export function showSelectionPanel() {
  const selectionPanel = document.getElementById('selection-panel');
  if (!selectionPanel) return;
  
  // Make the panel visible
  selectionPanel.style.display = 'block';
  
  // Update selection panel position
  updateSelectionPanelPosition();
}

/**
 * Update the position of the selection panel
 */
export function updateSelectionPanelPosition() {
  const infoPanel = document.getElementById('info-panel');
  const selectionPanel = document.getElementById('selection-panel');
  
  if (!infoPanel || !selectionPanel) return;
  
  // Check if the info panel is visible
  const infoPanelVisible = infoPanel.style.display !== 'none';
  
  // If the info panel is visible, position the selection panel to its left
  if (infoPanelVisible) {
    selectionPanel.style.right = `${420}px`; // More than info panel width (400px) + the right padding (10px)
  } else {
    selectionPanel.style.right = '10px';
  }
}

/**
 * Update the selection panel contents
 */
export function updateSelectionPanel() {
  const { multiSelectedNodes } = store.getState();
  
  // Get elements
  const selectionPanel = document.getElementById('selection-panel');
  const selectionList = document.getElementById('selection-list');
  const selectionCount = document.getElementById('selection-count');
  
  if (!selectionPanel || !selectionList || !selectionCount) return;
  
  // Update count
  selectionCount.textContent = multiSelectedNodes.length;
  
  // Clear list
  selectionList.innerHTML = '';
  
  // Add each selected node to the list
  multiSelectedNodes.forEach(node => {
    const item = document.createElement('div');
    item.className = 'selection-item';
    
    const itemText = document.createElement('div');
    itemText.className = 'selection-item-text';
    itemText.textContent = node.id;
    
    const removeButton = document.createElement('div');
    removeButton.className = 'selection-item-remove';
    removeButton.textContent = '✖';
    removeButton.title = 'Remove from selection';
    removeButton.addEventListener('click', () => {
      handleMultiSelectNode(node);
    });
    
    item.appendChild(itemText);
    item.appendChild(removeButton);
    selectionList.appendChild(item);
  });
}

/**
 * Hide the selection panel
 */
export function hideSelectionPanel() {
  const selectionPanel = document.getElementById('selection-panel');
  if (!selectionPanel) return;
  
  selectionPanel.style.display = 'none';
}

/**
 * Set up selection panel event listeners
 */
export function setupSelectionPanelListeners() {
  // Selection panel close button
  const closeButton = document.getElementById('selection-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      hideSelectionPanel();
    });
  }
  
  // Clear selection button
  const clearButton = document.getElementById('clear-selection-btn');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      const { multiSelectedNodes, multiSelectHighlightNodes } = store.getState();
      
      // Clear selection
      multiSelectedNodes.length = 0;
      multiSelectHighlightNodes.clear();
      
      // Update state
      store.update({
        multiSelectActive: false,
        multiSelectedNodes: [],
        multiSelectHighlightNodes: new Set()
      });
      
      // Update visual highlighting
      updateCombinedHighlights();
      updateHighlight();
      
      // Hide panel
      hideSelectionPanel();
    });
  }
  
  // Link selected nodes button
  const linkButton = document.getElementById('link-selected-btn');
  if (linkButton) {
    linkButton.addEventListener('click', () => {
      handleLinkAllSelected();
    });
  }
  
  // Selection panel copy button
  const copyButton = document.getElementById('selection-copy');
  if (copyButton) {
    copyButton.addEventListener('click', () => {
      const { multiSelectedNodes } = store.getState();
      
      // Create text to copy
      const text = multiSelectedNodes.map(node => node.id).join('\n');
      
      // Copy to clipboard
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log('Selection copied to clipboard');
        })
        .catch(err => {
          console.error('Failed to copy selection:', err);
        });
    });
  }
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
          const loadData = require('./graph').loadData;
          loadData(true, true); // preserve positions and skip links
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

// Export module
export default {
  handleViewNodeDetails,
  handleMultiSelectNode,
  handleShowTagInput,
  addTagToNode,
  handleDeleteNode,
  showCustomConfirmDialog,
  showSelectionPanel,
  updateSelectionPanelPosition,
  updateSelectionPanel,
  hideSelectionPanel,
  setupSelectionPanelListeners,
  handleLinkAllSelected
};