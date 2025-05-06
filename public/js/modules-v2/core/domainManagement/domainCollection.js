/**
 * Domain Collection Module
 * 
 * Handles collection and management of domains from graph data.
 */

import store from '../../state/store.js';

/**
 * Collect all unique domains from the graph data
 * @returns {Array} - Array of domain names
 */
export function collectAllDomains() {
  const domains = new Set();
  const { graphData } = store.getState();
  
  if (graphData && graphData.nodes) {
    graphData.nodes.forEach(node => {
      if (node.domain) {
        domains.add(node.domain);
      }
    });
  }
  
  const domainArray = Array.from(domains).sort();
  
  // Update state
  store.set('allDomains', domainArray);
  
  return domainArray;
}

/**
 * Get the count of nodes for each domain
 * @returns {Map} - Map of domain to node count
 */
export function getDomainNodeCounts() {
  const { graphData } = store.getState();
  const domainCounts = new Map();
  
  if (graphData && graphData.nodes) {
    graphData.nodes.forEach(node => {
      if (node.domain) {
        domainCounts.set(node.domain, (domainCounts.get(node.domain) || 0) + 1);
      }
    });
  }
  
  return domainCounts;
}

export default {
  collectAllDomains,
  getDomainNodeCounts
};