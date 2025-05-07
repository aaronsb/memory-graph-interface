/**
 * File System Router
 * 
 * Handles routes related to file system operations like browsing directories
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * @route   GET /browse
 * @desc    Browse directory and list files with optional filtering
 * @access  Public
 */
router.get('/browse', (req, res) => {
  console.log('==== [API] GET /api/browse request received ====');
  
  const requestedPath = req.query.path || '/';
  const filter = req.query.filter || '';
  console.log(`[API] Browsing directory: ${requestedPath}, filter: ${filter}`);
  
  // Normalize path to prevent directory traversal attacks
  const normalizedPath = path.normalize(requestedPath).replace(/\\/g, '/');
  
  // Validate the path (only allow absolute paths)
  if (!path.isAbsolute(normalizedPath)) {
    console.error('[API] Error: Relative paths are not allowed');
    return res.status(400).json({
      error: 'Invalid path',
      details: 'Only absolute paths are allowed'
    });
  }
  
  // Read directory contents
  fs.readdir(normalizedPath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error('[API] Error reading directory:', err.message);
      return res.status(500).json({ 
        error: 'Cannot read directory',
        details: err.message
      });
    }
    
    // Process entries
    const files = [];
    const directories = [];
    
    // Add parent directory if not at root
    if (normalizedPath !== '/') {
      directories.push({
        name: '..',
        path: path.dirname(normalizedPath),
        type: 'directory',
        isParent: true
      });
    }
    
    // Process entries
    entries.forEach(entry => {
      try {
        const entryPath = path.join(normalizedPath, entry.name);
        const isDir = entry.isDirectory();
        const isFile = entry.isFile();
        
        // Skip hidden files and directories (starting with .)
        if (entry.name.startsWith('.')) {
          return;
        }
        
        if (isDir) {
          directories.push({
            name: entry.name,
            path: entryPath,
            type: 'directory'
          });
        } else if (isFile) {
          // Apply filter if specified
          if (filter && !entry.name.endsWith(filter)) {
            return;
          }
          
          // Add file with basic stats
          files.push({
            name: entry.name,
            path: entryPath,
            type: 'file',
            size: fs.statSync(entryPath).size,
            extension: path.extname(entry.name)
          });
        }
      } catch (error) {
        console.warn(`[API] Error processing entry ${entry.name}:`, error.message);
        // Continue with other entries
      }
    });
    
    // Sort directories and files alphabetically
    directories.sort((a, b) => {
      if (a.isParent) return -1;
      if (b.isParent) return 1;
      return a.name.localeCompare(b.name);
    });
    
    files.sort((a, b) => a.name.localeCompare(b.name));
    
    // Build response
    const result = {
      current_path: normalizedPath,
      is_root: normalizedPath === '/',
      parent_path: normalizedPath !== '/' ? path.dirname(normalizedPath) : null,
      directories,
      files,
      filter
    };
    
    res.json(result);
  });
});

module.exports = router;