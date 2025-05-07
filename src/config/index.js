/**
 * Configuration Module
 * 
 * Centralizes access to environment variables and application settings
 */

require('dotenv').config();
const path = require('path');

// Default configuration values
const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  
  // Database configuration
  dbPath: process.env.DB_PATH || './memory-graph.db',
  
  // Connection retry settings
  maxReconnectAttempts: 10,
  baseReconnectDelay: 500, // 500ms initial delay
  
  // Path configuration
  publicDir: path.join(process.cwd(), 'public'),
  
  // Environment detection
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production'
};

// Log the configuration (without sensitive details) at startup
console.log('Application Configuration:');
console.log(`- Port: ${config.port}`);
console.log(`- Database: ${config.dbPath}`);
console.log(`- Environment: ${config.isProduction ? 'Production' : 'Development'}`);

module.exports = config;