/**
 * WebSocket Service Module
 * 
 * Provides real-time communication with the server.
 */

import store from '../state/store.js';
import { loadData } from '../core/graph.js';

// WebSocket connection and state
let socket = null;
let isConnected = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_BASE = 1000; // 1 second
const PING_INTERVAL = 30000; // 30 seconds
let pingTimer = null;

// Event handlers
const eventHandlers = {
  'database_changed': [],
  'connection': [],
  'error': [],
  'reconnect': []
};

/**
 * Initialize WebSocket connection
 */
export function initWebSocket() {
  // Don't initialize if already connected
  if (socket && isConnected) {
    console.log('[WebSocket] Already connected');
    return;
  }
  
  // Close existing socket if any
  if (socket) {
    closeConnection();
  }
  
  // Determine WebSocket URL from current page
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  console.log(`[WebSocket] Connecting to ${wsUrl}`);
  
  try {
    // Create new WebSocket connection
    socket = new WebSocket(wsUrl);
    
    // Connection opened
    socket.addEventListener('open', () => {
      console.log('[WebSocket] Connected to server');
      isConnected = true;
      reconnectAttempts = 0;
      
      // Store connection state
      store.set('websocketConnected', true);
      
      // Clear any reconnect timer
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      // Set up ping interval to keep connection alive
      startPingInterval();
      
      // Trigger connected event
      triggerEvent('connection', { connected: true });
      
      // Subscribe to database changes
      sendMessage({
        type: 'subscribe',
        data: {
          topic: 'database_changes'
        }
      });
      
      // Request current database status
      sendMessage({
        type: 'get_database_status'
      });
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
      handleServerMessage(event.data);
    });
    
    // Connection closed
    socket.addEventListener('close', () => {
      console.log('[WebSocket] Connection closed');
      handleDisconnection();
    });
    
    // Connection error
    socket.addEventListener('error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      triggerEvent('error', { message: 'Connection error', error });
      handleDisconnection();
    });
    
    return true;
  } catch (error) {
    console.error('[WebSocket] Failed to connect:', error);
    triggerEvent('error', { message: 'Failed to connect', error });
    handleDisconnection();
    return false;
  }
}

/**
 * Send a message to the server
 * @param {Object} message - Message object to send
 * @returns {boolean} - Whether the message was sent
 */
export function sendMessage(message) {
  if (!socket || !isConnected) {
    console.warn('[WebSocket] Cannot send message, not connected');
    return false;
  }
  
  try {
    const messageStr = JSON.stringify(message);
    socket.send(messageStr);
    return true;
  } catch (error) {
    console.error('[WebSocket] Error sending message:', error);
    return false;
  }
}

/**
 * Start ping interval to keep connection alive
 */
function startPingInterval() {
  // Clear existing timer if any
  if (pingTimer) {
    clearInterval(pingTimer);
  }
  
  // Set new timer
  pingTimer = setInterval(() => {
    // Only send ping if connected
    if (isConnected) {
      sendMessage({
        type: 'ping',
        data: {
          timestamp: Date.now()
        }
      });
    }
  }, PING_INTERVAL);
}

/**
 * Handle disconnection and reconnection logic
 */
function handleDisconnection() {
  // Update state
  isConnected = false;
  store.set('websocketConnected', false);
  
  // Clean up
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  
  // Close socket if it still exists
  if (socket) {
    try {
      socket.close();
    } catch (e) {
      // Ignore errors when closing
    }
    socket = null;
  }
  
  // Attempt to reconnect if not exceeding max attempts
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    
    // Calculate delay with exponential backoff
    const delay = RECONNECT_DELAY_BASE * Math.min(Math.pow(2, reconnectAttempts - 1), 30);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    // Trigger reconnect event
    triggerEvent('reconnect', { 
      attempt: reconnectAttempts,
      maxAttempts: MAX_RECONNECT_ATTEMPTS,
      delay
    });
    
    // Schedule reconnection
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      initWebSocket();
    }, delay);
  } else {
    console.error(`[WebSocket] Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
    
    // Trigger error event for max reconnect attempts
    triggerEvent('error', { 
      message: `Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`,
      isFinal: true
    });
  }
}

/**
 * Close the WebSocket connection
 */
export function closeConnection() {
  // Clear timers
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  // Close socket if it exists
  if (socket) {
    try {
      socket.close(1000, 'Client closing connection');
    } catch (error) {
      console.error('[WebSocket] Error closing connection:', error);
    }
    socket = null;
  }
  
  // Update state
  isConnected = false;
  store.set('websocketConnected', false);
}

/**
 * Handle messages from the server
 * @param {string} messageData - Raw message data from server
 */
function handleServerMessage(messageData) {
  try {
    const message = JSON.parse(messageData);
    console.log(`[WebSocket] Received message: ${message.type}`);
    
    switch (message.type) {
      case 'connection':
        // Connection confirmation
        console.log('[WebSocket] Connection confirmed by server');
        break;
        
      case 'pong':
        // Server responded to ping
        const roundTripTime = Date.now() - (message.data?.clientTime || 0);
        console.log(`[WebSocket] Pong received (round trip: ${roundTripTime}ms)`);
        break;
        
      case 'database_changed':
        console.log('[WebSocket] Database change notification received');
        
        // Update database change timestamp
        store.set('lastDatabaseChangeTimestamp', message.data?.timestamp || Date.now());
        
        // Set database changed flag
        store.set('databaseChanged', true);
        
        // Trigger event for listeners
        triggerEvent('database_changed', message.data || {});
        break;
        
      case 'database_status':
        console.log('[WebSocket] Database status received', message.data);
        
        // Update store with database status
        if (message.data) {
          if (message.data.path) {
            store.set('databasePath', message.data.path);
          }
          
          if (message.data.changed !== undefined) {
            store.set('databaseChanged', message.data.changed);
          }
        }
        break;
        
      case 'error':
        // Server reported an error
        console.error('[WebSocket] Server error:', message.data?.message);
        triggerEvent('error', message.data || {});
        break;
        
      default:
        console.log('[WebSocket] Unhandled message type:', message.type);
        break;
    }
  } catch (error) {
    console.error('[WebSocket] Error parsing message:', error);
  }
}

/**
 * Register an event handler
 * @param {string} eventType - Type of event to listen for
 * @param {Function} handler - Event handler function
 * @returns {Function} - Function to remove the handler
 */
export function on(eventType, handler) {
  if (!eventHandlers[eventType]) {
    eventHandlers[eventType] = [];
  }
  
  eventHandlers[eventType].push(handler);
  
  // Return function to remove handler
  return () => {
    const index = eventHandlers[eventType].indexOf(handler);
    if (index !== -1) {
      eventHandlers[eventType].splice(index, 1);
    }
  };
}

/**
 * Trigger an event for all registered handlers
 * @param {string} eventType - Type of event to trigger
 * @param {Object} data - Event data
 */
function triggerEvent(eventType, data) {
  if (eventHandlers[eventType]) {
    eventHandlers[eventType].forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[WebSocket] Error in ${eventType} event handler:`, error);
      }
    });
  }
}

