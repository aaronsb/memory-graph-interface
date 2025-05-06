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
  helpers 
} from './modules-v2/index.js';

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Memory Graph Visualizer - Initializing modular version');
  
  // Initialize the menu bar
  menuBar.initMenuBar();
  menuBar.setupMenuStateListeners();
  
  // Set up UI event listeners
  controls.setupUIEventListeners();
  
  // Set up selection panel listeners
  nodeInteractions.setupSelectionPanelListeners();
  
  // Initialize draggable windows
  windowManager.initializeDraggableWindows();
  
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
      getState: () => store.getState()
    };
    
    console.log('DEBUG mode: Modules available at window.__DEBUG__');
  }
});