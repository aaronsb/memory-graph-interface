/**
 * Window Manager Module
 * 
 * Provides functionality for draggable windows with controls.
 * Uses an event-based architecture to avoid circular dependencies.
 */
import * as eventBus from '../utils/eventBus.js';
import store from '../state/store.js';

// Event names
const EVENTS = {
  WINDOW_MOVED: 'window:moved',
  WINDOW_CLOSED: 'window:closed',
  CONTENT_COPIED: 'content:copied',
  NODE_EDIT_TAGS: 'node:editTags',
  NODE_SELECTION_CLEARED: 'node:selectionCleared',
  NODE_SELECTION_CHANGED: 'node:selectionChanged',
  NODE_DELETE: 'node:delete',
  NODES_DELETE_SELECTED: 'nodes:deleteSelected',
  NODES_CHANGE_DOMAIN: 'nodes:changeDomain'
};

// Register event handlers
function setupEventListeners() {
  // Helper function to handle both creation and updates
  const makeLegendDraggable = (legendId) => {
    console.log(`Domain legend event received for: ${legendId}`);
    const element = document.getElementById(legendId);
    
    if (element) {
      // Always reinitialize as draggable
      console.log(`Making ${legendId} draggable or refreshing drag handlers`);
      
      // If it was already draggable, we need to reinitialize it
      // because the content has been replaced (including the drag handle)
      makeDraggable(legendId, { 
        controls: [],
        addHeader: false, // The legend already has a header with drag-handle class
        forceReInit: true // Force reinitialization
      });
      
      element.draggableInitialized = true;
      
      // Directly attach a mousedown handler to the header
      const header = element.querySelector('h3.window-header');
      if (header) {
        console.log('Found domain legend header, attaching direct mousedown handler');
        header.style.cursor = 'move';
      }
    } else {
      console.error(`Element with ID ${legendId} not found`);
    }
  };

  // Listen for domain legend creation events
  eventBus.on('domainLegend:created', makeLegendDraggable);
  
  // Also listen for domain legend updates (same handling)
  eventBus.on('domainLegend:updated', makeLegendDraggable);
}

// Call setup when module is loaded
setupEventListeners();

/**
 * Initialize a window element to be draggable
 * @param {string} windowId - The ID of the window element
 * @param {Object} options - Options for the window
 * @param {boolean} options.addHeader - Whether to add a header bar for dragging
 * @param {Array} options.controls - Array of control buttons to add
 * @param {Object} options.defaultPosition - Default position {x, y}
 * @param {Function} options.onMove - Callback when window is moved
 */
