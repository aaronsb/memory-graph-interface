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
  getActiveVisualizationStyle,
  toggleCustomLinkRenderer,
  isUsingCustomLinkRenderer
} from '../core/visualizationManager.js';

// Define control parameters for each visualization style
const visualizationControls = {
  // Simple style controls
  simple: [
    {
      id: 'nodeRelSize',
      name: 'Node Size',
      min: 4,
      max: 20,
      step: 0.5,
      defaultValue: 12,
      description: 'Size of nodes relative to their connections'
    },
    {
      id: 'lineWidth',
      name: 'Link Width',
      min: 0.5,
      max: 4,
      step: 0.1,
      defaultValue: 1.5,
      description: 'Width of connection lines'
    },
    {
      id: 'arrowLength',
      name: 'Arrow Size',
      min: 2,
      max: 15,
      step: 0.5,
      defaultValue: 7,
      description: 'Size of directional arrows'
    },
    {
      id: 'linkOpacity',
      name: 'Link Opacity',
      min: 0.1,
      max: 1,
      step: 0.05,
      defaultValue: 0.8,
      description: 'Transparency of links'
    }
  ],
  
  // Minimalist style controls
  minimalist: [
    {
      id: 'nodeRelSize',
      name: 'Node Size',
      min: 4,
      max: 15,
      step: 0.5,
      defaultValue: 8,
      description: 'Size of nodes relative to their connections'
    },
    {
      id: 'lineWidth',
      name: 'Link Width',
      min: 0.5,
      max: 3,
      step: 0.1,
      defaultValue: 1,
      description: 'Width of connection lines'
    },
    {
      id: 'arrowLength',
      name: 'Arrow Size',
      min: 1,
      max: 10,
      step: 0.5,
      defaultValue: 4,
      description: 'Size of directional arrows'
    },
    {
      id: 'linkOpacity',
      name: 'Link Opacity',
      min: 0.1,
      max: 1,
      step: 0.05,
      defaultValue: 0.5,
      description: 'Transparency of links'
    }
  ],
  
  // Network style controls
  network: [
    {
      id: 'nodeRelSize',
      name: 'Node Size',
      min: 5,
      max: 18,
      step: 0.5,
      defaultValue: 10,
      description: 'Size of nodes relative to their connections'
    },
    {
      id: 'lineWidth',
      name: 'Link Width',
      min: 1,
      max: 5,
      step: 0.1,
      defaultValue: 2,
      description: 'Width of connection lines'
    },
    {
      id: 'arrowLength',
      name: 'Arrow Size',
      min: 2,
      max: 20,
      step: 0.5,
      defaultValue: 10,
      description: 'Size of directional arrows'
    },
    {
      id: 'linkCurvature',
      name: 'Link Curvature',
      min: 0,
      max: 0.5,
      step: 0.01,
      defaultValue: 0.1,
      description: 'Curvature of connection lines'
    },
    {
      id: 'linkOpacity',
      name: 'Link Opacity',
      min: 0.1,
      max: 1,
      step: 0.05,
      defaultValue: 0.85,
      description: 'Transparency of links'
    }
  ],
  
  // Gradient connection count style controls
  gradientConnectionCount: [
    {
      id: 'nodeRelSize',
      name: 'Node Size',
      min: 5,
      max: 20,
      step: 0.5,
      defaultValue: 14,
      description: 'Size of nodes relative to their connections'
    },
    {
      id: 'lineWidth',
      name: 'Link Width',
      min: 0.5,
      max: 4,
      step: 0.1,
      defaultValue: 1.8,
      description: 'Width of connection lines'
    },
    {
      id: 'arrowLength',
      name: 'Arrow Size',
      min: 2,
      max: 15,
      step: 0.5,
      defaultValue: 9,
      description: 'Size of directional arrows'
    },
    {
      id: 'colorIntensity',
      name: 'Gradient Intensity',
      min: 0.3,
      max: 1,
      step: 0.05,
      defaultValue: 0.7,
      description: 'Intensity of the complementary color gradient'
    },
    {
      id: 'linkOpacity',
      name: 'Link Opacity',
      min: 0.1,
      max: 1,
      step: 0.05,
      defaultValue: 0.8,
      description: 'Transparency of links'
    }
  ]
};

