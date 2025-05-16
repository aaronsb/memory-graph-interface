/**
 * Modules Index
 * 
 * This file exports all modules for the application.
 */

import store from './state/store.js';
import * as graph from './core/graph.js';
import * as nodeInteractions from './core/nodeInteractions.js';
import * as linkManagement from './core/linkManagement.js';
import * as domainManagement from './core/domainManagement.js';
import * as databaseService from './core/databaseService.js';
import * as controls from './ui/controls.js';
import * as contextMenu from './ui/contextMenu.js';
import * as windowManager from './ui/windowManager.js';
import * as menuBar from './ui/menuBar.js';
import * as fileDialog from './ui/fileDialog.js';
import * as visualizationControlsPanel from './ui/visualizationControlsPanel.js';
import * as helpers from './utils/helpers.js';
import * as eventBus from './utils/eventBus.js';
import * as settingsManager from './utils/settingsManager.js';
import * as webSocketService from './utils/webSocketService.js';
import * as visualizationManager from './core/visualizationManager.js';
import * as colorUtils from './utils/colorUtils.js';
import * as linkUtils from './utils/linkUtils.js';
import * as connectionAnalysis from './core/graph/connectionAnalysis.js';

// Export for direct importing
export {
  store,
  graph,
  nodeInteractions,
  linkManagement,
  domainManagement,
  databaseService,
  controls,
  contextMenu,
  windowManager,
  menuBar,
  fileDialog,
  visualizationControlsPanel,
  helpers,
  eventBus,
  settingsManager,
  webSocketService,
  visualizationManager,
  colorUtils,
  linkUtils,
  connectionAnalysis
};

// Default export for importing everything at once
export default {
  store,
  graph,
  nodeInteractions,
  linkManagement,
  domainManagement,
  databaseService,
  controls,
  contextMenu,
  windowManager,
  menuBar,
  fileDialog,
  visualizationControlsPanel,
  helpers,
  eventBus,
  settingsManager,
  webSocketService,
  visualizationManager,
  colorUtils,
  linkUtils,
  connectionAnalysis
};