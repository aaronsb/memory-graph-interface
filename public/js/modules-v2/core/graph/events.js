/**
 * Graph Events Module
 * 
 * Handles event listeners for the graph module.
 */

import * as eventBus from '../../utils/eventBus.js';
import { loadData } from './dataLoading.js';
import { positionPlaneBelowNodes } from './referencePlane.js';
import store from '../../state/store.js';

/**
 * Set up event listeners for the graph module
 */
export function setupEventListeners() {
  // Graph reload event
  eventBus.on('graph:reload', ({ preservePositions = false, skipLinks = false }) => {
    loadData(preservePositions, skipLinks);
  });
  
  // Window resize event - to be handled by the graph module
  eventBus.on('window:resize', (dimensions) => {
    // Handled in other module that has access to the graph instance
  });
  
  // Graph layout reset event
  eventBus.on('graph:resetLayout', () => {
    // Handled in other module that has access to the graph instance
  });
  
  // Graph zoom event
  eventBus.on('graph:zoom', ({ nodeId, level, duration }) => {
    // Handled in other module that has access to the graph instance
  });
  
  // Node filter event
  eventBus.on('graph:filterNodes', (filterCriteria) => {
    // Handled in other module that has access to the graph instance
  });
  
  // Listen for changes in node positions to update reference plane
  // This uses a debounced approach to prevent excessive updates
  let debounceTimer = null;
  eventBus.on('graph:nodesMoved', () => {
    // Clear any existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Set a new timer to update the reference plane after 500ms of inactivity
    debounceTimer = setTimeout(() => {
      const { graphData, referencePlane } = store.getState();
      if (graphData && referencePlane?.visible) {
        positionPlaneBelowNodes(graphData, 100);
      }
    }, 500);
  });
}

export default {
  setupEventListeners
};