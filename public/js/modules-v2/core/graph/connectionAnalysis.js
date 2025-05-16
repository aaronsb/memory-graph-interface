/**
 * Connection Analysis Module
 * 
 * Analyzes node connections in the graph and provides utility functions
 * for connection-based visualizations.
 */

/**
 * Calculate connection counts for each node
 * @param {Array} nodes - Array of graph nodes
 * @param {Array} links - Array of graph links
 * @returns {Map} - Map of node IDs to their connection counts
 */
export function calculateNodeConnectionCounts(nodes, links) {
  const connectionCounts = new Map();
  
  // Initialize all nodes with zero connections
  nodes.forEach(node => {
    connectionCounts.set(node.id, 0);
  });
  
  // Count connections (both incoming and outgoing)
  links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    connectionCounts.set(sourceId, connectionCounts.get(sourceId) + 1);
    connectionCounts.set(targetId, connectionCounts.get(targetId) + 1);
  });
  
  return connectionCounts;
}

/**
 * Group nodes by domain and rank them by connection count
 * @param {Array} nodes - Array of graph nodes
 * @param {Map} connectionCounts - Map of node IDs to connection counts
 * @returns {Object} - Object with domains as keys and arrays of ranked nodes as values
 */
export function groupAndRankNodesByDomain(nodes, connectionCounts) {
  const domainGroups = {};
  
  // Group nodes by domain
  nodes.forEach(node => {
    const domain = node.group || 'default';
    if (!domainGroups[domain]) {
      domainGroups[domain] = [];
    }
    
    domainGroups[domain].push({
      node,
      connectionCount: connectionCounts.get(node.id) || 0
    });
  });
  
  // Sort each domain group by connection count (descending)
  Object.keys(domainGroups).forEach(domain => {
    domainGroups[domain].sort((a, b) => b.connectionCount - a.connectionCount);
  });
  
  return domainGroups;
}

/**
 * Calculate normalization factors for each domain
 * @param {Object} domainGroups - Domain groups object from groupAndRankNodesByDomain
 * @returns {Object} - Object with domain names as keys and normalization info as values
 */
export function calculateDomainNormalizationFactors(domainGroups) {
  const normalizationFactors = {};
  
  Object.keys(domainGroups).forEach(domain => {
    const nodes = domainGroups[domain];
    
    if (nodes.length === 0) {
      normalizationFactors[domain] = { max: 0, min: 0, range: 0 };
      return;
    }
    
    // Find max and min connection counts in this domain
    const maxCount = nodes[0].connectionCount; // already sorted in descending order
    const minCount = nodes[nodes.length - 1].connectionCount;
    const range = maxCount - minCount;
    
    normalizationFactors[domain] = { 
      max: maxCount, 
      min: minCount, 
      range: range || 1 // Avoid division by zero
    };
  });
  
  return normalizationFactors;
}

/**
 * Calculate the normalized connection factor for a node
 * @param {Object} node - The node object
 * @param {Map} connectionCounts - Map of node IDs to connection counts
 * @param {Object} normalizationFactors - Domain normalization factors
 * @returns {number} - Normalized connection factor (0-1)
 */
export function getNormalizedConnectionFactor(node, connectionCounts, normalizationFactors) {
  const domain = node.group || 'default';
  const connectionCount = connectionCounts.get(node.id) || 0;
  const factors = normalizationFactors[domain];
  
  if (!factors || factors.range === 0) {
    return 0;
  }
  
  // Normalize based on min and max values in this domain
  return (connectionCount - factors.min) / factors.range;
}

export default {
  calculateNodeConnectionCounts,
  groupAndRankNodesByDomain,
  calculateDomainNormalizationFactors,
  getNormalizedConnectionFactor
};