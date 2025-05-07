/**
 * Graph Initialization Module
 * 
 * Handles initialization of the 3D force graph and basic configuration.
 */

import store from '../../state/store.js';
import { getNodeLabel, getNodeColor, getLinkColor } from '../../utils/helpers.js';
import { setupNodeInteractions } from './interactions.js';
import { setupLinkInteractions } from './interactions.js';
import { setupDragHandling } from './dragHandling.js';
import { addReferencePlane } from './referencePlane.js';

/**
 * Initialize the 3D force graph
 * @returns {Object} - The initialized 3D force graph instance
 */
export function initGraph() {
  console.log('Initializing 3D force graph');
  
  // Create the 3D force graph with basic configuration
  const graph = ForceGraph3D({ controlType: 'orbit' })
    (document.getElementById('graph-container'))
    .backgroundColor('#000020')
    .nodeLabel(node => getNodeLabel(node))
    .nodeColor(node => getNodeColor(node))
    .nodeRelSize(12) // Increased node size
    
    // Link styling
    .linkWidth(link => {
      const { highlightLinks } = store.getState();
      return highlightLinks.has(link) ? 5 : 2.5;
    })
    .linkDirectionalParticles(link => {
      // More particles for stronger links
      return Math.round(8 * (link.strength || 0.5));
    })
    .linkDirectionalParticleWidth(4)
    .linkDirectionalParticleSpeed(link => 0.00167 * link.strength)
    .linkColor(link => getLinkColor(link))
    .linkOpacity(1)
    .linkCurvature(0)
    
    // Link labels
    .linkLabel(link => `${link.type} (${link.strength.toFixed(2)})`)
    .linkThreeObjectExtend(true)
    .linkThreeObject(link => {
      const { showEdgeLabels } = store.getState();
      
      if (showEdgeLabels && typeof SpriteText !== 'undefined') {
        const sprite = new SpriteText(link.type);
        sprite.color = 'white';
        sprite.textHeight = 4;
        sprite.backgroundColor = 'rgba(0,0,0,0.7)';
        sprite.padding = 3;
        return sprite;
      }
      
      return null;
    })
    
    // Position link objects (labels)
    .linkPositionUpdate((sprite, { start, end }) => {
      if (sprite) {
        // Position the sprite at the middle of the link
        const middlePos = {
          x: start.x + (end.x - start.x) / 2,
          y: start.y + (end.y - start.y) / 2,
          z: start.z + (end.z - start.z) / 2
        };
        Object.assign(sprite.position, middlePos);
      }
    });
  
  // Set up node 3D objects
  setupNodeThreeObjects(graph);
  
  // Configure force simulation
  setupForceSimulation(graph);
  
  // Set up node and link interactions
  setupNodeInteractions(graph);
  setupLinkInteractions(graph);
  
  // Set up drag handling
  setupDragHandling(graph);
  
  // Set up bloom effect if available
  setupBloomEffect(graph);
  
  // Add reference plane for orientation
  addReferencePlane(graph, {
    position: { x: 0, y: -200, z: 0 }, // Initial position, will be adjusted after data loads
    size: 2000,
    divisions: 50,
    color1: 0x444466,
    color2: 0x222244,
    planeColor: 0x080820,
    planeOpacity: 0.1,
    visible: true,
    autoAdjust: true // Enable automatic adjustment
  });
  
  // Store the graph in the global state
  store.update({
    graph
  });
  
  return graph;
}

/**
 * Set up 3D objects for nodes
 * @param {Object} graph - The 3D force graph instance
 */
function setupNodeThreeObjects(graph) {
  graph.nodeThreeObject(node => {
    // Get state to check if summaries should be shown
    const { showSummariesOnNodes } = store.getState();
    
    // Only create text sprites for summaries when enabled
    if (showSummariesOnNodes && node.content_summary && typeof SpriteText !== 'undefined') {
      // Format summary to show approximately two lines of text
      let summaryText = node.content_summary;
      if (summaryText.length > 80) {
        summaryText = summaryText.substring(0, 80) + '...';
      }
      
      // Create a group to hold the sprite
      const group = new THREE.Group();
      
      // Create the sprite text
      const sprite = new SpriteText(summaryText);
      sprite.color = '#ffffff';
      sprite.textHeight = 2.5;
      sprite.backgroundColor = 'rgba(0,0,0,0.8)';
      sprite.padding = 3;
      
      // Add outline effect if possible
      if (sprite.material) {
        sprite.material.userData = {
          outlineWidth: 0.1,
          outlineColor: '#000000'
        };
      }
      
      // Position the sprite at 0,0,0 in the group
      sprite.position.set(0, 0, 0);
      group.add(sprite);
      
      // Add a custom render function to position the sprite relative to the node
      group.onBeforeRender = function(renderer, scene, camera) {
        // Get node's world position
        const nodePosition = new THREE.Vector3(node.x, node.y, node.z);
        
        // Get camera position
        const cameraPosition = new THREE.Vector3().copy(camera.position);
        
        // Calculate direction vector from node to camera
        const direction = new THREE.Vector3().subVectors(cameraPosition, nodePosition).normalize();
        
        // Scale the offset based on node size
        const nodeSize = 12 * (node.val || 1);
        const offset = 0.55 * nodeSize;
        
        // Position the group in the direction of the camera
        group.position.copy(direction).multiplyScalar(offset);
        
        // Orient the text to face the camera
        sprite.position.y = 0.2 * nodeSize;
      };
      
      return group;
    }
    
    // Default to normal sphere rendering
    return null;
  });
  
  // Set node object extension to true to allow for both custom and default rendering
  graph.nodeThreeObjectExtend(true);
}

/**
 * Configure force simulation
 * @param {Object} graph - The 3D force graph instance
 */
function setupForceSimulation(graph) {
  // Get original charge strength
  const originalChargeStrength = store.get('originalChargeStrength');
  
  // Configure D3 forces
  graph
    .d3Force('link', d3.forceLink().id(d => d.id)
      .distance(link => 200 - 150 * (typeof link.strength === 'number' ? link.strength : 0.5))
      .strength(link => 2 * link.strength)
    )
    .d3Force('charge', d3.forceManyBody()
      .strength(originalChargeStrength)
      .distanceMax(300)
    )
    .d3Force('center', d3.forceCenter())
    .d3Force('collide', d3.forceCollide(node => 15 + 5 * (node.val || 1)));
}

/**
 * Set up bloom effect if available
 * @param {Object} graph - The 3D force graph instance
 */
function setupBloomEffect(graph) {
  if (typeof THREE !== 'undefined' && 
      typeof THREE.UnrealBloomPass !== 'undefined' && 
      typeof THREE.EffectComposer !== 'undefined') {
    
    console.log('Setting up bloom effect');
    
    // Create bloom pass with moderate settings
    const bloomPass = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8, // strength
      0.8, // radius
      0.2  // threshold
    );
    
    // Add to composer
    graph.postProcessingComposer().addPass(bloomPass);
    
    // Update state
    store.update({
      bloomPass,
      bloomEnabled: true
    });
    
    console.log('Bloom effect added successfully');
  } else {
    console.warn('THREE.UnrealBloomPass not available, skipping bloom effect');
    
    // Update state
    store.update({
      bloomEnabled: false
    });
  }
}

export default {
  initGraph
};