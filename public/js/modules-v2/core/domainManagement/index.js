/**
 * Domain Management Module Index
 * 
 * Main entry point that re-exports all domain management functionality
 * from the various sub-modules to maintain the original API.
 */

// Import all sub-modules
import * as domainCollection from './domainCollection.js';
import * as domainModification from './domainModification.js';
import * as domainSelection from './domainSelection.js';
import * as ui from './ui.js';
import * as colorManagement from './colorManagement.js';
import * as pagination from './pagination.js';

// Re-export all functions from the various modules
export const {
  collectAllDomains,
  getDomainNodeCounts
} = domainCollection;

export const {
  handleChangeDomain,
  handleCreateDomain,
  handleRenameDomain,
  handleDeleteEmptyDomain
} = domainModification;

export const {
  handleSelectAllNodesInDomain
} = domainSelection;

export const {
  showDomainEditDialog,
  updateMemoryDomainsPanel,
  toggleMemoryDomainsPanel
} = ui;

export const {
  initializeDomainColors,
  assignDomainColor,
  assignColorsToAllDomains,
  transferDomainColor,
  removeDomainColor
} = colorManagement;

export const {
  getCurrentPageDomains,
  nextDomainPage,
  prevDomainPage,
  getDomainPaginationInfo
} = pagination;

// Export default object with all functions
export default {
  // Domain Collection
  collectAllDomains,
  getDomainNodeCounts,
  
  // Domain Modification
  handleChangeDomain,
  handleCreateDomain,
  handleRenameDomain,
  handleDeleteEmptyDomain,
  
  // Domain Selection
  handleSelectAllNodesInDomain,
  
  // UI
  showDomainEditDialog,
  updateMemoryDomainsPanel,
  toggleMemoryDomainsPanel,
  
  // Color Management
  initializeDomainColors,
  assignDomainColor,
  assignColorsToAllDomains,
  transferDomainColor,
  removeDomainColor,
  
  // Pagination
  getCurrentPageDomains,
  nextDomainPage,
  prevDomainPage,
  getDomainPaginationInfo
};