export function makeDraggable(windowId, options = {}) {
  const windowElement = document.getElementById(windowId);
  if (!windowElement) {
    console.error(`Window element with ID "${windowId}" not found`);
    return;
  }
  
  // Default options
  const defaults = {
    addHeader: true,
    controls: [],
    defaultPosition: null,
    onMove: null,
    forceReInit: false  // Add option to force reinitialization
  };
  
  // Merge options with defaults
  const settings = { ...defaults, ...options };
  
  // If the element is already draggable and we're not forcing reinitialization, just return it
  if (windowElement.draggableInitialized && !settings.forceReInit) {
    console.log(`Element ${windowId} is already draggable, skipping initialization`);
    return windowElement;
  }
  
  // If we're reinitializing, clean up old event listeners
  if (windowElement._cleanupDraggable && typeof windowElement._cleanupDraggable === 'function') {
    windowElement._cleanupDraggable();
    windowElement._cleanupDraggable = null;
  }
  
  // Store original styles
  const originalStyles = {
    position: windowElement.style.position,
    top: windowElement.style.top,
    left: windowElement.style.left,
    zIndex: windowElement.style.zIndex,
    cursor: windowElement.style.cursor
  };
  
  // Ensure element is positioned absolutely
  if (windowElement.style.position !== 'absolute' && windowElement.style.position !== 'fixed') {
    windowElement.style.position = 'absolute';
  }
  
  // Set initial position if provided
  if (settings.defaultPosition) {
    windowElement.style.left = `${settings.defaultPosition.x}px`;
    windowElement.style.top = `${settings.defaultPosition.y}px`;
  }
  
  // Always ensure z-index is sufficient
  if (!windowElement.style.zIndex || parseInt(windowElement.style.zIndex) < 100) {
    windowElement.style.zIndex = '100';
  }
  
  // If element has a header already, use it for dragging
  let headerElement = windowElement.querySelector('h1, h2, h3, h4, h5, h6, .window-header, .drag-handle');
  
  if (windowId === 'domain-legend') {
    // For debugging
    console.log('Domain legend detected, searching for header...');
    
    // Look for all possible header elements in the domain legend
    const possibleHeaders = windowElement.querySelectorAll('h3, .window-header, .drag-handle');
    console.log('Possible headers found:', possibleHeaders.length);
    
    if (possibleHeaders.length > 0) {
      headerElement = possibleHeaders[0];
      console.log('Using first found header:', headerElement.tagName);
    } else {
      console.warn('No suitable header found for domain-legend');
    }
  }
  
  // If no header and addHeader option is true, create a header
  if (!headerElement && settings.addHeader) {
    headerElement = document.createElement('div');
    headerElement.className = 'window-header drag-handle';
    headerElement.style.padding = '10px';
    headerElement.style.cursor = 'move';
    headerElement.style.backgroundColor = 'rgba(40, 40, 60, 0.95)';
    headerElement.style.borderTopLeftRadius = '5px';
    headerElement.style.borderTopRightRadius = '5px';
    headerElement.style.borderBottom = '1px solid rgba(100, 100, 255, 0.3)';
    headerElement.style.display = 'flex';
    headerElement.style.justifyContent = 'space-between';
    headerElement.style.alignItems = 'center';
    
    // Create title
    const titleElement = document.createElement('span');
    titleElement.textContent = windowElement.getAttribute('data-window-title') || windowId;
    titleElement.className = 'window-title';
    headerElement.appendChild(titleElement);
    
    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'window-controls';
    controlsContainer.style.display = 'flex';
    controlsContainer.style.gap = '8px';
    headerElement.appendChild(controlsContainer);
    
    // Prepend header to window
    if (windowElement.firstChild) {
      windowElement.insertBefore(headerElement, windowElement.firstChild);
    } else {
      windowElement.appendChild(headerElement);
    }
  } else if (headerElement) {
    // Ensure existing header has the right styling
    headerElement.style.cursor = 'move';
    
    // If controls are specified but header exists, find or create controls container
    let controlsContainer = headerElement.querySelector('.window-controls');
    if (!controlsContainer && settings.controls && settings.controls.length > 0) {
      controlsContainer = document.createElement('div');
      controlsContainer.className = 'window-controls';
      controlsContainer.style.display = 'flex';
      controlsContainer.style.gap = '8px';
      controlsContainer.style.marginLeft = 'auto';
      headerElement.appendChild(controlsContainer);
    }
  }
  
  // Add controls if specified
  if (settings.controls && settings.controls.length > 0 && headerElement) {
    const controlsContainer = headerElement.querySelector('.window-controls') || headerElement;
    
    settings.controls.forEach(control => {
      const button = document.createElement('span');
      button.textContent = control.icon;
      button.title = control.title || '';
      button.className = `window-control ${control.className || ''}`;
      button.style.cursor = 'pointer';
      button.style.padding = '2px 5px';
      button.style.borderRadius = '3px';
      button.style.transition = 'background-color 0.2s';
      
      // Hover effect
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = 'rgba(100, 100, 255, 0.2)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'transparent';
      });
      
      // Click handler
      if (control.onClick) {
        button.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent dragging when clicking control
          control.onClick(windowElement);
        });
      }
      
      controlsContainer.appendChild(button);
    });
  }
  
  // Variables to track dragging
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  
  // Function to handle mouse down on header
  const handleMouseDown = (e) => {
    // Only drag on left click
    if (e.button !== 0) return;
    
    // Don't drag if clicking on a control
    if (e.target.closest('.window-control')) return;
    
    e.preventDefault();
    
    // Start dragging
    isDragging = true;
    
    // Compute the mouse position
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    // Get the current position of the element
    const rect = windowElement.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    // Raise window to top (highest z-index)
    bringToFront(windowElement);
    
    // Add event listeners for dragging
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Function to handle mouse move
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    // Calculate the new position
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    
    // Move the window
    windowElement.style.left = `${initialLeft + dx}px`;
    windowElement.style.top = `${initialTop + dy}px`;
    
    // Call the onMove callback if provided
    if (typeof settings.onMove === 'function') {
      settings.onMove(windowElement, {
        x: initialLeft + dx,
        y: initialTop + dy
      });
    }
    
    // Emit move event
    eventBus.emit(EVENTS.WINDOW_MOVED, {
      windowId,
      position: {
        x: initialLeft + dx,
        y: initialTop + dy
      }
    });
  };
  
  // Function to handle mouse up
  const handleMouseUp = (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    // Stop dragging
    isDragging = false;
    
    // Remove the event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Attach the mousedown event to the header for dragging
  if (headerElement) {
    headerElement.addEventListener('mousedown', handleMouseDown);
    
    // For the domain legend, also make sure it visually indicates draggability
    if (windowId === 'domain-legend') {
      headerElement.style.cursor = 'move';
    }
  }
  
  // Add reset method to window element
  windowElement.resetPosition = () => {
    if (settings.defaultPosition) {
      windowElement.style.left = `${settings.defaultPosition.x}px`;
      windowElement.style.top = `${settings.defaultPosition.y}px`;
    } else {
      windowElement.style.left = originalStyles.left;
      windowElement.style.top = originalStyles.top;
    }
  };
  
  // Store cleanup function to remove event listeners when reinitializing
  windowElement._cleanupDraggable = () => {
    console.log(`Cleaning up draggable for ${windowId}`);
    if (headerElement) {
      headerElement.removeEventListener('mousedown', handleMouseDown);
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Make window element contain metadata
  windowElement.draggableInitialized = true;
  
  // Return the window element for chaining
  return windowElement;
}

/**
 * Bring a window to the front (highest z-index)
 * @param {HTMLElement} windowElement - The window element to bring to front
 */
export function bringToFront(windowElement) {
  // Get all windows
  const allWindows = document.querySelectorAll('[id$="-panel"], [id$="-legend"], [id$="-menu"]');
  
  // Find the highest z-index
  let maxZIndex = 100;
  allWindows.forEach(win => {
    const zIndex = win.style.zIndex ? parseInt(win.style.zIndex) : 0;
    if (zIndex > maxZIndex) {
      maxZIndex = zIndex;
    }
  });
  
  // Set this window's z-index to be higher
  windowElement.style.zIndex = (maxZIndex + 1).toString();
}

/**
 * Create standard control handlers that use the event bus
 */
const createControlHandlers = {
  copyNodeContent: () => {
    return (win) => {
      const nodeId = document.getElementById('node-id')?.textContent || '';
      const nodeTags = document.getElementById('node-tags')?.textContent || '';
      const nodeContent = document.getElementById('node-content')?.textContent || '';
      
      const text = `Node ID: ${nodeId}\nTags: ${nodeTags}\n\n${nodeContent}`;
      
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log('Content copied to clipboard');
          // Show feedback
          const copyIcon = win.querySelector('.window-control');
          if (copyIcon) {
            const originalText = copyIcon.textContent;
            copyIcon.textContent = '✓';
            setTimeout(() => {
              copyIcon.textContent = originalText;
            }, 1000);
          }
          
          // Emit content copied event
          eventBus.emit(EVENTS.CONTENT_COPIED, { text });
        })
        .catch(err => {
          console.error('Failed to copy content to clipboard:', err);
        });
    };
  },
  
  copySelectionContent: () => {
    return (win) => {
      // Get the list of selected nodes
      const selectedList = document.querySelectorAll('#selection-list .selection-item-text');
      
      if (selectedList && selectedList.length > 0) {
        // Create text with all selected node IDs
        const text = Array.from(selectedList)
          .map(item => item.textContent)
          .join('\n');
        
        navigator.clipboard.writeText(text)
          .then(() => {
            console.log('Selection copied to clipboard');
            // Show feedback
            const copyIcon = win.querySelector('.window-control');
            if (copyIcon) {
              const originalText = copyIcon.textContent;
              copyIcon.textContent = '✓';
              setTimeout(() => {
                copyIcon.textContent = originalText;
              }, 1000);
            }
            
            // Emit content copied event
            eventBus.emit(EVENTS.CONTENT_COPIED, { text });
          })
          .catch(err => {
            console.error('Failed to copy selection to clipboard:', err);
          });
      }
    };
  },
  
  deleteNode: () => {
    return () => {
      // Emit an event to delete the node (to be handled by nodeInteractions)
      eventBus.emit(EVENTS.NODE_DELETE, { node: null });
    };
  },
  
  deleteSelectedNodes: () => {
    return () => {
      // Emit an event to delete selected nodes
      eventBus.emit(EVENTS.NODES_DELETE_SELECTED, {});
    };
  },
  
  editTags: () => {
    return () => {
      // Emit an event to request tag editing
      // This avoids direct dependency on nodeInteractions
      eventBus.emit(EVENTS.NODE_EDIT_TAGS, {});
    };
  },
  
  editNodeContent: () => {
    return () => {
      // Get the current content and node ID
      const nodeContentDiv = document.getElementById('node-content');
      const nodeId = document.getElementById('node-id')?.textContent;
      
      if (!nodeContentDiv || !nodeId || nodeId === 'No Node Selected') {
        console.error('No node selected for editing');
        return;
      }
      
      // Store the original content
      const originalContent = nodeContentDiv.textContent || '';
      
      // Create a textarea to replace the content div
      const textarea = document.createElement('textarea');
      textarea.value = originalContent;
      textarea.style.width = '100%';
      textarea.style.minHeight = '200px';
      textarea.style.padding = '12px';
      textarea.style.backgroundColor = 'rgba(40, 40, 60, 0.7)';
      textarea.style.color = '#f0f0f0';
      textarea.style.border = '1px solid rgba(100, 100, 255, 0.3)';
      textarea.style.borderRadius = '6px';
      textarea.style.fontSize = '14px';
      textarea.style.lineHeight = '1.6';
      textarea.style.fontFamily = 'inherit';
      textarea.style.resize = 'vertical';
      
      // Auto-size the textarea based on content
      const adjustTextareaHeight = () => {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, window.innerHeight * 0.6);
        textarea.style.height = newHeight + 'px';
        
        // If content exceeds max height, show scrollbar
        if (textarea.scrollHeight > window.innerHeight * 0.6) {
          textarea.style.overflowY = 'auto';
        } else {
          textarea.style.overflowY = 'hidden';
        }
      };
      
      // Initial size adjustment
      textarea.style.height = '0px';
      requestAnimationFrame(() => {
        adjustTextareaHeight();
      });
      
      // Adjust height on input
      textarea.addEventListener('input', adjustTextareaHeight);
      
      // Replace the content div with the textarea
      nodeContentDiv.style.display = 'none';
      nodeContentDiv.parentNode.insertBefore(textarea, nodeContentDiv.nextSibling);
      
      // Create control buttons
      const controlsDiv = document.createElement('div');
      controlsDiv.style.marginTop = '10px';
      controlsDiv.style.display = 'flex';
      controlsDiv.style.gap = '10px';
      controlsDiv.style.justifyContent = 'flex-end';
      
      // Commit button
      const commitBtn = document.createElement('button');
      commitBtn.innerHTML = '✓';
      commitBtn.title = 'Save changes';
      commitBtn.style.backgroundColor = '#4CAF50';
      commitBtn.style.color = 'white';
      commitBtn.style.border = 'none';
      commitBtn.style.padding = '8px 16px';
      commitBtn.style.borderRadius = '4px';
      commitBtn.style.cursor = 'pointer';
      commitBtn.style.fontSize = '16px';
      
      // Cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.innerHTML = '✗';
      cancelBtn.title = 'Cancel changes';
      cancelBtn.style.backgroundColor = '#f44336';
      cancelBtn.style.color = 'white';
      cancelBtn.style.border = 'none';
      cancelBtn.style.padding = '8px 16px';
      cancelBtn.style.borderRadius = '4px';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.style.fontSize = '16px';
      
      controlsDiv.appendChild(commitBtn);
      controlsDiv.appendChild(cancelBtn);
      textarea.parentNode.insertBefore(controlsDiv, textarea.nextSibling);
      
      // Focus the textarea and select all text
      textarea.focus();
      textarea.select();
      
      // Function to restore original view
      const restoreView = () => {
        textarea.remove();
        controlsDiv.remove();
        nodeContentDiv.style.display = 'block';
      };
      
      // Commit button click handler
      commitBtn.addEventListener('click', async () => {
        const newContent = textarea.value;
        
        if (newContent !== originalContent) {
          try {
            // Send update request to server
            const response = await fetch(`/api/nodes/${nodeId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ content: newContent })
            });
            
            if (response.ok) {
              // Update the content display
              nodeContentDiv.textContent = newContent;
              
              // Update the node in store
              const selectedNode = store.get('selectedNode');
              if (selectedNode) {
                selectedNode.content = newContent;
                store.set('selectedNode', selectedNode);
              }
              
              // Update the graph data
              const graphData = store.get('graphData');
              const nodeInGraph = graphData.nodes.find(n => n.id === nodeId);
              if (nodeInGraph) {
                nodeInGraph.content = newContent;
              }
              
              console.log('Node content updated successfully');
            } else {
              throw new Error('Failed to update node content');
            }
          } catch (error) {
            console.error('Error updating node content:', error);
            alert('Failed to update node content. Please try again.');
            return;
          }
        }
        
        restoreView();
      });
      
      // Cancel button click handler
      cancelBtn.addEventListener('click', () => {
        restoreView();
      });
      
      // ESC key to cancel
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          restoreView();
        }
      });
    };
  },
  
  closeInfoPanel: () => {
    return (win) => {
      win.style.display = 'none';
      
      // Emit an event that the panel was closed and selection cleared
      eventBus.emit(EVENTS.WINDOW_CLOSED, { windowId: win.id });
      eventBus.emit(EVENTS.NODE_SELECTION_CLEARED, {});
    };
  },
  
  closeSelectionPanel: () => {
    return (win) => {
      win.style.display = 'none';
      
      // Emit an event that the panel was closed
      eventBus.emit(EVENTS.WINDOW_CLOSED, { windowId: win.id });
    };
  }
};

/**
 * Initialize all draggable windows in the application
 */
export function initializeDraggableWindows() {
  // Info panel
  makeDraggable('info-panel', {
    controls: [
      {
        icon: '✏️',
        title: 'Edit node content',
        className: 'edit-button',
        onClick: createControlHandlers.editNodeContent()
      },
      { 
        icon: '📋', 
        title: 'Copy to clipboard',
        onClick: createControlHandlers.copyNodeContent()
      },
      {
        icon: '🗑️',
        title: 'Delete node',
        className: 'delete-button',
        onClick: createControlHandlers.deleteNode()
      },
      {
        icon: '✖',
        title: 'Close',
        className: 'close-button',
        onClick: createControlHandlers.closeInfoPanel()
      }
    ]
  });
  
  // Selection panel
  makeDraggable('selection-panel', {
    controls: [
      { 
        icon: '📋', 
        title: 'Copy selected nodes to clipboard',
        onClick: createControlHandlers.copySelectionContent()
      },
      {
        icon: '🗑️',
        title: 'Delete selected nodes',
        className: 'delete-button',
        onClick: createControlHandlers.deleteSelectedNodes()
      },
      {
        icon: '✖',
        title: 'Close',
        className: 'close-button',
        onClick: createControlHandlers.closeSelectionPanel()
      }
    ],
    defaultPosition: { x: 10, y: 10 }
  });
  
  // Domain legend (if it exists)
  const domainLegend = document.getElementById('domain-legend');
  if (domainLegend) {
    makeDraggable('domain-legend', {
      controls: [] // No custom controls needed, they are already added in the updateDomainColorLegend function
    });
  }
  
  // Help card (if it exists)
  const helpCard = document.getElementById('help-card');
  if (helpCard) {
    makeDraggable('help-card', {
      controls: [] // No custom controls needed, close button is already added
    });
  }
  
  // About dialog (if it exists)
  const aboutDialog = document.getElementById('about-dialog');
  if (aboutDialog) {
    makeDraggable('about-dialog', {
      controls: [], // No custom controls needed, close button is already added
      addHeader: false // We've already added a header with the class window-header
    });
  }
  
  // Make context menu draggable but don't add header
  // Context menu needs special handling
  makeDraggable('context-menu', {
    addHeader: false
  });
}

// Export event constants for other modules to use
export { EVENTS };

// Export default
export default {
  makeDraggable,
  bringToFront,
  initializeDraggableWindows,
  EVENTS
};