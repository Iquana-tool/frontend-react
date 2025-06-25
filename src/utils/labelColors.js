// Consistent color palette for labels across the application
export const LABEL_COLORS = [
  '#3b82f6', // blue-500
  '#f97316', // orange-500
  '#22c55e', // green-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f43f5e', // rose-500
];

// Lighter variants for backgrounds and hover states
export const LABEL_COLORS_LIGHT = [
  '#dbeafe', // blue-100
  '#fed7aa', // orange-100
  '#dcfce7', // green-100
  '#f3e8ff', // violet-100
  '#fee2e2', // red-100
  '#cffafe', // cyan-100
  '#fef3c7', // amber-100
  '#fce7f3', // pink-100
  '#ecfccb', // lime-100
  '#e0e7ff', // indigo-100
  '#ccfbf1', // teal-100
  '#ffe4e6', // rose-100
];

// Darker variants for text and borders
export const LABEL_COLORS_DARK = [
  '#1e40af', // blue-800
  '#ea580c', // orange-800
  '#166534', // green-800
  '#5b21b6', // violet-800
  '#b91c1c', // red-800
  '#155e75', // cyan-800
  '#92400e', // amber-800
  '#be185d', // pink-800
  '#365314', // lime-800
  '#3730a3', // indigo-800
  '#134e4a', // teal-800
  '#be123c', // rose-800
];

/**
 * Get color for a label by its ID or index
 * @param {number|string} labelId - The label ID or index
 * @param {string} variant - 'default', 'light', or 'dark'
 * @returns {string} Hex color code
 */
export const getLabelColor = (labelId, variant = 'default') => {
  const index = typeof labelId === 'string' ? parseInt(labelId) : labelId;
  const colorIndex = (index - 1) % LABEL_COLORS.length;
  
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