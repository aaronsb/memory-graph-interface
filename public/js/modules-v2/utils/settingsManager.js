/**
 * Settings Manager Module
 * 
 * Handles persistent user settings and preferences using localStorage.
 */

import store from '../state/store.js';

// Constants
const STORAGE_PREFIX = 'memory_graph_';
const STORAGE_VERSION = 1;

// Default settings
const DEFAULT_SETTINGS = {
  // UI preferences
  bloomEnabled: true,
  showSummariesOnNodes: true,
  showEdgeLabels: false,
  zoomOnSelect: false,
  showHelpCard: true,
  
  // Visualization settings
  visualizationStyle: 'simple',
  
  // Database settings
  databasePathHistory: [],
  
  // Internal settings
  storageVersion: STORAGE_VERSION
};

/**
 * Load all settings from localStorage
 * @returns {Object} The loaded settings
 */
export function loadAllSettings() {
  try {
    // Try to get the settings object
    const settingsJson = localStorage.getItem(`${STORAGE_PREFIX}settings`);
    
    // If settings exist, parse and update store
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      
      // Check version for future migrations
      if (settings.storageVersion !== STORAGE_VERSION) {
        console.log(`Settings version mismatch (stored: ${settings.storageVersion}, current: ${STORAGE_VERSION}), migrating...`);
        // In the future, we could add migration logic here
      }
      
      // Update store with all loaded settings
      for (const [key, value] of Object.entries(settings)) {
        // Skip internal settings
        if (key === 'storageVersion') continue;
        
        // Update store
        store.set(key, value);
      }
      
      return settings;
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
  }
  
  // Return default settings if none found or error
  return DEFAULT_SETTINGS;
}

/**
 * Save all settings to localStorage
 * @returns {boolean} Success state
 */
export function saveAllSettings() {
  try {
    // Get current state
    const state = store.getState();
    
    // Create settings object with only the keys we want to save
    const settings = {
      // UI preferences
      bloomEnabled: state.bloomEnabled,
      showSummariesOnNodes: state.showSummariesOnNodes,
      showEdgeLabels: state.showEdgeLabels,
      zoomOnSelect: state.zoomOnSelect,
      showHelpCard: state.showHelpCard,
      
      // Visualization settings
      visualizationStyle: state.visualizationStyle?.id || 'simple',
      
      // Database settings
      databasePathHistory: state.databasePathHistory || [],
      
      // Internal settings
      storageVersion: STORAGE_VERSION
    };
    
    // Save to localStorage
    localStorage.setItem(`${STORAGE_PREFIX}settings`, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
    return false;
  }
}

/**
 * Save a specific setting to localStorage
 * @param {string} key - The setting key
 * @param {any} value - The setting value
 * @returns {boolean} Success state
 */
export function saveSetting(key, value) {
  try {
    // Update store first
    store.set(key, value);
    
    // Then save all settings
    return saveAllSettings();
  } catch (error) {
    console.error(`Error saving setting ${key} to localStorage:`, error);
    return false;
  }
}

/**
 * Save current UI state to localStorage
 * This includes visibility of panels, settings, etc.
 * @returns {boolean} Success state
 */
export function saveUIState() {
  try {
    const state = store.getState();
    
    // Get panel visibility states
    const infoPanelVisible = document.getElementById('info-panel')?.style.display === 'block';
    const selectionPanelVisible = document.getElementById('selection-panel')?.style.display === 'block';
    const domainLegendVisible = document.getElementById('domain-legend')?.style.display === 'block';
    
    // Create UI state object
    const uiState = {
      infoPanelVisible,
      selectionPanelVisible,
      domainLegendVisible,
      
      // Include current view settings
      bloomEnabled: state.bloomEnabled,
      showSummariesOnNodes: state.showSummariesOnNodes,
      showEdgeLabels: state.showEdgeLabels,
      zoomOnSelect: state.zoomOnSelect,
      showHelpCard: state.showHelpCard,
      
      // Visualization settings
      visualizationStyle: state.visualizationStyle?.id || 'simple'
    };
    
    // Save to localStorage
    localStorage.setItem(`${STORAGE_PREFIX}ui_state`, JSON.stringify(uiState));
    return true;
  } catch (error) {
    console.error('Error saving UI state to localStorage:', error);
    return false;
  }
}

/**
 * Load UI state from localStorage
 * @returns {Object|null} The loaded UI state or null if none found
 */
export function loadUIState() {
  try {
    const uiStateJson = localStorage.getItem(`${STORAGE_PREFIX}ui_state`);
    
    if (uiStateJson) {
      const uiState = JSON.parse(uiStateJson);
      return uiState;
    }
  } catch (error) {
    console.error('Error loading UI state from localStorage:', error);
  }
  
  return null;
}

/**
 * Set up event listeners to automatically save settings on changes
 */
export function setupSettingsEventListeners() {
  // Subscribe to store changes
  store.subscribe((newState, oldState) => {
    // Check if any of the settings we care about have changed
    const settingsKeys = [
      'bloomEnabled', 
      'showSummariesOnNodes', 
      'showEdgeLabels', 
      'zoomOnSelect', 
      'showHelpCard',
      'databasePathHistory',
      'visualizationStyle'
    ];
    
    const hasChanged = settingsKeys.some(key => 
      newState[key] !== oldState[key]
    );
    
    // Save settings if changed
    if (hasChanged) {
      saveAllSettings();
    }
  });
  
  // Add window beforeunload listener to save UI state before leaving
  window.addEventListener('beforeunload', () => {
    saveUIState();
  });
}

// Export functions for use in other modules
export default {
  loadAllSettings,
  saveAllSettings,
  saveSetting,
  saveUIState,
  loadUIState,
  setupSettingsEventListeners
};