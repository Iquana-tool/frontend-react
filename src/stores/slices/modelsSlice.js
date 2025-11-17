import { getPromptedModels } from '../../api/models';

// Fallback models if backend doesn't return any
const FALLBACK_MODELS = [
  { id: 'SAM2', name: 'SAM2' },
  { id: 'SAM', name: 'SAM' }
];

/**
 * Models slice - manages AI model selection and available models
 */
export const createModelsSlice = (set) => ({
  setSelectedModel: (model) => set((state) => {
    state.models.selectedModel = model;
  }),
  
  setCompletionModel: (model) => set((state) => {
    state.models.completionModel = model;
  }),

  fetchAvailableModels: async () => {
    set((state) => {
      state.models.isLoadingModels = true;
    });

    try {
      const result = await getPromptedModels();
      if (result.success && result.models && result.models.length > 0) {
        // Transform backend models to frontend format
        // Backend returns models with identifier_str and name fields
        const transformedModels = result.models.map(model => ({
          id: model.identifier_str || model.id,
          name: model.name || model.identifier_str || model.id,
          description: model.description,
          tags: model.tags,
          supported_prompt_types: model.supported_prompt_types,
          supports_refinement: model.supports_refinement
        }));

        set((state) => {
          state.models.availableModels = transformedModels;
          state.models.isLoadingModels = false;
          
          // Set default model if none is selected and models are available
          if (!state.models.selectedModel && transformedModels.length > 0) {
            state.models.selectedModel = transformedModels[0].id;
          }
        });
      } else {
        // Fallback to hardcoded models if backend doesn't return any
        set((state) => {
          state.models.availableModels = FALLBACK_MODELS;
          state.models.isLoadingModels = false;
          if (!state.models.selectedModel && FALLBACK_MODELS.length > 0) {
            state.models.selectedModel = FALLBACK_MODELS[0].id;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching AI models:', error);
      // Fallback to hardcoded models on error
      set((state) => {
        state.models.availableModels = FALLBACK_MODELS;
        state.models.isLoadingModels = false;
        if (!state.models.selectedModel && FALLBACK_MODELS.length > 0) {
          state.models.selectedModel = FALLBACK_MODELS[0].id;
        }
      });
    }
  },
});

