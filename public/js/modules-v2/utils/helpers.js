/**
 * Helper Utilities
 * 
 * Common utility functions used throughout the application.
 */

import store from '../state/store.js';

/**
 * Get the label text for a node
 * @param {Object} node - Node object
 * @returns {string} - Node label
 */
export function getNodeLabel(node) {
  if (!node) return '';
  
  // If node has a summary, show it in the label with the ID
  const summary = node.content_summary || 
                 (node.content && node.content.length > 80 ? 
                  node.content.substring(0, 80) + '...' : 
                  node.content);
  
  return `Memory: ${summary}\nTags: ${node.tags ? node.tags.join(', ') : ''}`;
}

/**
 * Get the color for a node based on its domain and highlight state
 * @param {Object} node - Node object
 * @returns {string} - Color hex code
 */
export function getNodeColor(node) {
  if (!node) return '#ffffff';
  
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
  
  // Domain-based coloring
  if (node.group) {
    // Initialize domain color palette if not already set
    if (!window.domainColors) {
      window.domainColors = new Map();
      window.colorIndex = 0;
      window.domainColorPalette = [
        'rgba(66, 133, 244, 0.85)',  // Google Blue
        'rgba(219, 68, 55, 0.85)',   // Google Red
        'rgba(244, 180, 0, 0.85)',   // Google Yellow
        'rgba(15, 157, 88, 0.85)',   // Google Green
        'rgba(171, 71, 188, 0.85)',  // Purple
        'rgba(255, 87, 34, 0.85)',   // Deep Orange
        'rgba(3, 169, 244, 0.85)',   // Light Blue
        'rgba(0, 150, 136, 0.85)',   // Teal
        'rgba(255, 152, 0, 0.85)',   // Orange
        'rgba(156, 39, 176, 0.85)',  // Purple
        'rgba(233, 30, 99, 0.85)',   // Pink
        'rgba(33, 150, 243, 0.85)',  // Blue
        'rgba(76, 175, 80, 0.85)',   // Green
        'rgba(255, 193, 7, 0.85)',   // Amber
        'rgba(121, 85, 72, 0.85)',   // Brown
        'rgba(96, 125, 139, 0.85)'   // Blue Grey
      ];
    }

    // Assign a color if we haven't seen this domain before
    if (!window.domainColors.has(node.group)) {
      const colorIdx = window.colorIndex % window.domainColorPalette.length;
      window.domainColors.set(node.group, window.domainColorPalette[colorIdx]);
      window.colorIndex++;
      console.log(`[Helper] Assigned color ${window.domainColorPalette[colorIdx]} to domain: ${node.group}`);
      
      // Queue an update to the legend to run after the current execution
      setTimeout(() => {
        try {
          // Import the domainManagement module dynamically to avoid circular references
          import('../core/domainManagement.js').then(domainManagement => {
            if (typeof domainManagement.updateMemoryDomainsPanel === 'function') {
              domainManagement.updateMemoryDomainsPanel();
            }
          }).catch(error => {
            console.warn('Failed to update memory domains panel:', error);
          });
        } catch (error) {
          console.warn('Failed to update memory domains panel:', error);
        }
      }, 0);
    }

    return window.domainColors.get(node.group);
  }
  
  // Default color if no domain
  return '#cccccc';
}

/**
 * Get the color for a link based on its type and highlight state
 * @param {Object} link - Link object
 * @returns {string} - Color value
 */
export function getLinkColor(link) {
  if (!link) return '#ffffff';
  
  const { highlightLinks, controlKeyPressed, hoverLink } = store.getState();
  
  // Special color for tentative/potential links
  if (link.type === 'potential_link') {
    return link.color || '#00ffff'; // Use the specified color or default to cyan
  }
  
  // If the link is highlighted
  if (highlightLinks.has(link)) {
    // Special case for hovered link with control key
    if (controlKeyPressed && hoverLink === link) {
      return '#ff00ff'; // Magenta for control+hover
    }
    return '#ffffff'; // White for highlighted links
  }
  
  // Type-based coloring
  switch(link.type) {
    case 'relates_to':
      return 'rgba(120, 170, 255, 0.6)'; // Light blue
    case 'synthesizes':
      return 'rgba(255, 180, 120, 0.6)'; // Light orange
    case 'supports':
      return 'rgba(120, 255, 170, 0.6)'; // Light green
    case 'refines':
      return 'rgba(220, 120, 255, 0.6)'; // Light purple
    default:
      return 'rgba(180, 180, 180, 0.4)'; // Light gray
  }
}

/**
 * Update the combined highlight sets
 */
export function updateCombinedHighlights() {
  const { 
    highlightNodes,
    highlightLinks,
    selectedHighlightNodes,
    selectedHighlightLinks,
    hoverHighlightNodes,
    hoverHighlightLinks,
    multiSelectHighlightNodes,
    hoverNode
  } = store.getState();
  
  // Clear combined sets
  highlightNodes.clear();
  highlightLinks.clear();
  
  // Add selected highlights first - these stay even when mouse moves away
  selectedHighlightNodes.forEach(node => highlightNodes.add(node));
  selectedHighlightLinks.forEach(link => highlightLinks.add(link));
  
  // Only add hover highlights if we have an active hover node
  // This ensures highlights disappear when mouse leaves a node
  if (hoverNode) {
    hoverHighlightNodes.forEach(node => highlightNodes.add(node));
    hoverHighlightLinks.forEach(link => highlightLinks.add(link));
  }
  
  // Add multi-select highlights last
  multiSelectHighlightNodes.forEach(node => highlightNodes.add(node));
  
  // Update store with new highlight sets
  store.update({
    highlightNodes: new Set(highlightNodes),
    highlightLinks: new Set(highlightLinks)
  });
}

