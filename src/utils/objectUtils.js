/**
 * Utility functions for object-related operations
 * Used for extracting IDs, labels, and other object properties
 */

/**
 * Extracts the contour ID from an object, falling back to the object ID if contour_id is not available
 * 
 * @param {Object} object - The object with potentially contour_id and id properties
 * @param {number|string} fallbackId - Optional fallback ID if object doesn't have id
 * @returns {number|string} - The contour ID or fallback
 */
export function getContourId(object, fallbackId = null) {
  if (!object) return fallbackId;
  return object.contour_id || object.id || fallbackId;
}

/**
 * Extracts label ID and name from a label object or value
 * Handles both object format { id, name } and primitive format (number/string)
 * 
 * @param {Object|number|string} label - The label value (object or primitive)
 * @returns {Object} - Object with id and name properties
 */
export function extractLabelInfo(label) {
  if (typeof label === 'object' && label !== null) {
    return {
      id: label.id,
      name: label.name || label.id,
    };
  }
  
  // Primitive format - use value as both id and name
  return {
    id: label,
    name: label,
  };
}

