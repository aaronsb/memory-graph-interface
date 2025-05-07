/**
 * Memory Graph Interface Server
 * 
 * Main server file for the Memory Graph Interface application.
 * Handles express setup, middleware, and route initialization.
 */

const express = require('express');
const path = require('path');
const config = require('./config');

// Import route modules
const graphRouter = require('./routes/graphRouter');
const databaseRouter = require('./routes/databaseRouter');
const filesRouter = require('./routes/filesRouter');
const nodeEdgeRouter = require('./routes/nodeEdgeRouter');

// Create Express application
const app = express();

// Middleware for parsing JSON and serving static files
app.use(express.json());
app.use(express.static(config.publicDir));

// API Routes
app.use('/api', graphRouter);         // Graph data endpoints
app.use('/api', databaseRouter);      // Database management endpoints
app.use('/api', filesRouter);         // File system operations
app.use('/api', nodeEdgeRouter);      // Node and edge operations

// Start the server
app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port}`);
});