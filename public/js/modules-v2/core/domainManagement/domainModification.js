/**
 * Domain Modification Module
 * 
 * Handles changing, creating, renaming, and deleting domains.
 */

import store from '../../state/store.js';
import { getDomainNodeCounts } from './domainCollection.js';
import { showDomainEditDialog } from './ui.js';

/**
 * Change a node's domain
 * @param {Object} node - The node to change
 * @param {string} newDomain - The new domain
 * @param {boolean} pruneEdges - Whether to prune edges to nodes in different domains
 */
export function handleChangeDomain(node, newDomain, pruneEdges = false) {
  console.log(`Changing domain of node ${node.id} to ${newDomain} (pruneEdges: ${pruneEdges})`);
  
  // Skip if domain is already set to the new value
  if (node.domain === newDomain) {
    console.log('Node already has this domain');
    return;
  }
  
  // Prepare update data
  const updateData = {
    nodeId: node.id,
    domain: newDomain,
    pruneEdges: pruneEdges
  };
  
  // Update via API
  fetch('/api/nodes/update-domain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('Domain updated successfully');
      
      // Update the node in our graph data
      const { graphData } = store.getState();
      const nodeIndex = graphData.nodes.findIndex(n => n.id === node.id);
      
      if (nodeIndex !== -1) {
        // Store the old domain for color mapping
        const oldDomain = graphData.nodes[nodeIndex].domain;
        
        // Update the node
        graphData.nodes[nodeIndex].domain = newDomain;
        graphData.nodes[nodeIndex].group = newDomain; // Update group for ForceGraph rendering
        
        // Update the graph
        const { graph } = store.getState();
        if (graph) {
          graph.graphData(graphData);
        }
        
        // Update state
        store.set('graphData', graphData);
        
        // Update domain color legend if the domain is new
        const allDomains = store.get('allDomains') || [];
        if (!allDomains.includes(newDomain)) {
          import('./domainCollection.js').then(collection => {
            collection.collectAllDomains();
            
            // Import updateMemoryDomainsPanel dynamically to avoid circular dependencies
            import('./ui.js').then(ui => {
              ui.updateMemoryDomainsPanel();
            });
          });
        }
      }
    } else {
      console.error('Failed to update domain:', result.error);
    }
  })
  .catch(error => {
    console.error('Error updating domain:', error);
  });
}

/**
 * Create a new domain
 */
export function handleCreateDomain() {
  import('./ui.js').then(ui => {
    ui.showDomainEditDialog('New Domain', (newDomain) => {
      console.log(`Creating new domain: ${newDomain}`);
      
      // Create domain in database first
      fetch('/api/domains/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ domain: newDomain })
      })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          console.log('Domain created successfully in database');
          
          // Import color management to assign color
          import('./colorManagement.js').then(colors => {
            // Assign a color to the new domain
            colors.assignDomainColor(newDomain);
            
            // Add the domain to the list
            const allDomains = store.get('allDomains') || [];
            if (!allDomains.includes(newDomain)) {
              allDomains.push(newDomain);
              allDomains.sort();
              store.set('allDomains', allDomains);
            }
            
            // Update the panel
            import('./ui.js').then(ui => {
              ui.updateMemoryDomainsPanel();
            });
          });
        } else {
          console.error('Failed to create domain in database:', result.error);
        }
      })
      .catch(error => {
        // If the endpoint doesn't exist yet, still create the domain in the UI
        console.warn('Error creating domain in database (endpoint may not exist yet):', error);
        
        // Import color management to assign color
        import('./colorManagement.js').then(colors => {
          // Assign a color to the new domain
          colors.assignDomainColor(newDomain);
          
          // Add the domain to the list
          const allDomains = store.get('allDomains') || [];
          if (!allDomains.includes(newDomain)) {
            allDomains.push(newDomain);
            allDomains.sort();
            store.set('allDomains', allDomains);
          }
          
          // Update the panel
          import('./ui.js').then(ui => {
            ui.updateMemoryDomainsPanel();
          });
        });
      });
    });
  });
}

/**
 * Rename a domain
 * @param {string} oldDomain - The domain to rename
 */
