/**
 * Memory Graph Interface Server
 * 
 * Main server file for the Memory Graph Interface application.
 * Handles express setup, middleware, route initialization, and WebSocket server.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const config = require('./config');

// Import route modules
const graphRouter = require('./routes/graphRouter');
const databaseRouter = require('./routes/databaseRouter');
const filesRouter = require('./routes/filesRouter');
const nodeEdgeRouter = require('./routes/nodeEdgeRouter');

// Import WebSocket server
const wsServer = require('./websocket/wsServer');

// Create Express application
const app = express();

// Create HTTP server using Express app
const server = http.createServer(app);

// Middleware for parsing JSON and serving static files
app.use(express.json());
app.use(express.static(config.publicDir));

// API Routes
app.use('/api', graphRouter);         // Graph data endpoints
app.use('/api', databaseRouter);      // Database management endpoints
app.use('/api', filesRouter);         // File system operations
app.use('/api', nodeEdgeRouter);      // Node and edge operations

// Initialize WebSocket server
wsServer.initWebSocketServer(server);

// Start the HTTP server
server.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port}`);
  console.log(`WebSocket server is available at ws://localhost:${config.port}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  
  // Close WebSocket server
  wsServer.shutdownWebSocketServer();
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});