/**
 * CUA-Style Menu Bar Module
 */

import store from '../state/store.js';
import { toggleBloomEffect, toggleSummariesOnNodes, toggleEdgeLabels, toggleZoomOnSelect, toggleHelpCard, toggleVisualizationControlsPanel } from './controls.js';
import { toggleMemoryDomainsPanel } from '../core/domainManagement/ui.js';
import { toggleReferencePlane } from '../core/graph/referencePlane.js';
import { refreshDataFromDatabaseChange } from '../utils/webSocketService.js';
import { applyVisualizationStyle, getVisualizationStyles, getActiveVisualizationStyle } from '../core/visualizationManager.js';

// Cache DOM elements
let menuBarElement = null;
let activeDropdown = null;
let databaseChangeBadge = null;

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
 * Create database change indicator badge
 */
function createDatabaseChangeBadge() {
  // Create badge element if it doesn't exist
  if (!databaseChangeBadge) {
    databaseChangeBadge = document.createElement('div');
    databaseChangeBadge.id = 'database-change-badge';
    databaseChangeBadge.className = 'database-change-badge';
    databaseChangeBadge.innerHTML = '!';
    
    // Add tooltip text
    databaseChangeBadge.setAttribute('title', 'Database changed externally. Click to refresh data.');
    
    // Add the CSS for the badge
    const style = document.createElement('style');
    style.textContent = `
      .database-change-badge {
        position: absolute;
        top: 0;
        right: 0;
        background-color: #ff4444;
        color: white;
        font-weight: bold;
        font-size: 10px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        animation: pulse-animation 1.5s infinite;
        display: none;
      }
      
      @keyframes pulse-animation {
        0% {
          box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
        }
        70% {
          box-shadow: 0 0 0 6px rgba(255, 68, 68, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(255, 68, 68, 0);
        }
      }
    `;
    document.head.appendChild(style);
    
    // Add click handler to refresh data
    databaseChangeBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      refreshDataFromDatabaseChange(true);
      updateDatabaseChangeBadge(false);
    });
  }
  
  return databaseChangeBadge;
}

/**
 * Update database change indicator visibility
 * @param {boolean} isVisible - Whether the indicator should be visible
 */
