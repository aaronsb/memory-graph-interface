/**
 * Graph Interactions Module
 * 
 * Handles user interactions with the graph, including
 * hovering, clicking, and context menus.
 */

import store from '../../state/store.js';
import { updateCombinedHighlights, updateHighlight } from '../../utils/helpers.js';
import { showContextMenu, hideContextMenu } from '../../ui/contextMenu.js';

// Import modules using dynamic imports to avoid circular dependencies
const importNodeInteractions = () => import('../../core/nodeInteractions.js');
const importLinkManagement = () => import('../../core/linkManagement.js');

/**
 * Set up node interactions for the graph
 * @param {Object} graph - The 3D force graph instance
 */
export function setupNodeInteractions(graph) {
  // Node hover handling
  graph.onNodeHover(node => {
    // Store current state
    const { 
      controlKeyPressed,
      hoverHighlightNodes,
      hoverHighlightLinks,
      graphData,
      hoverNode,
      selectedNode
    } = store.getState();
    
    // If control key is pressed, we're in a special selection mode
    if (controlKeyPressed) {
      store.set('hoverNode', node || null);
      return;
    }
    
    // Only update if the hovered node has changed
    if (node && hoverNode === node) return;
    
    // Clear previous hovered items
    hoverHighlightNodes.clear();
    hoverHighlightLinks.clear();
    
    if (node) {
      // Add the hovered node to highlights
      hoverHighlightNodes.add(node);
      
      // Add connected nodes and links to hover highlight set
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === node.id || targetId === node.id) {
          hoverHighlightLinks.add(link);
          
          // Also highlight connected nodes
          const connectedNode = sourceId === node.id ? 
            (typeof link.target === 'object' ? link.target : 
              graphData.nodes.find(n => n.id === targetId)) : 
            (typeof link.source === 'object' ? link.source : 
              graphData.nodes.find(n => n.id === sourceId));
          
          if (connectedNode) {
            hoverHighlightNodes.add(connectedNode);
          }
        }
      });
    } else {
      // When mouse leaves a node (node is null), clear all hover highlights
      // Only keep selected node highlights if a node is selected
      console.log('Mouse left node, clearing hover highlights');
    }
    
    // Update state with new hover highlights
    store.update({
      hoverNode: node || null,
      hoverHighlightNodes: new Set(hoverHighlightNodes),
      hoverHighlightLinks: new Set(hoverHighlightLinks)
    });
    
    // Update visual highlights
    updateCombinedHighlights();
    updateHighlight();
  });
  
  // Node click handling
  graph.onNodeClick((node, event) => {
    const { multiSelectActive } = store.getState();
    
    // Ensure node object is valid
    if (!node) {
      console.log('No valid node object provided to onNodeClick');
      return;
    }
    
    // Log the node for debugging
    console.log('Node clicked:', node.id);
    
    // Check if shift key is pressed or multi-select mode is active
    if (event.shiftKey || multiSelectActive) {
      importNodeInteractions().then(nodeInteractions => {
        nodeInteractions.handleMultiSelectNode(node);
      });
      return;
    }
    
    // Handle control+click for node deletion
    if (store.get('controlKeyPressed')) {
      console.log('Control-click detected on node:', node.id);
      importNodeInteractions().then(nodeInteractions => {
        nodeInteractions.handleDeleteNode(node);
      });
      return;
    }
    
    // Handle alt+click for link creation between selected nodes
    if (event.altKey) {
      console.log('Alt-click detected on node:', node.id);
      
      const selectedNodes = store.get('selectedNodes');
      const index = selectedNodes.findIndex(n => n.id === node.id);
      
      if (index !== -1) {
        // Node already selected, remove it
        selectedNodes.splice(index, 1);
        console.log('Node removed from selection:', node.id);
      } else {
        // Node not selected, add it
        selectedNodes.push(node);
        console.log('Node added to selection:', node.id);
      }
      
      // If we now have exactly 2 nodes selected, create a link
      if (selectedNodes.length === 2) {
        const sourceNode = selectedNodes[0];
        const targetNode = selectedNodes[1];
        
        importLinkManagement().then(linkManagement => {
          linkManagement.handleCreateLink(sourceNode, targetNode);
          
          // Clear selection after creating link
          store.set('selectedNodes', []);
          
          // Update highlights
          updateCombinedHighlights();
          updateHighlight();
        });
      }
      
      return;
    }
    
    // Default node click behavior - show node details or deselect if already selected
    importNodeInteractions().then(nodeInteractions => {
      nodeInteractions.handleViewNodeDetails(node);
    });
  });
  
  // Node right-click for context menu
  graph.onNodeRightClick((node, event) => {
    event.preventDefault();
    const { clientX, clientY } = event;
    showContextMenu(clientX, clientY, node, null);
    return false;
  });
  
  // Background right-click for context menu
  graph.onBackgroundRightClick((event) => {
    event.preventDefault();
    const { clientX, clientY } = event;
    showContextMenu(clientX, clientY);
    return false;
  });
}

/**
 * Set up link interactions for the graph
 * @param {Object} graph - The 3D force graph instance
 */
export function setupLinkInteractions(graph) {
  // Link hover handling
  graph.onLinkHover(link => {
    store.set('hoverLink', link || null);
  });
  
  // Link click handling
  graph.onLinkClick((link, event) => {
    // Handle control+click for link deletion
    if (store.get('controlKeyPressed') && store.get('hoverLink') === link) {
      console.log('Control-click detected on link:', link);
      
      importLinkManagement().then(linkManagement => {
        linkManagement.handleDeleteLink(link);
      });
    }
  });
  
  // Link right-click for context menu
  graph.onLinkRightClick((link, event) => {
    event.preventDefault();
    const { clientX, clientY } = event;
    showContextMenu(clientX, clientY, null, link);
    return false;
  });
}

/**
 * Set up special interaction modes (e.g., link creation)
 * @param {Object} graph - The 3D force graph instance
 */
export function setupInteractionModes(graph) {
  // Watch for state changes to enable/disable special interaction modes
  store.subscribe('linkCreationMode', value => {
    if (value) {
      // Enable link creation mode visual cues
      document.body.style.cursor = 'crosshair';
      
      // Add visual indicator
      const indicator = document.createElement('div');
      indicator.id = 'link-creation-mode-indicator';
      indicator.textContent = 'Link Creation Mode: Select first node';
      indicator.style.position = 'fixed';
      indicator.style.bottom = '10px';
      indicator.style.left = '10px';
      indicator.style.backgroundColor = 'rgba(100, 100, 255, 0.8)';
      indicator.style.color = 'white';
      indicator.style.padding = '10px';
      indicator.style.borderRadius = '5px';
      indicator.style.zIndex = 1000;
      document.body.appendChild(indicator);
    } else {
      // Disable link creation mode visual cues
      document.body.style.cursor = 'default';
      
      // Remove visual indicator
      const indicator = document.getElementById('link-creation-mode-indicator');
      if (indicator) document.body.removeChild(indicator);
    }
  });
}

export default {
  setupNodeInteractions,
  setupLinkInteractions,
  setupInteractionModes
};