import { useCallback } from 'react';
import annotationSession from '../services/annotationSession';
import { useZoomToObject } from './useZoomToObject';
import { calculateRenderedImageDimensions, getCanvasContainer } from '../utils/canvasUtils';
import { getContourId } from '../utils/objectUtils';

/**
 * Shared hook for entering refinement mode
 * Handles refinement mode entry, backend communication, and zoom/pan to object
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.enterRefinementMode - Function to enter refinement mode in store
 * @param {Function} options.setCurrentTool - Function to set current tool
 * @param {Function} options.exitFocusMode - Function to exit focus mode
 * @param {boolean} options.focusModeActive - Whether focus mode is currently active
 * @param {Object} options.imageObject - The image object with width/height
 * @param {HTMLElement|React.RefObject} options.containerRef - Reference to container element
 * @param {Object} options.zoomOptions - Options for zoom hook (marginPct, maxZoom, minZoom, etc.)
 * @returns {Function} - Function to enter refinement mode for an object
 */
export function useRefinementMode({
  enterRefinementMode,
  setCurrentTool,
  exitFocusMode,
  focusModeActive,
  imageObject,
  containerRef,
  zoomOptions = {
    marginPct: 0.2,
    maxZoom: 4,
    minZoom: 1,
  },
}) {
  const { zoomToObject } = useZoomToObject(zoomOptions);

  const enterRefinementModeForObject = useCallback(async (object) => {
    if (!object) {
      throw new Error('Object is required');
    }

    const contourId = getContourId(object);

    try {
      // Exit focus mode if active (refinement mode replaces focus mode)
      if (focusModeActive && exitFocusMode) {
        // Send unfocus message to backend
        if (annotationSession.isReady()) {
          await annotationSession.unfocusImage();
        }
        exitFocusMode();
      }

      // Send refinement selection to backend
      await annotationSession.selectRefinementObject(contourId);

      // Enter refinement mode in the store
      enterRefinementMode(object.id, contourId);

      // Switch to AI annotation tool
      setCurrentTool('ai_annotation');

      // Zoom and pan to the object (similar to focus mode)
      if (imageObject && object.x && object.y && object.x.length > 0) {
        // Try to get container from ref first, then fallback to querySelector
        let container = getCanvasContainer(containerRef);
        if (!container) {
          container = document.querySelector('.relative.overflow-hidden');
        }
        
        if (container) {
          const containerWidth = container.offsetWidth;
          const containerHeight = container.offsetHeight;

          if (containerWidth && containerHeight) {
            const imageDimensions = {
              width: imageObject.width,
              height: imageObject.height,
            };

            const containerDimensions = {
              width: containerWidth,
              height: containerHeight,
            };

            // Calculate rendered image dimensions (object-contain sizing)
            const renderedImageDimensions = calculateRenderedImageDimensions(
              imageObject,
              containerWidth,
              containerHeight
            );

            // Use the zoom hook to zoom/pan to the object
            zoomToObject(
              object, // Object with x, y arrays
              imageDimensions,
              containerDimensions,
              renderedImageDimensions,
              { animateMs: 300, immediate: false }
            );
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to enter refinement mode: ${error.message || 'Unknown error'}`);
    }
  }, [
    enterRefinementMode,
    setCurrentTool,
    exitFocusMode,
    focusModeActive,
    imageObject,
    containerRef,
    zoomToObject,
  ]);

  return enterRefinementModeForObject;
}

