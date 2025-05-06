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
    this.state[key] = value;
    this.notifyListeners(oldState);
    return this.state[key];
  }

  // Update multiple state values at once
  update(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    this.notifyListeners(oldState);
    return this.state;
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of state changes
  notifyListeners(oldState) {
    this.listeners.forEach(listener => listener(this.state, oldState));
  }
}

// Create a singleton instance
const storeInstance = new Store();

// Module exports
export default storeInstance;