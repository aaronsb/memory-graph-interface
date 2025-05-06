/**
 * Domain Management Module
 * 
 * Handles domain-related functionality including changing node domains,
 * updating the domain color legend, and domain pagination.
 */

import store from '../state/store.js';

/**
 * Collect all unique domains from the graph data
 * @returns {Array} - Array of domain names
 */
export function collectAllDomains() {
  const domains = new Set();
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
  
  return domainArray;
}

/**
 * Change a node's domain
 * @param {Object} node - The node to change
 * @param {string} newDomain - The new domain
 */
export function handleChangeDomain(node, newDomain) {
  console.log(`Changing domain of node ${node.id} to ${newDomain}`);
  
  // Skip if domain is already set to the new value
  if (node.domain === newDomain) {
    console.log('Node already has this domain');
    return;
  }
  
  // Prepare update data
  const updateData = {
    node_id: node.id,
    domain: newDomain
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
          collectAllDomains();
          updateDomainColorLegend();
        }
      }
    } else {
      console.error('Failed to update domain:', result.error);
      alert('Failed to update domain: ' + (result.error || 'Unknown error'));
    }
  })
  .catch(error => {
    console.error('Error updating domain:', error);
    alert('Error updating domain: ' + error);
  });
}

/**
 * Get the count of nodes for each domain
 * @returns {Map} - Map of domain to node count
 */
export function getDomainNodeCounts() {
  const { graphData } = store.getState();
  const domainCounts = new Map();
  
  if (graphData && graphData.nodes) {
    graphData.nodes.forEach(node => {
      if (node.domain) {
        domainCounts.set(node.domain, (domainCounts.get(node.domain) || 0) + 1);
      }
    });
  }
  
  return domainCounts;
}

/**
 * Show the domain name edit dialog
 * @param {string} currentDomain - The current domain name
 * @param {function} onComplete - Callback when edit is complete
 */
function showDomainEditDialog(currentDomain, onComplete) {
  // Create modal dialog
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
  modal.style.border = '1px solid rgba(100, 100, 255, 0.3)';
  
  // Add title
  const title = document.createElement('h3');
  title.textContent = 'Edit Domain Name';
  title.style.marginTop = '0';
  title.style.marginBottom = '15px';
  title.style.color = '#aaccff';
  title.style.borderBottom = '1px solid #5a5a8a';
  title.style.paddingBottom = '10px';
  modal.appendChild(title);
  
  // Add input
  const inputContainer = document.createElement('div');
  inputContainer.style.marginBottom = '20px';
  
  const label = document.createElement('label');
  label.textContent = 'Domain Name:';
  label.style.display = 'block';
  label.style.marginBottom = '5px';
  inputContainer.appendChild(label);
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentDomain;
  input.style.width = '100%';
  input.style.padding = '8px';
  input.style.backgroundColor = 'rgba(40, 40, 60, 0.7)';
  input.style.color = '#fff';
  input.style.border = '1px solid rgba(100, 100, 255, 0.3)';
  input.style.borderRadius = '4px';
  input.style.boxSizing = 'border-box';
  inputContainer.appendChild(input);
  
  modal.appendChild(inputContainer);
  
  // Add buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'flex-end';
  buttonContainer.style.gap = '10px';
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.padding = '8px 16px';
  cancelButton.style.backgroundColor = '#525252';
  cancelButton.style.color = '#fff';
  cancelButton.style.border = 'none';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.cursor = 'pointer';
  cancelButton.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  buttonContainer.appendChild(cancelButton);
  
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save';
  saveButton.style.padding = '8px 16px';
  saveButton.style.backgroundColor = '#2a5298';
  saveButton.style.color = '#fff';
  saveButton.style.border = 'none';
  saveButton.style.borderRadius = '4px';
  saveButton.style.cursor = 'pointer';
  saveButton.addEventListener('click', () => {
    const newDomain = input.value.trim();
    if (newDomain) {
      document.body.removeChild(modal);
      if (onComplete) onComplete(newDomain);
    }
  });
  buttonContainer.appendChild(saveButton);
  
  modal.appendChild(buttonContainer);
  
  // Add to document
  document.body.appendChild(modal);
  
  // Focus input
  input.focus();
  input.select();
  
  // Add Enter key handler
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      saveButton.click();
    }
  });
}

