import { getPromptedModels, getCompletionModels } from '../../api/models';

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
  
  setIsRunningCompletion: (isRunning) => set((state) => {
    state.models.isRunningCompletion = isRunning;
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
          id: model.registry_key,
          name: model.name,
          description: model.description,
          tags: model.tags,
          supports_refinement: model.refinement_supported
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
        // No models returned from backend - show empty list
        console.warn('No completion models returned from backend in loadPromptedModel');
        set((state) => {
          state.models.availableCompletionModels = [];
          state.models.isLoadingCompletionModels = false;
        });
      }
    } catch (error) {
      console.error('Error fetching completion models:', error);
      // Don't use fallback - show empty list on error
      set((state) => {
        state.models.availableCompletionModels = [];
        state.models.isLoadingCompletionModels = false;
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
          id: model.registry_key,
          name: model.name,
          description: model.description,
          tags: model.tags,
          supports_refinement: model.refinement_supported
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
        // No models returned from backend - show empty list
        console.warn('No completion models returned from backend');
        set((state) => {
          state.models.availableCompletionModels = [];
          state.models.isLoadingCompletionModels = false;
        });
      }
    } catch (error) {
      console.error('Error fetching completion models:', error);
      //show empty list on error
      set((state) => {
        state.models.availableCompletionModels = [];
        state.models.isLoadingCompletionModels = false;
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
        const transformedModels = result.models.map(model => ({
          id: model.registry_key,
          name: model.name,
          description: model.description,
          tags: model.tags,
          supported_prompt_types: model.prompt_types_supported,
          supports_refinement: model.refinement_supported
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
        // No models returned from backend - show empty list
        console.warn('No prompted models returned from backend');
        set((state) => {
          state.models.availablePromptedModels = [];
          state.models.isLoadingModels = false;
        });
      }
    } catch (error) {
      console.error('Error fetching AI models:', error);
      // show empty list on error
      set((state) => {
        state.models.availablePromptedModels = [];
        state.models.isLoadingModels = false;
      });
    }
  },
});

