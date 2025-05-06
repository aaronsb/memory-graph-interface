/**
 * Node Interactions Module
 * 
 * Handles user interactions with nodes, including viewing details,
 * deleting nodes, multi-selection, and tag management.
 */

import store from '../state/store.js';
import { updateCombinedHighlights, updateHighlight } from '../utils/helpers.js';
import * as eventBus from '../utils/eventBus.js';

/**
 * Show details for a node in the info panel, or deselect if already selected
 * @param {Object} node - The node to show details for
 */
export function handleViewNodeDetails(node) {
  const currentSelectedNode = store.get('selectedNode');
  
  // Add check to ensure we have a valid node object
  if (!node) {
    console.log('No node provided to handleViewNodeDetails');
    return;
  }
  
  // Check if the node is already selected by comparing IDs
  const isSameNode = currentSelectedNode && 
                     (currentSelectedNode.id === node.id || 
                      currentSelectedNode === node.id);
  
  if (isSameNode) {
    console.log('Deselecting node:', node.id);
    
    // Clear selection
    store.set('selectedNode', null);
    
    // Clear highlights
    const { selectedHighlightNodes, selectedHighlightLinks } = store.getState();
    selectedHighlightNodes.clear();
    selectedHighlightLinks.clear();
    
    // Update highlights
    updateCombinedHighlights();
    updateHighlight();
    
    // Hide info panel
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) {
      infoPanel.style.display = 'none';
    }
    
    return;
  }
  
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
      
      // Always show the tag input interface (with skipViewDetails=true to avoid infinite loop)
      handleShowTagInput(node, true);
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
export function handleShowTagInput(node, skipViewDetails = false) {
  console.log('Showing tag input for node:', node.id);
  
  // If not skipping view details, ensure the info panel is shown for this node
  if (!skipViewDetails) {
    handleViewNodeDetails(node);
    return; // handleViewNodeDetails will call this function again with skipViewDetails=true
  }
  
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
  
  // Change domain button
  const domainButton = document.getElementById('change-domain-btn');
  if (domainButton) {
    domainButton.addEventListener('click', () => {
      handleChangeSelectedNodesDomain();
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

/**
 * Handle deleting multiple selected nodes
 */
export function handleDeleteSelectedNodes() {
  const { multiSelectedNodes } = store.getState();
  
  if (!multiSelectedNodes || multiSelectedNodes.length === 0) {
    console.log('No nodes selected for deletion');
    return;
  }
  
  // Show confirmation dialog
  showCustomConfirmDialog(
    `Are you sure you want to delete ${multiSelectedNodes.length} selected nodes?`,
    () => {
      // Create a copy of the array to avoid issues during deletion
      const nodesToDelete = [...multiSelectedNodes];
      let deletedCount = 0;
      let errorCount = 0;
      
      // Sequential deletion with Promise.all and fetch
      const deletePromises = nodesToDelete.map(node => {
        return fetch(`/api/nodes/${node.id}`, {
          method: 'DELETE'
        })
        .then(response => response.json())
        .then(result => {
          if (result.success) {
            console.log(`Node ${node.id} deleted successfully`);
            deletedCount++;
            return { success: true, node };
          } else {
            console.error(`Failed to delete node ${node.id}:`, result.error);
            errorCount++;
            return { success: false, node, error: result.error };
          }
        })
        .catch(error => {
          console.error(`Error deleting node ${node.id}:`, error);
          errorCount++;
          return { success: false, node, error };
        });
      });
      
      // Process all deletions
      Promise.all(deletePromises)
        .then(results => {
          console.log(`Deleted ${deletedCount}/${nodesToDelete.length} nodes, ${errorCount} errors`);
          
          // Remove deleted nodes from graph data
          const { graphData } = store.getState();
          
          // Get successfully deleted node IDs
          const deletedNodeIds = results
            .filter(result => result.success)
            .map(result => result.node.id);
          
          // Remove nodes
          graphData.nodes = graphData.nodes.filter(node => !deletedNodeIds.includes(node.id));
          
          // Remove connected links
          graphData.links = graphData.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            
            return !deletedNodeIds.includes(sourceId) && !deletedNodeIds.includes(targetId);
          });
          
          // Update the graph
          const { graph } = store.getState();
          if (graph) {
            graph.graphData(graphData);
          }
          
          // Update state
          store.set('graphData', graphData);
          
          // Clear selection
          store.update({
            multiSelectActive: false,
            multiSelectedNodes: [],
            multiSelectHighlightNodes: new Set()
          });
          
          // Update visual highlighting
          updateCombinedHighlights();
          updateHighlight();
          
          // Hide selection panel
          hideSelectionPanel();
          
          // Show result
          alert(`Deleted ${deletedCount} nodes, ${errorCount} errors`);
        });
    }
  );
}

/**
 * Show domain selection dialog for selected nodes
 */
export function handleChangeSelectedNodesDomain() {
  const { multiSelectedNodes } = store.getState();
  
  if (!multiSelectedNodes || multiSelectedNodes.length === 0) {
    console.log('No nodes selected for domain change');
    return;
  }
  
  // Import domain management
  import('./domainManagement.js').then(domainModule => {
    // Get all domains
    const allDomains = store.get('allDomains') || domainModule.collectAllDomains();
    
    // Create a simple modal for domain selection
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'rgba(30, 30, 40, 0.95)';
    modal.style.padding = '20px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.7)';
    modal.style.zIndex = '1000';
    modal.style.minWidth = '300px';
    modal.style.maxWidth = '500px';
    modal.style.maxHeight = '80vh';
    modal.style.overflowY = 'auto';
    modal.style.border = '1px solid rgba(100, 100, 255, 0.3)';
    
    // Add header
    const header = document.createElement('h3');
    header.textContent = `Change Domain for ${multiSelectedNodes.length} Nodes`;
    header.style.marginTop = '0';
    header.style.marginBottom = '15px';
    header.style.color = '#aaccff';
    header.style.borderBottom = '1px solid #5a5a8a';
    header.style.paddingBottom = '10px';
    modal.appendChild(header);
    
    // Add description
    const description = document.createElement('p');
    description.textContent = 'Select a domain to apply to all selected nodes:';
    modal.appendChild(description);
    
    // Create domain container
    const domainContainer = document.createElement('div');
    domainContainer.style.display = 'flex';
    domainContainer.style.flexDirection = 'column';
    domainContainer.style.gap = '8px';
    domainContainer.style.maxHeight = '300px';
    domainContainer.style.overflowY = 'auto';
    domainContainer.style.padding = '5px';
    domainContainer.style.marginBottom = '15px';
    
    // Add domain options
    allDomains.forEach(domain => {
      const option = document.createElement('div');
      option.className = 'domain-option';
      option.style.display = 'flex';
      option.style.alignItems = 'center';
      option.style.padding = '8px 12px';
      option.style.borderRadius = '4px';
      option.style.cursor = 'pointer';
      option.style.transition = 'background-color 0.2s';
      
      // Color indicator
      const colorIndicator = document.createElement('div');
      colorIndicator.style.width = '16px';
      colorIndicator.style.height = '16px';
      colorIndicator.style.backgroundColor = window.domainColors?.get(domain) || '#aaccff';
      colorIndicator.style.marginRight = '10px';
      colorIndicator.style.borderRadius = '3px';
      option.appendChild(colorIndicator);
      
      // Domain name
      const domainName = document.createElement('span');
      domainName.textContent = domain;
      option.appendChild(domainName);
      
      // Hover effect
      option.addEventListener('mouseenter', () => {
        option.style.backgroundColor = 'rgba(100, 100, 255, 0.2)';
      });
      
      option.addEventListener('mouseleave', () => {
        option.style.backgroundColor = 'transparent';
      });
      
      // Click handler
      option.addEventListener('click', () => {
        // Apply domain change to all selected nodes
        applyDomainChangeToSelectedNodes(domain);
        // Remove modal
        document.body.removeChild(modal);
      });
      
      domainContainer.appendChild(option);
    });
    
    modal.appendChild(domainContainer);
    
    // Add button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '15px';
    
    // Add cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.backgroundColor = '#525252';
    cancelButton.style.color = 'white';
    cancelButton.style.border = 'none';
    cancelButton.style.padding = '8px 16px';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    buttonContainer.appendChild(cancelButton);
    
    modal.appendChild(buttonContainer);
    
    // Add to document
    document.body.appendChild(modal);
  });
}

/**
 * Apply domain change to all selected nodes
 * @param {string} newDomain - The new domain to apply
 */
export function applyDomainChangeToSelectedNodes(newDomain) {
  const { multiSelectedNodes } = store.getState();
  
  if (!multiSelectedNodes || multiSelectedNodes.length === 0) {
    console.log('No nodes selected for domain change');
    return;
  }
  
  console.log(`Changing domain of ${multiSelectedNodes.length} nodes to ${newDomain}`);
  
  // Import domain management
  import('./domainManagement.js').then(domainModule => {
    // Create a copy of the array to avoid issues during updates
    const nodesToUpdate = [...multiSelectedNodes];
    let updatedCount = 0;
    let errorCount = 0;
    
    // Update each node
    const updatePromises = nodesToUpdate.map(node => {
      // Skip if domain is already set to the new value
      if (node.domain === newDomain) {
        console.log(`Node ${node.id} already has domain ${newDomain}`);
        return Promise.resolve({ success: true, node, skipped: true });
      }
      
      // Prepare update data
      const updateData = {
        node_id: node.id,
        domain: newDomain
      };
      
      // Update via API
      return fetch('/api/nodes/update-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          console.log(`Domain of node ${node.id} updated successfully`);
          updatedCount++;
          return { success: true, node };
        } else {
          console.error(`Failed to update domain of node ${node.id}:`, result.error);
          errorCount++;
          return { success: false, node, error: result.error };
        }
      })
      .catch(error => {
        console.error(`Error updating domain of node ${node.id}:`, error);
        errorCount++;
        return { success: false, node, error };
      });
    });
    
    // Process all updates
    Promise.all(updatePromises)
      .then(results => {
        console.log(`Updated domain of ${updatedCount}/${nodesToUpdate.length} nodes, ${errorCount} errors`);
        
        // Update nodes in the graph data
        const { graphData } = store.getState();
        
        // Process each successful update
        results
          .filter(result => result.success && !result.skipped)
          .forEach(result => {
            const nodeIndex = graphData.nodes.findIndex(n => n.id === result.node.id);
            
            if (nodeIndex !== -1) {
              // Update the node
              graphData.nodes[nodeIndex].domain = newDomain;
              graphData.nodes[nodeIndex].group = newDomain; // Update group for ForceGraph rendering
            }
          });
        
        // Update the graph
        const { graph } = store.getState();
        if (graph) {
          graph.graphData(graphData);
        }
        
        // Update state
        store.set('graphData', graphData);
        
        // Update memory domains panel if the domain is new
        const allDomains = store.get('allDomains') || [];
        if (!allDomains.includes(newDomain)) {
          domainModule.collectAllDomains();
          domainModule.updateMemoryDomainsPanel();
        }
        
        // Show result
        alert(`Updated domain of ${updatedCount} nodes, ${errorCount} errors`);
      });
  });
}

