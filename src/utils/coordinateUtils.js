/**
 * Coordinate Conversion Utilities
 * 
 * Handles conversion between pixel coordinates and normalized coordinates (0-1 range)
 * 
 * USAGE PATTERNS:
 * 
 * 1. FRONTEND → BACKEND (pixelToNormalized):
 *    - Canvas components work with pixel coordinates
 *    - Store prompts in pixel coordinates  
 *    - Convert to normalized before sending to WebSocket/API
 * 
 * 2. BACKEND → FRONTEND (normalizedToPixel):
 *    - Backend returns normalized coordinates
 *    - Convert to pixels for canvas rendering
 *    - Used for displaying objects, masks, etc.
 * 
 * 3. CANVAS RENDERING:
 *    - All canvas operations use pixel coordinates
 *    - Mouse events provide pixel coordinates
 *    - Visual elements positioned in pixel space
 */

/**
 * Converts pixel coordinates to normalized coordinates (0-1 range)
 * @param {number} pixelX - X coordinate in pixels
 * @param {number} pixelY - Y coordinate in pixels
 * @param {number} imageWidth - Image width in pixels
 * @param {number} imageHeight - Image height in pixels
 * @returns {Object} Normalized coordinates {x, y}
 */
export const pixelToNormalized = (pixelX, pixelY, imageWidth, imageHeight) => {
  if (!imageWidth || !imageHeight) {
    console.warn('Invalid image dimensions for coordinate conversion');
    return { x: 0, y: 0 };
  }

  return {
    x: Math.max(0, Math.min(1, pixelX / imageWidth)),
    y: Math.max(0, Math.min(1, pixelY / imageHeight)),
  };
};

/**
 * Converts normalized coordinates to pixel coordinates
 * @param {number} normX - Normalized X coordinate (0-1)
 * @param {number} normY - Normalized Y coordinate (0-1)
 * @param {number} imageWidth - Image width in pixels
 * @param {number} imageHeight - Image height in pixels
 * @returns {Object} Pixel coordinates {x, y}
 */
export const normalizedToPixel = (normX, normY, imageWidth, imageHeight) => {
  if (!imageWidth || !imageHeight) {
    console.warn('Invalid image dimensions for coordinate conversion');
    return { x: 0, y: 0 };
  }

  return {
    x: Math.round(normX * imageWidth),
    y: Math.round(normY * imageHeight),
  };
};

/**
 * Converts an array of pixel coordinates to normalized coordinates
 * @param {Array<number>} xArray - Array of X coordinates in pixels
 * @param {Array<number>} yArray - Array of Y coordinates in pixels
 * @param {number} imageWidth - Image width in pixels
 * @param {number} imageHeight - Image height in pixels
 * @returns {Object} Arrays of normalized coordinates {x: Array, y: Array}
 */
export const pixelArrayToNormalized = (xArray, yArray, imageWidth, imageHeight) => {
  if (!xArray || !yArray || xArray.length !== yArray.length) {
    console.warn('Invalid coordinate arrays');
    return { x: [], y: [] };
  }

  return {
    x: xArray.map(x => Math.max(0, Math.min(1, x / imageWidth))),
    y: yArray.map(y => Math.max(0, Math.min(1, y / imageHeight))),
  };
};

/**
 * Converts arrays of normalized coordinates to pixel coordinates
 * @param {Array<number>} xArray - Array of normalized X coordinates (0-1)
 * @param {Array<number>} yArray - Array of normalized Y coordinates (0-1)
 * @param {number} imageWidth - Image width in pixels
 * @param {number} imageHeight - Image height in pixels
 * @returns {Object} Arrays of pixel coordinates {x: Array, y: Array}
 */
export const normalizedArrayToPixel = (xArray, yArray, imageWidth, imageHeight) => {
  if (!xArray || !yArray || xArray.length !== yArray.length) {
    console.warn('Invalid coordinate arrays');
    return { x: [], y: [] };
  }

  return {
    x: xArray.map(x => Math.round(x * imageWidth)),
    y: yArray.map(y => Math.round(y * imageHeight)),
  };
};

/**
 * Converts a bounding box from pixel to normalized coordinates
 * @param {Object} box - Box with pixel coordinates {min_x, min_y, max_x, max_y}
 * @param {number} imageWidth - Image width in pixels
 * @param {number} imageHeight - Image height in pixels
 * @returns {Object} Normalized box coordinates
 */
export const boxPixelToNormalized = (box, imageWidth, imageHeight) => {
  return {
    min_x: Math.max(0, Math.min(1, box.min_x / imageWidth)),
    min_y: Math.max(0, Math.min(1, box.min_y / imageHeight)),
    max_x: Math.max(0, Math.min(1, box.max_x / imageWidth)),
    max_y: Math.max(0, Math.min(1, box.max_y / imageHeight)),
  };
};

/**
 * Converts a bounding box from normalized to pixel coordinates
 * @param {Object} box - Box with normalized coordinates {min_x, min_y, max_x, max_y}
 * @param {number} imageWidth - Image width in pixels
 * @param {number} imageHeight - Image height in pixels
 * @returns {Object} Pixel box coordinates
 */
export const boxNormalizedToPixel = (box, imageWidth, imageHeight) => {
  return {
    min_x: Math.round(box.min_x * imageWidth),
    min_y: Math.round(box.min_y * imageHeight),
    max_x: Math.round(box.max_x * imageWidth),
    max_y: Math.round(box.max_y * imageHeight),
  };
};

/**
 * Validates if coordinates are in normalized range (0-1)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if coordinates are normalized
 */
export const isNormalized = (x, y) => {
  return x >= 0 && x <= 1 && y >= 0 && y <= 1;
};

/**
 * Clamps a value between 0 and 1
 * @param {number} value - Value to clamp
 * @returns {number} Clamped value
 */
export const clampNormalized = (value) => {
  return Math.max(0, Math.min(1, value));
};


