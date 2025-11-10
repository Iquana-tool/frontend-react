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
});

