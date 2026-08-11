/**
 * AI Annotation slice - manages AI annotation prompts and undo/redo
 */
import { trackAnnotation } from '../../services/telemetry';

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
    // Coordinates stay out of the event: how a participant prompted is the
    // measure, and the resulting annotation is already in the database.
    trackAnnotation('prompt.add', {
      payload: { kind: 'point', polarity: label, prompt_count: state.aiAnnotation.prompts.length },
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
    trackAnnotation('prompt.add', {
      payload: {
        kind: options.freehand ? 'freehand' : 'polygon',
        vertex_count: points.length,
        prompt_count: state.aiAnnotation.prompts.length,
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
    trackAnnotation('prompt.add', {
      payload: { kind: 'box', prompt_count: state.aiAnnotation.prompts.length },
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
      trackAnnotation('prompt.remove_last', {
        payload: { prompt_count: state.aiAnnotation.prompts.length },
      });
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
    trackAnnotation('prompt.clear_all', {
      payload: { prompt_count: currentPrompts.length },
    });
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
      trackAnnotation('prompt.undo', {
        payload: { prompt_count: previousState.length },
      });
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
      trackAnnotation('prompt.redo', {
        payload: { prompt_count: nextState.length },
      });
    }
  }),
  
  // Refinement mode actions
  enterRefinementMode: (objectId, contourId) => set((state) => {
    trackAnnotation('refinement.enter');
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
    if (state.aiAnnotation.refinementMode.active) trackAnnotation('refinement.exit');
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

