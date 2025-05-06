/**
 * Window Events Module
 * 
 * A mediator module that handles cross-module UI events without creating
 * circular dependencies.
 */

import store from '../state/store.js';

// Event listeners map
const listeners = {
  // Events related to domain management
  makeDomainLegendDraggable: [],
  
  // Events related to node interactions
  showTagInput: [],
  
  // Events related to window management
  registerDraggable: []
};

/**
 * Register a listener for an event
 * @param {string} eventName - The name of the event
 * @param {Function} callback - The callback function
 */
export function on(eventName, callback) {
  if (!listeners[eventName]) {
    listeners[eventName] = [];
  }
  
  listeners[eventName].push(callback);
}

/**
 * Emit an event
 * @param {string} eventName - The name of the event
 * @param {...any} args - Arguments to pass to the listeners
 */
export function emit(eventName, ...args) {
  if (!listeners[eventName]) {
    return;
  }
  
  listeners[eventName].forEach(callback => {
    try {
      callback(...args);
    } catch (error) {
      console.error(`Error in listener for ${eventName}:`, error);
    }
  });
}

// Export module
export default {
  on,
  emit
};