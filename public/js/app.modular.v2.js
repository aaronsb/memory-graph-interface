/**
 * Memory Graph Visualizer - Modular Version
 * 
 * This file is the entry point for the modular version of the application.
 * It imports the modules and initializes the application.
 */

import { 
  store, 
  graph, 
  nodeInteractions, 
  linkManagement, 
  domainManagement,
  controls, 
  contextMenu,
  windowManager,
  menuBar,
  helpers,
  visualizationManager
} from './modules-v2/index.js';

// Import WebSocket service
import webSocketService from './modules-v2/utils/webSocketService.js';

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Memory Graph Visualizer - Initializing modular version');
  
  // Initialize settings from localStorage first
  Promise.all([
    import('./modules-v2/utils/settingsManager.js'),
    import('./modules-v2/ui/controls.js')
  ]).then(([settingsManager, controls]) => {
    // Load all settings and update store
    settingsManager.loadAllSettings();
    
    // Set up listeners to save settings on change
    settingsManager.setupSettingsEventListeners();
    
    // Load UI state and apply it
    const uiState = settingsManager.loadUIState();
    console.log('Loaded UI state from localStorage:', uiState);
    
    // Apply UI state after a short delay to ensure DOM is ready
    setTimeout(() => {
      if (uiState) {
        controls.applyUIState(uiState);
      }
    }, 100);
  });
  
  // Initialize the menu bar
  menuBar.initMenuBar();
  menuBar.setupMenuStateListeners();
  
  // Set up UI event listeners
  controls.setupUIEventListeners();
  
  // Set up selection panel listeners
  nodeInteractions.setupSelectionPanelListeners();
  
  // Initialize draggable windows
  windowManager.initializeDraggableWindows();
  
  // Initialize database path and history
  import('./modules-v2/core/databaseService.js').then(databaseService => {
    // Load path history from localStorage if available
    databaseService.loadPathHistory();
    
    // Get current database path from server
    databaseService.getDatabasePath()
      .then(path => {
        console.log('Current database path:', path);
        // Add current path to history
        databaseService.addToPathHistory(path);
      })
      .catch(error => {
        console.error('Error getting database path:', error);
      });
  });
  
  // Initialize graph
  const graphInstance = graph.initGraph();
  
  // Load initial data
  graph.loadData().then(() => {
    // Initialize memory domains panel after data is loaded
    console.log('Data loaded, updating memory domains panel');
    // The updateMemoryDomainsPanel function now calls collectAllDomains internally
    domainManagement.updateMemoryDomainsPanel();
    
    // Initialize domain legend as draggable if it was created (with a delay to ensure it's created)
    setTimeout(() => {
      const domainLegend = document.getElementById('domain-legend');
      if (domainLegend && !domainLegend.draggableInitialized) {
        windowManager.makeDraggable('domain-legend', {
          // No custom controls needed, it already has a close button
        });
      }
    }, 500);
  }).catch(error => {
    console.error('Error loading data:', error);
    // Initialize memory domains panel even if data loading fails
    domainManagement.updateMemoryDomainsPanel();
  });
  
  // Fetch link types
  linkManagement.fetchLinkTypes();
  
  // Initialize WebSocket connection
  webSocketService.initWebSocket();
  
  // Set up reconnect event handler
  webSocketService.on('reconnect', (data) => {
    console.log(`WebSocket reconnecting... Attempt ${data.attempt}/${data.maxAttempts}`);
  });
  
  // Set up error event handler
  webSocketService.on('error', (data) => {
    console.error('WebSocket error:', data.message);
    
    // Show error notification for final errors only
    if (data.isFinal) {
      const notification = document.createElement('div');
      notification.innerHTML = `<strong>Connection Error</strong><br>${data.message}`;
      notification.style.position = 'fixed';
      notification.style.top = '50px';
      notification.style.right = '10px';
      notification.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
      notification.style.color = 'white';
      notification.style.padding = '10px';
      notification.style.borderRadius = '5px';
      notification.style.zIndex = 2000;
      document.body.appendChild(notification);
      
      // Remove error notification after 8 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 8000);
    }
  });
  
  // Log initialization complete
  console.log('Memory Graph Visualizer - Initialization complete');
  
  // Make modules available in global scope for debugging
  if (process.env.NODE_ENV !== 'production') {
    window.__DEBUG__ = {
      store,
      graph,
      nodeInteractions,
      linkManagement,
      domainManagement,
      controls,
      contextMenu,
      windowManager,
      menuBar,
      helpers,
      webSocketService,
      visualizationManager,
      getState: () => store.getState()
    };
    
    console.log('DEBUG mode: Modules available at window.__DEBUG__');
  }
});