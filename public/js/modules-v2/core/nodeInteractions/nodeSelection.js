/**
 * Node Selection Module
 * 
 * Handles selection of nodes, both single and multi-node selection.
 */

import store from '../../state/store.js';
import { updateCombinedHighlights, updateHighlight } from '../../utils/helpers.js';

/**
 * Show details for a node in the info panel, or deselect if already selected
 * @param {Object} node - The node to show details for
 */
export function handleViewNodeDetails(node) {
  const currentSelectedNode = store.get('selectedNode');
  
  // Add check to ensure we have a valid node object
  if (!node) {
    console.log('No node provided to handleViewNodeDetails');
    return;
  }
  
  // Check if the node is already selected by comparing IDs
  const isSameNode = currentSelectedNode && 
                     (currentSelectedNode.id === node.id || 
                      currentSelectedNode === node.id);
  
  if (isSameNode) {
    console.log('Deselecting node:', node.id);
    
    // Clear selection
    store.set('selectedNode', null);
    
    // Clear highlights
    const { selectedHighlightNodes, selectedHighlightLinks } = store.getState();
    selectedHighlightNodes.clear();
    selectedHighlightLinks.clear();
    
    // Update highlights
    updateCombinedHighlights();
    updateHighlight();
    
    // Depopulate info panel instead of hiding it
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) {
      // Clear the node ID
      const nodeIdElement = document.getElementById('node-id');
      if (nodeIdElement) {
        nodeIdElement.textContent = 'No Node Selected';
      }
      
      // Clear node content
      const nodeContent = document.getElementById('node-content');
      if (nodeContent) {
        nodeContent.innerHTML = '';
      }
      
      // Clear node tags
      const nodeTags = document.getElementById('node-tags');
      if (nodeTags) {
        nodeTags.innerHTML = '';
      }
      
      // Keep the panel visible if it was already visible
      // We don't hide the panel here anymore
    }
    
    return;
  }
  
  console.log('Viewing details for node:', node.id);
  
  // Update state
  store.set('selectedNode', node);
  
  // Clear previous selection
  const { selectedHighlightNodes, selectedHighlightLinks } = store.getState();
  selectedHighlightNodes.clear();
  selectedHighlightLinks.clear();
  
  if (node) {
    // Add newly selected node
    selectedHighlightNodes.add(node);
    
    // Add links connected to this node
    const { graphData } = store.getState();
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === node.id || targetId === node.id) {
        selectedHighlightLinks.add(link);
      }
    });
    
    // Show info panel
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) {
      // Set node ID in panel header
      const nodeIdElement = document.getElementById('node-id');
      if (nodeIdElement) {
        nodeIdElement.textContent = node.id;
      }
      
      // Set node content
      const nodeContent = document.getElementById('node-content');
      if (nodeContent) {
        // Use content_summary if available, otherwise use content
        nodeContent.innerHTML = node.content || '';
      }
      
      // Set node tags
      const nodeTags = document.getElementById('node-tags');
      if (nodeTags) {
        nodeTags.innerHTML = '';
        
        if (node.tags && node.tags.length > 0) {
          node.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = tag;
            nodeTags.appendChild(tagElement);
          });
        }
        
        // Add summary if available
        if (node.content_summary) {
          const summaryDiv = document.createElement('div');
          summaryDiv.className = 'summary';
          summaryDiv.textContent = node.content_summary;
          nodeTags.appendChild(summaryDiv);
        }
      }
      
      // Show the panel
      infoPanel.style.display = 'block';
      
      // Always show the tag input interface (with skipViewDetails=true to avoid infinite loop)
      import('./nodeManipulation.js').then(({ handleShowTagInput }) => {
        handleShowTagInput(node, true);
      });
    }
    
    // If auto-zoom is enabled, zoom to the node
    const { zoomOnSelect, graph } = store.getState();
    if (zoomOnSelect && graph) {
      graph.centerAt(node.x, node.y, node.z, 1000);
      graph.zoom(1.5, 1000);
    }
  } else {
    // Depopulate info panel instead of hiding it
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) {
      // Clear the node ID
      const nodeIdElement = document.getElementById('node-id');
      if (nodeIdElement) {
        nodeIdElement.textContent = 'No Node Selected';
      }
      
      // Clear node content
      const nodeContent = document.getElementById('node-content');
      if (nodeContent) {
        nodeContent.innerHTML = '';
      }
      
      // Clear node tags
      const nodeTags = document.getElementById('node-tags');
      if (nodeTags) {
        nodeTags.innerHTML = '';
      }
      
      // Keep the panel visible if it was already visible
      // We don't hide the panel here anymore
    }
  }
  
  // Update state with new selection
  store.update({
    selectedHighlightNodes: new Set(selectedHighlightNodes),
    selectedHighlightLinks: new Set(selectedHighlightLinks)
  });
  
  // Update visual highlighting
  updateCombinedHighlights();
  updateHighlight();
}

/**
 * Handle multi-selection of a node (shift+click)
 * @param {Object} node - The node to add to multi-selection
 */
export function handleMultiSelectNode(node) {
  console.log('Multi-selecting node:', node.id);
  
  // Get multi-selection state
  const { multiSelectedNodes, multiSelectHighlightNodes } = store.getState();
  
  // Check if node is already selected
  const index = multiSelectedNodes.findIndex(n => n.id === node.id);
  
  if (index !== -1) {
    // Node already selected, remove it
    multiSelectedNodes.splice(index, 1);
    multiSelectHighlightNodes.delete(node);
    console.log('Removed node from multi-selection:', node.id);
  } else {
    // Node not selected, add it
    multiSelectedNodes.push(node);
    multiSelectHighlightNodes.add(node);
    console.log('Added node to multi-selection:', node.id);
  }
  
  // Update state
  store.update({
    multiSelectActive: multiSelectedNodes.length > 0,
    multiSelectedNodes: [...multiSelectedNodes],
    multiSelectHighlightNodes: new Set(multiSelectHighlightNodes)
  });
  
  // Update visual highlighting
  updateCombinedHighlights();
  updateHighlight();
  
  // Import UI module to update panel
  import('./ui.js').then(({ showSelectionPanel, updateSelectionPanel }) => {
    // Show selection panel if not already shown
    showSelectionPanel();
    
    // Update selection panel contents
    updateSelectionPanel();
  });
}

/**
 * Clear a node from all selection sets
 * @param {Object} node - The node to clear
 */
export function clearNodeFromSelections(node) {
  const { 
    highlightNodes,
    selectedHighlightNodes,
    hoverHighlightNodes,
    multiSelectHighlightNodes,
    multiSelectedNodes
  } = store.getState();
  
  // Remove from highlight sets
  highlightNodes.delete(node);
  selectedHighlightNodes.delete(node);
  hoverHighlightNodes.delete(node);
  multiSelectHighlightNodes.delete(node);
  
  // Remove from multi-selected nodes array
  const index = multiSelectedNodes.findIndex(n => n.id === node.id);
  if (index !== -1) {
    multiSelectedNodes.splice(index, 1);
  }
  
  // Update state
  store.update({
    highlightNodes: new Set(highlightNodes),
    selectedHighlightNodes: new Set(selectedHighlightNodes),
    hoverHighlightNodes: new Set(hoverHighlightNodes),
    multiSelectHighlightNodes: new Set(multiSelectHighlightNodes),
    multiSelectedNodes: [...multiSelectedNodes]
  });
  
  // Update visual highlighting
  updateCombinedHighlights();
  updateHighlight();
}

export default {
  handleViewNodeDetails,
  handleMultiSelectNode,
  clearNodeFromSelections
};