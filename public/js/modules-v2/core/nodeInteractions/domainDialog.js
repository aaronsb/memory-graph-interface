/**
 * Domain Dialog Module
 * 
 * A standalone module for creating domain selection dialogs
 * without circular dependencies.
 */

import store from '../../state/store.js';

/**
 * Show a domain selection dialog for multiple nodes
 * @param {Array} nodes - Array of nodes to change the domain for
 * @returns {Promise} - Resolves when domain change is complete
 */
export function showDomainSelectionDialog(nodes) {
  console.log('Showing domain selection dialog for', nodes.length, 'nodes');
  
  return new Promise((resolve, reject) => {
    try {
      // Get all domains
      const allDomains = store.get('allDomains') || [];
      
      // Fetch domains if needed
      let domainPromise;
      if (allDomains.length === 0) {
        domainPromise = fetch('/api/domains')
          .then(response => response.json())
          .then(domainsData => {
            // Extract domain IDs 
            const apiDomains = domainsData.map(domain => domain.id);
            console.log('Domains from API:', apiDomains);
            
            // Also collect domains from the graph data
            const domains = new Set(apiDomains);
            const { graphData } = store.getState();
            
            if (graphData && graphData.nodes) {
              graphData.nodes.forEach(node => {
                if (node.domain) {
                  domains.add(node.domain);
                }
              });
            }
            
            const domainArray = Array.from(domains).sort();
            
            // Update state
            store.set('allDomains', domainArray);
            console.log('All domains collected:', domainArray);
            
            return domainArray;
          })
          .catch(error => {
            console.error('Error fetching domains from API:', error);
            return [];
          });
      } else {
        domainPromise = Promise.resolve(allDomains);
      }
      
      // Once we have domains, show the dialog
      domainPromise.then(domains => {
        // Create the modal dialog
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.backgroundColor = 'rgba(30, 30, 40, 0.95)';
        modal.style.padding = '20px';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.7)';
        modal.style.zIndex = '2000';
        modal.style.minWidth = '300px';
        modal.style.maxWidth = '500px';
        modal.style.maxHeight = '80vh';
        modal.style.overflowY = 'auto';
        modal.style.border = '1px solid rgba(100, 100, 255, 0.3)';
        
        // Add header
        const header = document.createElement('h3');
        header.textContent = `Change Domain for ${nodes.length} Nodes`;
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
        
        // Create checkbox for pruning cross-domain edges
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
        modal.appendChild(pruneEdgesContainer);
        
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
        domains.forEach(domain => {
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
            
            // Remove modal
            document.body.removeChild(modal);
            
            // Show a processing indicator
            const processingIndicator = document.createElement('div');
            processingIndicator.textContent = `Processing domain change for ${nodes.length} nodes...`;
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
            applyDomainChange(nodes, domain, pruneEdges)
              .then(result => {
                console.log('Domain change result:', result);
                
                // Remove processing indicator
                if (document.body.contains(processingIndicator)) {
                  document.body.removeChild(processingIndicator);
                }
                
                // Clear selection
                clearSelection();
                
                // Resolve the promise
                resolve(result);
              })
              .catch(error => {
                console.error('Error applying domain change:', error);
                
                // Remove processing indicator
                if (document.body.contains(processingIndicator)) {
                  document.body.removeChild(processingIndicator);
                }
                
                // Reject the promise
                reject(error);
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
          resolve({ cancelled: true });
        });
        buttonContainer.appendChild(cancelButton);
        
        modal.appendChild(buttonContainer);
        
        // Add to document
        document.body.appendChild(modal);
      });
    } catch (error) {
      console.error('Error showing domain dialog:', error);
      reject(error);
    }
  });
}

/**
 * Apply domain change to all selected nodes
 * @param {Array} nodes - Array of nodes to change the domain for
 * @param {string} newDomain - The new domain to apply
 * @param {boolean} pruneEdges - Whether to prune edges to nodes in different domains
 * @returns {Promise} - A promise that resolves when all updates are complete
 */
function applyDomainChange(nodes, newDomain, pruneEdges = false) {
  console.log(`Changing domain of ${nodes.length} nodes to ${newDomain}`);
  
  // Return a promise that resolves when all updates are complete
  return new Promise((resolve, reject) => {
    // Create a copy of the array to avoid issues during updates
    const nodesToUpdate = [...nodes];
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

/**
 * Clear the node selection
 */
function clearSelection() {
  // Get nodes
  const { multiSelectedNodes, multiSelectHighlightNodes } = store.getState();
  
  // Clear arrays and sets
  if (multiSelectedNodes) {
    multiSelectedNodes.length = 0;
  }
  
  if (multiSelectHighlightNodes) {
    multiSelectHighlightNodes.clear();
  }
  
  // Update state
  store.update({
    multiSelectActive: false,
    multiSelectedNodes: [],
    multiSelectHighlightNodes: new Set()
  });
  
  // Hide selection panel
  const selectionPanel = document.getElementById('selection-panel');
  if (selectionPanel) {
    selectionPanel.style.display = 'none';
  }
}

export default {
  showDomainSelectionDialog,
  applyDomainChange,
  clearSelection
};