export function updateDatabaseChangeBadge(isVisible) {
  // Create badge if it doesn't exist
  if (!databaseChangeBadge) {
    createDatabaseChangeBadge();
  }
  
  // Update visibility
  if (databaseChangeBadge) {
    databaseChangeBadge.style.display = isVisible ? 'flex' : 'none';
  }
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
    
    // Create and add database change badge
    const badge = createDatabaseChangeBadge();
    menuBarElement.appendChild(badge);
    
    // Listen for database changes
    store.subscribeToKey('databaseChanged', (newValue) => {
      updateDatabaseChangeBadge(newValue === true);
    });
    
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
        Promise.all([
          import('../core/graph.js'),
          import('../core/domainManagement.js')
        ]).then(([graph, domainManagement]) => {
          // Load graph data with preserved positions
          graph.loadData(true).then(() => {
            // Update domains panel (handle both export styles)
            if (typeof domainManagement.updateMemoryDomainsPanel === 'function') {
              domainManagement.updateMemoryDomainsPanel();
            } else if (typeof domainManagement.default?.updateMemoryDomainsPanel === 'function') {
              domainManagement.default.updateMemoryDomainsPanel();
            }
            console.log('Data and domains refreshed');
          });
        });
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
    
    // Modify toggleAutoRefresh to update menu item state
    const toggleAutoRefresh = () => {
      // Toggle auto refresh setting
      const currentValue = store.get('autoRefreshOnDatabaseChange') !== false;
      const newValue = !currentValue;
      
      // Update store
      store.set('autoRefreshOnDatabaseChange', newValue);
      
      // Update menu item
      setTimeout(() => {
        updateMenuItemState('toggle-auto-refresh', newValue);
      }, 0);
      
      return newValue;
    };
    
    // Auto Database Refresh option
    const autoRefreshEnabled = store.get('autoRefreshOnDatabaseChange') !== false;
    const autoRefreshItem = createDropdownItem('Auto-Refresh on Database Change', toggleAutoRefresh, false, true, autoRefreshEnabled);
    autoRefreshItem.id = 'toggle-auto-refresh';
    fileDropdown.appendChild(autoRefreshItem);
    
    addSeparator(fileDropdown);
    
    fileDropdown.appendChild(
      createDropdownItem('Export Domain...', () => {
        console.log('Export Domain clicked');
        import('../core/domainManagement.js').then(domainManagement => {
          console.log('Domain management imported');
          // collectAllDomains returns a Promise, so we need to handle it properly
          domainManagement.collectAllDomains().then(allDomains => {
            console.log('Collected domains:', allDomains);
            
            if (!allDomains || allDomains.length === 0) {
              alert('No domains available to export');
              return;
            }
            
            // Get node counts for domains
            const domainCounts = domainManagement.getDomainNodeCounts();
          
          // Create domain selection dialog
          const dialog = document.createElement('div');
          dialog.className = 'modal-dialog';
          dialog.innerHTML = `
            <div class="dialog-content" style="width: 400px;">
              <div class="dialog-header">
                <h3>Export Domain</h3>
                <button class="close-button">&times;</button>
              </div>
              <div class="dialog-body">
                <div class="form-group">
                  <label for="export-domain-select">Select Domain to Export:</label>
                  <select id="export-domain-select" style="width: 100%; padding: 8px;">
                    ${allDomains.map(domainId => {
                      const nodeCount = domainCounts.get(domainId) || 0;
                      return `<option value="${domainId}">${domainId} (${nodeCount} nodes)</option>`;
                    }).join('')}
                  </select>
                </div>
              </div>
              <div class="dialog-footer">
                <button class="primary-button" id="export-domain-btn">Export</button>
                <button class="secondary-button" id="cancel-export-btn">Cancel</button>
              </div>
            </div>
          `;
          
          document.body.appendChild(dialog);
          
          // Add event handlers after the dialog is added to DOM
          document.getElementById('export-domain-btn').addEventListener('click', () => {
            const selectedDomain = document.getElementById('export-domain-select').value;
            fetch('/api/domains/' + selectedDomain + '/export')
              .then(response => {
                if (!response.ok) throw new Error('Export failed');
                return response.blob();
              })
              .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = selectedDomain + '-export.json';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                document.body.removeChild(dialog);
              })
              .catch(error => {
                alert('Export failed: ' + error.message);
              });
          });
          
          document.getElementById('cancel-export-btn').addEventListener('click', () => {
            document.body.removeChild(dialog);
          });
          
          // Also add close button handler
          dialog.querySelector('.close-button').addEventListener('click', () => {
            document.body.removeChild(dialog);
          });
          }).catch(error => {
            console.error('Error collecting domains:', error);
            alert('Error loading domains: ' + error.message);
          }); // Close allDomains.then
        }).catch(error => {
          console.error('Error importing domain management:', error);
          alert('Error loading module: ' + error.message);
        }); // Close domainManagement.then
      })
    );
    
    fileDropdown.appendChild(
      createDropdownItem('Import Domain...', () => {
        // Create file input for importing
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (event) => {
          const file = event.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const importData = JSON.parse(e.target.result);
                
                // Validate the structure
                if (!importData.domain || !importData.nodes || !importData.edges) {
                  throw new Error('Invalid import file format');
                }
                
                // Show confirmation dialog
                const confirmDialog = document.createElement('div');
                confirmDialog.className = 'modal-dialog';
                confirmDialog.innerHTML = `
                  <div class="dialog-content" style="width: 500px;">
                    <div class="dialog-header">
                      <h3>Import Domain</h3>
                      <button class="close-button">&times;</button>
                    </div>
                    <div class="dialog-body">
                      <div class="import-info">
                        <p><strong>Domain:</strong> ${importData.domain.name} (${importData.domain.id})</p>
                        <p><strong>Nodes:</strong> ${importData.nodes.length}</p>
                        <p><strong>Edges:</strong> ${importData.edges.length}</p>
                        <p><strong>Export Date:</strong> ${new Date(importData.exportDate).toLocaleDateString()}</p>
                      </div>
                      <div class="form-info" style="margin-top: 15px;">
                        <p>⚠️ If this domain already exists, nodes will be updated and new nodes will be added.</p>
                      </div>
                    </div>
                    <div class="dialog-footer">
                      <button class="primary-button" id="confirm-import-btn">Import</button>
                      <button class="secondary-button" id="cancel-import-btn">Cancel</button>
                    </div>
                  </div>
                `;
                
                document.body.appendChild(confirmDialog);
                
                // Add event handlers for dialog buttons
                document.getElementById('cancel-import-btn').addEventListener('click', () => {
                  document.body.removeChild(confirmDialog);
                });
                
                confirmDialog.querySelector('.close-button').addEventListener('click', () => {
                  document.body.removeChild(confirmDialog);
                });
                
                // Handle import confirmation
                document.getElementById('confirm-import-btn').addEventListener('click', () => {
                  fetch('/api/domains/import', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(importData)
                  })
                  .then(response => response.json())
                  .then(result => {
                    document.body.removeChild(confirmDialog);
                    
                    if (result.success) {
                      // Show success notification
                      const notification = document.createElement('div');
                      notification.className = 'success-notification';
                      notification.innerHTML = `
                        <div class="success-title">Import Successful</div>
                        <div class="success-message">
                          Domain "${result.domain}" imported successfully
                        </div>
                        <div class="success-details">
                          Nodes: ${result.stats.nodesImported} imported, ${result.stats.nodesUpdated} updated<br>
                          Edges: ${result.stats.edgesImported} imported, ${result.stats.edgesSkipped} skipped<br>
                          ${result.stats.errors > 0 ? `Errors: ${result.stats.errors}` : ''}
                        </div>
                      `;
                      
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
                      
                      document.body.appendChild(notification);
                      
                      // Refresh data
                      import('../core/graph.js').then(graph => {
                        graph.loadData(true);
                      });
                      
                      import('../core/domainManagement.js').then(domainManagement => {
                        domainManagement.updateMemoryDomainsPanel();
                      });
                      
                      setTimeout(() => {
                        if (document.body.contains(notification)) {
                          document.body.removeChild(notification);
                        }
                      }, 8000);
                    } else {
                      alert('Import failed: ' + result.error);
                    }
                  })
                  .catch(error => {
                    document.body.removeChild(confirmDialog);
                    alert('Import failed: ' + error.message);
                  });
                });
                
              } catch (error) {
                alert('Error reading file: ' + error.message);
              }
            };
            reader.readAsText(file);
          }
        });
        
        // Trigger file selection
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
      })
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
    
    // Create wrapped toggle function for reference plane
    const wrappedToggleReferencePlane = () => {
      const isVisible = toggleReferencePlane(); // This returns the new visibility state
      setTimeout(() => {
        updateMenuItemState('toggle-reference-plane', isVisible);
      }, 0);
    };
    
    // Reference Plane - get initial state from store if available
    const referencePlaneVisible = store.get('referencePlane')?.visible || false;
    const referencePlaneItem = createDropdownItem('Reference Plane', wrappedToggleReferencePlane, false, true, referencePlaneVisible);
    referencePlaneItem.id = 'toggle-reference-plane';
    viewDropdown.appendChild(referencePlaneItem);
    
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
    
    // Create function to toggle visualization controls panel
    const wrappedToggleVizControls = () => {
      // This now returns a boolean indicating the new state
      const isVisible = toggleVisualizationControlsPanel();
      
      // Update menu item state
      setTimeout(() => {
        updateMenuItemState('toggle-viz-controls', isVisible);
      }, 0);
    };
    
    // Visualization Controls Panel
    const vizControlsPanel = document.getElementById('visualization-controls-panel');
    const vizControlsVisible = vizControlsPanel ? vizControlsPanel.style.display === 'block' : false;
    const vizControlsItem = createDropdownItem('Visualization Controls', wrappedToggleVizControls, false, true, vizControlsVisible);
    vizControlsItem.id = 'toggle-viz-controls';
    panelsDropdown.appendChild(vizControlsItem);
    
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
        // Toggle the about dialog visibility
        toggleAboutDialog();
      })
    );
    
    // 4. Visualization Menu
    const { category: visualizationCategory, dropdown: visualizationDropdown } = createMenuCategory('Visualization');
    
    // Get all available visualization styles
    const visualizationStyles = getVisualizationStyles();
    const activeStyle = getActiveVisualizationStyle();
    
    // Add items to Visualization dropdown
    visualizationStyles.forEach(style => {
      const isActive = style.id === activeStyle;
      const styleItem = createDropdownItem(style.name, () => {
        // Apply the selected style
        applyVisualizationStyle(style.id);
        
        // Update all menu items
        visualizationStyles.forEach(s => {
          updateMenuItemState(`visualization-style-${s.id}`, s.id === style.id);
        });
      }, false, true, isActive);
      
      styleItem.id = `visualization-style-${style.id}`;
      visualizationDropdown.appendChild(styleItem);
    });
    
    // Add separator
    addSeparator(visualizationDropdown);
    
    // Add custom style option (future enhancement)
    visualizationDropdown.appendChild(
      createDropdownItem('Custom Style (Coming Soon)', () => {
        console.log('Custom visualization style not yet implemented');
      }, true)
    );
    
    // 5. Help Menu - reuse the existing help menu
    
    // Add categories to menu bar
    menuBarElement.appendChild(fileCategory);
    menuBarElement.appendChild(viewCategory);
    menuBarElement.appendChild(visualizationCategory);
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
  
  // File Menu States
  updateMenuItemState('toggle-auto-refresh', store.get('autoRefreshOnDatabaseChange') !== false);
  
  // View Menu States
  updateMenuItemState('toggle-bloom-effect', store.get('bloomEnabled'));
  updateMenuItemState('toggle-summaries', store.get('showSummariesOnNodes'));
  updateMenuItemState('toggle-edge-labels', store.get('showEdgeLabels'));
  updateMenuItemState('toggle-zoom-on-select', store.get('zoomOnSelect'));
  updateMenuItemState('toggle-reference-plane', store.get('referencePlane')?.visible || false);
  
  // Visualization Menu States
  const activeStyle = getActiveVisualizationStyle();
  getVisualizationStyles().forEach(style => {
    updateMenuItemState(`visualization-style-${style.id}`, style.id === activeStyle);
  });
  
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
  
  // Visualization controls panel visibility
  const vizControlsPanel = document.getElementById('visualization-controls-panel');
  if (vizControlsPanel) {
    const isVizControlsPanelVisible = vizControlsPanel.style.display === 'block';
    updateMenuItemState('toggle-viz-controls', isVizControlsPanelVisible);
  }
  
  // Help card visibility
  updateMenuItemState('toggle-help-card', store.get('showHelpCard'));
}

