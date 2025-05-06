/**
 * Event Bus Module
 * 
 * A simple event bus to facilitate communication between modules
 * without creating circular dependencies.
 */

// Event registry to store event listeners
const eventRegistry = new Map();

/**
 * Subscribe to an event
 * @param {string} eventName - The name of the event to subscribe to
 * @param {Function} callback - The callback to execute when the event occurs
 * @returns {Function} - Function to unsubscribe
 */
export function on(eventName, callback) {
  if (!eventRegistry.has(eventName)) {
    eventRegistry.set(eventName, new Set());
  }
  
  eventRegistry.get(eventName).add(callback);
  
  // Return unsubscribe function
  return () => {
    const callbacks = eventRegistry.get(eventName);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        eventRegistry.delete(eventName);
      }
    }
  };
}

/**
 * Emit an event
 * @param {string} eventName - The name of the event to emit
 * @param {*} data - The data to pass to event listeners
 */
export function emit(eventName, data) {
  if (eventRegistry.has(eventName)) {
    eventRegistry.get(eventName).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    });
  }
}

/**
 * Remove all listeners for an event
 * @param {string} eventName - The name of the event to clear
 */
export function off(eventName) {
  eventRegistry.delete(eventName);
}

/**
 * Get the number of listeners for an event
 * @param {string} eventName - The name of the event
 * @returns {number} - The number of listeners
 */
export function listenerCount(eventName) {
  return eventRegistry.has(eventName) ? eventRegistry.get(eventName).size : 0;
}

export default {
  on,
  emit,
  off,
  listenerCount
};