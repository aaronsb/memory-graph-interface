/**
 * State Store Module
 * 
 * Central state management for the application.
 * This replaces global variables with a structured state store.
 */

// Initial state - mirrors the global variables from app.js
const initialState = {
  // Graph state
  graph: null,
  bloomPass: null,
  graphData: { nodes: [], links: [] },

  // UI settings
  bloomEnabled: true,
  showSummariesOnNodes: true,
  showEdgeLabels: false,
  zoomOnSelect: false,
  showHelpCard: true,

  // Data source settings
  databasePath: '/default/database/path',
  customDatabasePath: null,
  databasePathHistory: [],
  databaseChanged: false,
  autoRefreshOnDatabaseChange: true,
  lastDatabaseChangeTimestamp: null,
  websocketConnected: false,
  
  // Highlighting
  highlightNodes: new Set(),
  highlightLinks: new Set(),
  selectedHighlightNodes: new Set(),
  selectedHighlightLinks: new Set(),
  hoverHighlightNodes: new Set(),
  hoverHighlightLinks: new Set(),

  // Multi-selection
  multiSelectActive: false,
  multiSelectedNodes: [],
  multiSelectHighlightNodes: new Set(),

  // Context menu
  contextMenuActive: false,
  contextMenuNode: null,
  contextMenuLink: null,
  contextMenuPosition: { x: 0, y: 0 },

  // Link creation
  linkCreationMode: false,
  linkSourceNode: null,

  // Domains
  allDomains: [],
  currentDomainPage: 0,

  // Link types
  allLinkTypes: [],
  currentLinkTypePage: 0,

  // Node/link selection
  hoverNode: null,
  hoverLink: null,
  selectedNode: null,
  selectedNodes: [],

  // Drag and drop
  draggedNode: null,
  potentialLinkTarget: null,
  temporaryLinkFormed: false,
  repulsionReduced: false,
  originalChargeStrength: -120,

  // Keyboard state
  controlKeyPressed: false,
};

// Create a singleton state store
class Store {
  constructor() {
    this.state = { ...initialState };
    this.listeners = new Set();
    this.keyListeners = new Map(); // Map of key -> Set of listeners
  }

  // Get the entire state object
  getState() {
    return this.state;
  }

  // Get a specific state value
  get(key) {
    return this.state[key];
  }

  // Update a specific state value
  set(key, value) {
    const oldState = { ...this.state };
    const oldValue = this.state[key];
    this.state[key] = value;
    
    // Notify general listeners
    this.notifyListeners(oldState);
    
    // Notify key-specific listeners if the value changed
    if (oldValue !== value) {
      this.notifyKeyListeners(key, value, oldValue);
    }
    
    return this.state[key];
  }

  // Update multiple state values at once
  update(updates) {
    const oldState = { ...this.state };
    
    // Track keys that changed for key-specific listeners
    const changedKeys = [];
    
    // Apply each update and track changed keys
    Object.entries(updates).forEach(([key, value]) => {
      if (this.state[key] !== value) {
        changedKeys.push([key, value, this.state[key]]);
      }
      this.state[key] = value;
    });
    
    // Notify general listeners
    this.notifyListeners(oldState);
    
    // Notify key-specific listeners
    changedKeys.forEach(([key, newValue, oldValue]) => {
      this.notifyKeyListeners(key, newValue, oldValue);
    });
    
    return this.state;
  }

  // Subscribe to all state changes
  subscribe(listener) {
    if (typeof listener !== 'function') {
      console.error('Store.subscribe: listener must be a function');
      return () => {};
    }
    
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  // Subscribe to changes of a specific key
  subscribeToKey(key, listener) {
    if (typeof listener !== 'function') {
      console.error('Store.subscribeToKey: listener must be a function');
      return () => {};
    }
    
    if (!this.keyListeners.has(key)) {
      this.keyListeners.set(key, new Set());
    }
    
    this.keyListeners.get(key).add(listener);
    
    // Return unsubscribe function
    return () => {
      const keySet = this.keyListeners.get(key);
      if (keySet) {
        keySet.delete(listener);
        if (keySet.size === 0) {
          this.keyListeners.delete(key);
        }
      }
    };
  }

  // Notify all general listeners of state changes
  notifyListeners(oldState) {
    this.listeners.forEach(listener => {
      try {
        listener(this.state, oldState);
      } catch (error) {
        console.error('Error in store listener:', error);
      }
    });
  }
  
  // Notify key-specific listeners of changes
  notifyKeyListeners(key, newValue, oldValue) {
    const keyListeners = this.keyListeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(listener => {
        try {
          listener(newValue, oldValue);
        } catch (error) {
          console.error(`Error in key listener for "${key}":`, error);
        }
      });
    }
  }
}

// Create a singleton instance
const storeInstance = new Store();

// Module exports
export default storeInstance;