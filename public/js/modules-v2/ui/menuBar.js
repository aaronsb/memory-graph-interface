/**
 * CUA-Style Menu Bar Module
 */

import store from '../state/store.js';
import { toggleBloomEffect, toggleSummariesOnNodes, toggleEdgeLabels, toggleZoomOnSelect, toggleHelpCard } from './controls.js';
import { toggleMemoryDomainsPanel } from '../core/domainManagement/ui.js';

// Cache DOM elements
let menuBarElement = null;
let activeDropdown = null;

/**
 * Updates a menu item's checked state
 * @param {string} itemId - The ID of the menu item to update
 * @param {boolean} isChecked - Whether the item should be checked
 */
function updateMenuItemState(itemId, isChecked) {
  const menuItem = document.getElementById(itemId);
  if (!menuItem) return;
  
  const checkArea = menuItem.querySelector('.menu-check-area');
  if (!checkArea) return;
  
  // Update checkmark
  if (isChecked) {
    checkArea.innerHTML = '✓';
    menuItem.classList.add('checked');
  } else {
    checkArea.innerHTML = '';
    menuItem.classList.remove('checked');
  }
}

/**
 * Create a menu category (top-level menu item)
 */
function createMenuCategory(label) {
  const category = document.createElement('div');
  category.className = 'menu-category';
  category.textContent = label;
  
  // Create dropdown container
  const dropdown = document.createElement('div');
  dropdown.className = 'menu-dropdown';
  dropdown.style.display = 'none';
  
  // Toggle dropdown when clicking the category
  category.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Close any open dropdown first
    if (activeDropdown && activeDropdown !== dropdown) {
      activeDropdown.style.display = 'none';
    }
    
    // Toggle this dropdown
    if (dropdown.style.display === 'none') {
      // Check if there's enough space to the right
      const rect = category.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const dropdownWidth = 200; // Approximate width of dropdown
      
      // If near the right edge, align dropdown to the right
      if (rect.right + dropdownWidth > windowWidth) {
        dropdown.style.left = 'auto';
        dropdown.style.right = '0';
      } else {
        dropdown.style.left = '0';
        dropdown.style.right = 'auto';
      }
      
      dropdown.style.display = 'block';
      activeDropdown = dropdown;
    } else {
      dropdown.style.display = 'none';
      activeDropdown = null;
    }
  });
  
  // Add dropdown to category
  category.appendChild(dropdown);
  
  return { category, dropdown };
}

/**
 * Create a menu item for dropdowns
 */
function createDropdownItem(label, onClick, isDisabled = false, isCheckable = false, isChecked = false) {
  const item = document.createElement('div');
  item.className = 'menu-dropdown-item';
  
  // Create container for check mark and label
  const itemContent = document.createElement('div');
  itemContent.className = 'menu-item-content';
  
  // Create check mark area (for checkable items)
  if (isCheckable) {
    const checkArea = document.createElement('span');
    checkArea.className = 'menu-check-area';
    
    if (isChecked) {
      checkArea.innerHTML = '✓';
      item.classList.add('checked');
    }
    
    itemContent.appendChild(checkArea);
  }
  
  // Add label
  const labelSpan = document.createElement('span');
  labelSpan.className = 'menu-item-label';
  labelSpan.textContent = label;
  itemContent.appendChild(labelSpan);
  
  // Add content to item
  item.appendChild(itemContent);
  
  if (!isDisabled) {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close dropdown after clicking
      if (activeDropdown) {
        activeDropdown.style.display = 'none';
        activeDropdown = null;
      }
      
      // Execute action
      onClick();
      
      // For checkable items, we would toggle the checkmark here
      // This is handled by the individual toggle functions to ensure 
      // UI state matches application state
    });
  } else {
    item.classList.add('disabled');
  }
  
  return item;
}

/**
 * Add separator to dropdown menu
 */
function addSeparator(dropdown) {
  const separator = document.createElement('div');
  separator.className = 'menu-separator';
  dropdown.appendChild(separator);
}

/**
 * Initialize the menu bar
 */