// Store current parameter values - will be reset when switching styles
let currentValues = {
  simple: {},
  minimalist: {},
  network: {},
  gradientConnectionCount: {}
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
  
  // Add renderer toggle
  const rendererToggleWrapper = document.createElement('div');
  rendererToggleWrapper.className = 'renderer-toggle-wrapper';
  rendererToggleWrapper.style.marginBottom = '25px';
  rendererToggleWrapper.style.backgroundColor = 'rgba(40, 40, 60, 0.8)';
  rendererToggleWrapper.style.padding = '15px';
  rendererToggleWrapper.style.borderRadius = '6px';
  rendererToggleWrapper.style.border = '1px solid rgba(120, 100, 255, 0.3)';
  
  const rendererTitle = document.createElement('h4');
  rendererTitle.textContent = 'Link Renderer';
  rendererTitle.style.margin = '0 0 12px 0';
  rendererTitle.style.color = '#aaccff';
  rendererTitle.style.fontSize = '16px';
  rendererTitle.style.fontWeight = 'bold';
  
  // Create toggle switch wrapper
  const toggleContainer = document.createElement('div');
  toggleContainer.style.display = 'flex';
  toggleContainer.style.justifyContent = 'space-between';
  toggleContainer.style.alignItems = 'center';
  toggleContainer.style.marginTop = '10px';
  
  // Add labels for toggle
  const defaultLabel = document.createElement('span');
  defaultLabel.textContent = 'Default';
  defaultLabel.style.color = isUsingCustomLinkRenderer() ? '#888' : '#fff';
  defaultLabel.style.transition = 'color 0.3s';
  
  const customLabel = document.createElement('span');
  customLabel.textContent = 'Custom';
  customLabel.style.color = isUsingCustomLinkRenderer() ? '#fff' : '#888';
  customLabel.style.transition = 'color 0.3s';
  
  // Create toggle switch
  const toggleSwitch = document.createElement('label');
  toggleSwitch.className = 'toggle-switch';
  toggleSwitch.style.position = 'relative';
  toggleSwitch.style.display = 'inline-block';
  toggleSwitch.style.width = '60px';
  toggleSwitch.style.height = '28px';
  toggleSwitch.style.marginLeft = '10px';
  toggleSwitch.style.marginRight = '10px';
  toggleSwitch.style.cursor = 'pointer';
  
  const toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.checked = isUsingCustomLinkRenderer();
  toggleInput.style.opacity = '0';
  toggleInput.style.width = '0';
  toggleInput.style.height = '0';
  toggleInput.style.position = 'absolute';
  toggleInput.style.zIndex = '-1';
  
  const toggleSlider = document.createElement('div');
  toggleSlider.className = 'toggle-slider';
  toggleSlider.style.position = 'absolute';
  toggleSlider.style.cursor = 'pointer';
  toggleSlider.style.top = '0';
  toggleSlider.style.left = '0';
  toggleSlider.style.right = '0';
  toggleSlider.style.bottom = '0';
  toggleSlider.style.backgroundColor = isUsingCustomLinkRenderer() ? '#5a88ff' : '#666';
  toggleSlider.style.transition = '.4s';
  toggleSlider.style.borderRadius = '34px';
  toggleSlider.style.boxShadow = 'inset 0 0 5px rgba(0, 0, 0, 0.2)';
  
  // Create toggle knob
  const toggleKnob = document.createElement('div');
  toggleKnob.style.position = 'absolute';
  toggleKnob.style.height = '20px';
  toggleKnob.style.width = '20px';
  toggleKnob.style.left = isUsingCustomLinkRenderer() ? '36px' : '4px';
  toggleKnob.style.bottom = '4px';
  toggleKnob.style.backgroundColor = 'white';
  toggleKnob.style.transition = '.4s';
  toggleKnob.style.borderRadius = '50%';
  toggleKnob.style.boxShadow = '0 0 3px rgba(0, 0, 0, 0.3)';
  toggleSlider.appendChild(toggleKnob);
  
  // Add event listener to toggle
  toggleInput.addEventListener('change', () => {
    const isCustom = toggleCustomLinkRenderer();
    
    // Update UI to reflect new state
    toggleSlider.style.backgroundColor = isCustom ? '#5a88ff' : '#666';
    toggleKnob.style.left = isCustom ? '36px' : '4px';
    
    // Update labels
    defaultLabel.style.color = isCustom ? '#888' : '#fff';
    customLabel.style.color = isCustom ? '#fff' : '#888';
  });
  
  // Make the entire slider and labels clickable
  toggleSlider.addEventListener('click', () => {
    toggleInput.checked = !toggleInput.checked;
    // Trigger the change event manually
    toggleInput.dispatchEvent(new Event('change'));
  });
  
  defaultLabel.addEventListener('click', () => {
    if (isUsingCustomLinkRenderer()) {
      toggleInput.checked = false;
      toggleInput.dispatchEvent(new Event('change'));
    }
  });
  
  customLabel.addEventListener('click', () => {
    if (!isUsingCustomLinkRenderer()) {
      toggleInput.checked = true;
      toggleInput.dispatchEvent(new Event('change'));
    }
  });
  
  // Assemble toggle
  toggleSwitch.appendChild(toggleInput);
  toggleSwitch.appendChild(toggleSlider);
  
  // Assemble toggle container
  toggleContainer.appendChild(defaultLabel);
  toggleContainer.appendChild(toggleSwitch);
  toggleContainer.appendChild(customLabel);
  
  // Add description
  const rendererDescription = document.createElement('div');
  rendererDescription.textContent = 'Toggle between default Force3D renderer and our custom link renderer';
  rendererDescription.style.fontSize = '12px';
  rendererDescription.style.color = '#999';
  rendererDescription.style.marginTop = '12px';
  rendererDescription.style.fontStyle = 'italic';
  rendererDescription.style.borderTop = '1px solid rgba(100, 100, 255, 0.1)';
  rendererDescription.style.paddingTop = '8px';
  
  // Assemble renderer toggle section
  rendererToggleWrapper.appendChild(rendererTitle);
  rendererToggleWrapper.appendChild(toggleContainer);
  rendererToggleWrapper.appendChild(rendererDescription);
  
  // Add to controls container before the style-specific controls
  controlsContainer.appendChild(rendererToggleWrapper);
  
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
      
    case 'lineWidth':
      // Update line width in custom links
      // This requires re-applying the visualization style with the updated parameter
      style.customLinkWidth = value;
      applyVisualizationStyle(styleId);
      break;
      
    case 'arrowLength':
      // Update arrow length in custom links
      style.customArrowLength = value;
      applyVisualizationStyle(styleId);
      break;
      
    case 'linkOpacity':
      graph.linkOpacity(value);
      break;
      
    case 'linkCurvature':
      graph.linkCurvature(value);
      break;
      
    case 'colorIntensity':
      // Update gradient blend intensity for the gradient connection count style
      style.colorIntensity = value;
      applyVisualizationStyle(styleId);
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