/**
 * Custom Links Module
 * 
 * Provides custom THREE.js objects for rendering links with advanced visual styles.
 */

import store from '../../state/store.js';

/**
 * Create a custom link between nodes
 * @param {Object} link - Link data object
 * @param {Object} start - Start position {x,y,z}
 * @param {Object} end - End position {x,y,z}
 * @param {Object} options - Customization options
 * @returns {THREE.Object3D} - THREE.js object for the link
 */
export function createGridStyleLink(link, start, end, options = {}) {
  // Default options
  const config = {
    mainColor: options.mainColor || 0x444466, // Main color
    lineWidth: options.lineWidth || 1.5, // Width of the line
    showArrow: options.showArrow !== false, // Whether to show arrow
    arrowLength: options.arrowLength || 7, // Length of the arrow
    arrowPosition: options.arrowPosition || 0.85, // Position along the link (0-1)
    arrowColor: options.arrowColor || 0x8888ff, // Color of the arrow
    curved: options.curved === true // Whether to use curved lines
  };

  // Check if THREE is available
  if (typeof THREE === 'undefined') {
    console.error('THREE.js is not available. Cannot create custom link.');
    return null;
  }

  // Calculate the direction vector
  const direction = {
    x: end.x - start.x,
    y: end.y - start.y,
    z: end.z - start.z
  };

  // Calculate the length of the link
  const length = Math.sqrt(
    direction.x * direction.x + 
    direction.y * direction.y + 
    direction.z * direction.z
  );

  // Create a parent object to hold the line and arrow
  const linkObject = new THREE.Group();

  // Calculate the arrow position if needed
  const arrowStart = config.showArrow ? {
    x: start.x + direction.x * config.arrowPosition,
    y: start.y + direction.y * config.arrowPosition,
    z: start.z + direction.z * config.arrowPosition
  } : null;

  // Create a solid line for the entire link (or up to the arrow if it exists)
  let lineEnd;
  if (config.showArrow) {
    lineEnd = arrowStart;
  } else {
    lineEnd = end;
  }

  // Create the main line geometry
  let geometry;
  
  if (config.curved && length > 20) {
    // For curved lines, use a curved path with control points
    const midPoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2 + length * 0.2, // Curve upward
      z: (start.z + end.z) / 2
    };
    
    // Create a curved path
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(start.x, start.y, start.z),
      new THREE.Vector3(midPoint.x, midPoint.y, midPoint.z),
      new THREE.Vector3(lineEnd.x, lineEnd.y, lineEnd.z)
    );
    
    // Create geometry from the curve
    geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
  } else {
    // Create a straight line geometry
    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      start.x, start.y, start.z,
      lineEnd.x, lineEnd.y, lineEnd.z
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }
  
  // Create line material with solid color
  const material = new THREE.LineBasicMaterial({
    color: config.mainColor,
    linewidth: config.lineWidth,
    transparent: true,
    opacity: 0.8
  });
  
  // Create the line
  const line = new THREE.Line(geometry, material);
  linkObject.add(line);
  
  // Add an arrow if configured
  if (config.showArrow && config.arrowLength > 0) {
    // Calculate arrow direction (normalized)
    const arrowDir = {
      x: direction.x / length,
      y: direction.y / length,
      z: direction.z / length
    };
    
    // The arrow's end point
    const arrowEnd = {
      x: arrowStart.x + arrowDir.x * config.arrowLength,
      y: arrowStart.y + arrowDir.y * config.arrowLength,
      z: arrowStart.z + arrowDir.z * config.arrowLength
    };
    
    // Create arrowhead (cone)
    const arrowheadSize = config.arrowLength * 0.3;
    const arrowheadGeometry = new THREE.ConeGeometry(arrowheadSize * 0.5, arrowheadSize, 8);
    const arrowheadMaterial = new THREE.MeshBasicMaterial({
      color: config.arrowColor,
      transparent: true,
      opacity: 0.9
    });
    
    const arrowhead = new THREE.Mesh(arrowheadGeometry, arrowheadMaterial);
    
    // Position and orient the arrowhead
    arrowhead.position.set(arrowEnd.x, arrowEnd.y, arrowEnd.z);
    
    // Calculate rotation to point along the link direction
    const arrowQuaternion = new THREE.Quaternion();
    const upVector = new THREE.Vector3(0, 1, 0);
    const dirVector = new THREE.Vector3(arrowDir.x, arrowDir.y, arrowDir.z);
    
    // Rotate to align with direction
    arrowQuaternion.setFromUnitVectors(upVector, dirVector);
    arrowhead.setRotationFromQuaternion(arrowQuaternion);
    
    // Add to link object
    linkObject.add(arrowhead);
  }
  
  // Store link data for interaction
  linkObject.userData = {
    linkData: link,
    type: 'custom-link',
    start,
    end,
    hasArrow: config.showArrow,
    arrowPosition: config.arrowPosition,
    arrowLength: config.arrowLength,
    curved: config.curved
  };
  
  return linkObject;
}

