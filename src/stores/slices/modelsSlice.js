import { getPromptedModels, getCompletionModels } from '../../api/models';

// Fallback models if backend doesn't return any
const FALLBACK_MODELS = [
  { id: 'sam2_tiny', name: 'SAM2 - Tiny' },
];

const FALLBACK_COMPLETION_MODELS = [
  { id: 'dino_1000_cosine_he_max_agg', name: 'DINO Completion' }
];

/**
 * Models slice - manages AI model selection and available models
 */
export const createModelsSlice = (set) => ({
  setPromptedModel: (model) => set((state) => {
    state.models.promptedModel = model;
  }),
  
  setCompletionModel: (model) => set((state) => {
    state.models.completionModel = model;
  }),

  loadPromptedModel: async (model) => {
    set((state) => {
      state.models.promptedModel = {...state.models.promptedModel, model_status: "busy"};
    });

    try {
      const result = await getCompletionModels();
      if (result.success && result.models && result.models.length > 0) {
        // Transform backend models to frontend format
        const transformedModels = result.models.map(model => ({
          id: model.identifier_str || model.id,
          name: model.name || model.identifier_str || model.id,
          description: model.description,
          tags: model.tags,
          supports_refinement: model.supports_refinement
        }));

        set((state) => {
          state.models.availableCompletionModels = transformedModels;
          state.models.isLoadingCompletionModels = false;

          // Set default model if none is selected and models are available
          if (!state.models.completionModel && transformedModels.length > 0) {
            state.models.completionModel = transformedModels[0].id;
          }
        });
      } else {
        // Fallback to hardcoded models if backend doesn't return any
        set((state) => {
          state.models.availableCompletionModels = FALLBACK_COMPLETION_MODELS;
          state.models.isLoadingCompletionModels = false;
          if (!state.models.completionModel && FALLBACK_COMPLETION_MODELS.length > 0) {
            state.models.completionModel = FALLBACK_COMPLETION_MODELS[0].id;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching completion models:', error);
      // Fallback to hardcoded models on error
      set((state) => {
        state.models.availableCompletionModels = FALLBACK_COMPLETION_MODELS;
        state.models.isLoadingCompletionModels = false;
        if (!state.models.completionModel && FALLBACK_COMPLETION_MODELS.length > 0) {
          state.models.completionModel = FALLBACK_COMPLETION_MODELS[0].id;
        }
      });
    }
  },

  fetchAvailableCompletionModels: async () => {
    set((state) => {
      state.models.isLoadingCompletionModels = true;
    });

    try {
      const result = await getCompletionModels();
      if (result.success && result.models && result.models.length > 0) {
        // Transform backend models to frontend format
        const transformedModels = result.models.map(model => ({
          id: model.identifier_str || model.id,
          name: model.name || model.identifier_str || model.id,
          description: model.description,
          tags: model.tags,
          supports_refinement: model.supports_refinement
        }));

        set((state) => {
          state.models.availableCompletionModels = transformedModels;
          state.models.isLoadingCompletionModels = false;
          
          // Set default model if none is selected and models are available
          if (!state.models.completionModel && transformedModels.length > 0) {
            state.models.completionModel = transformedModels[0].id;
          }
        });
      } else {
        // Fallback to hardcoded models if backend doesn't return any
        set((state) => {
          state.models.availableCompletionModels = FALLBACK_COMPLETION_MODELS;
          state.models.isLoadingCompletionModels = false;
          if (!state.models.completionModel && FALLBACK_COMPLETION_MODELS.length > 0) {
            state.models.completionModel = FALLBACK_COMPLETION_MODELS[0].id;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching completion models:', error);
      // Fallback to hardcoded models on error
      set((state) => {
        state.models.availableCompletionModels = FALLBACK_COMPLETION_MODELS;
        state.models.isLoadingCompletionModels = false;
        if (!state.models.completionModel && FALLBACK_COMPLETION_MODELS.length > 0) {
          state.models.completionModel = FALLBACK_COMPLETION_MODELS[0].id;
        }
      });
    }
  },

  fetchAvailablePromptedModels: async () => {
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
          state.models.availablePromptedModels = transformedModels;
          state.models.isLoadingModels = false;
          
          // Set default model if none is selected and models are available
          if (!state.models.promptedModel && transformedModels.length > 0) {
            state.models.promptedModel = transformedModels[0].id;
          }
        });
      } else {
        // Fallback to hardcoded models if backend doesn't return any
        set((state) => {
          state.models.availablePromptedModels = FALLBACK_MODELS;
          state.models.isLoadingModels = false;
          if (!state.models.promptedModel && FALLBACK_MODELS.length > 0) {
            state.models.promptedModel = FALLBACK_MODELS[0].id;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching AI models:', error);
      // Fallback to hardcoded models on error
      set((state) => {
        state.models.availablePromptedModels = FALLBACK_MODELS;
        state.models.isLoadingModels = false;
        if (!state.models.promptedModel && FALLBACK_MODELS.length > 0) {
          state.models.promptedModel = FALLBACK_MODELS[0].id;
        }
      });
    }
  },
});

