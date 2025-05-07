/**
 * Visualization Style Manager Module
 * 
 * Manages different visualization styles for the graph.
 * Each style configures node appearance, colors, link styles, etc.
 */

import store from '../state/store.js';
import { getNodeColor, getLinkColor } from '../utils/helpers.js';
import { initializeDomainColors } from './domainManagement/colorManagement.js';
import { getComplementaryColor, blendColors } from '../utils/colorUtils.js';
import { 
  calculateLinkWidth, 
  calculateArrowLength, 
  calculateArrowPosition 
} from '../utils/linkUtils.js';
import { 
  calculateNodeConnectionCounts, 
  calculateDomainNormalizationFactors, 
  getNormalizedConnectionFactor 
} from './graph/connectionAnalysis.js';

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
      return calculateLinkWidth(link, highlightLinks.has(link));
    },
    linkColor: (link) => getLinkColor(link),
    linkCurvature: 0,
    linkOpacity: 0.8,
    
    // Use arrow heads for link direction
    linkDirectionalArrowLength: (link) => {
      const { highlightLinks } = store.getState();
      return calculateArrowLength(link, highlightLinks.has(link));
    },
    linkDirectionalArrowRelPos: (link) => calculateArrowPosition(link),
    linkDirectionalArrowColor: (link) => getLinkColor(link),
    
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
    linkWidth: (link) => calculateLinkWidth(link, false) * 0.7, // Slightly thinner for minimalist style
    linkColor: () => 'rgba(200, 200, 200, 0.4)', // All links same color
    linkCurvature: 0,
    linkOpacity: 0.5,
    
    // Subtle arrow heads for direction
    linkDirectionalArrowLength: (link) => {
      // Minimal arrows for minimalist style
      const strength = typeof link.strength === 'number' ? link.strength : 0.5;
      return strength > 0.5 ? 4 : (strength > 0.2 ? 2 : 0);
    },
    linkDirectionalArrowRelPos: 0.92, // Position close to the end
    linkDirectionalArrowColor: () => 'rgba(200, 200, 200, 0.6)', // Slightly brighter than links
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
      return calculateLinkWidth(link, highlightLinks.has(link)) * 1.2; // Slightly thicker for network style
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
    linkOpacity: 0.85,
    
    // Use bold, colorful arrows for the network style
    linkDirectionalArrowLength: (link) => {
      const { highlightLinks } = store.getState();
      const baseLength = calculateArrowLength(link, highlightLinks.has(link));
      return baseLength * 1.5; // Larger arrows for network style
    },
    linkDirectionalArrowRelPos: (link) => calculateArrowPosition(link),
    linkDirectionalArrowColor: (link) => {
      // Use the same vibrant color as the link
      if (link.type === 'potential_link') return '#00ffff';
      return null; // Match link color
    },
    
    // Background
    backgroundColor: '#000033'
  },
  
  // Gradient connection count style
  gradientConnectionCount: {
    id: 'gradientConnectionCount',
    name: 'Gradient Connection Count',
    description: 'Nodes colored by domain with gradient to complementary color based on connection count',
    
    // Node styling
    nodeRelSize: 14,
    nodeFill: (node) => {
      const { graph } = store.getState();
      
      // Special conditions (same as simple style)
      const { 
        highlightNodes, 
        potentialLinkTarget,
        draggedNode,
        selectedNodes,
        hoverNode,
        selectedNode
      } = store.getState();
      
      // Handle special node states
      if (potentialLinkTarget && node.id === potentialLinkTarget.id) {
        return '#00ffff'; // Cyan for potential link target
      }
      
      if (draggedNode && node.id === draggedNode.id) {
        return '#ffff00'; // Yellow for dragged node
      }
      
      // Check if node is in selected nodes array
      if (selectedNodes.some(n => n.id === node.id)) {
        return '#00ff00'; // Green for selected nodes
      }
      
      // Support for link selection highlighting
      if (window._linkSelection && window._linkSelection.includes(node)) {
        return '#00ff00'; // Green for link-selected nodes
      }
      
      // Highlight system
      if (highlightNodes.has(node)) {
        // Brighten the highlight color if this is the selected or hovered node
        if ((selectedNode && node.id === selectedNode.id) || node === hoverNode) {
          return '#ff5500'; // Brighter orange for selected/hovered node
        }
        return '#ff8800'; // Orange for highlighted nodes
      }
      
      // If we can't access the graph data, use the default domain color
      if (!graph) {
        // Domain-based coloring (fallback)
        if (node.group && window.domainColors?.has(node.group)) {
          return window.domainColors.get(node.group);
        }
        return '#cccccc';
      }
      
      // Get graph data for connection analysis
      const graphData = graph.graphData();
      
      // Use cached connection data if available
      if (!window._connectionData || window._connectionDataTimestamp !== graphData.timestamp) {
        // Calculate connection data for all nodes
        const connectionCounts = calculateNodeConnectionCounts(graphData.nodes, graphData.links);
        
        // Cache calculated data
        window._connectionData = {
          connectionCounts,
          normalizationFactors: calculateDomainNormalizationFactors({
            // Create a simple domain groups object on the fly
            ...[...new Set(graphData.nodes.map(n => n.group || 'default'))].reduce((acc, domain) => {
              acc[domain] = graphData.nodes
                .filter(n => (n.group || 'default') === domain)
                .map(n => ({ 
                  node: n, 
                  connectionCount: connectionCounts.get(n.id) || 0 
                }))
                .sort((a, b) => b.connectionCount - a.connectionCount);
              return acc;
            }, {})
          })
        };
        
        // Add timestamp to avoid recalculating on every frame
        window._connectionDataTimestamp = graphData.timestamp || Date.now();
      }
      
      // Domain-based coloring with connection count gradient
      if (node.group && window.domainColors?.has(node.group)) {
        const baseColor = window.domainColors.get(node.group);
        
        // Get normalized connection factor (0-1)
        const factor = getNormalizedConnectionFactor(
          node, 
          window._connectionData.connectionCounts,
          window._connectionData.normalizationFactors
        );
        
        // Enhanced: Cache complementary colors by domain
        if (!window._domainComplementaryColors) {
          window._domainComplementaryColors = new Map();
        }
        
        // Get or calculate complementary color
        let complementaryColor;
        if (window._domainComplementaryColors.has(node.group)) {
          complementaryColor = window._domainComplementaryColors.get(node.group);
        } else {
          // Calculate visually distinctive complementary color
          complementaryColor = getComplementaryColor(baseColor);
          window._domainComplementaryColors.set(node.group, complementaryColor);
        }
        
        // Use a more dramatic blend for higher contrast
        const enhancedFactor = Math.pow(factor, 0.7); // Apply power curve to emphasize differences
        return blendColors(baseColor, complementaryColor, enhancedFactor, 0.9); // Higher alpha for stronger colors
      }
      
      // Default color if no domain
      return '#cccccc';
    },
    nodeThreeObject: null,
    
    // Link styling
    linkWidth: (link) => {
      const { highlightLinks } = store.getState();
      return calculateLinkWidth(link, highlightLinks.has(link)) * 1.1; // Slightly thicker for gradient style
    },
    linkColor: (link) => getLinkColor(link),
    linkCurvature: 0.1,
    linkOpacity: 0.8,
    
    // Use gradient-colored arrows that match the link color
    linkDirectionalArrowLength: (link) => {
      const { highlightLinks } = store.getState();
      const baseLength = calculateArrowLength(link, highlightLinks.has(link));
      return baseLength * 1.3; // Slightly larger arrows for gradient style
    },
    linkDirectionalArrowRelPos: (link) => calculateArrowPosition(link),
    linkDirectionalArrowColor: (link) => getLinkColor(link), // Same color as link
    
    // Background
    backgroundColor: '#000022'
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
    .linkOpacity(style.linkOpacity)
    
    // Arrow heads for link direction
    .linkDirectionalArrowLength(style.linkDirectionalArrowLength)
    .linkDirectionalArrowRelPos(style.linkDirectionalArrowRelPos)
    .linkDirectionalArrowColor(style.linkDirectionalArrowColor)
    
    // Disable particles by setting to 0
    .linkDirectionalParticles(0);
  
  // Update currently active style
  activeVisualizationStyle = styleId;
  
  // Update store
  store.update({
    visualizationStyle: style
  });
  
  // Trigger a re-render, preserving the timestamp for connection analysis
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