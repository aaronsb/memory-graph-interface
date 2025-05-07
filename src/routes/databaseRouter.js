/**
 * Database Router
 * 
 * Handles routes related to database operations
 */

const express = require('express');
const router = express.Router();
const dbService = require('../db/dbService');

/**
 * @route   GET /db-path
 * @desc    Get the current database path
 * @access  Public
 */
router.get('/db-path', (req, res) => {
  console.log('==== [API] GET /api/db-path request received ====');
  res.json({ path: dbService.getDatabasePath() });
});

/**
 * @route   POST /db-path
 * @desc    Set a new database path
 * @access  Public
 */
router.post('/db-path', (req, res) => {
  console.log('==== [API] POST /api/db-path request received ====');
  console.log('[API] Request body:', JSON.stringify(req.body, null, 2));
  
  const { path } = req.body;
  
  if (!path) {
    console.log('[API] POST /api/db-path error: Missing path parameter');
    return res.status(400).json({ error: 'Missing path parameter' });
  }
  
  // Add validation steps
  dbService.validateDatabasePath(path)
    .then(validationResult => {
      console.log(`[API] Changing database path from ${dbService.getDatabasePath()} to ${path}`);
      
      // Update the path and reconnect
      dbService.updateDatabasePath(path, (err, result) => {
        if (err) {
          return res.status(500).json({ 
            error: 'Failed to connect to the new database',
            details: err.message
          });
        }
        res.json(result);
      });
    })
    .catch(error => {
      console.error('[API] Path validation error:', error.message);
      return res.status(400).json({
        error: error.message,
        details: error.details
      });
    });
});

/**
 * @route   GET /db-status
 * @desc    Check if the database file has been modified
 * @access  Public
 */
router.get('/db-status', (req, res) => {
  dbService.checkDatabaseModified((err, result) => {
    if (err) {
      console.error('Error checking database file:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

module.exports = router;