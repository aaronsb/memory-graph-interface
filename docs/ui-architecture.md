# UI Architecture and Implementation Guide

## Overview

The Memory Graph Interface uses a modular, event-driven architecture with vanilla JavaScript. The UI is composed of draggable panels, a central graph visualization, and a menu system, all coordinated through an event bus to avoid circular dependencies.

## Core UI Components

### 1. Window Manager System

The window manager (`windowManager.js`) provides a unified system for creating draggable, controllable panels throughout the interface.

#### Key Features:
- Draggable windows with customizable controls
- Standardized control buttons (copy, delete, close, etc.)
- Event-based communication to avoid circular dependencies
- Reusable for all panels in the application

#### Implementation Pattern:
```javascript
makeDraggable('panel-id', {
  controls: [
    { 
      icon: '✏️', 
      title: 'Edit content',
      onClick: handler
    }
  ],
  defaultPosition: { x: 10, y: 10 }
});
```

### 2. Event-Driven Architecture

The application uses a custom event bus (`eventBus.js`) for decoupled communication between modules.

#### Event Categories:
- Window events: `window:moved`, `window:closed`
- Node events: `node:delete`, `node:editTags`, `node:selectionChanged`
- Content events: `content:copied`
- Domain events: `domainLegend:created`, `domainLegend:updated`

#### Benefits:
- Avoids circular dependencies between modules
- Enables reactive updates across UI components
- Simplifies testing and debugging

### 3. State Management

A custom store (`store.js`) manages application state with subscription capabilities.

#### Key State Properties:
- `selectedNode`: Currently selected node
- `multiSelectedNodes`: Array of multi-selected nodes
- `graphData`: Complete graph structure
- `selectedHighlightNodes/Links`: Visual highlighting sets
- UI preferences: `bloomEnabled`, `showEdgeLabels`, etc.

### 4. Panel System

The interface includes multiple specialized panels:

#### Info Panel
- Displays selected node details
- Controls: Edit (✏️), Copy (📋), Delete (🗑️), Close (✖)
- Dynamically updated when node selection changes

#### Selection Panel
- Shows multi-selected nodes
- Batch operations for selected nodes
- Position adjusts based on info panel visibility

#### Memory Domains Panel
- Domain legend with color coding
- Node counts per domain
- Domain selection tools

#### Visualization Controls Panel
- Physics simulation settings
- Rendering effects controls
- Visual style options

### 5. Menu System

A CUA-style menu bar provides access to all features:
- **File**: Database operations, import/export
- **View**: Toggle visual effects
- **Visualization**: Style presets
- **Panels**: Toggle panel visibility
- **Help**: Documentation and shortcuts

## UI Patterns and Conventions

### 1. Dynamic Control Creation

Controls are added dynamically to panels during initialization:

```javascript
// Example from windowManager.js
controls: [
  {
    icon: '✏️',
    title: 'Edit node content',
    className: 'edit-button',
    onClick: createControlHandlers.editNodeContent()
  }
]
```

### 2. Content Editing Pattern

The edit functionality follows a consistent pattern:
1. Replace read-only content with editable element
2. Add commit/cancel controls
3. Handle save/cancel actions
4. Restore original view

Example implementation:
```javascript
// Create textarea
const textarea = document.createElement('textarea');
textarea.value = originalContent;

// Replace content div
nodeContentDiv.style.display = 'none';
nodeContentDiv.parentNode.insertBefore(textarea, nodeContentDiv.nextSibling);

// Add controls
const commitBtn = document.createElement('button');
commitBtn.innerHTML = '✓';
```

### 3. Asynchronous Operations

UI updates coordinate with server operations:
```javascript
// Send update to server
const response = await fetch(`/api/nodes/${nodeId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: newContent })
});

// Update local state
if (response.ok) {
  nodeContentDiv.textContent = newContent;
  store.get('selectedNode').content = newContent;
}
```

### 4. Responsive Positioning

Panels adjust positions based on other visible panels:
```javascript
// Selection panel adjusts when info panel is visible
if (infoPanelVisible) {
  selectionPanel.style.right = '420px';
} else {
  selectionPanel.style.right = '10px';
}
```

## Module Organization

### Core Modules
- `graph/`: Graph rendering and physics
- `nodeInteractions/`: Node selection and manipulation
- `domainManagement/`: Domain operations
- `linkManagement.js`: Edge/link operations

### UI Modules
- `windowManager.js`: Draggable window system
- `menuBar.js`: Application menu
- `controls.js`: UI toggles and effects
- `contextMenu.js`: Right-click menus

### Utility Modules
- `eventBus.js`: Event system
- `store.js`: State management
- `helpers.js`: Common utilities
- `settingsManager.js`: Persistence

## Best Practices

### 1. Event-Based Updates
Always use events for cross-module communication:
```javascript
eventBus.emit('node:selectionChanged', { node });
```

### 2. State Management
Update state through the store for consistency:
```javascript
store.set('selectedNode', node);
store.update({ multiSelectedNodes: [...nodes] });
```

### 3. UI Feedback
Provide visual feedback for user actions:
```javascript
// Show success indicator
copyIcon.textContent = '✓';
setTimeout(() => {
  copyIcon.textContent = originalText;
}, 1000);
```

### 4. Error Handling
Always handle errors gracefully:
```javascript
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed');
} catch (error) {
  console.error('Error:', error);
  alert('Operation failed. Please try again.');
}
```

## Adding New Features

### To Add a New Panel:
1. Create HTML structure in `index.html`
2. Initialize as draggable in `windowManager.js`
3. Add menu item in `menuBar.js`
4. Implement show/hide logic
5. Connect to event system

### To Add a New Control:
1. Add control definition to panel initialization
2. Create handler in `createControlHandlers`
3. Implement UI logic
4. Connect to backend API if needed
5. Add error handling and feedback

### To Add a New Menu Item:
1. Add item in appropriate menu category
2. Create toggle function if checkable
3. Update state management
4. Connect to UI updates
5. Persist preference if needed

## Testing Considerations

- Test event propagation between modules
- Verify state synchronization
- Check UI responsiveness during async operations
- Validate error handling
- Test panel positioning logic
- Verify keyboard shortcuts
- Check persistence of UI preferences

## Performance Considerations

- Minimize DOM manipulations
- Batch state updates
- Debounce frequent events
- Lazy load heavy components
- Use CSS transitions for smooth animations
- Cache DOM queries where possible

## Conclusion

The Memory Graph Interface UI architecture prioritizes modularity, maintainability, and user experience. The event-driven approach ensures loose coupling between components while the centralized state management provides consistency across the interface. Following these patterns ensures new features integrate seamlessly with the existing system.