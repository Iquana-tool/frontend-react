/**
 * Focus Mode slice - manages focus mode for annotation
 * 
 * using the same useZoomToObject hook that refinement mode uses
 */
export const createFocusModeSlice = (set) => ({
  enterFocusMode: (objectId, objectMask) => set((state) => {
    state.focusMode.active = true;
    state.focusMode.objectId = objectId;
    state.focusMode.objectMask = objectMask;
    // Switch to AI assisted annotation tool when entering focus mode
    state.ui.currentTool = 'ai_annotation';
  }),
  
  // Deprecated: Use enterFocusMode + external zoom handling instead
  enterFocusModeWithZoom: (objectId, objectMask) => set((state) => {
    state.focusMode.active = true;
    state.focusMode.objectId = objectId;
    state.focusMode.objectMask = objectMask;
    // Switch to AI assisted annotation tool when entering focus mode
    state.ui.currentTool = 'ai_annotation';
    // Note: Zoom/pan should be handled externally using useZoomToObject
  }),
  
  exitFocusMode: () => set((state) => {
    state.focusMode.active = false;
    state.focusMode.objectId = null;
    state.focusMode.objectMask = null;
  }),
});