/**
 * Create a new domain
 */
export function handleCreateDomain() {
  showDomainEditDialog('New Domain', (newDomain) => {
    console.log(`Creating new domain: ${newDomain}`);
    
    // Assign a color to the new domain
    if (window.domainColors && !window.domainColors.has(newDomain)) {
      const colorIdx = window.colorIndex % window.domainColorPalette.length;
      window.domainColors.set(newDomain, window.domainColorPalette[colorIdx]);
      window.colorIndex++;
    }
    
    // Add the domain to the list
    const allDomains = store.get('allDomains') || [];
    if (!allDomains.includes(newDomain)) {
      allDomains.push(newDomain);
      allDomains.sort();
      store.set('allDomains', allDomains);
    }
    
    // Update the legend
    updateDomainColorLegend();
  });
}

/**
 * Rename a domain
 * @param {string} oldDomain - The domain to rename
 */
export function handleRenameDomain(oldDomain) {
  showDomainEditDialog(oldDomain, (newDomain) => {
    console.log(`Renaming domain: ${oldDomain} to ${newDomain}`);
    
    // Check if the new domain already exists
    const allDomains = store.get('allDomains') || [];
    if (allDomains.includes(newDomain) && newDomain !== oldDomain) {
      alert(`Domain "${newDomain}" already exists. Please choose a different name.`);
      return;
    }
    
    // Get all nodes with the old domain
    const { graphData } = store.getState();
    const nodesToUpdate = graphData.nodes.filter(node => node.domain === oldDomain);
    
    if (nodesToUpdate.length === 0) {
      console.log(`No nodes found with domain ${oldDomain}`);
      return;
    }
    
    // Show confirmation dialog
    if (!confirm(`Are you sure you want to rename domain "${oldDomain}" to "${newDomain}"? This will update ${nodesToUpdate.length} nodes.`)) {
      return;
    }
    
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
        if (window.domainColors) {
          // Transfer the color from old domain to new domain
          if (window.domainColors.has(oldDomain)) {
            const color = window.domainColors.get(oldDomain);
            window.domainColors.set(newDomain, color);
            window.domainColors.delete(oldDomain);
          }
        }
        
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
        updateDomainColorLegend();
        
        // Show result
        alert(`Updated domain for ${updatedCount} nodes, ${errorCount} errors`);
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
    alert(`Cannot delete domain "${domain}" because it contains ${nodeCount} nodes. Move the nodes to another domain first.`);
    return;
  }
  
  // Show confirmation dialog
  if (!confirm(`Are you sure you want to delete the empty domain "${domain}"?`)) {
    return;
  }
  
  // Remove the domain from the list
  const allDomains = store.get('allDomains') || [];
  const domainIndex = allDomains.indexOf(domain);
  if (domainIndex !== -1) {
    allDomains.splice(domainIndex, 1);
    store.set('allDomains', allDomains);
  }
  
  // Remove the domain color
  if (window.domainColors && window.domainColors.has(domain)) {
    window.domainColors.delete(domain);
  }
  
  // Update the legend
  updateDomainColorLegend();
  
  console.log(`Deleted empty domain: ${domain}`);
}

/**
 * Update the domain color legend
 */
export function updateDomainColorLegend() {
  // Get domains and ensure we have fresh data
  let allDomains = store.get('allDomains');
  if (!allDomains || allDomains.length === 0) {
    allDomains = collectAllDomains();
  }
  
  // Initialize domain colors if not already set
  // This ensures the color palette is consistent with the color assignment in getNodeColor()
  if (!window.domainColors) {
    window.domainColors = new Map();
    window.colorIndex = 0;
    window.domainColorPalette = [
      'rgba(66, 133, 244, 0.85)',  // Google Blue
      'rgba(219, 68, 55, 0.85)',   // Google Red
      'rgba(244, 180, 0, 0.85)',   // Google Yellow
      'rgba(15, 157, 88, 0.85)',   // Google Green
      'rgba(171, 71, 188, 0.85)',  // Purple
      'rgba(255, 87, 34, 0.85)',   // Deep Orange
      'rgba(3, 169, 244, 0.85)',   // Light Blue
      'rgba(0, 150, 136, 0.85)',   // Teal
      'rgba(255, 152, 0, 0.85)',   // Orange
      'rgba(156, 39, 176, 0.85)',  // Purple
      'rgba(233, 30, 99, 0.85)',   // Pink
      'rgba(33, 150, 243, 0.85)',  // Blue
      'rgba(76, 175, 80, 0.85)',   // Green
      'rgba(255, 193, 7, 0.85)',   // Amber
      'rgba(121, 85, 72, 0.85)',   // Brown
      'rgba(96, 125, 139, 0.85)'   // Blue Grey
    ];
  }
  
  // Assign colors to any domain that doesn't have one yet
  allDomains.forEach(domain => {
    if (!window.domainColors.has(domain)) {
      const colorIdx = window.colorIndex % window.domainColorPalette.length;
      window.domainColors.set(domain, window.domainColorPalette[colorIdx]);
      window.colorIndex++;
      console.log(`[Legend] Assigned color ${window.domainColorPalette[colorIdx]} to domain: ${domain}`);
    }
  });
  
  // Get node counts for each domain
  const domainCounts = getDomainNodeCounts();
  
  // Get or create the legend element
  let legend = document.getElementById('domain-legend');
  
  if (!legend) {
    // Create the legend element if it doesn't exist
    legend = document.createElement('div');
    legend.id = 'domain-legend';
    legend.style.position = 'absolute';
    legend.style.bottom = '10px';
    legend.style.right = '10px';
    legend.style.backgroundColor = 'rgba(20, 20, 30, 0.85)';
    legend.style.padding = '20px';
    legend.style.borderRadius = '8px';
    legend.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.7)';
    legend.style.zIndex = '100';
    legend.style.width = '350px';
    legend.style.maxHeight = '80vh';
    legend.style.overflowY = 'auto';
    legend.style.border = '1px solid rgba(100, 100, 255, 0.3)';
    
    // Add to the document
    document.body.appendChild(legend);
    
    // Emit an event that the domain legend has been created
    // This avoids circular dependencies with windowManager
    try {
      import('../utils/eventBus.js').then(eventBus => {
        eventBus.emit('domainLegend:created', 'domain-legend');
      });
    } catch (error) {
      console.warn('Failed to notify about domain legend creation:', error);
    }
  }
  
  // Clear existing legend items
  legend.innerHTML = '';
  
  // Add title and controls
  const header = document.createElement('h3');
  header.className = 'window-header drag-handle';
  header.style.margin = '0 0 15px 0';
  header.style.padding = '0 0 10px 0';
  header.style.borderBottom = '1px solid rgba(100, 100, 255, 0.3)';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  
  const titleSpan = document.createElement('span');
  titleSpan.textContent = 'Domain Colors';
  titleSpan.className = 'window-title';
  header.appendChild(titleSpan);
  
  // Add controls container
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'window-controls';
  controlsContainer.style.display = 'flex';
  controlsContainer.style.gap = '8px';
  
  // Add clipboard icon
  const copyButton = document.createElement('span');
  copyButton.textContent = '📋';
  copyButton.className = 'window-control';
  copyButton.title = 'Copy domain list';
  copyButton.style.cursor = 'pointer';
  copyButton.addEventListener('click', () => {
    const text = allDomains.map(domain => {
      const count = domainCounts.get(domain) || 0;
      return `${domain}: ${count} node${count !== 1 ? 's' : ''}`;
    }).join('\n');
    
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Domain list copied to clipboard');
        // Show feedback
        const originalText = copyButton.textContent;
        copyButton.textContent = '✓';
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 1000);
      })
      .catch(err => {
        console.error('Failed to copy domain list:', err);
      });
  });
  controlsContainer.appendChild(copyButton);
  
  // Add create new domain button
  const addButton = document.createElement('span');
  addButton.textContent = '➕';
  addButton.className = 'window-control';
  addButton.title = 'Create new domain';
  addButton.style.cursor = 'pointer';
  addButton.addEventListener('click', handleCreateDomain);
  controlsContainer.appendChild(addButton);
  
  // Add close button
  const closeButton = document.createElement('span');
  closeButton.textContent = '✖';
  closeButton.className = 'window-control close-button';
  closeButton.title = 'Close';
  closeButton.style.cursor = 'pointer';
  closeButton.addEventListener('click', () => {
    legend.style.display = 'none';
    // Update toggle button
    const toggleButton = document.getElementById('toggle-domain-legend');
    if (toggleButton) {
      toggleButton.textContent = 'Domain Legend: OFF';
      toggleButton.style.backgroundColor = '#525252';
    }
  });
  controlsContainer.appendChild(closeButton);
  
  header.appendChild(controlsContainer);
  legend.appendChild(header);
  
  // Add domains list container
  const domainsContainer = document.createElement('div');
  domainsContainer.style.display = 'flex';
  domainsContainer.style.flexDirection = 'column';
  domainsContainer.style.gap = '8px';
  legend.appendChild(domainsContainer);
  
  // Add each domain
  allDomains.forEach(domain => {
    // Get color for this domain
    let color = '#aaaaff'; // Default color
    
    if (window.domainColors && window.domainColors.has(domain)) {
      color = window.domainColors.get(domain);
    }
    
    // Get node count
    const nodeCount = domainCounts.get(domain) || 0;
    
    // Create domain item
    const item = document.createElement('div');
    item.className = 'domain-item';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.padding = '8px 10px';
    item.style.backgroundColor = 'rgba(40, 40, 60, 0.7)';
    item.style.borderRadius = '6px';
    item.style.transition = 'all 0.2s ease';
    
    // Hover effect
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'rgba(50, 50, 70, 0.9)';
      item.style.transform = 'translateY(-2px)';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'rgba(40, 40, 60, 0.7)';
      item.style.transform = 'translateY(0)';
    });
    
    // Color swatch
    const swatch = document.createElement('div');
    swatch.style.width = '16px';
    swatch.style.height = '16px';
    swatch.style.backgroundColor = color;
    swatch.style.marginRight = '10px';
    swatch.style.borderRadius = '3px';
    swatch.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.3)';
    item.appendChild(swatch);
    
    // Domain name and count container
    const textContainer = document.createElement('div');
    textContainer.style.flex = '1';
    textContainer.style.display = 'flex';
    textContainer.style.justifyContent = 'space-between';
    textContainer.style.alignItems = 'center';
    
    // Domain name
    const name = document.createElement('div');
    name.textContent = domain;
    name.style.fontSize = '14px';
    textContainer.appendChild(name);
    
    // Node count
    const count = document.createElement('div');
    count.textContent = nodeCount;
    count.style.fontSize = '12px';
    count.style.backgroundColor = 'rgba(100, 100, 255, 0.2)';
    count.style.borderRadius = '12px';
    count.style.padding = '2px 8px';
    count.style.marginLeft = '10px';
    textContainer.appendChild(count);
    
    item.appendChild(textContainer);
    
    // Controls container
    const itemControls = document.createElement('div');
    itemControls.style.display = 'flex';
    itemControls.style.gap = '8px';
    itemControls.style.marginLeft = '10px';
    
    // Edit button
    const editButton = document.createElement('span');
    editButton.textContent = '✏️';
    editButton.title = 'Rename domain';
    editButton.style.cursor = 'pointer';
    editButton.style.fontSize = '14px';
    editButton.style.opacity = '0.7';
    editButton.style.transition = 'opacity 0.2s';
    
    editButton.addEventListener('mouseenter', () => {
      editButton.style.opacity = '1';
    });
    
    editButton.addEventListener('mouseleave', () => {
      editButton.style.opacity = '0.7';
    });
    
    editButton.addEventListener('click', () => {
      handleRenameDomain(domain);
    });
    
    itemControls.appendChild(editButton);
    
    // Delete button (only if domain has no nodes)
    if (nodeCount === 0) {
      const deleteButton = document.createElement('span');
      deleteButton.textContent = '🗑️';
      deleteButton.title = 'Delete empty domain';
      deleteButton.style.cursor = 'pointer';
      deleteButton.style.fontSize = '14px';
      deleteButton.style.opacity = '0.7';
      deleteButton.style.transition = 'opacity 0.2s';
      deleteButton.className = 'delete-button';
      
      deleteButton.addEventListener('mouseenter', () => {
        deleteButton.style.opacity = '1';
      });
      
      deleteButton.addEventListener('mouseleave', () => {
        deleteButton.style.opacity = '0.7';
      });
      
      deleteButton.addEventListener('click', () => {
        handleDeleteEmptyDomain(domain);
      });
      
      itemControls.appendChild(deleteButton);
    }
    
    item.appendChild(itemControls);
    domainsContainer.appendChild(item);
  });
  
  // Add "Create new domain" button at the bottom
  const createButtonContainer = document.createElement('div');
  createButtonContainer.style.marginTop = '15px';
  createButtonContainer.style.display = 'flex';
  createButtonContainer.style.justifyContent = 'center';
  
  const createButton = document.createElement('button');
  createButton.textContent = 'Create New Domain';
  createButton.style.padding = '8px 16px';
  createButton.style.backgroundColor = '#2a5298';
  createButton.style.color = '#fff';
  createButton.style.border = 'none';
  createButton.style.borderRadius = '4px';
  createButton.style.cursor = 'pointer';
  createButton.addEventListener('click', handleCreateDomain);
  
  createButtonContainer.appendChild(createButton);
  legend.appendChild(createButtonContainer);
  
  // Create toggle button if it doesn't exist
  if (!document.getElementById('toggle-domain-legend')) {
    const controlsContainer = document.getElementById('controls');
    
    if (controlsContainer) {
      const toggleButton = document.createElement('button');
      toggleButton.id = 'toggle-domain-legend';
      toggleButton.textContent = 'Toggle Domain Legend';
      toggleButton.addEventListener('click', toggleDomainLegend);
      
      controlsContainer.appendChild(toggleButton);
    }
  }
}

