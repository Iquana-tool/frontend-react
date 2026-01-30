import { getLabelColor, getLabelColorByName, LABEL_COLORS } from '../../utils/labelColors';

/**
 * Get color for an object based on its label, or fallback to ID-based color
 * @param {Object} object - Object with labelId, label, or labelName
 * @param {string|number} objectId - Object ID for stable color assignment (fallback for unlabeled objects)
 * @returns {string} Hex color code
 */
export const getObjectColor = (object, objectId) => {
  // If object has a labelId, use label-based color
  if (object.labelId) {
    return getLabelColor(object.labelId);
  }
  // If object has a label name (but no ID), use name-based color
  if (object.label && object.label !== 'Object') {
    return getLabelColorByName(object.label);
  }
  // Fallback to ID-based color for unlabeled objects using LABEL_COLORS for consistency
  // This ensures stable colors that don't change when other objects are removed
  const idHash = typeof objectId === 'string' 
    ? objectId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : objectId || 0;
  return LABEL_COLORS[Math.abs(idHash) % LABEL_COLORS.length];
};

