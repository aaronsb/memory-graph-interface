/**
 * Domain Pagination Module
 * 
 * Handles pagination functionality for domains.
 */

import store from '../../state/store.js';

/**
 * Get domains for the current pagination page
 * @returns {Array} - Array of domains for the current page
 */
export function getCurrentPageDomains() {
  const allDomains = store.get('allDomains') || [];
  const currentPage = store.get('currentDomainPage') || 0;
  const pageSize = 10;
  
  const start = currentPage * pageSize;
  const end = Math.min(start + pageSize, allDomains.length);
  
  return allDomains.slice(start, end);
}

/**
 * Navigate to the next page of domains
 */
export function nextDomainPage() {
  const { currentDomainPage = 0, allDomains = [] } = store.getState();
  const pageSize = 10;
  const totalPages = Math.ceil(allDomains.length / pageSize);
  
  if (currentDomainPage < totalPages - 1) {
    store.set('currentDomainPage', currentDomainPage + 1);
  }
}

/**
 * Navigate to the previous page of domains
 */
export function prevDomainPage() {
  const currentDomainPage = store.get('currentDomainPage') || 0;
  
  if (currentDomainPage > 0) {
    store.set('currentDomainPage', currentDomainPage - 1);
  }
}

/**
 * Get pagination info for domains
 * @returns {Object} - Pagination info object
 */
export function getDomainPaginationInfo() {
  const allDomains = store.get('allDomains') || [];
  const currentPage = store.get('currentDomainPage') || 0;
  const pageSize = 10;
  const totalPages = Math.ceil(allDomains.length / pageSize);
  
  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems: allDomains.length
  };
}

export default {
  getCurrentPageDomains,
  nextDomainPage,
  prevDomainPage,
  getDomainPaginationInfo
};