// Setup event listeners for cross-module communication
eventBus.on('node:editTags', () => {
  const selectedNode = store.get('selectedNode');
  if (selectedNode) {
    handleShowTagInput(selectedNode, true);
  }
});

eventBus.on('node:delete', (data) => {
  // If node is not provided, use the currently selected node
  const node = data.node || store.get('selectedNode');
  if (node) {
    handleDeleteNode(node);
  }
});

eventBus.on('nodes:deleteSelected', () => {
  handleDeleteSelectedNodes();
});

eventBus.on('nodes:changeDomain', () => {
  handleChangeSelectedNodesDomain();
});

eventBus.on('node:selectionCleared', () => {
  // Clear selected node
  store.set('selectedNode', null);
  
  // Clear highlights
  const { selectedHighlightNodes, selectedHighlightLinks } = store.getState();
  selectedHighlightNodes.clear();
  selectedHighlightLinks.clear();
  
  // Update displays
  updateCombinedHighlights();
  updateHighlight();
});

// Export module
export default {
  handleViewNodeDetails,
  handleMultiSelectNode,
  handleShowTagInput,
  addTagToNode,
  handleDeleteNode,
  handleDeleteSelectedNodes,
  handleChangeSelectedNodesDomain,
  applyDomainChangeToSelectedNodes,
  showCustomConfirmDialog,
  showSelectionPanel,
  updateSelectionPanelPosition,
  updateSelectionPanel,
  hideSelectionPanel,
  setupSelectionPanelListeners,
  handleLinkAllSelected
};