/**
 * WebSocket Server Module
 * 
 * Provides real-time communication capabilities for the application.
 */

const WebSocket = require('ws');
const dbService = require('../db/dbService');

// Map to store active connections
const clients = new Map();
let wsServer = null;
let databaseChangeUnsubscribe = null;

/**
 * Initialize WebSocket server
 * @param {object} server - HTTP server instance to attach WebSocket server to
 */
function initWebSocketServer(server) {
  if (wsServer) {
    console.log('WebSocket server already initialized');
    return wsServer;
  }

  console.log('Initializing WebSocket server');
  
  // Create WebSocket server attached to the HTTP server
  wsServer = new WebSocket.Server({ server });
  
  // Handle new connections
  wsServer.on('connection', (ws, req) => {
    const clientId = Date.now() + Math.random().toString(36).substring(2, 10);
    const ip = req.socket.remoteAddress;
    
    console.log(`[WebSocket] New client connected: ${clientId} from ${ip}`);
    
    // Store client connection
    clients.set(clientId, {
      id: clientId,
      connection: ws,
      ip,
      connectedAt: new Date()
    });
    
    // Send initial connection confirmation
    sendToClient(ws, {
      type: 'connection',
      data: {
        id: clientId,
        connected: true,
        serverTime: new Date().toISOString()
      }
    });
    
    // Handle client messages
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        handleClientMessage(clientId, ws, parsedMessage);
      } catch (error) {
        console.error(`[WebSocket] Error parsing message from client ${clientId}:`, error.message);
        
        // Send error response
        sendToClient(ws, {
          type: 'error',
          data: {
            message: 'Invalid message format'
          }
        });
      }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
      clients.delete(clientId);
      
      // Log active connections
      console.log(`[WebSocket] Active connections: ${clients.size}`);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`[WebSocket] Error with client ${clientId}:`, error.message);
      clients.delete(clientId);
    });
    
    // Log active connections
    console.log(`[WebSocket] Active connections: ${clients.size}`);
  });
  
  // Register for database change notifications
  setupDatabaseChangeListener();
  
  // Handle server errors
  wsServer.on('error', (error) => {
    console.error('[WebSocket] Server error:', error.message);
  });
  
  console.log('[WebSocket] Server initialized');
  return wsServer;
}

/**
 * Set up database change listener
 */
function setupDatabaseChangeListener() {
  // Unsubscribe from previous listener if it exists
  if (databaseChangeUnsubscribe) {
    databaseChangeUnsubscribe();
    databaseChangeUnsubscribe = null;
  }
  
  // Register new listener
  databaseChangeUnsubscribe = dbService.addChangeListener((changeInfo) => {
    console.log('[WebSocket] Database change detected, notifying clients');
    
    // Create notification message
    const notification = {
      type: 'database_changed',
      data: {
        timestamp: changeInfo.timestamp,
        path: changeInfo.path,
        serverTime: new Date().toISOString()
      }
    };
    
    // Broadcast to all connected clients
    broadcastMessage(notification);
  });
}

/**
 * Handle messages from clients
 * @param {string} clientId - ID of the client
 * @param {WebSocket} ws - WebSocket connection
 * @param {object} message - Parsed message from client
 */
function handleClientMessage(clientId, ws, message) {
  // Log message type
  console.log(`[WebSocket] Received message from client ${clientId}:`, message.type);
  
  switch (message.type) {
    case 'ping':
      // Respond to ping with pong
      sendToClient(ws, {
        type: 'pong',
        data: {
          serverTime: new Date().toISOString(),
          clientTime: message.data?.timestamp
        }
      });
      break;
      
    case 'subscribe':
      // Store subscription info with client
      const client = clients.get(clientId);
      if (client) {
        client.subscriptions = client.subscriptions || [];
        
        // Add subscription if not already present
        if (message.data?.topic && !client.subscriptions.includes(message.data.topic)) {
          client.subscriptions.push(message.data.topic);
          clients.set(clientId, client);
          
          console.log(`[WebSocket] Client ${clientId} subscribed to: ${message.data.topic}`);
          
          // Confirm subscription
          sendToClient(ws, {
            type: 'subscription_confirmed',
            data: {
              topic: message.data.topic,
              active: true
            }
          });
        }
      }
      break;
      
    case 'unsubscribe':
      // Remove subscription
      const clientData = clients.get(clientId);
      if (clientData && clientData.subscriptions) {
        const topicIndex = clientData.subscriptions.indexOf(message.data?.topic);
        
        if (topicIndex !== -1) {
          clientData.subscriptions.splice(topicIndex, 1);
          clients.set(clientId, clientData);
          
          console.log(`[WebSocket] Client ${clientId} unsubscribed from: ${message.data.topic}`);
          
          // Confirm unsubscription
          sendToClient(ws, {
            type: 'subscription_confirmed',
            data: {
              topic: message.data.topic,
              active: false
            }
          });
        }
      }
      break;
      
    case 'get_database_status':
      // Send current database status
      dbService.checkDatabaseModified((err, result) => {
        if (err) {
          sendToClient(ws, {
            type: 'database_status',
            data: {
              error: err.message,
              path: dbService.getDatabasePath(),
              serverTime: new Date().toISOString()
            }
          });
        } else {
          sendToClient(ws, {
            type: 'database_status',
            data: {
              path: dbService.getDatabasePath(),
              changed: result.changed,
              serverTime: new Date().toISOString()
            }
          });
        }
      });
      break;
      
    default:
      console.log(`[WebSocket] Unsupported message type from client ${clientId}: ${message.type}`);
      
      // Send error response for unsupported message types
      sendToClient(ws, {
        type: 'error',
        data: {
          message: `Unsupported message type: ${message.type}`
        }
      });
      break;
  }
}

/**
 * Send message to a specific client
 * @param {WebSocket} ws - WebSocket connection
 * @param {object} message - Message to send
 */
function sendToClient(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[WebSocket] Error sending message to client:', error.message);
    }
  }
}

/**
 * Broadcast message to all connected clients
 * @param {object} message - Message to broadcast
 * @param {string} excludeClientId - Optional client ID to exclude from broadcast
 */
function broadcastMessage(message, excludeClientId = null) {
  clients.forEach((client, clientId) => {
    // Skip excluded client
    if (excludeClientId && clientId === excludeClientId) {
      return;
    }
    
    // Send to connected client
    if (client.connection.readyState === WebSocket.OPEN) {
      try {
        client.connection.send(JSON.stringify(message));
      } catch (error) {
        console.error(`[WebSocket] Error broadcasting to client ${clientId}:`, error.message);
      }
    }
  });
}

/**
 * Shutdown the WebSocket server
 */
function shutdownWebSocketServer() {
  if (wsServer) {
    console.log('[WebSocket] Shutting down server...');
    
    // Unsubscribe from database changes
    if (databaseChangeUnsubscribe) {
      databaseChangeUnsubscribe();
      databaseChangeUnsubscribe = null;
    }
    
    // Close all client connections
    clients.forEach((client, clientId) => {
      try {
        client.connection.close(1000, 'Server shutting down');
      } catch (error) {
        console.error(`[WebSocket] Error closing connection for client ${clientId}:`, error.message);
      }
    });
    
    // Clear clients map
    clients.clear();
    
    // Close server
    wsServer.close((err) => {
      if (err) {
        console.error('[WebSocket] Error closing server:', err.message);
      } else {
        console.log('[WebSocket] Server closed successfully');
      }
      
      wsServer = null;
    });
  }
}

// Export functions
module.exports = {
  initWebSocketServer,
  broadcastMessage,
  shutdownWebSocketServer
};