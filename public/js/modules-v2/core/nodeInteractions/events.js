/**
 * Events Module for Node Interactions
 * 
 * Handles event bus subscriptions and event handling
 * for cross-module communication.
 */

import store from '../../state/store.js';
import * as eventBus from '../../utils/eventBus.js';
import { updateCombinedHighlights, updateHighlight } from '../../utils/helpers.js';

/**
 * Set up event bus listeners
 */
export function setupEventListeners() {
  // Handle tag editing events
  eventBus.on('node:editTags', () => {
    const selectedNode = store.get('selectedNode');
    if (selectedNode) {
      import('./nodeManipulation.js').then(({ handleShowTagInput }) => {
        handleShowTagInput(selectedNode, true);
      });
    }
  });

  // Handle node deletion events
  eventBus.on('node:delete', (data) => {
    // If node is not provided, use the currently selected node
    const node = data.node || store.get('selectedNode');
    if (node) {
      import('./nodeManipulation.js').then(({ handleDeleteNode }) => {
        handleDeleteNode(node);
      });
    }
  });

  // Handle selected nodes deletion events
  eventBus.on('nodes:deleteSelected', () => {
    import('./nodeManipulation.js').then(({ handleDeleteSelectedNodes }) => {
      handleDeleteSelectedNodes();
    });
  });

  // Handle domain change events
  eventBus.on('nodes:changeDomain', () => {
    import('./nodeManipulation.js').then(({ handleChangeSelectedNodesDomain }) => {
      handleChangeSelectedNodesDomain();
    });
  });

  // Handle selection clearing events
  eventBus.on('node:selectionCleared', () => {
    // Clear selected node
    store.set('selectedNode', null);
    
    // Clear highlights
    const { selectedHighlightNodes, selectedHighlightLinks } = store.getState();
    selectedHighlightNodes.clear();
    selectedHighlightLinks.clear();
    
    // Update displays
    updateCombinedHighlights();
    updateHighlight();
  });
}

export default {
  setupEventListeners
};