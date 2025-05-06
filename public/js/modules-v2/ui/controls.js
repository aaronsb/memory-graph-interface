/**
 * UI Controls Module
 * 
 * Manages UI controls and effects like bloom, node summaries, etc.
 */

import store from '../state/store.js';
import { updateHighlight } from '../utils/helpers.js';

/**
 * Toggle bloom effect on/off
 */
export function toggleBloomEffect() {
  const bloomPass = store.get('bloomPass');
  
  if (!bloomPass) {
    console.warn('Bloom effect not available');
    return;
  }
  
  // Toggle bloom enabled state
  const bloomEnabled = !store.get('bloomEnabled');
  
  try {
    if (bloomEnabled) {
      bloomPass.strength = 0.8;
      bloomPass.radius = 0.8;
      bloomPass.threshold = 0.2;
      console.log('Bloom effect enabled with reduced intensity');
    } else {
      bloomPass.strength = 0;
      console.log('Bloom effect disabled');
    }
    
    // Update state
    store.set('bloomEnabled', bloomEnabled);
    
    // Update button appearance
    const toggleButton = document.getElementById('toggle-bloom');
    if (toggleButton) {
      toggleButton.textContent = `Bloom Effect: ${bloomEnabled ? 'ON' : 'OFF'}`;
      toggleButton.style.backgroundColor = bloomEnabled ? '#3388ff' : '#525252';
    }
  } catch (error) {
    console.error('Error toggling bloom effect:', error);
  }
}

/**
 * Toggle node summaries on/off
 */
export function toggleSummariesOnNodes() {
  const graph = store.get('graph');
  
  // Toggle state
  const showSummariesOnNodes = !store.get('showSummariesOnNodes');
  store.set('showSummariesOnNodes', showSummariesOnNodes);
  
  // Update the button appearance
  const toggleButton = document.getElementById('toggle-summaries');
  if (toggleButton) {
    toggleButton.textContent = `Node Summaries: ${showSummariesOnNodes ? 'ON' : 'OFF'}`;
    toggleButton.style.backgroundColor = showSummariesOnNodes ? '#3388ff' : '#525252';
  }
  
  console.log(`Summaries on nodes ${showSummariesOnNodes ? 'enabled' : 'disabled'}`);
  
  // Force a refresh to update the node rendering
  if (graph) {
    graph.refresh();
  }
}

/**
 * Toggle edge labels on/off
 */
export function toggleEdgeLabels() {
  const graph = store.get('graph');
  
  // Toggle state
  const showEdgeLabels = !store.get('showEdgeLabels');
  store.set('showEdgeLabels', showEdgeLabels);
  
  // Update the button appearance
  const toggleButton = document.getElementById('toggle-edge-labels');
  if (toggleButton) {
    toggleButton.textContent = `Edge Labels: ${showEdgeLabels ? 'ON' : 'OFF'}`;
    toggleButton.style.backgroundColor = showEdgeLabels ? '#3388ff' : '#525252';
  }
  
  console.log(`Edge labels ${showEdgeLabels ? 'enabled' : 'disabled'}`);
  
  // Force a refresh to update the link rendering
  if (graph) {
    graph.refresh();
  }
}

/**
 * Toggle auto-zoom on node select
 */
export function toggleZoomOnSelect() {
  // Toggle state
  const zoomOnSelect = !store.get('zoomOnSelect');
  store.set('zoomOnSelect', zoomOnSelect);
  
  // Update the button appearance
  const toggleButton = document.getElementById('toggle-zoom');
  if (toggleButton) {
    toggleButton.textContent = `Auto-Zoom: ${zoomOnSelect ? 'ON' : 'OFF'}`;
    toggleButton.style.backgroundColor = zoomOnSelect ? '#3388ff' : '#525252';
  }
  
  console.log(`Auto-zoom on select ${zoomOnSelect ? 'enabled' : 'disabled'}`);
}

/**
 * Toggle help card visibility
 */
export function toggleHelpCard() {
  // Toggle state
  const showHelpCard = !store.get('showHelpCard');
  store.set('showHelpCard', showHelpCard);
  
  // Get the help card element
  const helpCard = document.getElementById('link-hint');
  
  // Toggle visibility
  if (helpCard) {
    helpCard.style.display = showHelpCard ? 'block' : 'none';
  }
  
  // Update the button appearance
  const toggleButton = document.getElementById('toggle-help-card');
  if (toggleButton) {
    toggleButton.textContent = `Help Card: ${showHelpCard ? 'ON' : 'OFF'}`;
    toggleButton.style.backgroundColor = showHelpCard ? '#3388ff' : '#525252';
  }
  
  console.log(`Help card ${showHelpCard ? 'shown' : 'hidden'}`);
}

/**
 * Toggle domain legend visibility
 */
export function toggleDomainLegend() {
  // Get the domain legend element
  const domainLegend = document.getElementById('domain-legend');
  
  if (!domainLegend) return;
  
  // Toggle visibility
  const isVisible = domainLegend.style.display !== 'none';
  domainLegend.style.display = isVisible ? 'none' : 'block';
  
  // Update the button appearance
  const toggleButton = document.getElementById('toggle-domain-legend');
  if (toggleButton) {
    toggleButton.textContent = `Domain Legend: ${!isVisible ? 'ON' : 'OFF'}`;
    toggleButton.style.backgroundColor = !isVisible ? '#3388ff' : '#525252';
  }
  
  console.log(`Domain legend ${!isVisible ? 'shown' : 'hidden'}`);
}

/**
 * Setup UI event listeners
 */
export function setupUIEventListeners() {
  console.log('Setting up UI event listeners');
  
  // Toggle bloom effect
  const bloomButton = document.getElementById('toggle-bloom');
  if (bloomButton) {
    bloomButton.addEventListener('click', toggleBloomEffect);
  }
  
  // Refresh data
  const refreshButton = document.getElementById('refresh-btn');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      const loadData = require('../core/graph').loadData;
      loadData(true); // preserve positions
    });
  }
  
  // Keyboard events for control key
  document.addEventListener('keydown', e => {
    if (e.key === 'Control') {
      store.set('controlKeyPressed', true);
    }
  });
  
  document.addEventListener('keyup', e => {
    if (e.key === 'Control') {
      store.set('controlKeyPressed', false);
      
      // Also update highlight since hover behavior may have changed
      updateHighlight();
    }
  });
  
  console.log('UI event listeners set up successfully');
}

// Export UI controls
export default {
  toggleBloomEffect,
  toggleSummariesOnNodes,
  toggleEdgeLabels,
  toggleZoomOnSelect,
  toggleHelpCard,
  toggleDomainLegend,
  setupUIEventListeners
};