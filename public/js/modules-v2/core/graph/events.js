/**
 * Graph Events Module
 * 
 * Handles event listeners for the graph module.
 */

import * as eventBus from '../../utils/eventBus.js';
import { loadData } from './dataLoading.js';

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
}

export default {
  setupEventListeners
};