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
  helpers 
} from './modules-v2/index.js';

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Memory Graph Visualizer - Initializing modular version');
  
  // Set up UI event listeners
  controls.setupUIEventListeners();
  
  // Set up selection panel listeners
  nodeInteractions.setupSelectionPanelListeners();
  
  // Initialize graph
  const graphInstance = graph.initGraph();
  
  // Load initial data
  graph.loadData();
  
  // Initialize domain color legend
  domainManagement.updateDomainColorLegend();
  
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
      helpers,
      getState: () => store.getState()
    };
    
    console.log('DEBUG mode: Modules available at window.__DEBUG__');
  }
});