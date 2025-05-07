/**
 * Node Manipulation Module
 * 
 * Handles operations that modify nodes, including adding tags,
 * deleting nodes, and changing domains.
 */

import store from '../../state/store.js';
import { updateCombinedHighlights, updateHighlight } from '../../utils/helpers.js';
import { clearNodeFromSelections } from './nodeSelection.js';
import { showCustomConfirmDialog } from './ui.js';
import domainManagement from '../domainManagement.js';

/**
 * Show the tag input for a node
 * @param {Object} node - The node to add tags to
 * @param {boolean} skipViewDetails - Whether to skip showing node details
 */
export function handleShowTagInput(node, skipViewDetails = false) {
  console.log('Showing tag input for node:', node.id);
  
  // If not skipping view details, ensure the info panel is shown for this node
  if (!skipViewDetails) {
    import('./nodeSelection.js').then(({ handleViewNodeDetails }) => {
      handleViewNodeDetails(node);
    });
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
      import('./nodeSelection.js').then(({ handleViewNodeDetails }) => {
        handleViewNodeDetails(node);
      });
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
              import('./nodeSelection.js').then(({ handleViewNodeDetails }) => {
                handleViewNodeDetails(null);
              });
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
          import('./ui.js').then(({ hideSelectionPanel }) => {
            hideSelectionPanel();
          });
          
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
  
  // Get all domains using the imported module
  const allDomains = store.get('allDomains') || [];
  
  // If no domains in store, fetch them
  let domainPromise;
  if (allDomains.length === 0) {
    domainPromise = domainManagement.collectAllDomains();
  } else {
    domainPromise = Promise.resolve(allDomains);
  }
  
  // Continue with domain handling after ensuring domains are available
  domainPromise.then(domains => {
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
    
    // Add checkbox for pruning cross-domain edges
    const pruneEdgesContainer = document.createElement('div');
    pruneEdgesContainer.style.padding = '10px';
    pruneEdgesContainer.style.marginBottom = '10px';
    pruneEdgesContainer.style.borderBottom = '1px solid rgba(100, 100, 255, 0.2)';
    
    const pruneEdgesCheckbox = document.createElement('input');
    pruneEdgesCheckbox.type = 'checkbox';
    pruneEdgesCheckbox.id = 'prune-edges-checkbox';
    pruneEdgesCheckbox.style.marginRight = '10px';
    
    const pruneEdgesLabel = document.createElement('label');
    pruneEdgesLabel.htmlFor = 'prune-edges-checkbox';
    pruneEdgesLabel.textContent = 'Prune edges to nodes in different domains';
    pruneEdgesLabel.style.cursor = 'pointer';
    pruneEdgesLabel.style.userSelect = 'none';
    
    pruneEdgesContainer.appendChild(pruneEdgesCheckbox);
    pruneEdgesContainer.appendChild(pruneEdgesLabel);
    
    modal.insertBefore(pruneEdgesContainer, domainContainer);
    
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
        // Get prune edges option
        const pruneEdges = pruneEdgesCheckbox.checked;
        
        // Remove modal before applying the change to prevent UI freeze
        document.body.removeChild(modal);
        
        // Show a processing indicator
        const processingIndicator = document.createElement('div');
        processingIndicator.textContent = `Processing domain change for ${multiSelectedNodes.length} nodes...`;
        processingIndicator.style.position = 'fixed';
        processingIndicator.style.bottom = '20px';
        processingIndicator.style.right = '20px';
        processingIndicator.style.backgroundColor = 'rgba(30, 30, 40, 0.95)';
        processingIndicator.style.color = '#fff';
        processingIndicator.style.padding = '10px 20px';
        processingIndicator.style.borderRadius = '5px';
        processingIndicator.style.zIndex = '1000';
        document.body.appendChild(processingIndicator);
        
        // Apply domain change to all selected nodes
        applyDomainChangeToSelectedNodes(domain, pruneEdges)
          .then(result => {
            // Remove processing indicator when done
            setTimeout(() => {
              if (document.body.contains(processingIndicator)) {
                document.body.removeChild(processingIndicator);
              }
            }, 1000);
          });
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
 * @param {boolean} pruneEdges - Whether to prune edges to nodes in different domains
 * @returns {Promise} - A promise that resolves when all updates are complete
 */
export function applyDomainChangeToSelectedNodes(newDomain, pruneEdges = false) {
  const { multiSelectedNodes } = store.getState();
  
  if (!multiSelectedNodes || multiSelectedNodes.length === 0) {
    console.log('No nodes selected for domain change');
    return Promise.resolve({ updatedCount: 0, errorCount: 0 });
  }
  
  console.log(`Changing domain of ${multiSelectedNodes.length} nodes to ${newDomain}`);
  
  // Return a promise that resolves when all updates are complete
  return new Promise((resolve, reject) => {
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
          domain: newDomain,
          pruneEdges: pruneEdges
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
            domainManagement.collectAllDomains().then(() => {
              domainManagement.updateMemoryDomainsPanel();
            });
          }
          
          // Resolve the promise with the result
          resolve({ 
            updatedCount, 
            errorCount, 
            totalCount: nodesToUpdate.length 
          });
        })
        .catch(error => {
          console.error('Error processing domain updates:', error);
          reject(error);
        });
  });
}

export default {
  handleShowTagInput,
  addTagToNode,
  handleDeleteNode,
  handleDeleteSelectedNodes,
  handleChangeSelectedNodesDomain,
  applyDomainChangeToSelectedNodes
};