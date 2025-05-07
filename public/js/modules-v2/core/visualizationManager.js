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
  createGridStyleLink, 
  updateGridStyleLink 
} from './graph/customLinks.js';
import { 
  calculateNodeConnectionCounts, 
  calculateDomainNormalizationFactors, 
  getNormalizedConnectionFactor 
} from './graph/connectionAnalysis.js';

// Flag to toggle between custom and default link renderers
let useCustomLinkRenderer = true;

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
    
    // Use custom links for all connections
    linkThreeObject: (link) => {
      const { highlightLinks } = store.getState();
      const isHighlighted = highlightLinks.has(link);
      
      // Get link color for arrow color
      const linkColor = getLinkColor(link);
      
      // Parse color to RGB
      let arrowColor = 0x8888ff; // Default
      if (linkColor.startsWith('rgba(')) {
        const components = linkColor.replace('rgba(', '').replace(')', '').split(',');
        const r = parseInt(components[0].trim());
        const g = parseInt(components[1].trim());
        const b = parseInt(components[2].trim());
        arrowColor = (r << 16) | (g << 8) | b;
      }
      
      // Calculate arrow length based on link strength
      const arrowLength = calculateArrowLength(link, isHighlighted);
      const arrowPosition = calculateArrowPosition(link);
      
      // Create a custom link with reference plane colors
      return createGridStyleLink(link, {x:0,y:0,z:0}, {x:0,y:0,z:0}, {
        mainColor: 0x444466, // Main grid color
        lineWidth: isHighlighted ? 2.5 : 1.5,
        showArrow: true,
        arrowLength: arrowLength,
        arrowPosition: arrowPosition,
        arrowColor: arrowColor,
        curved: false
      });
    },
    linkPositionUpdate: (obj, { start, end }) => {
      // Update position of the custom link object
      if (obj) {
        updateGridStyleLink(obj, start, end);
        return true; // Indicate we've handled positioning
      }
      return false;
    },
    linkColor: (link) => getLinkColor(link), // Just for highlighting logic
    linkCurvature: 0,
    linkOpacity: 0.8,
    
    // Disable default arrows since we have custom ones
    linkDirectionalArrowLength: 0,
    linkDirectionalArrowRelPos: 1,
    
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
    
    // Use custom links for minimalist style
    linkThreeObject: (link) => {
      // Simple, consistent color for minimalist style
      const arrowColor = 0xcccccc; // Light gray
      
      // Minimal arrow length for stronger links
      const strength = typeof link.strength === 'number' ? link.strength : 0.5;
      const showArrow = strength > 0.3; // Only show arrows for medium-strong links
      const arrowLength = strength > 0.5 ? 4 : 2; // Minimal arrows
      
      // Create a simple link with minimal style
      return createGridStyleLink(link, {x:0,y:0,z:0}, {x:0,y:0,z:0}, {
        mainColor: 0x333344, // More subtle color
        lineWidth: 1,
        showArrow: showArrow,
        arrowLength: arrowLength,
        arrowPosition: 0.92, // Closer to end
        arrowColor: arrowColor,
        curved: false
      });
    },
    linkPositionUpdate: (obj, { start, end }) => {
      // Update position of the custom link object
      if (obj) {
        updateGridStyleLink(obj, start, end);
        return true; // Indicate we've handled positioning
      }
      return false;
    },
    linkColor: () => 'rgba(200, 200, 200, 0.4)', // For selection logic
    linkCurvature: 0,
    linkOpacity: 0.5,
    
    // Disable default arrows
    linkDirectionalArrowLength: 0,
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
    
    // Use custom curved links with vibrant network colors
    linkThreeObject: (link) => {
      const { highlightLinks } = store.getState();
      const isHighlighted = highlightLinks.has(link);
      
      // Get vibrant colors based on link type
      let linkColor;
      let mainColor;
      
      switch(link.type) {
        case 'relates_to':
          linkColor = 'rgba(120, 200, 255, 0.8)'; // Brighter blue
          mainColor = 0x78c8ff;
          break;
        case 'synthesizes':
          linkColor = 'rgba(255, 200, 120, 0.8)'; // Brighter orange
          mainColor = 0xffc878;
          break;
        case 'supports':
          linkColor = 'rgba(120, 255, 200, 0.8)'; // Brighter green
          mainColor = 0x78ffc8;
          break;
        case 'refines':
          linkColor = 'rgba(255, 120, 255, 0.8)'; // Brighter purple
          mainColor = 0xff78ff;
          break;
        default:
          linkColor = 'rgba(220, 220, 220, 0.6)'; // Brighter gray
          mainColor = 0xdddddd;
      }
      
      // Calculate arrow length based on link strength
      const arrowLength = calculateArrowLength(link, isHighlighted) * 1.5; // Larger for network style
      const arrowPosition = calculateArrowPosition(link);
      
      // Create a vibrant, colorful curved link
      return createGridStyleLink(link, {x:0,y:0,z:0}, {x:0,y:0,z:0}, {
        mainColor: mainColor,
        lineWidth: isHighlighted ? 3 : 2, // Thicker for network style
        showArrow: true,
        arrowLength: arrowLength,
        arrowPosition: arrowPosition,
        arrowColor: mainColor,
        curved: true // Use curved lines for network style
      });
    },
    linkPositionUpdate: (obj, { start, end }) => {
      // Update position of the custom link object
      if (obj) {
        updateGridStyleLink(obj, start, end);
        return true; // Indicate we've handled positioning
      }
      return false;
    },
    linkColor: (link) => {
      // Keep this for selection logic - same vibrant colors
      switch(link.type) {
        case 'relates_to': return 'rgba(120, 200, 255, 0.8)'; // Brighter blue
        case 'synthesizes': return 'rgba(255, 200, 120, 0.8)'; // Brighter orange
        case 'supports': return 'rgba(120, 255, 200, 0.8)'; // Brighter green
        case 'refines': return 'rgba(255, 120, 255, 0.8)'; // Brighter purple
        default: return 'rgba(220, 220, 220, 0.6)'; // Brighter gray
      }
    },
    linkCurvature: 0.1, // Slight curvature
    linkOpacity: 0.85,
    
    // Disable default arrows
    linkDirectionalArrowLength: 0,
    
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
    
    // Use custom links for gradient connection style
    linkThreeObject: (link) => {
      const { highlightLinks } = store.getState();
      const isHighlighted = highlightLinks.has(link);
      
      // Get link color for arrow color
      const linkColor = getLinkColor(link);
      
      // Parse color to RGB
      let mainColor = 0x444466; // Default
      let arrowColor = 0x8888ff; // Default
      
      if (linkColor.startsWith('rgba(')) {
        const components = linkColor.replace('rgba(', '').replace(')', '').split(',');
        const r = parseInt(components[0].trim());
        const g = parseInt(components[1].trim());
        const b = parseInt(components[2].trim());
        
        // Use the link color for both line and arrow for gradient style
        mainColor = (r << 16) | (g << 8) | b;
        arrowColor = mainColor;
      }
      
      // Calculate arrow length based on link strength
      const arrowLength = calculateArrowLength(link, isHighlighted) * 1.3; // Slightly larger for gradient style
      const arrowPosition = calculateArrowPosition(link);
      const strength = typeof link.strength === 'number' ? link.strength : 0.5;
      
      // Create a custom link with gradient colors
      return createGridStyleLink(link, {x:0,y:0,z:0}, {x:0,y:0,z:0}, {
        mainColor: mainColor,
        lineWidth: isHighlighted ? 2.5 : 1.8, // Slightly thicker for gradient style
        showArrow: true,
        arrowLength: arrowLength,
        arrowPosition: arrowPosition,
        arrowColor: arrowColor,
        curved: strength > 0.7 // Use curved lines for strong connections
      });
    },
    linkPositionUpdate: (obj, { start, end }) => {
      // Update position of the custom link object
      if (obj) {
        updateGridStyleLink(obj, start, end);
        return true; // Indicate we've handled positioning
      }
      return false;
    },
    
    // Keep these for highlighting logic
    linkColor: (link) => getLinkColor(link),
    linkCurvature: 0,
    linkOpacity: 0.8,
    
    // Disable default arrows since we have custom ones
    linkDirectionalArrowLength: 0,
    linkDirectionalArrowRelPos: 1,
    
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
 * Toggle between custom and default link renderers
 * @returns {boolean} New state of custom link renderer (true = custom, false = default)
 */
