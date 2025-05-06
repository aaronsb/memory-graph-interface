/**
 * Window Manager Module
 * 
 * Provides functionality for draggable windows with controls.
 * Uses an event-based architecture to avoid circular dependencies.
 */
import * as eventBus from '../utils/eventBus.js';

// Event names
const EVENTS = {
  WINDOW_MOVED: 'window:moved',
  WINDOW_CLOSED: 'window:closed',
  CONTENT_COPIED: 'content:copied',
  NODE_EDIT_TAGS: 'node:editTags',
  NODE_SELECTION_CLEARED: 'node:selectionCleared',
  NODE_SELECTION_CHANGED: 'node:selectionChanged',
  NODE_DELETE: 'node:delete'
};

// Register event handlers
function setupEventListeners() {
  // Listen for domain legend creation events
  eventBus.on('domainLegend:created', (legendId) => {
    if (document.getElementById(legendId)) {
      makeDraggable(legendId, { addHeader: false });
    }
  });
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
    onMove: null
  };
  
  // Merge options with defaults
  const settings = { ...defaults, ...options };
  
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
  
  deleteNode: () => {
    return () => {
      // Emit an event to delete the node (to be handled by nodeInteractions)
      eventBus.emit(EVENTS.NODE_DELETE, { node: null });
    };
  },
  
  editTags: () => {
    return () => {
      // Emit an event to request tag editing
      // This avoids direct dependency on nodeInteractions
      eventBus.emit(EVENTS.NODE_EDIT_TAGS, {});
    };
  },
  
  closeInfoPanel: () => {
    return (win) => {
      win.style.display = 'none';
      
      // Emit an event that the panel was closed and selection cleared
      eventBus.emit(EVENTS.WINDOW_CLOSED, { windowId: win.id });
      eventBus.emit(EVENTS.NODE_SELECTION_CLEARED, {});
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
    defaultPosition: { x: 10, y: 10 }
  });
  
  // Domain legend (if it exists)
  const domainLegend = document.getElementById('domain-legend');
  if (domainLegend) {
    makeDraggable('domain-legend', {
      // No custom controls needed, it already has a close button
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