/**
 * Visualization Controls Panel Module
 * 
 * Provides a panel with sliders to control visualization parameters
 * for the different visualization styles in the graph.
 */

import store from '../state/store.js';
import * as windowManager from './windowManager.js';
import * as eventBus from '../utils/eventBus.js';
import { 
  applyVisualizationStyle, 
  getVisualizationStyles, 
  getActiveVisualizationStyle
} from '../core/visualizationManager.js';

// Define control parameters for each visualization style
const visualizationControls = {
  // Clean style controls (primary style)
  clean: [
    {
      id: 'nodeRelSize',
      name: 'Node Size',
      min: 2,
      max: 8,
      step: 0.5,
      defaultValue: 4,
      description: 'Size of nodes'
    },
    {
      id: 'linkWidth',
      name: 'Link Width',
      min: 0.2,
      max: 2.5,
      step: 0.1,
      defaultValue: 1.0,
      description: 'Width of connection lines'
    },
    {
      id: 'linkDirectionalArrowLength',
      name: 'Arrow Size',
      min: 0,
      max: 6,
      step: 0.5,
      defaultValue: 3,
      description: 'Size of directional arrows'
    },
    {
      id: 'linkOpacity',
      name: 'Link Opacity',
      min: 0.1,
      max: 1,
      step: 0.05,
      defaultValue: 0.7,
      description: 'Transparency of links'
    }
  ]
  
  // Additional styles can be added here in the future
};

// Store current parameter values - will be reset when switching styles
let currentValues = {
  clean: {}
  // Additional styles can be added here in the future
};

// Function to reset current values for a style
function resetStyleValues(styleId) {
  console.log(`Resetting values for style: ${styleId}`);
  if (visualizationControls[styleId]) {
    currentValues[styleId] = {};
    visualizationControls[styleId].forEach(control => {
      currentValues[styleId][control.id] = control.defaultValue;
    });
  }
}

/**
 * Initialize the visualization controls panel
 */
export function initializeVisualizationControlsPanel() {
  console.log('Initializing visualization controls panel');

  // Get the panel
  const panel = document.getElementById('visualization-controls-panel');
  if (!panel) {
    console.error('Visualization controls panel element not found in DOM');
    return;
  }
  
  // Set up the close button
  const closeButton = panel.querySelector('.close-icon');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      hideVisualizationControlsPanel();
    });
  }
  
  // Make the panel draggable
  windowManager.makeDraggable('visualization-controls-panel', {
    addHeader: false, // We already have a header in the HTML
    controls: [], // Controls are handled in the HTML
    defaultPosition: { x: window.innerWidth - 400, y: 100 }
  });
  
  // Initialize controls
  createVisualizationControlsPanelElement();
  
  console.log('Visualization controls panel initialized');
}

/**
 * Initialize the style selector and controls on the visualization panel
 */
