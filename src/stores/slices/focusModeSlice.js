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
    // Focus mode is for annotating inside the object, so a tool that cannot
    // annotate (selection, pan, zoom, a calibration measurement) gives way to
    // the prompt canvas. Manual drawing is left alone: drawing a child contour
    // by hand inside a focused parent is exactly what ManualDrawCanvas nests
    // under `focusedParentContourId`, and forcing 'ai_annotation' here took
    // that away the moment the user focused the parent.
    if (state.ui.currentTool !== 'manual_drawing') {
      state.ui.currentTool = 'ai_annotation';
    }
  }),
  
  // Deprecated: Use enterFocusMode + external zoom handling instead
  enterFocusModeWithZoom: (objectId, objectMask) => set((state) => {
    state.focusMode.active = true;
    state.focusMode.objectId = objectId;
    state.focusMode.objectMask = objectMask;
    // Focus mode is for annotating inside the object, so a tool that cannot
    // annotate (selection, pan, zoom, a calibration measurement) gives way to
    // the prompt canvas. Manual drawing is left alone: drawing a child contour
    // by hand inside a focused parent is exactly what ManualDrawCanvas nests
    // under `focusedParentContourId`, and forcing 'ai_annotation' here took
    // that away the moment the user focused the parent.
    if (state.ui.currentTool !== 'manual_drawing') {
      state.ui.currentTool = 'ai_annotation';
    }
    // Note: Zoom/pan should be handled externally using useZoomToObject
  }),
  
  exitFocusMode: () => set((state) => {
    state.focusMode.active = false;
    state.focusMode.objectId = null;
    state.focusMode.objectMask = null;
  }),
});

