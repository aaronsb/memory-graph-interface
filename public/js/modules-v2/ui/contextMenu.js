/**
 * Context Menu Module
 * 
 * Handles context menu functionality for nodes and links.
 */

import store from '../state/store.js';
import { handleViewNodeDetails, handleShowTagInput, handleDeleteNode } from '../core/nodeInteractions.js';
import { 
  toggleLinkCreationMode, 
  handleDeleteLink, 
  handleChangeStrength, 
  handleChangeLinkType,
  nextLinkTypePage, 
  prevLinkTypePage, 
  getLinkTypePaginationInfo 
} from '../core/linkManagement.js';
import { 
  handleChangeDomain, 
  nextDomainPage, 
  prevDomainPage, 
  getDomainPaginationInfo 
} from '../core/domainManagement.js';

/**
 * Show the context menu at the specified position
 * @param {number} x - X position in pixels
 * @param {number} y - Y position in pixels
 * @param {Object} node - Optional node object
 * @param {Object} link - Optional link object
 */
export function showContextMenu(x, y, node = null, link = null) {
  console.log('Showing context menu:', { x, y, node, link });
  
  // Update state
  store.update({
    contextMenuActive: true,
    contextMenuNode: node,
    contextMenuLink: link,
    contextMenuPosition: { x, y }
  });
  
  // Get context menu element
  const contextMenu = document.getElementById('context-menu');
  if (!contextMenu) {
    console.error('Context menu element not found');
    return;
  }
  
  // Position menu
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.style.display = 'block';
  
  // Clear previous content
  contextMenu.innerHTML = '';
  
  // Populate menu based on context
  populateContextMenu(contextMenu, node, link);
  
  // Ensure menu is within viewport
  keepContextMenuInViewport(contextMenu);
}

/**
 * Hide the context menu
 */
export function hideContextMenu() {
  console.log('Hiding context menu');
  
  // Update state
  store.update({
    contextMenuActive: false,
    contextMenuNode: null,
    contextMenuLink: null
  });
  
  // Hide menu element
  const contextMenu = document.getElementById('context-menu');
  if (contextMenu) {
    contextMenu.style.display = 'none';
  }
}

/**
 * Populate the context menu with items based on the context
 * @param {HTMLElement} contextMenu - The context menu element
 * @param {Object} node - Optional node object
 * @param {Object} link - Optional link object
 */
function populateContextMenu(contextMenu, node, link) {
  if (node) {
    // Node context menu
    populateNodeContextMenu(contextMenu, node);
  } else if (link) {
    // Link context menu
    populateLinkContextMenu(contextMenu, link);
  } else {
    // Background context menu
    populateBackgroundContextMenu(contextMenu);
  }
}

/**
 * Populate node context menu
 * @param {HTMLElement} contextMenu - The context menu element
 * @param {Object} node - The node object
 */
function populateNodeContextMenu(contextMenu, node) {
  // Add menu header
  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.textContent = `Node: ${node.id}`;
  contextMenu.appendChild(header);
  
  // Add view details option
  const viewDetails = createMenuItem('View Details', () => {
    hideContextMenu();
    handleViewNodeDetails(node);
  });
  contextMenu.appendChild(viewDetails);
  
  // Add domain submenu
  const domainItem = createMenuItem('Change Domain', null, true);
  const domainSubmenu = createDomainSubmenu(node);
  domainItem.appendChild(domainSubmenu);
  contextMenu.appendChild(domainItem);
  
  // Add link creation option
  const createLink = createMenuItem('Create Link', () => {
    hideContextMenu();
    toggleLinkCreationMode(node);
  });
  contextMenu.appendChild(createLink);
  
  // Add tag option
  const addTag = createMenuItem('Add Tag', () => {
    hideContextMenu();
    handleShowTagInput(node);
  });
  contextMenu.appendChild(addTag);
  
  // Add separator
  contextMenu.appendChild(createSeparator());
  
  // Add delete option
  const deleteItem = createMenuItem('Delete Node', () => {
    hideContextMenu();
    handleDeleteNode(node);
  }, false, true);
  contextMenu.appendChild(deleteItem);
}

/**
 * Populate link context menu
 * @param {HTMLElement} contextMenu - The context menu element
 * @param {Object} link - The link object
 */
