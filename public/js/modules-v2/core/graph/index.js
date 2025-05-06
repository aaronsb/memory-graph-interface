/**
 * Graph Module Index
 * 
 * Main entry point that re-exports all graph functionality
 * from the various sub-modules to maintain the original API.
 */

// Import all sub-modules
import * as initialization from './initialization.js';
import * as forceManagement from './forceManagement.js';
import * as dataLoading from './dataLoading.js';
import * as interactions from './interactions.js';
import * as dragHandling from './dragHandling.js';
import * as events from './events.js';

// Initialize event listeners
events.setupEventListeners();

// Re-export all functions from the various modules
export const {
  initGraph
} = initialization;

export const {
  restoreForces,
  disableForcesDuringDrag,
  adjustForces,
  temporarilyReduceForces
} = forceManagement;

export const {
  loadData,
  processGraphData,
  reloadSpecificData
} = dataLoading;

export const {
  setupNodeInteractions,
  setupLinkInteractions,
  setupInteractionModes
} = interactions;

export const {
  setupDragHandling
} = dragHandling;

// Export default object with all functions
export default {
  // Initialization
  initGraph,
  
  // Force Management
  restoreForces,
  disableForcesDuringDrag,
  adjustForces,
  temporarilyReduceForces,
  
  // Data Loading
  loadData,
  processGraphData,
  reloadSpecificData,
  
  // Interactions
  setupNodeInteractions,
  setupLinkInteractions,
  setupInteractionModes,
  
  // Drag Handling
  setupDragHandling
};