export function initMenuBar() {
  console.log('Initializing menu bar');
  
  // Create menu bar if it doesn't exist
  if (!document.getElementById('menu-bar')) {
    menuBarElement = document.createElement('div');
    menuBarElement.id = 'menu-bar';
    menuBarElement.className = 'menu-bar';
    
    // Close any open dropdowns when clicking elsewhere
    document.addEventListener('click', () => {
      if (activeDropdown) {
        activeDropdown.style.display = 'none';
        activeDropdown = null;
      }
    });
    
    // 1. File Menu
    const { category: fileCategory, dropdown: fileDropdown } = createMenuCategory('File');
    
    // Add items to File dropdown
    fileDropdown.appendChild(
      createDropdownItem('Refresh Data', () => {
        const loadData = require('../core/graph').loadData;
        loadData(true); // preserve positions
      })
    );
    
    // Add select database path option
    fileDropdown.appendChild(
      createDropdownItem('Select Database...', () => {
        // Import modules dynamically to avoid circular dependencies
        Promise.all([
          import('../ui/fileDialog.js'),
          import('../core/databaseService.js')
        ]).then(([fileDialog, databaseService]) => {
          // Open database path dialog
          fileDialog.openDatabasePathDialog((selectedPath) => {
            if (selectedPath) {
              databaseService.updateDatabaseAndReload(selectedPath)
                .then(result => {
                  console.log('Database updated:', result);
                  
                  // Create success notification
                  const notification = document.createElement('div');
                  notification.className = 'success-notification';
                  
                  // Add success message
                  let successContent = `<div class="success-title">Database Updated</div>`;
                  successContent += `<div class="success-message">Successfully switched to new database</div>`;
                  
                  // Add path details
                  if (result && result.newPath) {
                    successContent += `<div class="success-details">Path: ${result.newPath}</div>`;
                  }
                  
                  notification.innerHTML = successContent;
                  
                  // Style the notification
                  notification.style.position = 'fixed';
                  notification.style.bottom = '10px';
                  notification.style.right = '10px';
                  notification.style.backgroundColor = 'rgba(20, 60, 20, 0.95)';
                  notification.style.color = 'white';
                  notification.style.padding = '15px';
                  notification.style.borderRadius = '5px';
                  notification.style.zIndex = 2000;
                  notification.style.maxWidth = '400px';
                  notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
                  notification.style.border = '1px solid rgba(100, 255, 100, 0.3)';
                  
                  // Style success title
                  const titleStyle = document.createElement('style');
                  titleStyle.textContent = `
                    .success-title {
                      font-weight: bold;
                      font-size: 16px;
                      margin-bottom: 8px;
                      color: #88ff88;
                    }
                    .success-message {
                      margin-bottom: 8px;
                    }
                    .success-details {
                      font-size: 13px;
                      color: #cccccc;
                      border-top: 1px solid rgba(100, 255, 100, 0.3);
                      padding-top: 8px;
                      margin-top: 8px;
                      word-break: break-all;
                    }
                  `;
                  document.head.appendChild(titleStyle);
                  
                  // Add close button
                  const closeButton = document.createElement('div');
                  closeButton.textContent = '✕';
                  closeButton.style.position = 'absolute';
                  closeButton.style.top = '8px';
                  closeButton.style.right = '8px';
                  closeButton.style.cursor = 'pointer';
                  closeButton.style.color = '#88ff88';
                  closeButton.style.fontSize = '16px';
                  closeButton.addEventListener('click', () => {
                    if (document.body.contains(notification)) {
                      document.body.removeChild(notification);
                    }
                  });
                  
                  notification.appendChild(closeButton);
                  document.body.appendChild(notification);
                  
                  // Remove notification after 5 seconds
                  setTimeout(() => {
                    if (document.body.contains(notification)) {
                      document.body.removeChild(notification);
                    }
                  }, 5000);
                })
                .catch(error => {
                  console.error('Error updating database:', error);
                  
                  // Create detailed error notification
                  const errorNotification = document.createElement('div');
                  errorNotification.className = 'error-notification';
                  
                  // Add error title and message
                  let errorContent = `<div class="error-title">Database Error</div>`;
                  errorContent += `<div class="error-message">${error.message || 'Failed to update database'}</div>`;
                  
                  // Add error details if available
                  if (error.details) {
                    errorContent += `<div class="error-details">${error.details}</div>`;
                  }
                  
                  errorNotification.innerHTML = errorContent;
                  
                  // Style the notification
                  errorNotification.style.position = 'fixed';
                  errorNotification.style.bottom = '10px';
                  errorNotification.style.right = '10px';
                  errorNotification.style.backgroundColor = 'rgba(60, 20, 20, 0.95)';
                  errorNotification.style.color = 'white';
                  errorNotification.style.padding = '15px';
                  errorNotification.style.borderRadius = '5px';
                  errorNotification.style.zIndex = 2000;
                  errorNotification.style.maxWidth = '400px';
                  errorNotification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
                  errorNotification.style.border = '1px solid rgba(255, 100, 100, 0.3)';
                  
                  // Style error title
                  const titleStyle = document.createElement('style');
                  titleStyle.textContent = `
                    .error-title {
                      font-weight: bold;
                      font-size: 16px;
                      margin-bottom: 8px;
                      color: #ff8888;
                    }
                    .error-message {
                      margin-bottom: 8px;
                    }
                    .error-details {
                      font-size: 13px;
                      color: #cccccc;
                      border-top: 1px solid rgba(255, 100, 100, 0.3);
                      padding-top: 8px;
                      margin-top: 8px;
                    }
                  `;
                  document.head.appendChild(titleStyle);
                  
                  // Add close button
                  const closeButton = document.createElement('div');
                  closeButton.textContent = '✕';
                  closeButton.style.position = 'absolute';
                  closeButton.style.top = '8px';
                  closeButton.style.right = '8px';
                  closeButton.style.cursor = 'pointer';
                  closeButton.style.color = '#ff8888';
                  closeButton.style.fontSize = '16px';
                  closeButton.addEventListener('click', () => {
                    if (document.body.contains(errorNotification)) {
                      document.body.removeChild(errorNotification);
                    }
                  });
                  
                  errorNotification.appendChild(closeButton);
                  document.body.appendChild(errorNotification);
                  
                  // Remove notification after 8 seconds
                  setTimeout(() => {
                    if (document.body.contains(errorNotification)) {
                      document.body.removeChild(errorNotification);
                    }
                  }, 8000);
                });
            }
          });
        });
      })
    );
    
    // Add get current database path option
    fileDropdown.appendChild(
      createDropdownItem('Current Database Path', () => {
        // Import databaseService dynamically to avoid circular dependencies
        import('../core/databaseService.js').then(databaseService => {
          databaseService.getDatabasePath()
            .then(path => {
              // Show path in a notification
              const notification = document.createElement('div');
              notification.innerHTML = `<strong>Current Database Path:</strong><br>${path}`;
              notification.style.position = 'fixed';
              notification.style.bottom = '10px';
              notification.style.right = '10px';
              notification.style.backgroundColor = 'rgba(40, 40, 70, 0.9)';
              notification.style.color = 'white';
              notification.style.padding = '10px';
              notification.style.borderRadius = '5px';
              notification.style.zIndex = 2000;
              notification.style.maxWidth = '80%';
              notification.style.wordBreak = 'break-all';
              document.body.appendChild(notification);
              
              // Remove notification after 5 seconds
              setTimeout(() => {
                if (document.body.contains(notification)) {
                  document.body.removeChild(notification);
                }
              }, 5000);
            })
            .catch(error => {
              console.error('Error getting database path:', error);
            });
        });
      })
    );
    
    addSeparator(fileDropdown);
    
    fileDropdown.appendChild(
      createDropdownItem('Export Graph (Not Implemented)', () => {
        console.log('Export feature not yet implemented');
      }, true)
    );
    
    // 2. View Menu
    const { category: viewCategory, dropdown: viewDropdown } = createMenuCategory('View');
    
    // Modify toggleBloomEffect to update menu item state
    const originalToggleBloomEffect = toggleBloomEffect;
    const wrappedToggleBloomEffect = () => {
      originalToggleBloomEffect();
      // Update menu item state AFTER the toggle function has executed
      setTimeout(() => {
        updateMenuItemState('toggle-bloom-effect', store.get('bloomEnabled'));
      }, 0);
    };
    
    // Modify toggleSummariesOnNodes to update menu item state
    const originalToggleSummaries = toggleSummariesOnNodes;
    const wrappedToggleSummaries = () => {
      originalToggleSummaries();
      // Update menu item state AFTER the toggle function has executed
      setTimeout(() => {
        updateMenuItemState('toggle-summaries', store.get('showSummariesOnNodes'));
      }, 0);
    };
    
    // Modify toggleEdgeLabels to update menu item state
    const originalToggleEdgeLabels = toggleEdgeLabels;
    const wrappedToggleEdgeLabels = () => {
      originalToggleEdgeLabels();
      // Update menu item state AFTER the toggle function has executed
      setTimeout(() => {
        updateMenuItemState('toggle-edge-labels', store.get('showEdgeLabels'));
      }, 0);
    };
    
    // Modify toggleZoomOnSelect to update menu item state
    const originalToggleZoomOnSelect = toggleZoomOnSelect;
    const wrappedToggleZoomOnSelect = () => {
      originalToggleZoomOnSelect();
      // Update menu item state AFTER the toggle function has executed
      setTimeout(() => {
        updateMenuItemState('toggle-zoom-on-select', store.get('zoomOnSelect'));
      }, 0);
    };
    
    // Add items to View dropdown with checkable status
    const bloomEffectItem = createDropdownItem('Bloom Effect', wrappedToggleBloomEffect, false, true, store.get('bloomEnabled'));
    bloomEffectItem.id = 'toggle-bloom-effect';
    viewDropdown.appendChild(bloomEffectItem);
    
    const summariesItem = createDropdownItem('Node Summaries', wrappedToggleSummaries, false, true, store.get('showSummariesOnNodes'));
    summariesItem.id = 'toggle-summaries';
    viewDropdown.appendChild(summariesItem);
    
    const edgeLabelsItem = createDropdownItem('Edge Labels', wrappedToggleEdgeLabels, false, true, store.get('showEdgeLabels'));
    edgeLabelsItem.id = 'toggle-edge-labels';
    viewDropdown.appendChild(edgeLabelsItem);
    
    const zoomOnSelectItem = createDropdownItem('Auto-Zoom on Selection', wrappedToggleZoomOnSelect, false, true, store.get('zoomOnSelect'));
    zoomOnSelectItem.id = 'toggle-zoom-on-select';
    viewDropdown.appendChild(zoomOnSelectItem);
    
    // 3. Panels Menu
    const { category: panelsCategory, dropdown: panelsDropdown } = createMenuCategory('Panels');
    
    // Add items to Panels dropdown with checkable status
    
    // Create function to toggle info panel
    const toggleInfoPanel = () => {
      const infoPanel = document.getElementById('info-panel');
      if (infoPanel) {
        // Check explicitly if it's visible (display is 'block')
        // This ensures consistency even if style.display is an empty string
        const isVisible = infoPanel.style.display === 'block';
        
        // Set the display style explicitly
        infoPanel.style.display = isVisible ? 'none' : 'block';
        console.log(`Info panel ${isVisible ? 'hidden' : 'shown'}`);
        
        // Update menu item state - when isVisible is true, we're hiding it
        // so the new state is !isVisible
        updateMenuItemState('toggle-info-panel', !isVisible);
        
        // Update the selection panel position when toggling info panel
        import('../core/nodeInteractions/ui.js').then(({ updateSelectionPanelPosition }) => {
          updateSelectionPanelPosition();
        });
      }
    };
    
    // Create function to toggle selection panel
    const toggleSelectionPanel = () => {
      const selectionPanel = document.getElementById('selection-panel');
      if (selectionPanel) {
        // Check explicitly if it's visible (display is 'block')
        const isVisible = selectionPanel.style.display === 'block';
        
        // Set the display style explicitly
        selectionPanel.style.display = isVisible ? 'none' : 'block';
        console.log(`Selection panel ${isVisible ? 'hidden' : 'shown'}`);
        
        // Update menu item state
        updateMenuItemState('toggle-selection-panel', !isVisible);
      }
    };
    
    // Info Panel - gets initial state
    // Always check style.display explicitly since the initial state may be inconsistent
    const infoPanel = document.getElementById('info-panel');
    const infoPanelVisible = infoPanel && infoPanel.style.display === 'block';
    
    // Store in variable for consistent access
    const infoPanelItem = createDropdownItem('Node Info Panel', toggleInfoPanel, false, true, infoPanelVisible);
    infoPanelItem.id = 'toggle-info-panel';
    panelsDropdown.appendChild(infoPanelItem);
    
    // Selection Panel - gets initial state
    const selectionPanelVisible = document.getElementById('selection-panel')?.style.display !== 'none';
    const selectionPanelItem = createDropdownItem('Selected Nodes Panel', toggleSelectionPanel, false, true, selectionPanelVisible);
    selectionPanelItem.id = 'toggle-selection-panel';
    panelsDropdown.appendChild(selectionPanelItem);
    
    // Modify toggleMemoryDomainsPanel to update menu item state
    const originalToggleDomainsPanel = toggleMemoryDomainsPanel;
    const wrappedToggleDomainsPanel = () => {
      originalToggleDomainsPanel();
      // Update menu item state after toggling
      setTimeout(() => {
        const domainLegend = document.getElementById('domain-legend');
        const isVisible = domainLegend ? domainLegend.style.display !== 'none' : false;
        updateMenuItemState('toggle-memory-domains', isVisible);
      }, 0);
    };
    
    // Modify toggleHelpCard to update menu item state
    const originalToggleHelpCard = toggleHelpCard;
    const wrappedToggleHelpCard = () => {
      originalToggleHelpCard();
      // Update menu item state after toggling
      setTimeout(() => {
        const helpCardVisible = store.get('showHelpCard');
        updateMenuItemState('toggle-help-card', helpCardVisible);
      }, 0);
    };
    
    // Initialize help card based on the initial store state if needed
    const initialHelpCardState = store.get('showHelpCard');
    if (initialHelpCardState) {
      const helpCard = document.getElementById('help-card');
      if (helpCard) {
        helpCard.style.display = 'block';
        // Add event listener to close button
        const closeButton = document.getElementById('help-card-close');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            originalToggleHelpCard();
            // Update menu item state
            setTimeout(() => {
              updateMenuItemState('toggle-help-card', false);
            }, 0);
          });
        }
      }
    }
    
    // Memory Domains Panel - gets initial state
    const domainLegend = document.getElementById('domain-legend');
    const domainsVisible = domainLegend ? domainLegend.style.display !== 'none' : false;
    const domainsItem = createDropdownItem('Memory Domains Panel', wrappedToggleDomainsPanel, false, true, domainsVisible);
    domainsItem.id = 'toggle-memory-domains';
    panelsDropdown.appendChild(domainsItem);
    
    // Help Card - gets initial state
    const helpCardVisible = store.get('showHelpCard') || false;
    const helpCardItem = createDropdownItem('Help Card', wrappedToggleHelpCard, false, true, helpCardVisible);
    helpCardItem.id = 'toggle-help-card';
    panelsDropdown.appendChild(helpCardItem);
    
    // 4. Help Menu
    const { category: helpCategory, dropdown: helpDropdown } = createMenuCategory('Help');
    
    // Add items to Help dropdown
    helpDropdown.appendChild(
      createDropdownItem('About Memory Graph', () => {
        alert('Memory Graph Visualizer\nA tool for visualizing memory connections.');
      })
    );
    
    // Add categories to menu bar
    menuBarElement.appendChild(fileCategory);
    menuBarElement.appendChild(viewCategory);
    menuBarElement.appendChild(panelsCategory);
    menuBarElement.appendChild(helpCategory);
    
    // Add menu bar to document
    const graphContainer = document.getElementById('graph-container');
    if (graphContainer) {
      document.body.insertBefore(menuBarElement, graphContainer);
    }
  }
}

