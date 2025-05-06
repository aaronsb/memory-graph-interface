/**
 * Node Interactions Module Index
 * 
 * Main entry point that re-exports all node interaction functionality
 * from the various sub-modules to maintain the original API.
 */

// Import all sub-modules
import * as nodeSelection from './nodeSelection.js';
import * as nodeManipulation from './nodeManipulation.js';
import * as nodeLinking from './nodeLinking.js';
import * as ui from './ui.js';
import * as events from './events.js';

// Initialize event listeners
events.setupEventListeners();

// Re-export all functions from the various modules
export const {
  handleViewNodeDetails,
  handleMultiSelectNode,
  clearNodeFromSelections
} = nodeSelection;

export const {
  handleShowTagInput,
  addTagToNode,
  handleDeleteNode,
  handleDeleteSelectedNodes,
  handleChangeSelectedNodesDomain,
  applyDomainChangeToSelectedNodes
} = nodeManipulation;

export const {
  createLinkPromise,
  handleLinkAllSelected
} = nodeLinking;

export const {
  showCustomConfirmDialog,
  showSelectionPanel,
  updateSelectionPanelPosition,
  updateSelectionPanel,
  hideSelectionPanel,
  setupSelectionPanelListeners
} = ui;

// Export default object with all functions
export default {
  // Node Selection
  handleViewNodeDetails,
  handleMultiSelectNode,
  clearNodeFromSelections,
  
  // Node Manipulation
  handleShowTagInput,
  addTagToNode,
  handleDeleteNode,
  handleDeleteSelectedNodes,
  handleChangeSelectedNodesDomain,
  applyDomainChangeToSelectedNodes,
  
  // Node Linking
  handleLinkAllSelected,
  
  // UI
  showCustomConfirmDialog,
  showSelectionPanel,
  updateSelectionPanelPosition,
  updateSelectionPanel,
  hideSelectionPanel,
  setupSelectionPanelListeners
};