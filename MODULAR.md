# Modular Architecture for Memory Graph Interface

This document outlines how to use the modular architecture for breaking apart the monolithic `app.js` file.

## Overview

The monolithic `app.js` has been refactored into a modular architecture with these benefits:

- **Maintainability**: Each module has a clear, defined purpose
- **Testability**: Modules can be tested in isolation
- **Reusability**: Modules can be reused across projects
- **Dependency Injection**: Modules receive their dependencies explicitly
- **State Management**: Central store for application state

## Getting Started

### 1. Extract Modules

Use the extraction script to identify function boundaries and generate module files:

```bash
npm run extract-modules
```

This will:
- Read the `module-boundaries.txt` file to understand module boundaries
- Extract functions from `app.js` into separate module files
- Generate an `index.js` to export all modules
- Create a template `app.modular.js` as the new entry point

### 2. Build the Modular Version

Build the modular version using webpack:

```bash
# Development build
npm run build:js

# Production build
npm run build:js:prod
```

### 3. Run with the Modular Version

Update `index.html` to use the bundled JS file:

```html
<!-- Replace this: -->
<script src="js/app.js"></script>

<!-- With this: -->
<script src="js/dist/app.bundle.js"></script>
```

Then run the application:

```bash
npm start
```

## Module Structure

Each module follows a consistent pattern:

```javascript
// Import dependencies
import { Events } from '../state/events.js';

// Factory function creates the module with injected dependencies
export function createModule(dependencies = {}) {
  // Destructure dependencies
  const { store, eventBus } = dependencies;
  
  // Private state
  let privateState = {};
  
  // Private functions
  function privateFunction() { /* ... */ }
  
  // Public API
  return {
    publicFunction() { /* ... */ }
  };
}

// Optional singleton for convenience
export function getModule(dependencies = {}) {
  // Implementation...
}
```

## State Management

The application uses a central store for state management:

```javascript
import { getStore } from './state/store.js';

const store = getStore();

// Get state
const { bloomEnabled } = store.getState();

// Update state
store.setState({ bloomEnabled: !bloomEnabled });

// Subscribe to changes
const unsubscribe = store.subscribe((newState, oldState) => {
  // React to state changes
});
```

## Event System

Modules communicate via an event system:

```javascript
import { getEventBus, Events } from './state/events.js';

const eventBus = getEventBus();

// Listen for events
eventBus.on(Events.NODE_SELECTED, ({ node }) => {
  // Handle node selection
});

// Emit events
eventBus.emit(Events.UI_TOGGLE_BLOOM);
```

## Development Workflow

For active development, use the watch mode:

```bash
npm run watch
```

This will automatically rebuild the bundle when files change.

For the full development experience with server:

```bash
npm run dev
```

## Adding New Modules

1. Create a new file in `public/js/modules/`
2. Follow the module pattern shown above
3. Import and initialize it in `app.modular.js`
4. Build with webpack

## Debug Mode

The modular version exposes a debug object in the browser console:

```javascript
// In browser console
debugMemoryGraph.store.getState()
debugMemoryGraph.eventBus.getEventNames()
```

## Migration Strategy

1. Start using the modular version in development
2. Test thoroughly to ensure feature parity
3. Switch to the modular version in production
4. Gradually improve module organization and dependency injection