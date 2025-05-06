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
    legend.style.padding = '10px';
    legend.style.borderRadius = '5px';
    legend.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    legend.style.zIndex = '100';
    legend.style.maxWidth = '300px';
    legend.style.maxHeight = '50vh';
    legend.style.overflowY = 'auto';
    legend.style.border = '1px solid rgba(100, 100, 255, 0.3)';
    
    // Create a header with class for windowManager to identify as drag handle
    const header = document.createElement('div');
    header.className = 'window-header drag-handle';
    header.style.fontSize = '14px';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '8px';
    header.style.marginTop = '-5px';
    header.style.marginLeft = '-5px';
    header.style.marginRight = '-5px';
    header.style.padding = '8px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'move';
    header.style.borderBottom = '1px solid rgba(100, 100, 255, 0.3)';
    
    // Add title
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Domain Colors';
    titleSpan.className = 'window-title';
    header.appendChild(titleSpan);
    
    // Add controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'window-controls';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.gap = '8px';
    
    // Add close button
    const closeButton = document.createElement('span');
    closeButton.textContent = '✖';
    closeButton.className = 'window-control close-button';
    closeButton.style.cursor = 'pointer';
    closeButton.addEventListener('click', () => {
      legend.style.display = 'none';
    });
    
    controlsContainer.appendChild(closeButton);
    header.appendChild(controlsContainer);
    legend.appendChild(header);
    
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
  while (legend.childNodes.length > 1) {
    legend.removeChild(legend.lastChild);
  }
  
  // Add legend items
  (allDomains || []).forEach(domain => {
    // Get color for this domain
    let color = '#aaaaff'; // Default color
    
    if (window.domainColors && window.domainColors.has(domain)) {
      color = window.domainColors.get(domain);
    }
    
    // Create legend item
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.marginBottom = '5px';
    
    // Color swatch
    const swatch = document.createElement('div');
    swatch.style.width = '16px';
    swatch.style.height = '16px';
    swatch.style.backgroundColor = color;
    swatch.style.marginRight = '8px';
    swatch.style.borderRadius = '3px';
    item.appendChild(swatch);
    
    // Domain name
    const name = document.createElement('div');
    name.textContent = domain;
    name.style.fontSize = '13px';
    item.appendChild(name);
    
    legend.appendChild(item);
  });
  
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
  getDomainPaginationInfo
};