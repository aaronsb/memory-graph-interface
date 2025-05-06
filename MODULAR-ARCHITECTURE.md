# Memory Graph Interface - Modular Architecture

This document outlines the modular architecture implemented to refactor the monolithic `app.js` file.

## Overview

The monolithic `app.js` has been refactored into a modular structure with these benefits:

- **Maintainability**: Each module has a clear, defined purpose
- **Testability**: Modules can be tested in isolation
- **Reusability**: Modules can be reused across projects
- **Dependency Management**: Clear separation of concerns
- **State Management**: Central store for application state

## Directory Structure

```
public/js/
├── app.modular.v2.js        # Entry point for modular version
├── dist/                    # Build output directory
│   └── app.bundle.js        # Bundled output from webpack
└── modules-v2/             # Modules directory
    ├── index.js            # Main index exporting all modules
    ├── core/               # Core functionality modules
    │   ├── graph.js        # Graph initialization and visualization
    │   ├── nodeInteractions.js # Node selection, viewing, deletion
    │   ├── linkManagement.js   # Link creation, deletion, updating
    │   └── domainManagement.js # Domain handling and visualization
    ├── ui/                 # UI-related modules
    │   ├── controls.js     # UI control functions
    │   └── contextMenu.js  # Context menu handling
    ├── state/              # State management
    │   └── store.js        # Central state store
    └── utils/              # Helper utilities
        └── helpers.js      # Common utility functions
```

## Module Design

Each module follows a consistent pattern:

1. Import dependencies at the top
2. Declare public functions (exported)
3. Declare private functions (not exported)
4. Export public API

## State Management

The application uses a central store for state management to replace global variables:

```javascript
// Get state
const { bloomEnabled } = store.getState();

// Update state
store.setState({ bloomEnabled: !bloomEnabled });

// Subscribe to changes
const unsubscribe = store.subscribe((newState, oldState) => {
  // React to state changes
});
```

## Usage

To use the modular version:

1. Build the bundle with webpack:
   ```bash
   npm run build:js
   ```

2. Make sure index.html includes the bundle:
   ```html
   <script src="js/dist/app.bundle.js"></script>
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Future Improvements

- Add more UI components as separate modules
- Implement better error handling
- Add unit tests for each module
- Create a proper event bus for communication between modules
- Add TypeScript for better type safety