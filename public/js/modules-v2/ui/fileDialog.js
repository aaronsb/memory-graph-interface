/**
 * File Dialog Module
 * 
 * Provides UI components for file path selection dialogs.
 */

import store from '../state/store.js';

/**
 * Creates and opens a dialog for database file selection
 * @param {Function} onConfirm - Callback function that receives the selected path
 */
export function openDatabasePathDialog(onConfirm) {
  // Dynamically import databaseService to avoid circular dependencies
  import('../core/databaseService.js').then(databaseService => {
    // Load path history
    const pathHistory = databaseService.loadPathHistory();
    
    // Check if dialog already exists and remove it
    let existingDialog = document.getElementById('database-path-dialog');
    if (existingDialog) {
      document.body.removeChild(existingDialog);
    }
    
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.id = 'database-path-dialog';
    dialog.className = 'modal-dialog';
    
    // Create dialog content with history dropdown
    dialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>Select Database Path</h3>
          <button id="close-dialog" class="close-button">&times;</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label for="database-path-input">Database Path:</label>
            <div class="input-with-dropdown">
              <input type="text" id="database-path-input" placeholder="/path/to/your/database.db" value="${store.get('customDatabasePath') || ''}">
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
          <div class="form-info">
            <p>Enter the full path to your SQLite database file on the server. The server will reload the database when you confirm.</p>
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
    
    // Add event listeners
    const closeButton = document.getElementById('close-dialog');
    const confirmButton = document.getElementById('confirm-path-button');
    const cancelButton = document.getElementById('cancel-path-button');
    const pathInput = document.getElementById('database-path-input');
    
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