/**
 * Reload graph data in response to database changes
 * @param {boolean} showNotification - Whether to show a notification to the user
 */
export function refreshDataFromDatabaseChange(showNotification = true) {
  // Reset database changed flag
  store.set('databaseChanged', false);
  
  // Reload graph data, preserving positions
  loadData(true).then(() => {
    console.log('[WebSocket] Graph data reloaded due to database change');
    
    // Update memory domains panel
    import('../core/domainManagement.js').then((domainManagement) => {
      if (typeof domainManagement.updateMemoryDomainsPanel === 'function') {
        domainManagement.updateMemoryDomainsPanel();
      } else if (typeof domainManagement.default?.updateMemoryDomainsPanel === 'function') {
        domainManagement.default.updateMemoryDomainsPanel();
      }
      console.log('[WebSocket] Memory domains panel updated');
    }).catch(error => {
      console.error('[WebSocket] Error updating memory domains panel:', error);
    });
    
    // Show notification if requested
    if (showNotification) {
      const notification = document.createElement('div');
      notification.className = 'database-change-notification';
      notification.innerHTML = `
        <div class="notification-title">Database Updated</div>
        <div class="notification-message">The database was modified externally. Data has been refreshed.</div>
      `;
      
      // Style the notification
      notification.style.position = 'fixed';
      notification.style.bottom = '10px';
      notification.style.right = '10px';
      notification.style.backgroundColor = 'rgba(30, 30, 70, 0.9)';
      notification.style.color = 'white';
      notification.style.padding = '15px';
      notification.style.borderRadius = '5px';
      notification.style.zIndex = 2000;
      notification.style.maxWidth = '400px';
      notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
      notification.style.border = '1px solid rgba(100, 100, 255, 0.3)';
      
      // Style title
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        .notification-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 8px;
          color: #8888ff;
        }
        .notification-message {
          font-size: 14px;
        }
      `;
      document.head.appendChild(styleEl);
      
      // Add close button
      const closeButton = document.createElement('div');
      closeButton.textContent = '✕';
      closeButton.style.position = 'absolute';
      closeButton.style.top = '8px';
      closeButton.style.right = '8px';
      closeButton.style.cursor = 'pointer';
      closeButton.style.color = '#8888ff';
      closeButton.style.fontSize = '16px';
      closeButton.addEventListener('click', () => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      });
      
      notification.appendChild(closeButton);
      document.body.appendChild(notification);
      
      // Remove notification after 5 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 5000);
    }
  });
}

// Initialize WebSocket when this module is loaded
// Setup event listener for database changes
on('database_changed', () => {
  try {
    // Check if auto-refresh is enabled
    const autoRefreshEnabled = store.get('autoRefreshOnDatabaseChange') !== false;
    
    if (autoRefreshEnabled) {
      refreshDataFromDatabaseChange();
    } else {
      // Just mark the database as changed but don't refresh
      store.set('databaseChanged', true);
      console.log('Database changed but auto-refresh is disabled');
    }
  } catch (error) {
    console.error('[WebSocket] Error handling database change:', error);
  }
});

// Export functions
export default {
  initWebSocket,
  closeConnection,
  sendMessage,
  on,
  refreshDataFromDatabaseChange
};