/**
 * Domain UI Module
 * 
 * Handles user interface elements for domain management.
 */

import store from '../../state/store.js';
import { initializeDomainColors, assignColorsToAllDomains } from './colorManagement.js';
import { handleSelectAllNodesInDomain } from './domainSelection.js';
import { handleCreateDomain, handleRenameDomain, handleDeleteEmptyDomain } from './domainModification.js';
import { getDomainNodeCounts } from './domainCollection.js';

/**
 * Show the domain name edit dialog
 * @param {string} currentDomain - The current domain name
 * @param {function} onComplete - Callback when edit is complete
 */
export function showDomainEditDialog(currentDomain, onComplete) {
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
 * Update the memory domains panel
 */
export function updateMemoryDomainsPanel() {
  // Get domains and ensure we have fresh data
  import('./domainCollection.js').then(collection => {
    let allDomains = store.get('allDomains');
    if (!allDomains || allDomains.length === 0) {
      allDomains = collection.collectAllDomains();
    }
    
    // Initialize domain colors if not already set
    import('./colorManagement.js').then(colors => {
      colors.initializeDomainColors();
      
      // Assign colors to any domain that doesn't have one yet
      colors.assignColorsToAllDomains(allDomains);
      
      // Get node counts for each domain
      const domainCounts = collection.getDomainNodeCounts();
      
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
          import('../../utils/eventBus.js').then(eventBus => {
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
      titleSpan.textContent = 'Memory Domains';
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
        
        // Node count (clickable to select all nodes in this domain)
        const count = document.createElement('div');
        count.textContent = nodeCount;
        count.style.fontSize = '12px';
        count.style.backgroundColor = 'rgba(100, 100, 255, 0.2)';
        count.style.borderRadius = '12px';
        count.style.padding = '2px 8px';
        count.style.marginLeft = '10px';
        count.style.cursor = 'pointer';
        count.title = `Select all ${nodeCount} nodes in domain "${domain}"`;
        
        // Add hover effect for count
        count.addEventListener('mouseenter', () => {
          count.style.backgroundColor = 'rgba(100, 100, 255, 0.4)';
        });
        
        count.addEventListener('mouseleave', () => {
          count.style.backgroundColor = 'rgba(100, 100, 255, 0.2)';
        });
        
        // Add click event to select all nodes in this domain
        count.addEventListener('click', () => {
          handleSelectAllNodesInDomain(domain);
        });
        
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
    });
  });
}

/**
 * Toggle the visibility of the memory domains panel
 */
export function toggleMemoryDomainsPanel() {
  const legend = document.getElementById('domain-legend');
  
  if (legend) {
    const isVisible = legend.style.display !== 'none';
    legend.style.display = isVisible ? 'none' : 'block';
    
    // Update button text
    const toggleButton = document.getElementById('toggle-domain-legend');
    if (toggleButton) {
      toggleButton.textContent = `Memory Domains: ${isVisible ? 'OFF' : 'ON'}`;
      toggleButton.style.backgroundColor = isVisible ? '#525252' : '#3388ff';
    }
  } else {
    // Create the panel if it doesn't exist
    updateMemoryDomainsPanel();
  }
}

export default {
  showDomainEditDialog,
  updateMemoryDomainsPanel,
  toggleMemoryDomainsPanel
};