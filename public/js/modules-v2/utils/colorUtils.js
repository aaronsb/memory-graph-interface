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

  // Method 1: Simple RGB inversion (traditional complementary)
  const inverted = {
    r: 255 - r,
    g: 255 - g,
    b: 255 - b
  };
  
  // Method 2: HSL-based complementary (rotating hue by 180 degrees)
  const hsl = rgbToHsl(r, g, b);
  const complementaryHsl = {
    h: (hsl.h + 0.5) % 1.0, // Add 0.5 (180 degrees) to hue and wrap around
    s: hsl.s,
    l: hsl.l
  };
  const hslComplement = hslToRgb(complementaryHsl.h, complementaryHsl.s, complementaryHsl.l);
  
  // Method 3: Color wheel opposites (more visually striking)
  // Based on traditional color wheel pairs
  let wheelComplement;
  
  // Determine dominant color component
  if (r > g && r > b) {
    // Red dominant - complement is cyan-ish
    wheelComplement = { r: 0, g: Math.min(255, g + 100), b: Math.min(255, b + 150) };
  } else if (g > r && g > b) {
    // Green dominant - complement is magenta-ish
    wheelComplement = { r: Math.min(255, r + 150), g: 0, b: Math.min(255, b + 100) };
  } else {
    // Blue dominant - complement is yellow-ish
    wheelComplement = { r: Math.min(255, r + 150), g: Math.min(255, g + 150), b: 0 };
  }
  
  // Method 4: Semi-random complementary based on the primary color
  const randomOffset = Math.floor((r * g * b) % 3); // Deterministic "random" value 0-2
  const options = [
    // Option 1: Blue-magenta for warm colors, orange-yellow for cool colors
    (r > b) ? { r: r * 0.2, g: g * 0.2, b: Math.min(255, b * 3) } : { r: Math.min(255, r * 3), g: Math.min(255, g * 1.5), b: b * 0.2 },
    
    // Option 2: Cyan for reds, magenta for greens, yellow for blues
    { r: (g > r && g > b) ? Math.min(255, r * 2) : r * 0.2, 
      g: (r > g && r > b) ? Math.min(255, g * 2) : g * 0.2, 
      b: (r > b && g > b) ? Math.min(255, b * 2) : b * 0.2 },
      
    // Option 3: High contrast - boosting the lowest component while reducing others
    { r: r < Math.min(g, b) ? Math.min(255, r * 4) : r * 0.25,
      g: g < Math.min(r, b) ? Math.min(255, g * 4) : g * 0.25,
      b: b < Math.min(r, g) ? Math.min(255, b * 4) : b * 0.25 }
  ];
  
  // Choose the most visually distinctive option based on color analysis
  const colorBrightness = (r + g + b) / 3;
  const colorVariance = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
  
  // If color is very bright or very low variance, use the high contrast option
  if (colorBrightness > 200 || colorVariance < 50) {
    return options[2]; // High contrast option
  }
  
  // For colors with medium brightness or high variance, use the wheel complement
  if (colorBrightness > 100 || colorVariance > 150) {
    return wheelComplement;
  }
  
  // For other colors, use the semi-random option
  return options[randomOffset];
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

/**
 * Convert RGB to HSL
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {Object} - HSL components (h: 0-1, s: 0-1, l: 0-1)
 */
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return { h, s, l };
}

/**
 * Convert HSL to RGB
 * @param {number} h - Hue component (0-1)
 * @param {number} s - Saturation component (0-1)
 * @param {number} l - Lightness component (0-1)
 * @returns {Object} - RGB components (r, g, b: 0-255)
 */
export function hslToRgb(h, s, l) {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export default {
  parseRgba,
  rgbToRgba,
  getComplementaryColor,
  blendColors,
  adjustBrightness,
  rgbToHsl,
  hslToRgb
};