function createVisualizationControlsPanelElement() {
  const panel = document.getElementById('visualization-controls-panel');
  if (!panel) {
    console.error('Visualization controls panel not found in DOM');
    return;
  }
  
  const controlsContainer = document.getElementById('visualization-controls-container');
  if (!controlsContainer) {
    console.error('Visualization controls container not found in panel');
    return;
  }
  
  // Empty the controls container
  controlsContainer.innerHTML = '';
  
  // Add style selector
  const styleSelector = document.createElement('div');
  styleSelector.className = 'style-selector';
  styleSelector.style.marginBottom = '25px';
  styleSelector.style.backgroundColor = 'rgba(40, 40, 60, 0.8)';
  styleSelector.style.padding = '15px';
  styleSelector.style.borderRadius = '6px';
  styleSelector.style.border = '1px solid rgba(100, 130, 255, 0.3)';
  
  const styleLabel = document.createElement('label');
  styleLabel.style.display = 'block';
  styleLabel.style.marginBottom = '8px';
  styleLabel.style.color = '#aaccff';
  styleLabel.style.fontSize = '16px';
  styleLabel.style.fontWeight = 'bold';
  styleLabel.textContent = 'Visualization Style:';
  
  const styleSelect = document.createElement('select');
  styleSelect.id = 'visualization-style-select';
  styleSelect.style.width = '100%';
  styleSelect.style.padding = '10px';
  styleSelect.style.backgroundColor = 'rgba(50, 50, 70, 0.9)';
  styleSelect.style.color = '#ffffff';
  styleSelect.style.border = '1px solid rgba(100, 100, 255, 0.3)';
  styleSelect.style.borderRadius = '5px';
  styleSelect.style.fontSize = '15px';
  styleSelect.style.cursor = 'pointer';
  
  // Add options from available styles
  const styles = getVisualizationStyles();
  styles.forEach(style => {
    const option = document.createElement('option');
    option.value = style.id;
    option.textContent = style.name;
    styleSelect.appendChild(option);
  });
  
  // Set the active style
  styleSelect.value = getActiveVisualizationStyle();
  
  // Add event listener for style change
  styleSelect.addEventListener('change', (e) => {
    const newStyle = e.target.value;
    
    // Apply the new style
    applyVisualizationStyle(newStyle);
    
    // Clear the existing controls and recreate them for the new style
    createVisualizationControlsPanelElement();
  });
  
  styleSelector.appendChild(styleLabel);
  styleSelector.appendChild(styleSelect);
  controlsContainer.appendChild(styleSelector);
  
  // Add style information
  const styleInfoWrapper = document.createElement('div');
  styleInfoWrapper.className = 'style-info-wrapper';
  styleInfoWrapper.style.marginBottom = '25px';
  styleInfoWrapper.style.backgroundColor = 'rgba(40, 40, 60, 0.8)';
  styleInfoWrapper.style.padding = '15px';
  styleInfoWrapper.style.borderRadius = '6px';
  styleInfoWrapper.style.border = '1px solid rgba(120, 100, 255, 0.3)';
  
  const styleInfoTitle = document.createElement('h4');
  styleInfoTitle.textContent = 'Clean Style';
  styleInfoTitle.style.margin = '0 0 12px 0';
  styleInfoTitle.style.color = '#aaccff';
  styleInfoTitle.style.fontSize = '16px';
  styleInfoTitle.style.fontWeight = 'bold';
  
  const styleInfoText = document.createElement('div');
  styleInfoText.textContent = 'This style uses simple lines with minimal styling for clean visuals, similar to the 3d-force-graph examples. It provides both better performance and a more elegant appearance.';
  styleInfoText.style.fontSize = '13px';
  styleInfoText.style.color = '#ccc';
  styleInfoText.style.lineHeight = '1.5';
  
  styleInfoWrapper.appendChild(styleInfoTitle);
  styleInfoWrapper.appendChild(styleInfoText);
  
  controlsContainer.appendChild(styleInfoWrapper);
  
  // Initialize with the current active style
  loadControlValues(getActiveVisualizationStyle());
}

/**
 * Load control values for a specific visualization style
 * @param {string} styleId - The ID of the visualization style
 */
