/**
 * Link (Edge) Utilities Module
 * 
 * Provides utilities for link/edge styling and appearance.
 */

import store from '../state/store.js';

/**
 * Calculate link width based on strength
 * Maps connection strength on an exponential curve from:
 * - 0.05 strength -> 1px (hairline)
 * - 0.2 strength -> 2px
 * - 0.5 strength -> 4px
 * - 0.8 strength -> 6px
 * - 1.0 strength -> 10px
 * 
 * @param {Object} link - Link object with strength property
 * @param {boolean} isHighlighted - Whether the link is highlighted
 * @returns {number} - Width in pixels
 */
export function calculateLinkWidth(link, isHighlighted = false) {
  // If link is highlighted, increase its width
  if (isHighlighted) {
    return 10; // Maximum width for highlighted links
  }
  
  // Get link strength, defaulting to 0.5 if not specified
  const strength = typeof link.strength === 'number' ? link.strength : 0.5;
  
  // For very weak connections (less than 0.05), use minimal width
  if (strength < 0.05) {
    return 0.5; // Thinner than hairline
  }
  
  // Use an exponential curve to make differences more pronounced
  // Square the normalized strength to create an exponential effect
  const normalizedStrength = Math.min(1, strength); // Ensure we don't exceed 1
  
  // Use a quadratic curve for more dramatic differences between weak and strong links
  // This gives us: 0.1->1.0px, 0.3->2.5px, 0.5->5.0px, 0.7->7.8px, 1.0->10px
  const width = Math.pow(normalizedStrength, 2) * 10;
  
  // Ensure minimum width for very weak but visible connections
  return Math.max(1, width);
}

/**
 * Calculate arrow length based on link strength
 * For better visual differentiation of strong vs weak links
 * 
 * @param {Object} link - Link object with strength property
 * @param {boolean} isHighlighted - Whether the link is highlighted
 * @returns {number} - Arrow length in pixels
 */
export function calculateArrowLength(link, isHighlighted = false) {
  // For highlighted links, use prominent arrows
  if (isHighlighted) {
    return 8;
  }
  
  // Get link strength, defaulting to 0.5 if not specified
  const strength = typeof link.strength === 'number' ? link.strength : 0.5;
  
  // Enhanced arrow length with more dramatic scaling:
  // - Anything below 0.1: Minimum arrow size (1px)
  // - Strength 0.1-0.5: Small to medium arrows (2-5px)
  // - Strength 0.5-1.0: Medium to large arrows (5-10px)
  
  if (strength < 0.05) {
    return 0; // No visible arrow for extremely weak links
  } else if (strength < 0.1) {
    return 2; // Tiny arrow for very weak links
  } else if (strength < 0.5) {
    // Linear scale from 2-5 arrow length
    return 2 + ((strength - 0.1) / 0.4) * 3;
  } else {
    // Slightly exponential scale from 5-10 for stronger links
    const normalizedStrength = (strength - 0.5) / 0.5; // 0-1 range
    return 5 + Math.pow(normalizedStrength, 1.2) * 5;
  }
}

/**
 * Get the relative position for the arrow along the link
 * Places arrows closer to the target for stronger links
 * 
 * @param {Object} link - Link object with strength property
 * @returns {number} - Relative position (0-1), where 1 is at the target node
 */
export function calculateArrowPosition(link) {
  const strength = typeof link.strength === 'number' ? link.strength : 0.5;
  
  // Position the arrow:
  // - Weak links (0.1-0.3): Around 70-80% along the link
  // - Medium links (0.3-0.7): Around 80-90% along the link
  // - Strong links (0.7-1.0): Around 90-95% along the link
  // This creates a subtle visual cue that stronger connections have their arrows
  // closer to the target node
  
  if (strength < 0.3) {
    return 0.7 + (strength / 0.3) * 0.1; // 70-80%
  } else if (strength < 0.7) {
    return 0.8 + ((strength - 0.3) / 0.4) * 0.1; // 80-90%
  } else {
    return 0.9 + ((strength - 0.7) / 0.3) * 0.05; // 90-95%
  }
}

export default {
  calculateLinkWidth,
  calculateArrowLength,
  calculateArrowPosition
};