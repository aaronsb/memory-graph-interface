/**
 * Domain Color Management Module
 * 
 * Handles initialization and management of domain colors.
 */

/**
 * Initialize domain colors
 * Creates the domainColors Map and color palette if they don't exist
 */
export function initializeDomainColors() {
  // Only initialize if not already set
  if (!window.domainColors) {
    window.domainColors = new Map();
    window.colorIndex = 0;
    window.domainColorPalette = [
      'rgba(66, 133, 244, 0.85)',  // Google Blue
      'rgba(219, 68, 55, 0.85)',   // Google Red
      'rgba(244, 180, 0, 0.85)',   // Google Yellow
      'rgba(15, 157, 88, 0.85)',   // Google Green
      'rgba(171, 71, 188, 0.85)',  // Purple
      'rgba(255, 87, 34, 0.85)',   // Deep Orange
      'rgba(3, 169, 244, 0.85)',   // Light Blue
      'rgba(0, 150, 136, 0.85)',   // Teal
      'rgba(255, 152, 0, 0.85)',   // Orange
      'rgba(156, 39, 176, 0.85)',  // Purple
      'rgba(233, 30, 99, 0.85)',   // Pink
      'rgba(33, 150, 243, 0.85)',  // Blue
      'rgba(76, 175, 80, 0.85)',   // Green
      'rgba(255, 193, 7, 0.85)',   // Amber
      'rgba(121, 85, 72, 0.85)',   // Brown
      'rgba(96, 125, 139, 0.85)'   // Blue Grey
    ];
  }
}

/**
 * Assign a color to a domain
 * @param {string} domain - The domain to assign a color to
 * @returns {string} - The assigned color
 */
export function assignDomainColor(domain) {
  // Initialize if needed
  initializeDomainColors();
  
  // If domain already has a color, return it
  if (window.domainColors.has(domain)) {
    return window.domainColors.get(domain);
  }
  
  // Assign a new color
  const colorIdx = window.colorIndex % window.domainColorPalette.length;
  const color = window.domainColorPalette[colorIdx];
  window.domainColors.set(domain, color);
  window.colorIndex++;
  
  console.log(`[Color] Assigned color ${color} to domain: ${domain}`);
  
  return color;
}

/**
 * Assign colors to all domains that don't have one yet
 * @param {Array} domains - Array of domain names
 */
export function assignColorsToAllDomains(domains) {
  domains.forEach(domain => {
    if (!window.domainColors?.has(domain)) {
      assignDomainColor(domain);
    }
  });
}

/**
 * Transfer color from one domain to another
 * @param {string} fromDomain - Domain to take color from
 * @param {string} toDomain - Domain to assign color to
 */
export function transferDomainColor(fromDomain, toDomain) {
  // Initialize if needed
  initializeDomainColors();
  
  // Transfer the color if from domain has one
  if (window.domainColors.has(fromDomain)) {
    const color = window.domainColors.get(fromDomain);
    window.domainColors.set(toDomain, color);
    window.domainColors.delete(fromDomain);
    console.log(`[Color] Transferred color ${color} from ${fromDomain} to ${toDomain}`);
  } else {
    // Otherwise assign a new color to the target domain
    assignDomainColor(toDomain);
  }
}

/**
 * Remove color from a domain
 * @param {string} domain - Domain to remove color from
 */
export function removeDomainColor(domain) {
  if (window.domainColors && window.domainColors.has(domain)) {
    window.domainColors.delete(domain);
    console.log(`[Color] Removed color from domain: ${domain}`);
  }
}

export default {
  initializeDomainColors,
  assignDomainColor,
  assignColorsToAllDomains,
  transferDomainColor,
  removeDomainColor
};