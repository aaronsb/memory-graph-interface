/**
 * File Dialog Module
 * 
 * Provides UI components for file path selection dialogs with file browser integration.
 */

import store from '../state/store.js';

/**
 * Represents a size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Human-readable size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024;
  if (mb < 1024) return mb.toFixed(1) + ' MB';
  const gb = mb / 1024;
  return gb.toFixed(1) + ' GB';
}

/**
 * Fetches directory contents from the API
 * @param {string} path - Directory path to browse
 * @param {string} filter - File extension filter (e.g., '.db')
 * @returns {Promise<Object>} - Directory contents
 */
async function browseDirectory(path, filter = '.db') {
  try {
    const queryParams = new URLSearchParams({
      path: path,
      filter: filter
    }).toString();
    
    const response = await fetch(`/api/browse?${queryParams}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to browse directory');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error browsing directory:', error);
    throw error;
  }
}

/**
 * Creates and opens a dialog for database file selection with file browser
 * @param {Function} onConfirm - Callback function that receives the selected path
 */
export function openDatabasePathDialog(onConfirm) {
  // Dynamically import databaseService to avoid circular dependencies
  import('../core/databaseService.js').then(databaseService => {
    // Load path history
    const pathHistory = databaseService.loadPathHistory();
    
    // Initial path to browse (use home directory or root)
    let currentPath = '/';
    
    // Try to get the last used directory from the stored path
    const lastPath = store.get('customDatabasePath');
    if (lastPath) {
      const lastDir = lastPath.substring(0, lastPath.lastIndexOf('/'));
      if (lastDir) currentPath = lastDir;
    }
    
    // Check if dialog already exists and remove it
    let existingDialog = document.getElementById('database-path-dialog');
    if (existingDialog) {
      document.body.removeChild(existingDialog);
    }
    
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.id = 'database-path-dialog';
    dialog.className = 'modal-dialog';
    
    // Create dialog content with file browser
    dialog.innerHTML = `
      <div class="dialog-content" style="width: 700px; max-width: 90%;">
        <div class="dialog-header">
          <h3>Select Database File</h3>
          <button id="close-dialog" class="close-button">&times;</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label for="database-path-input">Database Path:</label>
            <div class="input-with-dropdown" style="display: flex;">
              <input type="text" id="database-path-input" style="flex-grow: 1;" placeholder="/path/to/your/database.db" value="${store.get('customDatabasePath') || ''}">
              <button id="browse-button" class="secondary-button" style="margin-left: 5px;">Browse</button>
              ${pathHistory.length > 0 ? 
                `<button id="show-history-button" class="history-button">▼</button>
                <div id="path-history-dropdown" class="path-history-dropdown" style="display: none;">
                  <div class="dropdown-header">Recent Paths</div>
                  ${pathHistory.map(path => `
                    <div class="history-item" data-path="${path}">${path}</div>
                  `).join('')}
                </div>` : ''}
            </div>
          </div>
          
          <!-- File Browser Section -->
          <div id="file-browser" style="display: none; margin-top: 15px;">
            <div class="file-browser-header" style="display: flex; align-items: center; margin-bottom: 8px;">
              <div style="flex-grow: 1; font-weight: bold;">
                <span id="current-path-display">${currentPath}</span>
              </div>
              <button id="parent-dir-button" class="secondary-button" style="margin-left: 5px;">Parent Directory</button>
              <button id="refresh-button" class="secondary-button" style="margin-left: 5px;">Refresh</button>
            </div>
            
            <div class="file-browser-content" style="height: 300px; overflow-y: auto; background-color: rgba(40, 40, 60, 0.7); border-radius: 4px; padding: 8px;">
              <div id="directory-loading">Loading...</div>
              <div id="directory-error" style="color: #ff6b6b; display: none;"></div>
              <table id="directory-contents" style="width: 100%; border-collapse: collapse; display: none;">
                <thead>
                  <tr style="border-bottom: 1px solid rgba(100, 100, 255, 0.3);">
                    <th style="text-align: left; padding: 8px;">Name</th>
                    <th style="text-align: left; padding: 8px;">Type</th>
                    <th style="text-align: right; padding: 8px;">Size</th>
                  </tr>
                </thead>
                <tbody id="directory-list">
                  <!-- Directory contents will be populated here -->
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="form-info" style="margin-top: 10px;">
            <p id="browser-help-text">Enter the full path to your SQLite database file, or click Browse to select a file.</p>
          </div>
        </div>
        <div class="dialog-footer">
          <button id="confirm-path-button" class="primary-button">Confirm</button>
          <button id="cancel-path-button" class="secondary-button">Cancel</button>
        </div>
      </div>
    `;
    
    // Add dialog to the body
    document.body.appendChild(dialog);
    
    // Get all the elements we need to work with
    const closeButton = document.getElementById('close-dialog');
    const confirmButton = document.getElementById('confirm-path-button');
    const cancelButton = document.getElementById('cancel-path-button');
    const pathInput = document.getElementById('database-path-input');
    const browseButton = document.getElementById('browse-button');
    const fileBrowser = document.getElementById('file-browser');
    const currentPathDisplay = document.getElementById('current-path-display');
    const parentDirButton = document.getElementById('parent-dir-button');
    const refreshButton = document.getElementById('refresh-button');
    const directoryLoading = document.getElementById('directory-loading');
    const directoryError = document.getElementById('directory-error');
    const directoryContents = document.getElementById('directory-contents');
    const directoryList = document.getElementById('directory-list');
    
    // Function to load and display directory contents
    async function loadDirectory(path) {
      currentPath = path;
      currentPathDisplay.textContent = path;
      
      // Show loading, hide errors and contents
      directoryLoading.style.display = 'block';
      directoryError.style.display = 'none';
      directoryContents.style.display = 'none';
      
      try {
        const data = await browseDirectory(path);
        
        // Clear the directory list
        directoryList.innerHTML = '';
        
        // Add directories
        data.directories.forEach(dir => {
          const row = document.createElement('tr');
          row.style.cursor = 'pointer';
          row.addEventListener('click', () => loadDirectory(dir.path));
          row.addEventListener('mouseenter', () => row.style.backgroundColor = 'rgba(70, 70, 100, 0.7)');
          row.addEventListener('mouseleave', () => row.style.backgroundColor = '');
          
          row.innerHTML = `
            <td style="padding: 8px;">
              <span style="color: #aaccff;">📁 ${dir.name}</span>
            </td>
            <td style="padding: 8px;">Directory</td>
            <td style="padding: 8px; text-align: right;">-</td>
          `;
          
          directoryList.appendChild(row);
        });
        
        // Add files
        data.files.forEach(file => {
          const row = document.createElement('tr');
          row.style.cursor = 'pointer';
          
          row.addEventListener('click', () => {
            pathInput.value = file.path;
            // Hide the browser after selection
            fileBrowser.style.display = 'none';
          });
          
          row.addEventListener('dblclick', () => {
            pathInput.value = file.path;
            confirmButton.click();
          });
          
          row.addEventListener('mouseenter', () => row.style.backgroundColor = 'rgba(70, 70, 100, 0.7)');
          row.addEventListener('mouseleave', () => row.style.backgroundColor = '');
          
          const fileIcon = file.extension === '.db' ? '📊' : '📄';
          
          row.innerHTML = `
            <td style="padding: 8px;">
              <span style="color: ${file.extension === '.db' ? '#aaffcc' : '#ffffff'};">${fileIcon} ${file.name}</span>
            </td>
            <td style="padding: 8px;">${file.extension || 'File'}</td>
            <td style="padding: 8px; text-align: right;">${formatFileSize(file.size)}</td>
          `;
          
          directoryList.appendChild(row);
        });
        
        // Show the contents, hide loading
        directoryLoading.style.display = 'none';
        directoryContents.style.display = 'table';
        
        // If no items found, show a message
        if (data.directories.length === 0 && data.files.length === 0) {
          directoryList.innerHTML = `
            <tr>
              <td colspan="3" style="padding: 20px; text-align: center;">
                No items found in this directory
              </td>
            </tr>
          `;
        }
      } catch (error) {
        directoryLoading.style.display = 'none';
        directoryError.style.display = 'block';
        directoryError.textContent = `Error: ${error.message}`;
      }
    }
    
    // Toggle file browser visibility
    browseButton.addEventListener('click', () => {
      const isVisible = fileBrowser.style.display !== 'none';
      fileBrowser.style.display = isVisible ? 'none' : 'block';
      
      if (!isVisible) {
        // Load directory when showing the browser
        loadDirectory(currentPath);
      }
    });
    
    // Parent directory button
    parentDirButton.addEventListener('click', () => {
      if (currentPath === '/') return;
      
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
      loadDirectory(parentPath);
    });
    
    // Refresh button
    refreshButton.addEventListener('click', () => {
      loadDirectory(currentPath);
    });
    
    // Close dialog on close button click
    closeButton.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    // Cancel button closes the dialog
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    // Confirm button calls the callback with the selected path
    confirmButton.addEventListener('click', () => {
      const path = pathInput.value.trim();
      if (path) {
        onConfirm(path);
      } else {
        // If path is empty, show error
        alert('Please enter a valid database path.');
        return;
      }
      document.body.removeChild(dialog);
    });
    
    // Add path history dropdown functionality if we have history
    if (pathHistory.length > 0) {
      const historyButton = document.getElementById('show-history-button');
      const historyDropdown = document.getElementById('path-history-dropdown');
      
      // Toggle history dropdown
      historyButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = historyDropdown.style.display !== 'none';
        historyDropdown.style.display = isVisible ? 'none' : 'block';
      });
      
      // Handle clicking on history items
      const historyItems = dialog.querySelectorAll('.history-item');
      historyItems.forEach(item => {
        item.addEventListener('click', () => {
          const path = item.getAttribute('data-path');
          pathInput.value = path;
          historyDropdown.style.display = 'none';
          
          // If file browser is open, navigate to the directory
          if (fileBrowser.style.display !== 'none') {
            const dirPath = path.substring(0, path.lastIndexOf('/'));
            if (dirPath) loadDirectory(dirPath);
          }
        });
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        if (historyDropdown.style.display !== 'none') {
          historyDropdown.style.display = 'none';
        }
      });
      
      // Stop propagation for dropdown
      historyDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
    
    // Set focus to input
    pathInput.focus();
    
    // Add ESC key handler to close dialog
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        document.body.removeChild(dialog);
        document.removeEventListener('keydown', handleKeyDown);
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Add click outside to close
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });
    
    return dialog;
  });
}

export default {
  openDatabasePathDialog
};