/**
 * Toggle the About dialog visibility
 */
export function toggleAboutDialog() {
  // Get or create the about dialog element
  let aboutDialog = document.getElementById('about-dialog');
  
  if (!aboutDialog) {
    // Create the about dialog if it doesn't exist
    aboutDialog = document.createElement('div');
    aboutDialog.id = 'about-dialog';
    aboutDialog.style.position = 'absolute';
    aboutDialog.style.top = '50%';
    aboutDialog.style.left = '50%';
    aboutDialog.style.transform = 'translate(-50%, -50%)';
    aboutDialog.style.width = '500px';
    aboutDialog.style.backgroundColor = 'rgba(20, 20, 30, 0.9)';
    aboutDialog.style.borderRadius = '8px';
    aboutDialog.style.padding = '15px';
    aboutDialog.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.7)';
    aboutDialog.style.zIndex = '2000';
    aboutDialog.style.border = '1px solid rgba(100, 100, 255, 0.3)';
    aboutDialog.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    aboutDialog.style.display = 'none';
    
    // Create header
    const header = document.createElement('h3');
    header.className = 'window-header drag-handle';
    header.style.marginTop = '0';
    header.style.borderBottom = '1px solid #5a5a8a';
    header.style.paddingBottom = '12px';
    header.style.color = '#aaccff';
    header.style.fontSize = '18px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.cursor = 'move';
    
    // Add title
    const title = document.createElement('span');
    title.textContent = 'About Memory Graph Visualizer';
    
    // Add close button
    const closeButton = document.createElement('span');
    closeButton.id = 'about-dialog-close';
    closeButton.className = 'close-icon';
    closeButton.textContent = '✖';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#ff8888';
    closeButton.addEventListener('click', toggleAboutDialog);
    
    // Add elements to header
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'about-content';
    content.style.marginTop = '15px';
    content.style.lineHeight = '1.6';
    
    // Add about content
    content.innerHTML = `
      <div style="display: flex; margin-bottom: 20px; align-items: center;">
        <div style="flex: 1;">
          <h2 style="margin-top: 0; color: #aaccff;">Memory Graph Visualizer</h2>
          <p>A tool for performing ontological analysis of memory domains.</p>
          <p style="color: #aaaaaa; font-size: 14px;">Version 2.0.1</p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="color: #ccddff; margin-bottom: 10px;">About This Tool</h4>
        <p>The Memory Graph Visualizer enables you to analyze and explore relationships between memory domains through an interactive 3D graph visualization. This tool allows you to perform ontological analysis of memory structures, identify connections between domains, and understand the hierarchical organization of memory systems.</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="color: #ccddff; margin-bottom: 10px;">Key Features</h4>
        <ul style="padding-left: 20px; margin-top: 5px;">
          <li>Interactive 3D visualization of memory domain relationships</li>
          <li>Ontological analysis of domain hierarchies and associations</li>
          <li>Domain-based color coding and filtering</li>
          <li>Advanced graph analytics for connection patterns</li>
          <li>Multi-node selection and batch operations</li>
          <li>Custom visualization styles for different analysis approaches</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="color: #ccddff; margin-bottom: 10px;">How to Use</h4>
        <p>Use the menu bar at the top of the interface to access features, toggle visualization settings, and manage database connections. Navigate the 3D space using mouse controls, and select nodes to view their content and connections. Check the "Help" menu for keyboard shortcuts and more information.</p>
      </div>
    `;
    
    // Assemble dialog
    aboutDialog.appendChild(header);
    aboutDialog.appendChild(content);
    
    // Add to document
    document.body.appendChild(aboutDialog);
    
    // Make draggable
    import('../ui/windowManager.js').then(windowManager => {
      windowManager.makeDraggable('about-dialog', {
        controls: [],
        addHeader: false // We've already added a header
      });
    });
  }
  
  // Toggle visibility
  aboutDialog.style.display = aboutDialog.style.display === 'none' ? 'block' : 'none';
}

export default {
  initMenuBar,
  setupMenuStateListeners,
  updateDatabaseChangeBadge,
  toggleAboutDialog
};