/**
 * Set up menu state listeners
 */
export function setupMenuStateListeners() {
  // When this function is called, the menu items have already been created
  // We just need to sync with current application state
  
  // View Menu States
  updateMenuItemState('toggle-bloom-effect', store.get('bloomEnabled'));
  updateMenuItemState('toggle-summaries', store.get('showSummariesOnNodes'));
  updateMenuItemState('toggle-edge-labels', store.get('showEdgeLabels'));
  updateMenuItemState('toggle-zoom-on-select', store.get('zoomOnSelect'));
  
  // Panels Menu States  
  
  // Explicitly check panel visibility with ternary to avoid issues with style.display being ""
  // Info panel visibility
  const infoPanel = document.getElementById('info-panel');
  if (infoPanel) {
    const isInfoPanelVisible = infoPanel.style.display === 'block';
    updateMenuItemState('toggle-info-panel', isInfoPanelVisible);
  }
  
  // Selection panel visibility
  const selectionPanel = document.getElementById('selection-panel');
  if (selectionPanel) {
    const isSelectionPanelVisible = selectionPanel.style.display === 'block';
    updateMenuItemState('toggle-selection-panel', isSelectionPanelVisible);
  }
  
  // Memory domains panel visibility
  const domainLegend = document.getElementById('domain-legend');
  if (domainLegend) {
    const isDomainLegendVisible = domainLegend.style.display === 'block';
    updateMenuItemState('toggle-memory-domains', isDomainLegendVisible);
  }
  
  // Help card visibility
  updateMenuItemState('toggle-help-card', store.get('showHelpCard'));
}

export default {
  initMenuBar,
  setupMenuStateListeners
};