/**
 * Selection Box Module
 * 
 * Handles shift-click drag to create a selection box for multi-selecting nodes
 */

import store from '../../state/store.js';
import { handleMultiSelectNode } from '../nodeInteractions.js';

let selectionBox = null;
let isDrawing = false;
let startX = 0;
let startY = 0;
let graphCanvas = null;
let graph = null;

/**
 * Initialize selection box functionality
 * @param {Object} graphInstance - The 3D force graph instance
 */
export function initSelectionBox(graphInstance) {
  graph = graphInstance;
  
  // Get the canvas element that the graph renders to
  const graphContainer = document.getElementById('graph-container');
  if (!graphContainer) {
    console.error('Graph container not found');
    return;
  }
  
  // Get the canvas element within the container
  graphCanvas = graphContainer.querySelector('canvas');
  if (!graphCanvas) {
    console.error('Graph canvas not found');
    return;
  }
  
  // Create selection box element
  selectionBox = document.createElement('div');
  selectionBox.id = 'selection-box';
  selectionBox.style.position = 'absolute';
  selectionBox.style.border = '2px dashed rgba(100, 100, 255, 0.8)';
  selectionBox.style.backgroundColor = 'rgba(100, 100, 255, 0.1)';
  selectionBox.style.pointerEvents = 'none';
  selectionBox.style.display = 'none';
  selectionBox.style.zIndex = '1000';
  graphContainer.appendChild(selectionBox);
  
  // Add event listeners
  graphCanvas.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  // Also handle mouse leave to cancel selection if needed
  graphCanvas.addEventListener('mouseleave', handleMouseLeave);
}

/**
 * Handle mouse down event
 * @param {MouseEvent} event
 */
function handleMouseDown(event) {
  // Only start selection box on shift+left click on the background
  if (!event.shiftKey || event.button !== 0) {
    return;
  }
  
  console.log('Selection box: Shift+click detected on canvas');
  
  // Check if we clicked on the background (not on a node)
  const hoveredNode = store.get('hoverNode');
  if (hoveredNode) {
    console.log('Selection box: Cancelled - clicked on a node');
    return; // Don't start selection box if we're over a node
  }
  
  console.log('Selection box: Starting selection on background');
  
  // Prevent camera rotation while dragging
  event.preventDefault();
  event.stopPropagation();
  
  // Start drawing selection box
  isDrawing = true;
  const rect = graphCanvas.getBoundingClientRect();
  startX = event.clientX - rect.left;
  startY = event.clientY - rect.top;
  
  // Position and show selection box
  selectionBox.style.left = startX + 'px';
  selectionBox.style.top = startY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  selectionBox.style.display = 'block';
  
  // Disable camera controls while drawing
  if (graph && graph.controls) {
    graph.controls().enabled = false;
  }
}

/**
 * Handle mouse move event
 * @param {MouseEvent} event
 */
function handleMouseMove(event) {
  if (!isDrawing) return;
  
  const rect = graphCanvas.getBoundingClientRect();
  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;
  
  // Calculate dimensions
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  
  // Update selection box
  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
}

/**
 * Handle mouse up event
 * @param {MouseEvent} event
 */
function handleMouseUp(event) {
  if (!isDrawing) return;
  
  isDrawing = false;
  
  // Get final selection box bounds
  const boxRect = selectionBox.getBoundingClientRect();
  const canvasRect = graphCanvas.getBoundingClientRect();
  
  // Convert to relative coordinates
  const relativeBox = {
    left: boxRect.left - canvasRect.left,
    top: boxRect.top - canvasRect.top,
    right: boxRect.right - canvasRect.left,
    bottom: boxRect.bottom - canvasRect.top
  };
  
  // Find nodes within the selection box
  const graphData = store.get('graphData');
  if (graphData && graphData.nodes) {
    const selectedNodes = [];
    
    graphData.nodes.forEach(node => {
      // Project node position to screen coordinates
      const screenCoords = graph.graph2ScreenCoords(node.x, node.y, node.z);
      
      // Check if node is within selection box
      if (screenCoords.x >= relativeBox.left && 
          screenCoords.x <= relativeBox.right &&
          screenCoords.y >= relativeBox.top && 
          screenCoords.y <= relativeBox.bottom) {
        selectedNodes.push(node);
      }
    });
    
    // Add selected nodes to the multi-selection
    selectedNodes.forEach(node => {
      handleMultiSelectNode(node);
    });
    
    console.log(`Selected ${selectedNodes.length} nodes with selection box`);
  }
  
  // Hide selection box
  selectionBox.style.display = 'none';
  
  // Re-enable camera controls
  if (graph && graph.controls) {
    graph.controls().enabled = true;
  }
}

/**
 * Handle mouse leave event (cancel selection if mouse leaves canvas)
 * @param {MouseEvent} event
 */
function handleMouseLeave(event) {
  if (!isDrawing) return;
  
  // Cancel selection
  isDrawing = false;
  selectionBox.style.display = 'none';
  
  // Re-enable camera controls
  if (graph && graph.controls) {
    graph.controls().enabled = true;
  }
}

/**
 * Clean up selection box (useful when unloading the page)
 */
export function cleanupSelectionBox() {
  if (graphCanvas) {
    graphCanvas.removeEventListener('mousedown', handleMouseDown);
    graphCanvas.removeEventListener('mouseleave', handleMouseLeave);
  }
  
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  
  if (selectionBox && selectionBox.parentNode) {
    selectionBox.parentNode.removeChild(selectionBox);
  }
  
  selectionBox = null;
  graphCanvas = null;
  graph = null;
}

export default {
  initSelectionBox,
  cleanupSelectionBox
};