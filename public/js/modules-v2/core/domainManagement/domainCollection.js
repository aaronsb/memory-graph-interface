/**
 * Domain Collection Module
 * 
 * Handles collection and management of domains from graph data.
 */

import store from '../../state/store.js';

/**
 * Collect all domains from the API and from graph data
 * @returns {Promise<Array>} - Promise resolving to array of domain names
 */
export function collectAllDomains() {
  // Fetch domains from the API
  return fetch('/api/domains')
    .then(response => response.json())
    .then(domainsData => {
      // Extract domain IDs 
      const apiDomains = domainsData.map(domain => domain.id);
      console.log('Domains from API:', apiDomains);
      
      // Also collect domains from the graph data to ensure we include any that might not be in the API yet
      const domains = new Set(apiDomains);
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
      console.log('All domains collected:', domainArray);
      
      return domainArray;
    })
    .catch(error => {
      console.error('Error fetching domains from API:', error);
      
      // Fall back to collecting from graph data only
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
    });
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