function populateLinkContextMenu(contextMenu, link) {
  // Add menu header
  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.textContent = `Link: ${link.source.id || link.source} → ${link.target.id || link.target}`;
  contextMenu.appendChild(header);
  
  // Add link type submenu
  const typeItem = createMenuItem('Change Type', null, true);
  const typeSubmenu = createLinkTypeSubmenu(link);
  typeItem.appendChild(typeSubmenu);
  contextMenu.appendChild(typeItem);
  
  // Add link strength submenu
  const strengthItem = createMenuItem('Change Strength', null, true);
  const strengthSubmenu = createStrengthSubmenu(link);
  strengthItem.appendChild(strengthSubmenu);
  contextMenu.appendChild(strengthItem);
  
  // Add separator
  contextMenu.appendChild(createSeparator());
  
  // Add delete option
  const deleteItem = createMenuItem('Delete Link', () => {
    hideContextMenu();
    handleDeleteLink(link);
  }, false, true);
  contextMenu.appendChild(deleteItem);
}

/**
 * Populate background context menu
 * @param {HTMLElement} contextMenu - The context menu element
 */
function populateBackgroundContextMenu(contextMenu) {
  // Add menu header
  const header = document.createElement('div');
  header.className = 'context-menu-header';
  header.textContent = 'Graph Options';
  contextMenu.appendChild(header);
  
  // Add refresh option
  const refreshItem = createMenuItem('Refresh Data', () => {
    hideContextMenu();
    const loadData = require('../core/graph').loadData;
    loadData(true); // preserve positions
  });
  contextMenu.appendChild(refreshItem);
  
  // Add toggle options
  const toggleBloom = createMenuItem('Toggle Bloom Effect', () => {
    hideContextMenu();
    const toggleBloomEffect = require('./controls').toggleBloomEffect;
    toggleBloomEffect();
  });
  contextMenu.appendChild(toggleBloom);
  
  const toggleSummaries = createMenuItem('Toggle Node Summaries', () => {
    hideContextMenu();
    const toggleSummariesOnNodes = require('./controls').toggleSummariesOnNodes;
    toggleSummariesOnNodes();
  });
  contextMenu.appendChild(toggleSummaries);
  
  const toggleEdgeLabels = createMenuItem('Toggle Edge Labels', () => {
    hideContextMenu();
    const toggleEdgeLabelsFunc = require('./controls').toggleEdgeLabels;
    toggleEdgeLabelsFunc();
  });
  contextMenu.appendChild(toggleEdgeLabels);
}

/**
 * Create a menu item element
 * @param {string} text - Menu item text
 * @param {Function} onClick - Click handler
 * @param {boolean} hasSubmenu - Whether the item has a submenu
 * @param {boolean} isDanger - Whether the item is a dangerous action
 * @returns {HTMLElement} - The menu item element
 */
function createMenuItem(text, onClick, hasSubmenu = false, isDanger = false) {
  const item = document.createElement('div');
  item.className = 'context-menu-item';
  if (isDanger) item.className += ' danger';
  if (hasSubmenu) item.className += ' has-submenu';
  
  item.textContent = text;
  
  if (onClick) {
    item.addEventListener('click', onClick);
  }
  
  return item;
}

/**
 * Create a separator element
 * @returns {HTMLElement} - The separator element
 */
function createSeparator() {
  const separator = document.createElement('div');
  separator.className = 'context-menu-separator';
  return separator;
}

/**
 * Create domain submenu
 * @param {Object} node - The node object
 * @returns {HTMLElement} - The submenu element
 */
function createDomainSubmenu(node) {
  // Create submenu container
  const submenu = document.createElement('div');
  submenu.className = 'context-submenu';
  
  // Get domains from store or global
  const domains = store.get('allDomains') || window.allDomains || [];
  
  // Get pagination values
  const { currentPage, pageSize, totalPages } = getDomainPaginationInfo();
  
  // Create domain items
  const pageStart = currentPage * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, domains.length);
  
  for (let i = pageStart; i < pageEnd; i++) {
    const domain = domains[i];
    
    // Skip current domain
    if (node.domain === domain) continue;
    
    const item = createMenuItem(domain, () => {
      hideContextMenu();
      handleChangeDomain(node, domain);
    });
    
    // Add color indicator if available
    if (window.domainColors && window.domainColors.has(domain)) {
      const color = window.domainColors.get(domain);
      item.style.borderLeft = `4px solid ${color}`;
    }
    
    submenu.appendChild(item);
  }
  
  // Add pagination controls if needed
  if (totalPages > 1) {
    submenu.appendChild(createSeparator());
    
    const pagination = document.createElement('div');
    pagination.className = 'submenu-pagination';
    
    // Add page info
    const pageInfo = document.createElement('div');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
    pagination.appendChild(pageInfo);
    
    // Add pagination buttons
    const buttonContainer = document.createElement('div');
    
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button';
    prevButton.textContent = '← Prev';
    prevButton.disabled = currentPage === 0;
    prevButton.addEventListener('click', () => {
      prevDomainPage();
      hideContextMenu();
      showContextMenu(
        store.get('contextMenuPosition').x,
        store.get('contextMenuPosition').y,
        node
      );
    });
    
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button';
    nextButton.textContent = 'Next →';
    nextButton.disabled = currentPage === totalPages - 1;
    nextButton.addEventListener('click', () => {
      nextDomainPage();
      hideContextMenu();
      showContextMenu(
        store.get('contextMenuPosition').x,
        store.get('contextMenuPosition').y,
        node
      );
    });
    
    buttonContainer.appendChild(prevButton);
    buttonContainer.appendChild(nextButton);
    
    pagination.appendChild(buttonContainer);
    submenu.appendChild(pagination);
  }
  
  return submenu;
}

