/**
 * Domain Management Module
 * 
 * Handles domain-related functionality including changing node domains,
 * updating the domain color legend, and domain pagination.
 * 
 * This file re-exports all functionality from the modular structure
 * to maintain backward compatibility.
 */

// Re-export everything from the modular implementation
export * from './domainManagement/index.js';

// Re-export default export
import domainManagement from './domainManagement/index.js';
export default domainManagement;