/**
 * Update the visual highlighting in the graph
 */
export function updateHighlight() {
  const { 
    graph, 
    highlightNodes, 
    highlightLinks, 
    draggedNode, 
    potentialLinkTarget, 
    temporaryLinkFormed 
  } = store.getState();
  
  if (!graph) return;
  
  // Create a temporary virtual link between dragged node and potential target
  let virtualLinks = [];
  if (draggedNode && potentialLinkTarget) {
    virtualLinks = [{
      source: draggedNode,
      target: potentialLinkTarget,
      type: 'potential_link',
      color: '#00ffff', // Cyan
      strength: 0.7
    }];
  }
  
  // Update only the affected properties instead of overriding all link styling
  // This allows the visualization style to take precedence except for highlighting
  
  // Update node colors (this is always needed)
  graph.nodeColor(node => getNodeColor(node));
  
  // For links, only update colors for highlighted links and potential links
  // to avoid overriding the visualization style's settings
  const currentStyle = store.get('visualizationStyle');
  
  // Only handle special link styling for temporary links to avoid overriding visualization settings
  if (draggedNode && potentialLinkTarget) {
    // For potential links, add styling just for those special links
    graph.linkColor(link => {
      if (link.type === 'potential_link') {
        return '#00ffff'; // Cyan for potential links
      }
      // For other links, use the default styling from the current visualization style
      return getLinkColor(link);
    });
    
    // Enhance arrows for highlighted links
    graph.linkDirectionalArrowLength(link => {
      if (link.type === 'potential_link') {
        return 8; // Larger arrow for potential links
      } else if (highlightLinks.has(link)) {
        return 7; // Larger arrow for highlighted links
      }
      // For non-highlighted links, maintain the current visualization style
      return null; // null means "don't change from current setting"
    });

    // Make arrows brighter for highlighted links
    graph.linkDirectionalArrowColor(link => {
      if (link.type === 'potential_link') {
        return '#00ffff'; // Cyan for potential links
      } else if (highlightLinks.has(link)) {
        return '#ffffff'; // White for highlighted links
      }
      // For non-highlighted links, maintain the current visualization style
      return null;
    });
  } else if (highlightLinks.size > 0) {
    // If we have highlighted links but no dragged node, enhance arrows for highlights
    graph.linkDirectionalArrowLength(link => {
      if (highlightLinks.has(link)) {
        return 7; // Larger arrow for highlighted links
      }
      return null; // null means "don't change from current setting"
    });
    
    // Make arrows brighter for highlighted links
    graph.linkDirectionalArrowColor(link => {
      if (highlightLinks.has(link)) {
        return '#ffffff'; // White for highlighted links
      }
      return null;
    });
  }
    
  // Add or remove the virtual link
  const currentLinks = graph.graphData().links;
  const virtualLinkExists = currentLinks.some(link => link.type === 'potential_link');
  
  if (virtualLinks.length > 0 && !virtualLinkExists) {
    // Add virtual link
    console.log('Adding virtual tentative link:', 
                virtualLinks[0].source.id, 
                '→',
                virtualLinks[0].target.id);
                
    graph.graphData({
      nodes: graph.graphData().nodes,
      links: [...currentLinks, ...virtualLinks]
    });
  } else if (virtualLinks.length === 0 && virtualLinkExists) {
    // Remove virtual link
    console.log('Removing virtual tentative link');
    
    graph.graphData({
      nodes: graph.graphData().nodes,
      links: currentLinks.filter(link => link.type !== 'potential_link')
    });
  } else if (virtualLinks.length > 0 && virtualLinkExists) {
    // Virtual link already exists, check if it's the same one or needs to be updated
    const currentVirtualLink = currentLinks.find(link => link.type === 'potential_link');
    const newVirtualLink = virtualLinks[0];
    
    const currentSourceId = typeof currentVirtualLink.source === 'object' ? 
                         currentVirtualLink.source.id : currentVirtualLink.source;
    const currentTargetId = typeof currentVirtualLink.target === 'object' ? 
                         currentVirtualLink.target.id : currentVirtualLink.target;
                         
    const newSourceId = typeof newVirtualLink.source === 'object' ? 
                      newVirtualLink.source.id : newVirtualLink.source;
    const newTargetId = typeof newVirtualLink.target === 'object' ? 
                      newVirtualLink.target.id : newVirtualLink.target;
    
    if (currentSourceId !== newSourceId || currentTargetId !== newTargetId) {
      console.log('Updating virtual tentative link:', 
                  currentSourceId, '→', currentTargetId,
                  'to',
                  newSourceId, '→', newTargetId);
                  
      // Remove old virtual link and add new one
      graph.graphData({
        nodes: graph.graphData().nodes,
        links: [...currentLinks.filter(link => link.type !== 'potential_link'), ...virtualLinks]
      });
    }
  }
}

// Export other utility functions as needed
export default {
  getNodeLabel,
  getNodeColor,
  getLinkColor,
  updateCombinedHighlights,
  updateHighlight
};