/**
 * Database Service Module
 * 
 * Provides functions for database connection management and operations
 */

const sqlite3 = require('sqlite3').verbose();
const config = require('../config');
const fs = require('fs');
const path = require('path');

// Database connection
let db;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = config.maxReconnectAttempts;
const BASE_RECONNECT_DELAY = config.baseReconnectDelay;

// Track database path
let currentDbPath = config.dbPath;

// Track the last modification time of the database file
let lastDatabaseModTime = null;

// File watcher instance
let fileWatcher = null;

// Change event listeners
const changeListeners = [];

/**
 * Connect to the database with exponential backoff retry logic
 * @param {boolean} isReconnect - Whether this is a reconnection attempt
 * @param {function} callback - Optional callback to execute after connection, callback(err, result)
 */
function connectToDatabase(isReconnect = false, callback = null) {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    console.log('Connection attempt already in progress, skipping');
    if (callback && typeof callback === 'function') {
      callback(new Error('Connection attempt already in progress'));
    }
    return;
  }
  
  isConnecting = true;
  
  // Close existing connection if it exists
  if (db) {
    try {
      db.close();
    } catch (err) {
      console.error('Error closing existing database connection:', err.message);
    }
  }
  
  console.log(`${isReconnect ? 'Re' : ''}connecting to database (attempt ${reconnectAttempts + 1})...`);
  console.log(`Using database at: ${currentDbPath}`);
  
  // Create a new connection
  db = new sqlite3.Database(currentDbPath, (err) => {
    isConnecting = false;
    
    if (err) {
      console.error('Error connecting to the database:', err.message);
      
      // Implement exponential backoff for reconnection
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);
        console.log(`Will retry connection in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        
        setTimeout(() => {
          connectToDatabase(true, callback);
        }, delay);
      } else {
        console.error(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Giving up.`);
        reconnectAttempts = 0; // Reset for future attempts
        
        // Execute callback with error if provided
        if (callback && typeof callback === 'function') {
          callback(err);
        }
      }
    } else {
      console.log(`Successfully ${isReconnect ? 're' : ''}connected to the memory-graph database`);
      reconnectAttempts = 0; // Reset reconnect counter on success
      
      // Configure the database connection
      db.configure('busyTimeout', 5000); // Wait up to 5 seconds when the database is locked
      
      // Initialize last modification time
      initLastModTime();
      
      // Execute callback with success if provided
      if (callback && typeof callback === 'function') {
        callback(null, { success: true });
      }
    }
  });
}

/**
 * Execute a database operation with automatic reconnection on failure
 * @param {function} operation - Function that takes the db object and executes the operation
 * @param {number} maxRetries - Maximum number of retries
 * @param {function} callback - Callback to execute after operation completes or fails
 */