export function toggleCustomLinkRenderer() {
  useCustomLinkRenderer = !useCustomLinkRenderer;
  console.log(`Link renderer set to: ${useCustomLinkRenderer ? 'Custom' : 'Default'}`);
  
  // Re-apply the current style with the new renderer setting
  if (activeVisualizationStyle) {
    applyVisualizationStyle(activeVisualizationStyle);
  }
  
  return useCustomLinkRenderer;
}

/**
 * Get the current state of the custom link renderer
 * @returns {boolean} Current state (true = custom, false = default)
 */
export function isUsingCustomLinkRenderer() {
  return useCustomLinkRenderer;
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
    .linkColor(style.linkColor)
    .linkCurvature(style.linkCurvature)
    .linkOpacity(style.linkOpacity);
    
  // Apply different link rendering based on the toggle
  if (useCustomLinkRenderer) {
    // Use custom THREE.js object for links
    graph
      .linkWidth(0) // Zero width for custom links
      .linkThreeObject(style.linkThreeObject)
      .linkThreeObjectExtend(false) // Don't extend the default line - use only our custom object
      .linkPositionUpdate(style.linkPositionUpdate)
      .linkDirectionalArrowLength(0); // Disable default arrows
  } else {
    // Use default Force3D link renderer
    graph
      .linkWidth(style.customLinkWidth || 1.5) // Use width for default links
      .linkThreeObject(null) // Remove custom objects
      .linkThreeObjectExtend(true) // Use default line
      .linkPositionUpdate(null) // No custom position updates
      .linkDirectionalArrowLength(6) // Use default arrows
      .linkDirectionalArrowRelPos(0.9);
  }
  
  // Disable particles either way
  graph.linkDirectionalParticles(0);
  
  // Update currently active style
  activeVisualizationStyle = styleId;
  
  // Update store with both the style object and the style ID
  store.update({
    visualizationStyle: style,
    visualizationStyleId: styleId
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
  getActiveVisualizationStyle,
  toggleCustomLinkRenderer,
  isUsingCustomLinkRenderer
};