/**
 * Toggle the visibility of the domain legend
 */
export function toggleDomainLegend() {
  const legend = document.getElementById('domain-legend');
  
  if (legend) {
    const isVisible = legend.style.display !== 'none';
    legend.style.display = isVisible ? 'none' : 'block';
    
    // Update button text
    const toggleButton = document.getElementById('toggle-domain-legend');
    if (toggleButton) {
      toggleButton.textContent = `Domain Legend: ${isVisible ? 'OFF' : 'ON'}`;
      toggleButton.style.backgroundColor = isVisible ? '#525252' : '#3388ff';
    }
  } else {
    // Create the legend if it doesn't exist
    updateDomainColorLegend();
  }
}

/**
 * Get domains for the current pagination page
 * @returns {Array} - Array of domains for the current page
 */
export function getCurrentPageDomains() {
  const allDomains = store.get('allDomains') || [];
  const currentPage = store.get('currentDomainPage') || 0;
  const pageSize = 10;
  
  const start = currentPage * pageSize;
  const end = Math.min(start + pageSize, allDomains.length);
  
  return allDomains.slice(start, end);
}

/**
 * Navigate to the next page of domains
 */
export function nextDomainPage() {
  const { currentDomainPage = 0, allDomains = [] } = store.getState();
  const pageSize = 10;
  const totalPages = Math.ceil(allDomains.length / pageSize);
  
  if (currentDomainPage < totalPages - 1) {
    store.set('currentDomainPage', currentDomainPage + 1);
  }
}

/**
 * Navigate to the previous page of domains
 */
export function prevDomainPage() {
  const currentDomainPage = store.get('currentDomainPage') || 0;
  
  if (currentDomainPage > 0) {
    store.set('currentDomainPage', currentDomainPage - 1);
  }
}

/**
 * Get pagination info for domains
 * @returns {Object} - Pagination info object
 */
export function getDomainPaginationInfo() {
  const allDomains = store.get('allDomains') || [];
  const currentPage = store.get('currentDomainPage') || 0;
  const pageSize = 10;
  const totalPages = Math.ceil(allDomains.length / pageSize);
  
  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems: allDomains.length
  };
}

// Export module
export default {
  collectAllDomains,
  handleChangeDomain,
  updateDomainColorLegend,
  toggleDomainLegend,
  getCurrentPageDomains,
  nextDomainPage,
  prevDomainPage,
  getDomainPaginationInfo,
  getDomainNodeCounts,
  handleCreateDomain,
  handleRenameDomain,
  handleDeleteEmptyDomain
};