/**
 * Create strength submenu for link
 * @param {Object} link - The link object
 * @returns {HTMLElement} - The submenu element
 */
function createStrengthSubmenu(link) {
  const submenu = document.createElement('div');
  submenu.className = 'context-submenu';
  
  // Create slider container
  const sliderContainer = document.createElement('div');
  sliderContainer.style.padding = '10px 15px';
  sliderContainer.style.width = '200px';
  
  // Create slider track
  const track = document.createElement('div');
  track.style.position = 'relative';
  track.style.height = '6px';
  track.style.backgroundColor = 'rgba(100, 100, 255, 0.3)';
  track.style.borderRadius = '3px';
  track.style.marginBottom = '20px';
  
  // Create active track portion
  const activeTrack = document.createElement('div');
  activeTrack.style.position = 'absolute';
  activeTrack.style.height = '100%';
  activeTrack.style.backgroundColor = 'rgba(100, 200, 255, 0.7)';
  activeTrack.style.borderRadius = '3px';
  activeTrack.style.width = `${(link.strength || 0.5) * 100}%`;
  track.appendChild(activeTrack);
  
  // Create slider handle
  const handle = document.createElement('div');
  handle.style.position = 'absolute';
  handle.style.top = '50%';
  handle.style.transform = 'translate(-50%, -50%)';
  handle.style.width = '14px';
  handle.style.height = '14px';
  handle.style.backgroundColor = '#ffffff';
  handle.style.borderRadius = '50%';
  handle.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.3)';
  handle.style.cursor = 'pointer';
  handle.style.left = `${(link.strength || 0.5) * 100}%`;
  track.appendChild(handle);
  
  // Create value display
  const valueDisplay = document.createElement('div');
  valueDisplay.style.textAlign = 'center';
  valueDisplay.style.marginBottom = '10px';
  valueDisplay.textContent = `Strength: ${(link.strength || 0.5).toFixed(2)}`;
  
  // Create hidden input for value
  const input = document.createElement('input');
  input.type = 'hidden';
  input.value = link.strength || 0.5;
  
  // Add slider interaction
  let isDragging = false;
  
  function updateSlider(e) {
    if (!isDragging) return;
    
    // Calculate position
    const trackRect = track.getBoundingClientRect();
    let x = (e.clientX - trackRect.left) / trackRect.width;
    
    // Constrain to 0-1
    x = Math.max(0, Math.min(1, x));
    
    // Update strength
    updateStrengthUI(handle, activeTrack, valueDisplay, input, x);
  }
  
  handle.addEventListener('mousedown', () => {
    isDragging = true;
    
    // Add temporary event listeners
    document.addEventListener('mousemove', updateSlider);
    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.removeEventListener('mousemove', updateSlider);
      
      // Apply the change
      handleChangeStrength(link, parseFloat(input.value));
      hideContextMenu();
    }, { once: true });
  });
  
  // Also allow clicking on the track
  track.addEventListener('click', (e) => {
    const trackRect = track.getBoundingClientRect();
    let x = (e.clientX - trackRect.left) / trackRect.width;
    x = Math.max(0, Math.min(1, x));
    
    // Update UI
    updateStrengthUI(handle, activeTrack, valueDisplay, input, x);
    
    // Apply the change
    handleChangeStrength(link, parseFloat(input.value));
    hideContextMenu();
  });
  
  // Assemble slider
  sliderContainer.appendChild(valueDisplay);
  sliderContainer.appendChild(track);
  sliderContainer.appendChild(input);
  submenu.appendChild(sliderContainer);
  
  // Add preset buttons
  const presetContainer = document.createElement('div');
  presetContainer.style.display = 'flex';
  presetContainer.style.justifyContent = 'space-between';
  presetContainer.style.padding = '0 15px 10px';
  
  const presets = [
    { label: 'Weak', value: 0.25 },
    { label: 'Medium', value: 0.5 },
    { label: 'Strong', value: 0.75 },
    { label: 'Very Strong', value: 1.0 }
  ];
  
  presets.forEach(preset => {
    const button = document.createElement('button');
    button.textContent = preset.label;
    button.style.padding = '5px 8px';
    button.style.backgroundColor = 'rgba(60, 60, 90, 0.7)';
    button.style.border = 'none';
    button.style.borderRadius = '3px';
    button.style.color = '#fff';
    button.style.cursor = 'pointer';
    button.style.fontSize = '12px';
    
    button.addEventListener('click', () => {
      handleChangeStrength(link, preset.value);
      hideContextMenu();
    });
    
    presetContainer.appendChild(button);
  });
  
  submenu.appendChild(presetContainer);
  
  return submenu;
}

