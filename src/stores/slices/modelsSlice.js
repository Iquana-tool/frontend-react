/**
 * Models slice - manages AI model selection
 */
export const createModelsSlice = (set) => ({
  setSelectedModel: (model) => set((state) => {
    state.models.selectedModel = model;
  }),
  
  setCompletionModel: (model) => set((state) => {
    state.models.completionModel = model;
  }),
});

