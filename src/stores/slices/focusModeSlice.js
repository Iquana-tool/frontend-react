import { calculateBoundingBox, calculateFocusTransformSimple } from '../../utils/geometryUtils';

/**
 * Focus Mode slice - manages focus mode for annotation
 */
export const createFocusModeSlice = (set) => ({
  enterFocusMode: (objectId, objectMask) => set((state) => {
    state.focusMode.active = true;
    state.focusMode.objectId = objectId;
    state.focusMode.objectMask = objectMask;
    // Switch to AI assisted annotation tool when entering focus mode
    state.ui.currentTool = 'ai_annotation';
  }),
  
  enterFocusModeWithZoom: (objectId, objectMask, imageDimensions, containerDimensions, renderedImageDimensions) => set((state) => {
    state.focusMode.active = true;
    state.focusMode.objectId = objectId;
    state.focusMode.objectMask = objectMask;
    // Switch to AI assisted annotation tool when entering focus mode
    state.ui.currentTool = 'ai_annotation';
    
    // Calculate and apply zoom/pan for focus
    if (objectMask && objectMask.points) {
      const boundingBox = calculateBoundingBox(objectMask.points);
      const focusTransform = calculateFocusTransformSimple(
        boundingBox, 
        imageDimensions, 
        containerDimensions, 
        renderedImageDimensions
      );
      
      // Set both zoom and pan
      state.images.zoomLevel = focusTransform.zoomLevel;
      state.images.panOffset = focusTransform.panOffset;
    }
  }),
  
  panZoomToObject: (objectMask, imageDimensions, containerDimensions, renderedImageDimensions) => set((state) => {
    if (objectMask && objectMask.points) {
      const boundingBox = calculateBoundingBox(objectMask.points);
      const focusTransform = calculateFocusTransformSimple(
        boundingBox, 
        imageDimensions, 
        containerDimensions, 
        renderedImageDimensions
      );
      
      state.images.zoomLevel = focusTransform.zoomLevel;
      state.images.panOffset = focusTransform.panOffset;
    }
  }),
  
  exitFocusMode: () => set((state) => {
    state.focusMode.active = false;
    state.focusMode.objectId = null;
    state.focusMode.objectMask = null;
  }),
});