function loadControlValues(styleId) {
  const controlsContainer = document.getElementById('visualization-controls-container');
  if (!controlsContainer) return;
  
  // Clear existing controls
  controlsContainer.innerHTML = '';
  
  // Get controls for the selected style
  const controls = visualizationControls[styleId] || [];
  if (controls.length === 0) {
    const noControls = document.createElement('p');
    noControls.textContent = 'No adjustable parameters for this style.';
    noControls.style.color = '#aaa';
    noControls.style.fontStyle = 'italic';
    noControls.style.textAlign = 'center';
    controlsContainer.appendChild(noControls);
    return;
  }
  
  // Reset values for this style to ensure we're using the defaults
  resetStyleValues(styleId);
  
  // Create controls for each parameter
  controls.forEach(control => {
    const controlWrapper = document.createElement('div');
    controlWrapper.className = 'control-wrapper';
    controlWrapper.style.marginBottom = '20px';
    controlWrapper.style.backgroundColor = 'rgba(40, 40, 60, 0.7)';
    controlWrapper.style.padding = '12px';
    controlWrapper.style.borderRadius = '6px';
    controlWrapper.style.border = '1px solid rgba(100, 100, 255, 0.2)';
    
    // Create label with value display
    const labelContainer = document.createElement('div');
    labelContainer.style.display = 'flex';
    labelContainer.style.justifyContent = 'space-between';
    labelContainer.style.marginBottom = '5px';
    
    const label = document.createElement('label');
    label.textContent = control.name;
    label.style.color = '#ccddff';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.id = `${control.id}-value`;
    valueDisplay.textContent = currentValues[styleId][control.id];
    valueDisplay.style.color = '#aaccff';
    valueDisplay.style.fontSize = '14px';
    valueDisplay.style.backgroundColor = 'rgba(60, 60, 90, 0.5)';
    valueDisplay.style.padding = '2px 6px';
    valueDisplay.style.borderRadius = '3px';
    
    labelContainer.appendChild(label);
    labelContainer.appendChild(valueDisplay);
    controlWrapper.appendChild(labelContainer);
    
    // Create slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = control.id;
    slider.min = control.min;
    slider.max = control.max;
    slider.step = control.step;
    slider.value = currentValues[styleId][control.id];
    
    // Slider styling
    slider.style.width = '100%';
    slider.style.height = '6px';
    slider.style.appearance = 'none';
    slider.style.backgroundColor = 'rgba(60, 60, 90, 0.7)';
    slider.style.borderRadius = '3px';
    slider.style.outline = 'none';
    slider.style.margin = '10px 0';
    
    // Slider thumb styling
    const thumbStyles = `
      #${control.id}::-webkit-slider-thumb {
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #5a88ff;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
      }
      #${control.id}::-webkit-slider-thumb:hover {
        background: #7aa2ff;
        transform: scale(1.1);
      }
      #${control.id}::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #5a88ff;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
      }
      #${control.id}::-moz-range-thumb:hover {
        background: #7aa2ff;
        transform: scale(1.1);
      }
    `;
    
    // Add thumb styles to document
    const styleElement = document.createElement('style');
    styleElement.textContent = thumbStyles;
    document.head.appendChild(styleElement);
    
    // Add description
    const description = document.createElement('div');
    description.textContent = control.description;
    description.style.fontSize = '12px';
    description.style.color = '#999';
    description.style.marginTop = '8px';
    description.style.fontStyle = 'italic';
    description.style.borderTop = '1px solid rgba(100, 100, 255, 0.1)';
    description.style.paddingTop = '8px';
    
    // Add event listener for value change
    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      valueDisplay.textContent = value;
      currentValues[styleId][control.id] = value;
      
      // Apply the change to the visualization
      applyControlChange(styleId, control.id, value);
    });
    
    controlWrapper.appendChild(slider);
    controlWrapper.appendChild(description);
    controlsContainer.appendChild(controlWrapper);
  });
}

/**
 * Apply a control change to the visualization
 * @param {string} styleId - The ID of the visualization style
 * @param {string} controlId - The ID of the control to change
 * @param {number} value - The new value
 */
function applyControlChange(styleId, controlId, value) {
  const { graph } = store.getState();
  if (!graph) return;
  
  const style = getVisualizationStyles().find(s => s.id === styleId);
  if (!style) return;
  
  // Apply different changes based on control ID
  switch (controlId) {
    case 'nodeRelSize':
      graph.nodeRelSize(value);
      break;
      
    case 'linkWidth':
      // Set constant link width for clean style
      graph.linkWidth(value);
      break;
      
    case 'linkDirectionalArrowLength':
      // Update arrow length
      graph.linkDirectionalArrowLength(value);
      break;
      
    case 'linkOpacity':
      graph.linkOpacity(value);
      break;
  }
}

/**
 * Show the visualization controls panel
 */
export function showVisualizationControlsPanel() {
  console.log('Showing visualization controls panel');
  
  let panel = document.getElementById('visualization-controls-panel');
  if (!panel) {
    console.error('Visualization controls panel not found in DOM');
    return;
  }
  
  // Always recreate the panel contents to ensure sync with current style
  createVisualizationControlsPanelElement();
  
  // Show panel
  panel.style.display = 'block';
  windowManager.bringToFront(panel);
  
  console.log('Panel displayed and updated');
}

/**
 * Hide the visualization controls panel
 */
export function hideVisualizationControlsPanel() {
  const panel = document.getElementById('visualization-controls-panel');
  if (panel) {
    panel.style.display = 'none';
  }
}

/**
 * Toggle the visualization controls panel
 */
export function toggleVisualizationControlsPanel() {
  console.log('Toggling visualization controls panel');
  const panel = document.getElementById('visualization-controls-panel');
  if (panel && panel.style.display === 'block') {
    hideVisualizationControlsPanel();
    return false;
  } else {
    showVisualizationControlsPanel();
    return true;
  }
}

export default {
  initializeVisualizationControlsPanel,
  showVisualizationControlsPanel,
  hideVisualizationControlsPanel,
  toggleVisualizationControlsPanel
};