/**
 * AI Annotation slice - manages AI annotation prompts and undo/redo
 */
export const createAIAnnotationSlice = (set) => ({
  addPointPrompt: (x, y, label) => set((state) => {
    // Save current state for undo
    const currentPrompts = [...state.aiAnnotation.prompts];
    state.aiAnnotation.undoStack = state.aiAnnotation.undoStack || [];
    state.aiAnnotation.undoStack.push(currentPrompts);
    
    // Clear redo stack (new action invalidates redo)
    state.aiAnnotation.redoStack = [];
    
    // Add new prompt
    state.aiAnnotation.prompts.push({
      id: `${Date.now()}-${Math.random()}`,
      type: 'point',
      coords: { x, y },
      label, // 'positive' or 'negative'
    });
  }),
  
  addPolygonPrompt: (points, options = {}) => set((state) => {
    // points: array of { x, y } in image pixel coordinates.
    // Used for both polygon (clicked vertices) and freehand (traced path)
    // prompts; `freehand` distinguishes them for rendering/labelling only.
    if (!Array.isArray(points) || points.length < 3) {
      return;
    }

    // Save current state for undo
    const currentPrompts = [...state.aiAnnotation.prompts];
    state.aiAnnotation.undoStack = state.aiAnnotation.undoStack || [];
    state.aiAnnotation.undoStack.push(currentPrompts);

    // Clear redo stack (new action invalidates redo)
    state.aiAnnotation.redoStack = [];

    state.aiAnnotation.prompts.push({
      id: `${Date.now()}-${Math.random()}`,
      type: 'polygon',
      freehand: !!options.freehand,
      coords: {
        points: points.map((p) => ({ x: p.x, y: p.y })),
      },
    });
  }),

  setPromptMode: (mode) => set((state) => {
    state.aiAnnotation.promptMode = mode;
  }),

  setManualDrawMode: (mode) => set((state) => {
    state.aiAnnotation.manualDrawMode = mode;
  }),

  addBoxPrompt: (x1, y1, x2, y2) => set((state) => {
    // Save current state for undo
    const currentPrompts = [...state.aiAnnotation.prompts];
    state.aiAnnotation.undoStack = state.aiAnnotation.undoStack || [];
    state.aiAnnotation.undoStack.push(currentPrompts);
    
    // Clear redo stack (new action invalidates redo)
    state.aiAnnotation.redoStack = [];
    
    // Add new box prompt
    state.aiAnnotation.prompts.push({
      id: `${Date.now()}-${Math.random()}`,
      type: 'box',
      coords: { 
        x1: Math.min(x1, x2), 
        y1: Math.min(y1, y2), 
        x2: Math.max(x1, x2), 
        y2: Math.max(y1, y2) 
      },
    });
  }),
  
  removeLastPrompt: () => set((state) => {
    if (state.aiAnnotation.prompts.length > 0) {
      // Save current state for undo
      const currentPrompts = [...state.aiAnnotation.prompts];
      state.aiAnnotation.undoStack = state.aiAnnotation.undoStack || [];
      state.aiAnnotation.undoStack.push(currentPrompts);
      
      // Clear redo stack (new action invalidates redo)
      state.aiAnnotation.redoStack = [];
      
      // Remove last prompt
      state.aiAnnotation.prompts.pop();
    }
  }),
  
  clearAllPrompts: () => set((state) => {
    // Save current state for undo
    const currentPrompts = [...state.aiAnnotation.prompts];
    state.aiAnnotation.undoStack = state.aiAnnotation.undoStack || [];
    state.aiAnnotation.undoStack.push(currentPrompts);
    
    // Clear redo stack (new action invalidates redo)
    state.aiAnnotation.redoStack = [];
    
    // Clear all prompts
    state.aiAnnotation.prompts = [];
    state.aiAnnotation.activePreview = null;
  }),
  
  /**
   * Clear prompts because they were SUBMITTED, not because the user discarded them.
   *
   * The difference matters to undo. `clearAllPrompts` is a user action and is
   * therefore itself undoable — it pushes onto the undo stack. But prompts that
   * have been turned into an object are spent: the object is now the thing on
   * screen, and the meaningful undo is "remove that object", not "put the box
   * outline back". Leaving them on the stack made Ctrl+Z hand back the prompt
   * that produced the object and never reach the object itself, because the
   * prompt stack stayed non-empty for the rest of the session.
   *
   * So this drops both stacks rather than pushing to them, which hands the next
   * Ctrl+Z to the annotation history where it belongs.
   */
  consumePrompts: () => set((state) => {
    state.aiAnnotation.prompts = [];
    state.aiAnnotation.activePreview = null;
    state.aiAnnotation.undoStack = [];
    state.aiAnnotation.redoStack = [];
  }),

  setActivePreview: (preview) => set((state) => {
    state.aiAnnotation.activePreview = preview;
  }),
  
  setIsSubmitting: (isSubmitting) => set((state) => {
    state.aiAnnotation.isSubmitting = isSubmitting;
  }),
  
  toggleInstantSegmentation: () => set((state) => {
    state.aiAnnotation.instantSegmentation = !state.aiAnnotation.instantSegmentation;
  }),
  
  // Custom undo action
  undoLastAction: () => set((state) => {
    if (state.aiAnnotation.undoStack && state.aiAnnotation.undoStack.length > 0) {
      // Save current state to redo stack
      const currentState = [...state.aiAnnotation.prompts];
      state.aiAnnotation.redoStack = state.aiAnnotation.redoStack || [];
      state.aiAnnotation.redoStack.push(currentState);
      
      // Restore previous state
      const previousState = state.aiAnnotation.undoStack.pop();
      state.aiAnnotation.prompts = previousState;
    }
  }),
  
  // Custom redo action
  redoLastAction: () => set((state) => {
    if (state.aiAnnotation.redoStack && state.aiAnnotation.redoStack.length > 0) {
      // Save current state to undo stack
      const currentState = [...state.aiAnnotation.prompts];
      state.aiAnnotation.undoStack = state.aiAnnotation.undoStack || [];
      state.aiAnnotation.undoStack.push(currentState);
      
      // Restore next state
      const nextState = state.aiAnnotation.redoStack.pop();
      state.aiAnnotation.prompts = nextState;
    }
  }),
  
  // Refinement mode actions
  enterRefinementMode: (objectId, contourId) => set((state) => {
    state.aiAnnotation.refinementMode.active = true;
    state.aiAnnotation.refinementMode.objectId = objectId;
    state.aiAnnotation.refinementMode.contourId = contourId;
    // Clear existing prompts when entering refinement mode
    state.aiAnnotation.prompts = [];
    state.aiAnnotation.activePreview = null;
    state.aiAnnotation.undoStack = [];
    state.aiAnnotation.redoStack = [];
  }),
  
  exitRefinementMode: () => set((state) => {
    state.aiAnnotation.refinementMode.active = false;
    state.aiAnnotation.refinementMode.objectId = null;
    state.aiAnnotation.refinementMode.contourId = null;
    // Clear prompts when exiting refinement mode
    state.aiAnnotation.prompts = [];
    state.aiAnnotation.activePreview = null;
    state.aiAnnotation.undoStack = [];
    state.aiAnnotation.redoStack = [];
  }),
});