function executeWithRetry(operation, maxRetries = 3, callback = null) {
  let retries = 0;
  
  function attempt() {
    if (!db) {
      console.log('No database connection, connecting first...');
      connectToDatabase(false, () => attempt());
      return;
    }
    
    try {
      operation(db, (err, result) => {
        if (err && (err.message.includes('SQLITE_BUSY') || 
                    err.message.includes('SQLITE_LOCKED') || 
                    err.message.includes('database is locked'))) {
          
          if (retries < maxRetries) {
            retries++;
            const delay = BASE_RECONNECT_DELAY * Math.pow(2, retries - 1);
            console.log(`Database busy/locked, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
            
            setTimeout(attempt, delay);
          } else {
            console.error(`Failed operation after ${maxRetries} retries:`, err.message);
            if (callback) callback(err);
          }
        } else if (err) {
          console.error('Database operation error:', err.message);
          if (callback) callback(err);
        } else {
          if (callback) callback(null, result);
        }
      });
    } catch (err) {
      console.error('Unexpected error during database operation:', err.message);
      
      if (retries < maxRetries) {
        retries++;
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, retries - 1);
        console.log(`Unexpected error, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
        
        setTimeout(attempt, delay);
      } else {
        console.error(`Failed operation after ${maxRetries} retries:`, err.message);
        if (callback) callback(err);
      }
    }
  }
  
  attempt();
}

/**
 * Initialize the last modification time of the database file
 */
function initLastModTime() {
  fs.stat(currentDbPath, (err, stats) => {
    if (err) {
      console.error('Error getting initial database file stats:', err.message);
    } else {
      lastDatabaseModTime = stats.mtime.getTime();
      console.log('Initial database modification time:', new Date(lastDatabaseModTime).toISOString());
    }
  });
}

/**
 * Start watching the database file for changes
 */
function startFileWatcher() {
  // Stop existing watcher if any
  stopFileWatcher();
  
  try {
    console.log(`Starting file watcher for database: ${currentDbPath}`);
    
    // Set up file watcher
    const watchDir = path.dirname(currentDbPath);
    const filename = path.basename(currentDbPath);
    
    fileWatcher = fs.watch(watchDir, (eventType, changedFile) => {
      // Check if the event affects our database file
      if (changedFile === filename) {
        console.log(`Database file change detected (${eventType}): ${currentDbPath}`);
        
        // Check modification time to filter duplicate events
        checkDatabaseModified((err, result) => {
          if (err) {
            console.error('Error checking database modification:', err.message);
            return;
          }
          
          if (result.changed) {
            // Notify all registered listeners
            notifyChangeListeners();
          }
        });
      }
    });
    
    // Handle watcher errors
    fileWatcher.on('error', (error) => {
      console.error('Database file watcher error:', error);
      // Attempt to restart watcher after a delay
      setTimeout(() => {
        if (fileWatcher === null) {
          startFileWatcher();
        }
      }, 5000);
    });
    
    console.log('File watcher started successfully');
    return true;
  } catch (error) {
    console.error('Failed to start database file watcher:', error);
    return false;
  }
}

/**
 * Stop the database file watcher
 */
function stopFileWatcher() {
  if (fileWatcher) {
    console.log('Stopping database file watcher');
    fileWatcher.close();
    fileWatcher = null;
    return true;
  }
  return false;
}

/**
 * Register a listener to be notified of database changes
 * @param {Function} listener - Callback function to be called when database changes
 * @returns {Function} - Function to remove the listener
 */
function addChangeListener(listener) {
  if (typeof listener !== 'function') {
    throw new Error('Listener must be a function');
  }
  
  // Add listener if not already registered
  if (!changeListeners.includes(listener)) {
    changeListeners.push(listener);
    console.log(`Database change listener added (${changeListeners.length} total)`);
  }
  
  // Start watcher if this is the first listener
  if (changeListeners.length === 1) {
    startFileWatcher();
  }
  
  // Return function to remove this listener
  return () => {
    removeChangeListener(listener);
  };
}

/**
 * Remove a previously registered change listener
 * @param {Function} listener - The listener to remove
 * @returns {boolean} - Whether the listener was found and removed
 */
function removeChangeListener(listener) {
  const index = changeListeners.indexOf(listener);
  
  if (index !== -1) {
    changeListeners.splice(index, 1);
    console.log(`Database change listener removed (${changeListeners.length} remaining)`);
    
    // Stop watcher if no listeners remain
    if (changeListeners.length === 0) {
      stopFileWatcher();
    }
    
    return true;
  }
  
  return false;
}

/**
 * Notify all registered listeners about database changes
 */
function notifyChangeListeners() {
  if (changeListeners.length === 0) {
    return;
  }
  
  const changeInfo = {
    timestamp: Date.now(),
    path: currentDbPath
  };
  
  console.log(`Notifying ${changeListeners.length} listeners of database change`);
  
  // Call each listener with change information
  changeListeners.forEach(listener => {
    try {
      listener(changeInfo);
    } catch (error) {
      console.error('Error in database change listener:', error);
    }
  });
}

/**
 * Check if the database file has been modified since last check
 * @param {function} callback - Callback function with result: callback(err, { changed: boolean })
 */
function checkDatabaseModified(callback) {
  fs.stat(currentDbPath, (err, stats) => {
    if (err) {
      console.error('Error checking database file:', err.message);
      return callback(err);
    }
    
    const currentModTime = stats.mtime.getTime();
    
    // Initialize lastDatabaseModTime if it's null
    if (lastDatabaseModTime === null) {
      lastDatabaseModTime = currentModTime;
      return callback(null, { changed: false });
    }
    
    // Check if the file has been modified
    const hasChanged = currentModTime > lastDatabaseModTime;
    
    // If the file has changed, update the last modification time and reconnect to the database
    if (hasChanged) {
      console.log('Database file has been modified. Last mod time:', new Date(lastDatabaseModTime).toISOString());
      console.log('Current mod time:', new Date(currentModTime).toISOString());
      
      lastDatabaseModTime = currentModTime;
      
      // Reconnect to the database to ensure we have the latest data
      connectToDatabase(true, (err) => {
        if (err) {
          console.error('Error reconnecting to database after external modification:', err.message);
        } else {
          console.log('Reconnected to the memory-graph database after external modification');
        }
        
        callback(null, { changed: hasChanged });
      });
    } else {
      callback(null, { changed: hasChanged });
    }
  });
}

/**
 * Validate the provided database path
 * @param {string} dbPath - The path to validate
 * @returns {Promise} - Resolves if valid, rejects with error if invalid
 */
function validateDatabasePath(dbPath) {
  return new Promise((resolve, reject) => {
    // Check if path is absolute
    if (!path.isAbsolute(dbPath)) {
      return reject({
        message: 'Database path must be absolute (start with /)',
        details: 'Relative paths are not allowed'
      });
    }
    
    // Check if file exists and is readable
    fs.access(dbPath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          return reject({
            message: 'Database file not found',
            details: `The file at ${dbPath} does not exist`
          });
        } else if (err.code === 'EACCES') {
          return reject({
            message: 'Database file not accessible',
            details: `The server does not have permission to read ${dbPath}`
          });
        } else {
          return reject({
            message: 'Database file not accessible',
            details: err.message
          });
        }
      }
      
      // Check if file is a SQLite database
      fs.stat(dbPath, (statErr, stats) => {
        if (statErr) {
          return reject({
            message: 'Error checking database file',
            details: statErr.message
          });
        }
        
        // Check if it's a file (not a directory)
        if (!stats.isFile()) {
          return reject({
            message: 'Path is not a file',
            details: `${dbPath} exists but is not a file`
          });
        }
        
        // Check file size (empty SQLite database is at least a few KB)
        if (stats.size < 100) {
          return reject({
            message: 'File is too small to be a valid SQLite database',
            details: `${dbPath} may be empty or corrupted`
          });
        }
        
        // Basic SQLite header check
        const fd = fs.openSync(dbPath, 'r');
        const buffer = Buffer.alloc(16);
        
        try {
          fs.readSync(fd, buffer, 0, 16, 0);
          fs.closeSync(fd);
          
          // Check for SQLite header
          if (buffer.toString('utf8', 0, 6) !== 'SQLite') {
            return reject({
              message: 'File is not a valid SQLite database',
              details: `${dbPath} does not have a valid SQLite header`
            });
          }
          
          // All validation passed
          resolve({
            valid: true,
            path: dbPath
          });
        } catch (readErr) {
          // Close file descriptor if still open
          try {
            fs.closeSync(fd);
          } catch (e) {
            // Ignore errors when closing
          }
          
          return reject({
            message: 'Error reading database file',
            details: readErr.message
          });
        }
      });
    });
  });
}

/**
 * Update the database path and reconnect
 * @param {string} newPath - The new database path
 * @param {function} callback - Callback with result: callback(err, result)
 */
function updateDatabasePath(newPath, callback) {
  const oldPath = currentDbPath;
  
  // Stop watching the current database
  stopFileWatcher();
  
  // Update the global DB_PATH
  currentDbPath = newPath;
  
  // Connect to the new database
  connectToDatabase(true, (err) => {
    if (err) {
      console.error('[API] Error connecting to new database:', err.message);
      
      // Revert to old path if connection fails
      currentDbPath = oldPath;
      connectToDatabase(true);
      
      // Restart watcher for the old path if there are listeners
      if (changeListeners.length > 0) {
        startFileWatcher();
      }
      
      return callback(err);
    }
    
    console.log(`[API] Successfully switched to database at ${newPath}`);
    
    // Reset the last modification time
    fs.stat(newPath, (err, stats) => {
      if (!err) {
        lastDatabaseModTime = stats.mtime.getTime();
        console.log('[API] Updated last modification time for new database:', 
          new Date(lastDatabaseModTime).toISOString());
      }
    });
    
    // Restart the file watcher for the new path if there are listeners
    if (changeListeners.length > 0) {
      startFileWatcher();
    }
    
    // Notify listeners about the path change
    notifyChangeListeners();
    
    callback(null, { 
      success: true, 
      oldPath, 
      newPath,
      message: 'Database path updated successfully'
    });
  });
}

/**
 * Get the current database path
 * @returns {string} The current database path
 */
function getDatabasePath() {
  return currentDbPath;
}

/**
 * Get the database connection
 * @returns {Object} The SQLite database connection object
 */
function getDatabase() {
  return db;
}

// Initialize database connection on module load
connectToDatabase();

// Clean up on process exit
process.on('SIGINT', () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing the database:', err.message);
      } else {
        console.log('Database connection closed');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

module.exports = {
  connectToDatabase,
  executeWithRetry,
  checkDatabaseModified,
  validateDatabasePath,
  updateDatabasePath,
  getDatabasePath,
  getDatabase,
  startFileWatcher,
  stopFileWatcher,
  addChangeListener,
  removeChangeListener
};