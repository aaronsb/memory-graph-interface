/**
 * Core Graph Module
 * 
 * Handles graph initialization, data loading, and core visualization functionality.
 * 
 * This file re-exports all functionality from the modular structure
 * to maintain backward compatibility.
 */

// Re-export everything from the modular implementation
export * from './graph/index.js';

// Re-export default export
import graph from './graph/index.js';
export default graph;