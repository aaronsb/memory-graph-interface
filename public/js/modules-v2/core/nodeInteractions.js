/**
 * Node Interactions Module
 * 
 * Handles user interactions with nodes, including viewing details,
 * deleting nodes, multi-selection, and tag management.
 * 
 * This file re-exports all functionality from the modular structure
 * to maintain backward compatibility.
 */

// Re-export everything from the modular implementation
export * from './nodeInteractions/index.js';

// Re-export default export
import nodeInteractions from './nodeInteractions/index.js';
export default nodeInteractions;