export function handleRenameDomain(oldDomain) {
  import('./ui.js').then(ui => {
    ui.showDomainEditDialog(oldDomain, (newDomain) => {
      console.log(`Renaming domain: ${oldDomain} to ${newDomain}`);
      
      // Check if the new domain already exists
      const allDomains = store.get('allDomains') || [];
      if (allDomains.includes(newDomain) && newDomain !== oldDomain) {
        console.warn(`Domain "${newDomain}" already exists. Please choose a different name.`);
        return;
      }
      
      // Get all nodes with the old domain
      const { graphData } = store.getState();
      const nodesToUpdate = graphData.nodes.filter(node => node.domain === oldDomain);
      
      if (nodesToUpdate.length === 0) {
        console.log(`No nodes found with domain ${oldDomain}`);
        return;
      }
      
      // Log instead of showing confirmation dialog
      console.log(`Renaming domain "${oldDomain}" to "${newDomain}" (updating ${nodesToUpdate.length} nodes)`);
      // No confirmation needed, proceed directly
      
      // Update each node's domain
      let updatedCount = 0;
      let errorCount = 0;
      
      const updatePromises = nodesToUpdate.map(node => {
        // Prepare update data
        const updateData = {
          nodeId: node.id,
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
            
            // Update the node in our graph data
            const nodeIndex = graphData.nodes.findIndex(n => n.id === node.id);
            if (nodeIndex !== -1) {
              graphData.nodes[nodeIndex].domain = newDomain;
              graphData.nodes[nodeIndex].group = newDomain; // For ForceGraph
            }
            
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
        .then(() => {
          console.log(`Updated domain for ${updatedCount}/${nodesToUpdate.length} nodes, ${errorCount} errors`);
          
          // Update the graph
          const { graph } = store.getState();
          if (graph) {
            graph.graphData(graphData);
          }
          
          // Update state
          store.set('graphData', graphData);
          
          // Update domain colors
          import('./colorManagement.js').then(colors => {
            // Transfer the color from old domain to new domain
            colors.transferDomainColor(oldDomain, newDomain);
            
            // Update allDomains
            const domainIndex = allDomains.indexOf(oldDomain);
            if (domainIndex !== -1) {
              allDomains.splice(domainIndex, 1);
              if (!allDomains.includes(newDomain)) {
                allDomains.push(newDomain);
                allDomains.sort();
              }
              store.set('allDomains', allDomains);
            }
            
            // Update domain legend
            import('./ui.js').then(ui => {
              ui.updateMemoryDomainsPanel();
            });
            
            // Log result instead of showing alert
            console.log(`Updated domain for ${updatedCount} nodes, ${errorCount} errors`);
          });
        });
    });
  });
}

/**
 * Delete a domain that has no nodes
 * @param {string} domain - The domain to delete
 */
export function handleDeleteEmptyDomain(domain) {
  // Check if the domain has any nodes
  const domainCounts = getDomainNodeCounts();
  const nodeCount = domainCounts.get(domain) || 0;
  
  if (nodeCount > 0) {
    console.warn(`Cannot delete domain "${domain}" because it contains ${nodeCount} nodes. Move the nodes to another domain first.`);
    return;
  }
  
  // Confirm deletion with user
  if (!confirm(`Are you sure you want to delete the domain "${domain}"?`)) {
    return;
  }
  
  console.log(`Deleting empty domain "${domain}"`);
  
  // Delete domain via API
  fetch(`/api/domains/${domain}`, {
    method: 'DELETE'
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('Domain deleted successfully from database');
      
      // Remove the domain from the list
      const allDomains = store.get('allDomains') || [];
      const domainIndex = allDomains.indexOf(domain);
      if (domainIndex !== -1) {
        allDomains.splice(domainIndex, 1);
        store.set('allDomains', allDomains);
      }
      
      // Remove the domain color
      import('./colorManagement.js').then(colors => {
        colors.removeDomainColor(domain);
        
        // Update the legend
        import('./ui.js').then(ui => {
          ui.updateMemoryDomainsPanel();
        });
        
        console.log(`Deleted empty domain: ${domain}`);
      });
    } else {
      console.error('Failed to delete domain:', result.error);
      if (result.nodeCount) {
        alert(`Cannot delete domain "${domain}" - it contains ${result.nodeCount} nodes`);
      } else {
        alert('Failed to delete domain: ' + (result.error || 'Unknown error'));
      }
    }
  })
  .catch(error => {
    console.error('Error deleting domain:', error);
    alert('Error deleting domain: ' + error.message);
  });
}

export default {
  handleChangeDomain,
  handleCreateDomain,
  handleRenameDomain,
  handleDeleteEmptyDomain
};