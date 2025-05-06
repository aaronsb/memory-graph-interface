/**
 * UI Module for Node Interactions
 * 
 * Handles UI components for node interactions, including
 * confirmation dialogs and selection panels.
 */

import store from '../../state/store.js';
import { updateCombinedHighlights, updateHighlight } from '../../utils/helpers.js';

/**
 * Show a custom confirmation dialog
 * @param {string} message - The message to show
 * @param {Function} yesCallback - The callback to call if the user confirms
 */
export function showCustomConfirmDialog(message, yesCallback) {
  // Get the dialog element
  const dialog = document.getElementById('custom-confirm-dialog');
  const messageElement = document.getElementById('confirm-message');
  const yesButton = document.getElementById('confirm-yes-btn');
  const noButton = document.getElementById('confirm-no-btn');
  
  if (!dialog || !messageElement || !yesButton || !noButton) {
    // Fallback to browser confirm if elements not found
    if (confirm(message)) {
      yesCallback();
    }
    return;
  }
  
  // Set the message
  messageElement.textContent = message;
  
  // Set up the yes button
  yesButton.onclick = function() {
    dialog.style.display = 'none';
    yesCallback();
  };
  
  // Set up the no button
  noButton.onclick = function() {
    dialog.style.display = 'none';
  };
  
  // Show the dialog
  dialog.style.display = 'block';
}

/**
 * Show the selection panel for multi-select
 */
export function showSelectionPanel() {
  const selectionPanel = document.getElementById('selection-panel');
  if (!selectionPanel) return;
  
  // Make the panel visible
  selectionPanel.style.display = 'block';
  
  // Update selection panel position
  updateSelectionPanelPosition();
}

/**
 * Update the position of the selection panel
 */
export function updateSelectionPanelPosition() {
  const infoPanel = document.getElementById('info-panel');
  const selectionPanel = document.getElementById('selection-panel');
  
  if (!infoPanel || !selectionPanel) return;
  
  // Only consider the info panel if it's visible and has a display style of 'block'
  const infoPanelVisible = infoPanel.style.display === 'block';
  const selectionPanelVisible = selectionPanel.style.display === 'block';
  
  // Only update position if the selection panel is actually visible
  if (selectionPanelVisible) {
    // If the info panel is visible, position the selection panel to its left
    if (infoPanelVisible) {
      selectionPanel.style.right = `${420}px`; // More than info panel width (400px) + the right padding (10px)
    } else {
      selectionPanel.style.right = '10px';
    }
  }
}

/**
 * Update the selection panel contents
 */
export function updateSelectionPanel() {
  const { multiSelectedNodes } = store.getState();
  
  // Get elements
  const selectionPanel = document.getElementById('selection-panel');
  const selectionList = document.getElementById('selection-list');
  const selectionCount = document.getElementById('selection-count');
  
  if (!selectionPanel || !selectionList || !selectionCount) return;
  
  // Update count
  selectionCount.textContent = multiSelectedNodes.length;
  
  // Clear list
  selectionList.innerHTML = '';
  
  // Add each selected node to the list
  multiSelectedNodes.forEach(node => {
    const item = document.createElement('div');
    item.className = 'selection-item';
    
    const itemText = document.createElement('div');
    itemText.className = 'selection-item-text';
    itemText.textContent = node.id;
    
    const removeButton = document.createElement('div');
    removeButton.className = 'selection-item-remove';
    removeButton.textContent = '✖';
    removeButton.title = 'Remove from selection';
    removeButton.addEventListener('click', () => {
      import('./nodeSelection.js').then(({ handleMultiSelectNode }) => {
        handleMultiSelectNode(node);
      });
    });
    
    item.appendChild(itemText);
    item.appendChild(removeButton);
    selectionList.appendChild(item);
  });
}

/**
 * Hide the selection panel
 */
export function hideSelectionPanel() {
  const selectionPanel = document.getElementById('selection-panel');
  if (!selectionPanel) return;
  
  selectionPanel.style.display = 'none';
}

/**
 * Set up selection panel event listeners
 */
export function setupSelectionPanelListeners() {
  // Clear selection button
  const clearButton = document.getElementById('clear-selection-btn');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      const { multiSelectedNodes, multiSelectHighlightNodes } = store.getState();
      
      // Clear selection
      multiSelectedNodes.length = 0;
      multiSelectHighlightNodes.clear();
      
      // Update state
      store.update({
        multiSelectActive: false,
        multiSelectedNodes: [],
        multiSelectHighlightNodes: new Set()
      });
      
      // Update visual highlighting
      updateCombinedHighlights();
      updateHighlight();
      
      // Hide panel
      hideSelectionPanel();
    });
  }
  
  // Link selected nodes button
  const linkButton = document.getElementById('link-selected-btn');
  if (linkButton) {
    linkButton.addEventListener('click', () => {
      import('./nodeLinking.js').then(({ handleLinkAllSelected }) => {
        handleLinkAllSelected();
      });
    });
  }
  
  // Change domain button
  const domainButton = document.getElementById('change-domain-btn');
  if (domainButton) {
    domainButton.addEventListener('click', () => {
      import('./nodeManipulation.js').then(({ handleChangeSelectedNodesDomain }) => {
        handleChangeSelectedNodesDomain();
      });
    });
  }
}

export default {
  showCustomConfirmDialog,
  showSelectionPanel,
  updateSelectionPanelPosition,
  updateSelectionPanel,
  hideSelectionPanel,
  setupSelectionPanelListeners
};