# Memory Graph Interface - Modular Approach

This document explains the modular architecture for the Memory Graph Interface application.

## Overview

The monolithic `app.js` file has been refactored into a modular structure for better maintainability and organization. This approach allows for easier development, testing, and feature addition.

## Directory Structure

```
public/js/
├── app.modular.v2.js          # Entry point for modular version
├── dist/
│   └── app.bundle.js          # Bundled output from webpack
└── modules-v2/                # Modules directory
    ├── index.js               # Main index exporting all modules
    ├── core/                  # Core functionality modules
    │   └── graph.js           # Graph initialization and data loading
    ├── ui/                    # UI-related modules
    │   └── controls.js        # UI controls and effects
    ├── state/                 # State management
    │   └── store.js           # Central state store
    └── utils/                 # Utility functions
        └── helpers.js         # Helper functions
```

## Architecture

### State Management

The central state store in `state/store.js` replaces global variables with a structured state object. Features:

- Single source of truth for application state
- Subscribe to state changes
- Getter and setter methods for type safety
- Simplified debugging

### Core Module

The `core/graph.js` module encapsulates the core graph functionality:

- Graph initialization
- Data loading and processing
- Force-directed graph configuration
- Node and link visual settings

### UI Controls

The `ui/controls.js` module handles user interface elements:

- Toggle UI elements (bloom effect, labels, etc.)
- Set up event listeners
- Handle keyboard events

### Utils

The `utils/helpers.js` module contains shared utility functions:

- Node and link color functions
- Label generation
- Highlight management
- Common UI update functions

## Module Design

Each module follows a consistent pattern:

1. Import dependencies at the top
2. Declare public functions (exported)
3. Declare private functions (not exported)
4. Export public API

### Example

```javascript
// Import dependencies
import store from '../state/store.js';

// Public function
export function publicFunction() {
  // Implementation
}

// Private function
function privateFunction() {
  // Implementation
}

// Optional default export
export default {
  publicFunction
};
```

## State Management

The application uses a simple state store that acts as a central repository for all application state:

```javascript
// Get a specific value
const graph = store.get('graph');

// Set a specific value
store.set('bloomEnabled', true);

// Update multiple values
store.update({
  graph,
  bloomEnabled: true
});

// Subscribe to changes
const unsubscribe = store.subscribe((newState, oldState) => {
  // React to state changes
});
```

## Benefits of Modularization

1. **Maintainability**: Smaller, focused files are easier to understand and maintain
2. **Testability**: Modules can be tested in isolation
3. **Scalability**: New features can be added without modifying existing code
4. **Collaboration**: Multiple developers can work on different modules
5. **Documentation**: Clear separation of concerns makes the codebase self-documenting

## Usage

To use the modular version:

1. Build the bundle with webpack: `npm run build:js`
2. Make sure index.html includes the bundle: `<script src="js/dist/app.bundle.js"></script>`
3. Start the server: `npm start`

## Future Improvements

- Add more UI components as separate modules
- Implement better error handling
- Add unit tests for each module
- Create a proper event bus for communication between modules
- Add TypeScript for better type safety