/**
 * Update the strength UI elements
 * @param {HTMLElement} handle - Slider handle
 * @param {HTMLElement} activeTrack - Active track portion
 * @param {HTMLElement} valueDisplay - Value display
 * @param {HTMLElement} input - Hidden input
 * @param {number} strength - New strength value
 */
function updateStrengthUI(handle, activeTrack, valueDisplay, input, strength) {
  handle.style.left = `${strength * 100}%`;
  activeTrack.style.width = `${strength * 100}%`;
  valueDisplay.textContent = `Strength: ${strength.toFixed(2)}`;
  input.value = strength;
}

/**
 * Create link type submenu
 * @param {Object} link - The link object
 * @returns {HTMLElement} - The submenu element
 */
function createLinkTypeSubmenu(link) {
  const submenu = document.createElement('div');
  submenu.className = 'context-submenu';
  
  // Get link types
  const linkTypes = store.get('allLinkTypes') || window.allLinkTypes || [
    'relates_to',
    'synthesizes',
    'supports',
    'refines'
  ];
  
  // Get pagination info
  const { currentPage, pageSize, totalPages } = getLinkTypePaginationInfo();
  
  // Add link type items
  const pageStart = currentPage * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, linkTypes.length);
  
  for (let i = pageStart; i < pageEnd; i++) {
    const type = linkTypes[i];
    
    // Skip current type
    if (link.type === type) continue;
    
    const item = createMenuItem(type, () => {
      hideContextMenu();
      handleChangeLinkType(link, type);
    });
    
    submenu.appendChild(item);
  }
  
  // Add pagination controls if needed
  if (totalPages > 1) {
    submenu.appendChild(createSeparator());
    
    const pagination = document.createElement('div');
    pagination.className = 'submenu-pagination';
    
    // Add page info
    const pageInfo = document.createElement('div');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
    pagination.appendChild(pageInfo);
    
    // Add pagination buttons
    const buttonContainer = document.createElement('div');
    
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button';
    prevButton.textContent = '← Prev';
    prevButton.disabled = currentPage === 0;
    prevButton.addEventListener('click', () => {
      prevLinkTypePage();
      hideContextMenu();
      showContextMenu(
        store.get('contextMenuPosition').x,
        store.get('contextMenuPosition').y,
        null,
        link
      );
    });
    
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button';
    nextButton.textContent = 'Next →';
    nextButton.disabled = currentPage === totalPages - 1;
    nextButton.addEventListener('click', () => {
      nextLinkTypePage();
      hideContextMenu();
      showContextMenu(
        store.get('contextMenuPosition').x,
        store.get('contextMenuPosition').y,
        null,
        link
      );
    });
    
    buttonContainer.appendChild(prevButton);
    buttonContainer.appendChild(nextButton);
    
    pagination.appendChild(buttonContainer);
    submenu.appendChild(pagination);
  }
  
  return submenu;
}

/**
 * Keep the context menu within the viewport
 * @param {HTMLElement} contextMenu - The context menu element
 */
function keepContextMenuInViewport(contextMenu) {
  // Get menu and window dimensions
  const menuRect = contextMenu.getBoundingClientRect();
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Check if menu is outside viewport
  if (menuRect.right > windowWidth) {
    contextMenu.style.left = `${windowWidth - menuRect.width - 10}px`;
  }
  
  if (menuRect.bottom > windowHeight) {
    contextMenu.style.top = `${windowHeight - menuRect.height - 10}px`;
  }
}

// Using getDomainPaginationInfo from domainManagement.js

// Using getLinkTypePaginationInfo from linkManagement.js

// Using nextDomainPage, prevDomainPage from domainManagement.js
// Using nextLinkTypePage, prevLinkTypePage from linkManagement.js

// Export context menu module
export default {
  showContextMenu,
  hideContextMenu,
  createDomainSubmenu,
  createLinkTypeSubmenu,
  createStrengthSubmenu
};