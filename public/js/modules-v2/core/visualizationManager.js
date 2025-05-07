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
  // Current default style
  simple: {
    id: 'simple',
    name: 'Simple',
    description: 'Default visualization with domain-colored nodes and link types',
    
    // Node styling
    nodeRelSize: 12,
    nodeFill: (node) => getNodeColor(node),
    nodeThreeObject: null, // Use default THREE.Mesh sphere
    
    // Link styling
    linkWidth: (link) => {
      const { highlightLinks } = store.getState();
      return highlightLinks.has(link) ? 5 : 2.5;
    },
    linkColor: (link) => getLinkColor(link),
    linkCurvature: 0,
    linkDirectionalParticles: (link) => Math.round(8 * (link.strength || 0.5)),
    linkDirectionalParticleWidth: 4,
    linkDirectionalParticleSpeed: (link) => 0.00167 * link.strength,
    linkOpacity: 1,
    
    // Background
    backgroundColor: '#000020'
  },
  
  // Minimalist style
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, minimal visualization with simplified node and link appearance',
    
    // Node styling
    nodeRelSize: 8,
    nodeFill: (node) => {
      // Simplified colors - only use domain colors, no highlights
      if (node.group && window.domainColors?.has(node.group)) {
        return window.domainColors.get(node.group);
      }
      return '#cccccc';
    },
    nodeThreeObject: null,
    
    // Link styling
    linkWidth: 1.5,
    linkColor: () => 'rgba(200, 200, 200, 0.4)', // All links same color
    linkCurvature: 0,
    linkDirectionalParticles: 0, // No particles
    linkDirectionalParticleWidth: 0,
    linkOpacity: 0.4,
    
    // Background
    backgroundColor: '#000010'
  },
  
  // Network style
  network: {
    id: 'network',
    name: 'Network',
    description: 'Network diagram style with bright, vibrant connections',
    
    // Node styling
    nodeRelSize: 10,
    nodeFill: (node) => {
      if (node.group && window.domainColors?.has(node.group)) {
        // Convert rgba to brighter variant
        const color = window.domainColors.get(node.group);
        // If it's an rgba color, extract components and make more vibrant
        if (color.startsWith('rgba(')) {
          const components = color.replace('rgba(', '').replace(')', '').split(',');
          const r = Math.min(255, parseInt(components[0]) + 40);
          const g = Math.min(255, parseInt(components[1]) + 40);
          const b = Math.min(255, parseInt(components[2]) + 40);
          return `rgba(${r}, ${g}, ${b}, 0.95)`;
        }
        return color;
      }
      return '#ffffff';
    },
    nodeThreeObject: null,
    
    // Link styling
    linkWidth: (link) => {
      const { highlightLinks } = store.getState();
      return highlightLinks.has(link) ? 6 : 3;
    },
    linkColor: (link) => {
      // More vibrant link colors
      switch(link.type) {
        case 'relates_to':
          return 'rgba(120, 200, 255, 0.8)'; // Brighter blue
        case 'synthesizes':
          return 'rgba(255, 200, 120, 0.8)'; // Brighter orange
        case 'supports':
          return 'rgba(120, 255, 200, 0.8)'; // Brighter green
        case 'refines':
          return 'rgba(255, 120, 255, 0.8)'; // Brighter purple
        default:
          return 'rgba(220, 220, 220, 0.6)'; // Brighter gray
      }
    },
    linkCurvature: 0.1, // Slight curvature
    linkDirectionalParticles: (link) => Math.round(12 * (link.strength || 0.5)),
    linkDirectionalParticleWidth: 5,
    linkDirectionalParticleSpeed: (link) => 0.003 * link.strength,
    linkOpacity: 0.85,
    
    // Background
    backgroundColor: '#000033'
  }
};

/**
 * Currently active visualization style
 */
let activeVisualizationStyle = 'simple';

/**
 * Initialize visualization manager
 */
export function initializeVisualizationManager() {
  console.log('Initializing visualization manager');
  
  // Ensure domain colors are initialized
  initializeDomainColors();
  
  // Get the saved style from store (which is loaded from settings)
  const savedStyleId = store.get('visualizationStyle');
  const styleToApply = (
    typeof savedStyleId === 'string' && visualizationStyles[savedStyleId]
  ) ? savedStyleId : 'simple';
  
  // Store the style in state
  store.update({
    visualizationStyle: visualizationStyles[styleToApply]
  });
  
  // Set active style
  activeVisualizationStyle = styleToApply;
  
  console.log(`Initialized with visualization style: ${styleToApply}`);
}

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
  
  // Apply all graph properties
  graph
    .nodeRelSize(style.nodeRelSize)
    .nodeColor(style.nodeFill)
    .backgroundColor(style.backgroundColor)
    .linkWidth(style.linkWidth)
    .linkColor(style.linkColor)
    .linkCurvature(style.linkCurvature)
    .linkDirectionalParticles(style.linkDirectionalParticles)
    .linkDirectionalParticleWidth(style.linkDirectionalParticleWidth)
    .linkDirectionalParticleSpeed(style.linkDirectionalParticleSpeed)
    .linkOpacity(style.linkOpacity);
  
  // Update currently active style
  activeVisualizationStyle = styleId;
  
  // Update store
  store.update({
    visualizationStyle: style
  });
  
  // Trigger a re-render
  const graphData = graph.graphData();
  graph.graphData({
    nodes: [...graphData.nodes],
    links: [...graphData.links]
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