/**
 * Update the position of a custom link
 * @param {Object} linkObject - The link object to update 
 * @param {Object} start - New start position {x,y,z}
 * @param {Object} end - New end position {x,y,z}
 */
export function updateGridStyleLink(linkObject, start, end) {
  if (!linkObject || !linkObject.children || linkObject.children.length === 0) {
    return;
  }
  
  // Get link data and options from userData
  const userData = linkObject.userData || {};
  const link = userData.linkData || {};
  const hasArrow = userData.hasArrow || false;
  const arrowPosition = userData.arrowPosition || 0.85;
  const arrowLength = userData.arrowLength || 7;
  const curved = userData.curved || false;
  
  // Calculate the direction vector
  const direction = {
    x: end.x - start.x,
    y: end.y - start.y,
    z: end.z - start.z
  };
  
  // Calculate length
  const length = Math.sqrt(
    direction.x * direction.x + 
    direction.y * direction.y + 
    direction.z * direction.z
  );
  
  // Calculate the arrow position if needed
  const arrowStart = hasArrow ? {
    x: start.x + direction.x * arrowPosition,
    y: start.y + direction.y * arrowPosition,
    z: start.z + direction.z * arrowPosition
  } : null;

  // Determine the end point for the main line
  let lineEnd;
  if (hasArrow) {
    lineEnd = arrowStart;
  } else {
    lineEnd = end;
  }
  
  // Update the main line (first child)
  const line = linkObject.children[0];
  if (line && line.geometry) {
    if (curved && length > 20) {
      // Update curved line
      const midPoint = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2 + length * 0.2, // Curve upward
        z: (start.z + end.z) / 2
      };
      
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(start.x, start.y, start.z),
        new THREE.Vector3(midPoint.x, midPoint.y, midPoint.z),
        new THREE.Vector3(lineEnd.x, lineEnd.y, lineEnd.z)
      );
      
      // Update geometry from the curve
      line.geometry.dispose();
      line.geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(20));
    } else {
      // Update straight line
      const positions = new Float32Array([
        start.x, start.y, start.z,
        lineEnd.x, lineEnd.y, lineEnd.z
      ]);
      
      line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      line.geometry.attributes.position.needsUpdate = true;
    }
  }
  
  // Update arrowhead if present
  if (hasArrow && linkObject.children.length > 1) {
    const arrowhead = linkObject.children[1];
    
    // Calculate arrow direction (normalized)
    const arrowDir = {
      x: direction.x / length,
      y: direction.y / length,
      z: direction.z / length
    };
    
    // The arrow's end point
    const arrowEnd = {
      x: arrowStart.x + arrowDir.x * arrowLength,
      y: arrowStart.y + arrowDir.y * arrowLength,
      z: arrowStart.z + arrowDir.z * arrowLength
    };
    
    // Update arrowhead position and orientation
    if (arrowhead) {
      arrowhead.position.set(arrowEnd.x, arrowEnd.y, arrowEnd.z);
      
      // Calculate rotation to point along the link direction
      const arrowQuaternion = new THREE.Quaternion();
      const upVector = new THREE.Vector3(0, 1, 0);
      const dirVector = new THREE.Vector3(arrowDir.x, arrowDir.y, arrowDir.z);
      
      // Rotate to align with direction
      arrowQuaternion.setFromUnitVectors(upVector, dirVector);
      arrowhead.setRotationFromQuaternion(arrowQuaternion);
    }
  }
  
  // Update userData
  linkObject.userData.start = start;
  linkObject.userData.end = end;
}

export default {
  createGridStyleLink,
  updateGridStyleLink
};