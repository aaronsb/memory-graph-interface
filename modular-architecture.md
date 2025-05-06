# Modular Architecture for Memory Graph Interface

This document outlines the modular architecture for refactoring the monolithic `app.js` file into a maintainable, component-based structure.

## Architecture Overview

The application will be split into focused modules with clear responsibilities. These modules will use dependency injection to communicate with each other, making the system more maintainable and testable.

```
public/js/
├── app.js               # Main entry point - thin initializer
├── modules/
│   ├── index.js         # Re-exports all modules for easy imports
│   ├── core-graph.js    # Core graph initialization and configuration
│   ├── node-interaction.js  # Node interaction handlers
│   ├── highlighting.js  # Highlight system functionality
│   ├── ui-effects.js    # UI effects and toggles
│   ├── context-menu.js  # Context menu functionality
│   ├── domain-management.js # Domain management functions
│   ├── link-management.js   # Link creation and management
│   ├── selection-panel.js   # Selection panel functionality
│   └── utils.js         # Shared utility functions
└── state/
    └── store.js         # Central state management
```

## Core Principles

1. **Single Responsibility**: Each module should focus on one area of functionality.
2. **Dependency Injection**: Modules should receive their dependencies explicitly rather than importing them directly.
3. **Loose Coupling**: Modules should communicate through well-defined interfaces.
4. **State Management**: Global state should be managed through a central store, not scattered across modules.
5. **Explicit Exports**: Only expose what's needed by other modules.

## Module Structure

Each module will follow this structure:

```js
// Private state and functions
const privateState = { /* ... */ };

// Factory function that creates the module with injected dependencies
export function createModule(dependencies = {}) {
  // Destructure dependencies
  const { 
    someOtherModule, 
    store 
  } = dependencies;
  
  // Private functions
  function privateFunction() { /* ... */ }
  
  // Public API
  return {
    publicFunction() { /* ... */ },
    // Other public functions
  };
}

// Optional singleton for backward compatibility
export function getInstance(dependencies = {}) { /* ... */ }
```

## State Management

To reduce global variables, the application will use a central store:

```js
// store.js
export function createStore(initialState = {}) {
  let state = { ...initialState };
  const listeners = new Set();
  
  return {
    getState() { return { ...state }; },
    
    setState(newState) {
      state = { ...state, ...newState };
      this.notify();
    },
    
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    
    notify() {
      listeners.forEach(listener => listener(state));
    }
  };
}
```

## Dependency Injection

Modules will receive their dependencies through factory functions:

```js
// app.js
import { createStore } from './state/store.js';
import { createCoreGraph } from './modules/core-graph.js';
import { createNodeInteraction } from './modules/node-interaction.js';

// Create store first
const store = createStore({
  bloomEnabled: true,
  showSummariesOnNodes: true,
  // Other initial state...
});

// Create modules with dependencies
const coreGraph = createCoreGraph({ store });
const nodeInteraction = createNodeInteraction({ 
  store,
  coreGraph
});

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  coreGraph.initGraph();
  coreGraph.loadData();
});
```

## Refactoring Strategy

1. **Extract**: Use the provided script to extract functions into module files.
2. **Refactor**: Convert each module to use the factory pattern with dependency injection.
3. **State Management**: Move global variables to the central store.
4. **Connect**: Wire up dependencies between modules.
5. **Test**: Incrementally test each module to ensure functionality is preserved.

## Event System

For loose coupling, modules can communicate via an event system:

```js
// events.js
export function createEventBus() {
  const listeners = new Map();
  
  return {
    on(event, callback) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(callback);
      return () => this.off(event, callback);
    },
    
    off(event, callback) {
      if (listeners.has(event)) {
        listeners.get(event).delete(callback);
      }
    },
    
    emit(event, data) {
      if (listeners.has(event)) {
        listeners.get(event).forEach(callback => callback(data));
      }
    }
  };
}
```

## Build Process (Future Enhancement)

A webpack or rollup configuration will bundle these modules for production, with these features:

- Tree shaking to remove unused code
- Minification for smaller file size
- Source maps for debugging
- Hot module replacement for development

By following this architecture, the application will be more maintainable, testable, and easier to enhance with new features.