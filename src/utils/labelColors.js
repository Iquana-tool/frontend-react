import {
  CLASS_PALETTE,
  CLASS_PALETTE_LIGHT,
  CLASS_PALETTE_DARK,
} from '../styles/theme';

// Re-exported under the label-domain names the rest of the app already uses.
// The values themselves live in styles/theme.js, which is also what emits the
// matching `--cls-N` variables — the two used to be maintained separately.
export const LABEL_COLORS = CLASS_PALETTE;

// Lighter variants for backgrounds and hover states
export const LABEL_COLORS_LIGHT = CLASS_PALETTE_LIGHT;

// Darker variants for text and borders
export const LABEL_COLORS_DARK = CLASS_PALETTE_DARK;

/**
 * Get color for a label by its ID or index
 * @param {number|string} labelId - The label ID or index
 * @param {string} variant - 'default', 'light', or 'dark'
 * @returns {string} Hex color code
 */
export const getLabelColor = (labelId, variant = 'default') => {
  const parsed = typeof labelId === 'string' ? parseInt(labelId, 10) : labelId;
  // Guard against NaN / negative / out-of-range ids so we never return undefined.
  const base = Number.isFinite(parsed) ? parsed : 1;
  const colorIndex = (((base - 1) % LABEL_COLORS.length) + LABEL_COLORS.length) % LABEL_COLORS.length;

  switch (variant) {
    case 'light':
      return LABEL_COLORS_LIGHT[colorIndex];
    case 'dark':
      return LABEL_COLORS_DARK[colorIndex];
    default:
      return LABEL_COLORS[colorIndex];
  }
};

/**
 * Get color for a label by its name (deterministic based on hash)
 * @param {string} labelName - The label name
 * @param {string} variant - 'default', 'light', or 'dark'
 * @returns {string} Hex color code
 */
export const getLabelColorByName = (labelName, variant = 'default') => {
  // Simple hash function to get consistent color for same name
  let hash = 0;
  for (let i = 0; i < labelName.length; i++) {
    hash = ((hash << 5) - hash + labelName.charCodeAt(i)) & 0xffffffff;
  }
  const index = Math.abs(hash) % LABEL_COLORS.length;
  
  switch (variant) {
    case 'light':
      return LABEL_COLORS_LIGHT[index];
    case 'dark':
      return LABEL_COLORS_DARK[index];
    default:
      return LABEL_COLORS[index];
  }
};

/**
 * Get the next available color for new labels
 * @param {Array} usedColors - Array of already used colors
 * @returns {string} Next available color
 */
export const getNextAvailableColor = (usedColors = []) => {
  return LABEL_COLORS.find(color => !usedColors.includes(color)) || LABEL_COLORS[0];
};

/**
 * Get contour colors for canvas drawing based on selection state and label
 * @param {boolean} isSelected - Whether the contour is selected
 * @param {number|string} labelId - The label ID for color assignment
 * @param {string} labelName - The label name (fallback if no ID)
 * @returns {Object} Object containing strokeStyle, fillStyle, and lineWidth
 */
export const getContourStyle = (isSelected, labelId, labelName) => {
  let baseColor;
  
  if (labelId) {
    baseColor = getLabelColor(labelId);
  } else if (labelName) {
    baseColor = getLabelColorByName(labelName);
  } else {
    baseColor = LABEL_COLORS[0]; // Default to first color
  }
  
  if (isSelected) {
    return {
      strokeStyle: baseColor,
      fillStyle: `${baseColor}66`, // 40% opacity
      lineWidth: 4,
      shadowColor: baseColor,
      shadowBlur: 8
    };
  } else {
    return {
      strokeStyle: baseColor,
      fillStyle: `${baseColor}33`, // 20% opacity
      lineWidth: 2,
      shadowColor: 'transparent',
      shadowBlur: 0
    };
  }
};

/**
 * Convert hex color to rgba with specified opacity
 * @param {string} hex - Hex color code
 * @param {number} opacity - Opacity value between 0 and 1
 * @returns {string} RGBA color string
 */
export const hexToRgba = (hex, opacity) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}; 