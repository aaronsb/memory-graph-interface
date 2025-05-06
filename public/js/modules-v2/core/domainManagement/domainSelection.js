/**
 * Domain Selection Module
 * 
 * Handles selecting all nodes in a specific domain.
 */

import store from '../../state/store.js';

/**
 * Select all nodes in a specific domain
 * @param {string} domain - The domain to select all nodes from
 */
export function handleSelectAllNodesInDomain(domain) {
  console.log(`Selecting all nodes in domain: ${domain}`);
  
  // Get the nodes in this domain
  const { graphData } = store.getState();
  const nodesInDomain = graphData.nodes.filter(node => node.domain === domain);
  
  if (nodesInDomain.length === 0) {
    console.log(`No nodes found in domain ${domain}`);
    return;
  }
  
  // Import nodeInteractions to handle multi-select
  import('../../core/nodeInteractions.js').then(nodeInteractions => {
    // Clear current selection first
    const { multiSelectedNodes, multiSelectHighlightNodes } = store.getState();
    multiSelectedNodes.length = 0;
    multiSelectHighlightNodes.clear();
    
    // Add each node to the selection
    nodesInDomain.forEach(node => {
      multiSelectedNodes.push(node);
      multiSelectHighlightNodes.add(node);
    });
    
    // Update state
    store.update({
      multiSelectActive: multiSelectedNodes.length > 0,
      multiSelectedNodes: [...multiSelectedNodes],
      multiSelectHighlightNodes: new Set(multiSelectHighlightNodes)
    });
    
    // Update visual highlighting
    import('../../utils/helpers.js').then(helpers => {
      helpers.updateCombinedHighlights();
      helpers.updateHighlight();
    });
    
    // Show selection panel
    nodeInteractions.showSelectionPanel();
    nodeInteractions.updateSelectionPanel();
    
    // Show feedback to the user
    alert(`Added ${nodesInDomain.length} nodes from domain "${domain}" to selection`);
  });
}

export default {
  handleSelectAllNodesInDomain
};