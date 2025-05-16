/**
 * Visualization Style Manager Module
 * 
 * Manages different visualization styles for the graph.
 * Each style configures node appearance, colors, link styles, etc.
 */

import store from '../state/store.js';
import { getNodeColor, getLinkColor } from '../utils/helpers.js';
import { initializeDomainColors } from './domainManagement/colorManagement.js';

// Available visualization styles
const visualizationStyles = {
  // Clean style - matches the 3d-force-graph example style
  clean: {
    id: 'clean',
    name: 'Clean',
    description: 'Clean visualization with minimal styling, like the 3d-force-graph examples',
    
    // Node styling - smaller nodes
    nodeRelSize: 4, // Even smaller nodes like in the example
    nodeFill: (node) => getNodeColor(node),
    nodeThreeObject: null, // Use default THREE.Mesh sphere 
    
    // Use simple line rendering for links
    linkThreeObject: null, // No custom THREE.js object
    linkPositionUpdate: null, // No custom position update
    linkWidth: 1.0, // Increased width to make lines visible
    linkColor: (link) => getLinkColor(link),
    linkCurvature: 0,
    linkOpacity: 0.7, // Increased opacity for better visibility
    
    // Use 2D-style directional arrows
    linkDirectionalArrowLength: 3, // Slightly larger arrows
    linkDirectionalArrowRelPos: 1, // At the very end
    
    // Background
    backgroundColor: '#000011'
  }
  
  // Additional styles can be added here in the future
};

/**
 * Currently active visualization style
 */
let activeVisualizationStyle = 'clean';

/**
 * Initialize visualization manager
 */
export function initializeVisualizationManager() {
  console.log('Initializing visualization manager');
  
  // Ensure domain colors are initialized
  initializeDomainColors();
  
  // Get the saved style from store (which is loaded from settings)
  const savedStyleId = store.get('visualizationStyle');
  // Use the clean style as the default instead of simple
  const styleToApply = (
    typeof savedStyleId === 'string' && visualizationStyles[savedStyleId]
  ) ? savedStyleId : 'clean';
  
  // Store the style in state
  store.update({
    visualizationStyle: visualizationStyles[styleToApply]
  });
  
  // Set active style
  activeVisualizationStyle = styleToApply;
  
  console.log(`Initialized with visualization style: ${styleToApply}`);
}

// We no longer need custom link renderer toggle functions since we're using 
// the built-in renderer for clean, simple visualization

/**
 * Apply a visualization style to the graph
 * @param {string} styleId - ID of the style to apply
 */
export function applyVisualizationStyle(styleId) {
  const { graph } = store.getState();
  if (!graph) {
    console.warn('Cannot apply visualization style: graph not initialized');
    return;
  }
  
  // Get the style configuration
  const style = visualizationStyles[styleId];
  if (!style) {
    console.warn(`Visualization style "${styleId}" not found`);
    return;
  }
  
  console.log(`Applying visualization style: ${style.name}`);
  
  // Apply core graph properties
  graph
    .nodeRelSize(style.nodeRelSize)
    .nodeColor(style.nodeFill)
    .backgroundColor(style.backgroundColor)
    .linkWidth(style.linkWidth)
    .linkColor(style.linkColor)
    .linkCurvature(style.linkCurvature)
    .linkOpacity(style.linkOpacity)
    .linkResolution(6) // Higher resolution for smoother lines
    .linkDirectionalArrowLength(style.linkDirectionalArrowLength)
    .linkDirectionalArrowRelPos(style.linkDirectionalArrowRelPos)
    .linkDirectionalParticles(0); // No particles
    
  // Handle edge labels separately - preserve showEdgeLabels setting
  const showEdgeLabels = store.get('showEdgeLabels');
  if (showEdgeLabels) {
    // Create link labels using SpriteText
    graph.linkThreeObject(link => {
      if (typeof SpriteText !== 'undefined') {
        const sprite = new SpriteText(link.type);
        sprite.color = 'white';
        sprite.textHeight = 4;
        sprite.backgroundColor = 'rgba(0,0,0,0.7)';
        sprite.padding = 3;
        return sprite;
      }
      return null;
    });
    
    // Position link labels at the middle of links
    graph.linkPositionUpdate((sprite, { start, end }) => {
      if (sprite) {
        // Position the sprite at the middle of the link
        const middlePos = {
          x: start.x + (end.x - start.x) / 2,
          y: start.y + (end.y - start.y) / 2,
          z: start.z + (end.z - start.z) / 2
        };
        Object.assign(sprite.position, middlePos);
      }
    });
    
    // Ensure the link line is still rendered
    graph.linkThreeObjectExtend(true);
  } else {
    // No edge labels
    graph.linkThreeObject(null);
    graph.linkPositionUpdate(null);
    graph.linkThreeObjectExtend(true);
  }
  
  // Update currently active style
  activeVisualizationStyle = styleId;
  
  // Update store with both the style object and the style ID
  store.update({
    visualizationStyle: style,
    visualizationStyleId: styleId
  });
  
  // Trigger a re-render, preserving the timestamp
  const graphData = graph.graphData();
  graph.graphData({
    nodes: [...graphData.nodes],
    links: [...graphData.links],
    timestamp: graphData.timestamp || Date.now()
  });
}

/**
 * Get all available visualization styles
 * @returns {Object[]} Array of visualization style objects
 */
export function getVisualizationStyles() {
  return Object.values(visualizationStyles);
}

/**
 * Get the currently active visualization style
 * @returns {string} ID of the active style
 */
export function getActiveVisualizationStyle() {
  return activeVisualizationStyle;
}

export default {
  initializeVisualizationManager,
  applyVisualizationStyle,
  getVisualizationStyles,
  getActiveVisualizationStyle
};