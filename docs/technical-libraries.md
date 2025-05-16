# Technical Documentation: UI and Visualization Libraries

## Overview

The Memory Graph Interface is built using a carefully selected set of libraries that focus on 3D graph visualization and real-time data management. The application follows a vanilla JavaScript approach without traditional UI frameworks, prioritizing performance and direct control over the visualization layer.

## Core Visualization Libraries

### 3D Force Graph
- **Version**: 1.70.10 (CDN)
- **Purpose**: Primary 3D graph visualization engine
- **Documentation**: https://github.com/vasturiano/3d-force-graph
- **Key Features Used**:
  - Force-directed graph layout algorithms
  - Node and link customization via callbacks
  - Built-in camera controls (pan, zoom, rotate)
  - Custom node/link rendering functions
  
**Implementation Details**:
```javascript
// Located in: public/js/modules-v2/core/graph/initialization.js
myGraph = ForceGraph3D()
    .graphData(graphData)
    .nodeLabel('label')
    .nodeAutoColorBy('domain_id')
    .nodeThreeObject(nodeThreeObjectFunction)
    .linkCurvature(0.05)
    // ... additional configuration
```

### Three.js
- **Version**: 0.137.0 (CDN)
- **Purpose**: 3D graphics engine (underlying 3d-force-graph)
- **Documentation**: https://threejs.org/docs/
- **Key Features Used**:
  - Custom mesh creation for nodes
  - Sprite materials for labels
  - Post-processing effects (bloom)
  - Custom scene elements (reference plane)

**Implementation Details**:
```javascript
// Located in: public/js/modules-v2/core/graph/referencePlane.js
const planeGeometry = new THREE.PlaneGeometry(10000, 10000);
const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0x222244,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
});
```

### Three-spritetext
- **Version**: 1.6.5 (CDN)
- **Purpose**: 2D text sprites in 3D space
- **Documentation**: https://github.com/vasturiano/three-spritetext
- **Key Features Used**:
  - Node labels
  - Edge labels
  - Auto-scaling text sprites
  - Background color support

**Implementation Details**:
```javascript
// Located in: public/js/modules-v2/core/graph/initialization.js
const sprite = new SpriteText(node.label);
sprite.color = colorUtils.getTextColorForBackground(node.color);
sprite.backgroundColor = node.color;
sprite.padding = 4;
sprite.borderRadius = 3;
```

### D3.js
- **Version**: 7.8.5 (CDN)
- **Purpose**: Force simulation and data utilities
- **Documentation**: https://d3js.org/
- **Note**: Used indirectly through 3d-force-graph for force calculations

## Backend Libraries

### WebSocket (ws)
- **Version**: 8.18.2
- **Purpose**: Real-time bidirectional communication
- **Documentation**: https://github.com/websockets/ws
- **Key Features Used**:
  - Real-time database updates
  - Client connection management
  - Message broadcasting
  - Connection state tracking

**Implementation Details**:
```javascript
// Located in: src/websocket/wsServer.js
const wss = new WebSocketServer({ port: 8081 });
wss.on('connection', (ws) => {
    // Handle real-time updates
});
```

### Express
- **Version**: 4.18.2
- **Purpose**: Web server framework
- **Documentation**: https://expressjs.com/
- **Key Features Used**:
  - RESTful API endpoints
  - Static file serving
  - CORS middleware
  - Request body parsing

**Implementation Details**:
```javascript
// Located in: src/server.js
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', databaseRouter);
```

### SQLite3
- **Version**: 5.1.6
- **Purpose**: Embedded database
- **Documentation**: https://www.sqlite.org/
- **Key Features Used**:
  - JSON field support
  - Full-text search
  - Transaction support
  - In-memory or file-based storage

## Build Tools

### Webpack
- **Version**: 5.88.0
- **Purpose**: Module bundling and optimization
- **Configuration**: `webpack.config.js`
- **Key Features Used**:
  - ES6 module bundling
  - Development/production modes
  - Source maps
  - Watch mode

### Babel
- **Version**: 9.1.2 (babel-loader)
- **Purpose**: JavaScript transpilation
- **Key Features Used**:
  - ES6+ to ES5 transpilation
  - Module syntax transformation
  - Browser compatibility

## Architecture Patterns

### Module System
The application uses ES6 modules with a clear separation of concerns:
```
public/js/modules-v2/
├── core/           # Core functionality
├── state/          # State management
├── ui/             # UI components
└── utils/          # Utility functions
```

### State Management
Custom state store pattern without external libraries:
```javascript
// Located in: public/js/modules-v2/state/store.js
class Store {
    constructor() {
        this.state = { /* ... */ };
    }
    updateState(updates) { /* ... */ }
    getState() { /* ... */ }
}
```

### Event System
Custom event bus for decoupled communication:
```javascript
// Located in: public/js/modules-v2/utils/eventBus.js
class EventBus {
    emit(event, data) { /* ... */ }
    on(event, handler) { /* ... */ }
}
```

## Post-Processing Effects

Three.js effect modules loaded via CDN:
- **EffectComposer**: Effect pipeline management
- **RenderPass**: Base rendering pass
- **UnrealBloomPass**: Bloom effect implementation
- **ShaderPass**: Custom shader effects

**Implementation Details**:
```javascript
// Located in: public/js/modules-v2/core/graph/initialization.js
composer = new THREE.EffectComposer(renderer);
renderPass = new THREE.RenderPass(scene, camera);
bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, 0.4, 0.85
);
```

## Performance Considerations

1. **Selective Rendering**: Only visible nodes/edges are rendered
2. **Level of Detail**: Simplified rendering for distant objects
3. **WebSocket Throttling**: Batched updates to prevent overload
4. **Lazy Loading**: Components loaded on demand
5. **GPU Optimization**: Leveraging Three.js GPU acceleration

## Browser Requirements

- **WebGL Support**: Required for 3D rendering
- **ES6 Support**: Required for module system
- **WebSocket Support**: Required for real-time updates
- **Modern Browser**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

## Conclusion

The Memory Graph Interface leverages powerful visualization libraries while maintaining a lightweight architecture. By using vanilla JavaScript with carefully selected libraries, the application achieves high performance 3D graph visualization with real-time capabilities without the overhead of traditional UI frameworks.