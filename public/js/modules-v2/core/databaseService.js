/**
 * Database Service Module
 * 
 * Handles interactions with the database API endpoints.
 */

import store from '../state/store.js';

/**
 * Get the current database path from server
 * @returns {Promise<string>} - A promise that resolves to the database path
 */
export function getDatabasePath() {
  return fetch('/api/db-path')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to get database path: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      // Update store with the current server database path
      store.set('databasePath', data.path);
      return data.path;
    });
}

/**
 * Set a new database path on the server
 * @param {string} path - The new database path
 * @returns {Promise<Object>} - A promise that resolves to the response from the server
 */
export function setDatabasePath(path) {
  return fetch('/api/db-path', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ path })
  })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          // Create a custom error object with detailed information
          const error = new Error(err.error || err.message || `Failed to set database path: ${response.statusText}`);
          error.details = err.details;
          error.status = response.status;
          throw error;
        });
      }
      return response.json();
    })
    .then(data => {
      // Update store on success
      if (data.success) {
        store.set('databasePath', data.newPath);
        store.set('customDatabasePath', data.newPath);
        
        // Add to path history if not already present
        addToPathHistory(data.newPath);
      }
      return data;
    });
}

/**
 * Add a path to the database path history
 * @param {string} path - The path to add to history
 */
export function addToPathHistory(path) {
  // Get current history
  const history = store.get('databasePathHistory') || [];
  
  // Remove if already exists (to move it to the front)
  const filteredHistory = history.filter(item => item !== path);
  
  // Add to front of array
  filteredHistory.unshift(path);
  
  // Limit to 10 items
  const limitedHistory = filteredHistory.slice(0, 10);
  
  // Update store 
  // This will trigger the settings manager to save to localStorage
  store.set('databasePathHistory', limitedHistory);
}

/**
 * Load database path history
 * @returns {Array} - The history array or empty array if none
 */
export function loadPathHistory() {
  // Get history from store
  const storeHistory = store.get('databasePathHistory');
  
  // If we have history in the store, return it
  if (storeHistory && storeHistory.length > 0) {
    return storeHistory;
  }
  
  // Otherwise return empty array
  return [];
}

/**
 * Update the database path in the UI and reload data
 * @param {string} path - The new database path
 * @returns {Promise<Object>} - A promise that resolves when the database is updated and data is reloaded
 */
export function updateDatabaseAndReload(path) {
  console.log('Updating database path to:', path);
  
  // Show loading indicator
  document.getElementById('loading-indicator').style.display = 'block';
  
  return setDatabasePath(path)
    .then(response => {
      if (response.success) {
        console.log('Database path updated successfully. Reloading data...');
        
        // Import graph module dynamically to avoid circular dependency
        return import('./graph.js').then(graph => {
          return graph.loadData(false).then(() => {
            console.log('Data reloaded successfully');
            return {
              success: true,
              message: 'Database updated and data reloaded successfully'
            };
          });
        });
      } else {
        throw new Error('Failed to update database path');
      }
    })
    .catch(error => {
      console.error('Error updating database path:', error);
      throw error;
    })
    .finally(() => {
      // Hide loading indicator
      document.getElementById('loading-indicator').style.display = 'none';
    });
}

export default {
  getDatabasePath,
  setDatabasePath,
  updateDatabaseAndReload
};