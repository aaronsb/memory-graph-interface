/**
 * Color Utilities Module
 * 
 * Provides utilities for color manipulation and processing.
 */

/**
 * Parse an RGBA color string into its components
 * @param {string} rgbaColor - RGBA color string (rgba(r,g,b,a))
 * @returns {Object} - Object with r, g, b, a components
 */
export function parseRgba(rgbaColor) {
  if (!rgbaColor || typeof rgbaColor !== 'string') {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  
  // Extract RGB components from rgba string
  const components = rgbaColor.replace('rgba(', '').replace(')', '').split(',');
  return {
    r: parseInt(components[0].trim()),
    g: parseInt(components[1].trim()),
    b: parseInt(components[2].trim()),
    a: parseFloat(components[3] || 1)
  };
}

/**
 * Convert RGB object to RGBA string
 * @param {Object} rgb - RGB object with r, g, b properties
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} - RGBA color string
 */
export function rgbToRgba(rgb, alpha = 0.85) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Get the complementary color of an RGBA color
 * @param {string} rgbaColor - RGBA color string
 * @returns {Object} - RGB components of the complementary color
 */
export function getComplementaryColor(rgbaColor) {
  const { r, g, b } = parseRgba(rgbaColor);
  
  // Calculate complementary color (255 - original value)
  return {
    r: 255 - r,
    g: 255 - g,
    b: 255 - b
  };
}

/**
 * Blend two colors based on a mix factor
 * @param {string|Object} baseColor - Base color (RGBA string or RGB object)
 * @param {string|Object} mixColor - Mix color (RGBA string or RGB object)
 * @param {number} factor - Mix factor from 0 to 1
 * @param {number} alpha - Alpha value for the result
 * @returns {string} - Resulting RGBA color string
 */
export function blendColors(baseColor, mixColor, factor, alpha = 0.85) {
  // Parse colors if they are strings
  const base = typeof baseColor === 'string' ? parseRgba(baseColor) : baseColor;
  const mix = typeof mixColor === 'string' ? parseRgba(mixColor) : mixColor;
  
  // Ensure factor is between 0 and 1
  const mixFactor = Math.max(0, Math.min(1, factor));
  
  // Linear interpolation between colors
  const r = Math.round(base.r + (mix.r - base.r) * mixFactor);
  const g = Math.round(base.g + (mix.g - base.g) * mixFactor);
  const b = Math.round(base.b + (mix.b - base.b) * mixFactor);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Brighten or darken a color
 * @param {string} rgbaColor - RGBA color string
 * @param {number} factor - Positive to brighten, negative to darken
 * @returns {string} - Resulting RGBA color string
 */
export function adjustBrightness(rgbaColor, factor) {
  const { r, g, b, a } = parseRgba(rgbaColor);
  
  const adjust = (value) => {
    if (factor > 0) {
      // Brighten: linear interpolation towards white
      return Math.round(value + (255 - value) * factor);
    } else {
      // Darken: linear interpolation towards black
      return Math.round(value * (1 + factor));
    }
  };
  
  return `rgba(${adjust(r)}, ${adjust(g)}, ${adjust(b)}, ${a})`;
}

export default {
  parseRgba,
  rgbToRgba,
  getComplementaryColor,
  blendColors,
  adjustBrightness
};