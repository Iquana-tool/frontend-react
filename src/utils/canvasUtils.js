/**
 * Utility functions for canvas-related calculations
 * Used for calculating rendered image dimensions and other canvas operations
 */

/**
 * Calculates the rendered image dimensions for object-contain sizing
 * This is used when an image is displayed in a container with object-contain CSS
 * 
 * @param {Object} imageObject - The image object with width and height properties
 * @param {number} containerWidth - Width of the container
 * @param {number} containerHeight - Height of the container
 * @returns {Object} - Object with width, height, x, y properties representing rendered dimensions
 */
export function calculateRenderedImageDimensions(imageObject, containerWidth, containerHeight) {
  if (!imageObject || !imageObject.width || !imageObject.height) {
    return { width: 0, height: 0, x: 0, y: 0 };
  }

  const imageAspect = imageObject.width / imageObject.height;
  const containerAspect = containerWidth / containerHeight;

  let renderedWidth, renderedHeight, renderedX, renderedY;

  if (imageAspect > containerAspect) {
    // Image is wider than container - fit to width
    renderedWidth = containerWidth;
    renderedHeight = containerWidth / imageAspect;
    renderedX = 0;
    renderedY = (containerHeight - renderedHeight) / 2;
  } else {
    // Image is taller than container - fit to height
    renderedWidth = containerHeight * imageAspect;
    renderedHeight = containerHeight;
    renderedX = (containerWidth - renderedWidth) / 2;
    renderedY = 0;
  }

  return {
    width: renderedWidth,
    height: renderedHeight,
    x: renderedX,
    y: renderedY,
  };
}

/**
 * Gets the container element for the canvas
 * @param {HTMLElement|React.RefObject} ref - Reference to menu or component element
 * @returns {HTMLElement|null} - The container element or null if not found
 */
export function getCanvasContainer(ref) {
  if (!ref) return null;
  
  // Handle React ref object
  const element = ref.current || ref;
  if (!element) return null;
  
  // Try parent element first (for context menu)
  if (element.parentElement) {
    return element.parentElement;
  }
  
  // Fallback to querySelector for direct container lookup
  return document.querySelector('.relative.overflow-hidden');
}

