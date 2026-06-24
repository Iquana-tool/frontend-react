import { getPromptedModels, getSuggestionModels } from '../../api/models';
import { getInstanceModels } from '../../api/instance_segmentation';

/**
 * Models slice - manages AI model selection and available models
 */
const getModelId = (model) =>
  model?.id ?? model?.registry_key ?? model?.identifier ?? null;

const getFirstModelId = (models) => {
  const first = (models || []).find((m) => getModelId(m));
  return first ? getModelId(first) : null;
};

export const createModelsSlice = (set) => ({
  setPromptedModel: (model) => set((state) => {
    state.models.promptedModel = model;
  }),
  
  setSuggestionModel: (model) => set((state) => {
    state.models.suggestionModel = model;
  }),
  
  setInstanceModel: (model) => set((state) => {
    state.models.instanceModel = model;
  }),

  setIsRunningSuggestion: (isRunning) => set((state) => {
    state.models.isRunningSuggestion = isRunning;
  }),

  setIsRunningInstance: (isRunning) => set((state) => {
    state.models.isRunningInstance = isRunning;
  }),

  loadPromptedModel: async (model) => {
    set((state) => {
      state.models.promptedModel = {...state.models.promptedModel, model_status: "busy"};
    });

    try {
      const result = await getSuggestionModels();
      if (result.success && result.models && result.models.length > 0) {
        // Transform backend models to frontend format
        const transformedModels = result.models.map(model => ({
          id: getModelId(model),
          name: model.name,
          description: model.description,
          tags: model.tags,
          supports_refinement: model.refinement_supported,
          model_status: model.model_status || 'ready', // Default to 'ready' if models are available
        }));

        set((state) => {
          state.models.availableSuggestionModels = transformedModels;
          state.models.isLoadingSuggestionModels = false;

          // Set default model if none is selected and models are available
          if (!state.models.suggestionModel && transformedModels.length > 0) {
            const firstModelId = getFirstModelId(transformedModels);
            if (firstModelId) state.models.suggestionModel = firstModelId;
          }
        });
      } else {
        // No models returned from backend - show empty list
        console.warn('No suggestion models returned from backend in loadPromptedModel');
        set((state) => {
          state.models.availableSuggestionModels = [];
          state.models.isLoadingSuggestionModels = false;
        });
      }
    } catch (error) {
      console.error('Error fetching suggestion models:', error);
      // Don't use fallback - show empty list on error
      set((state) => {
        state.models.availableSuggestionModels = [];
        state.models.isLoadingSuggestionModels = false;
      });
    }
  },

  fetchAvailableSuggestionModels: async () => {
    set((state) => {
      state.models.isLoadingSuggestionModels = true;
    });

    try {
      const result = await getSuggestionModels();
      if (result.success && result.models && result.models.length > 0) {
        // Transform backend models to frontend format
        const transformedModels = result.models.map(model => ({
          id: getModelId(model),
          name: model.name,
          description: model.description,
          tags: model.tags,
          supports_refinement: model.refinement_supported,
          model_status: model.model_status || 'ready', // Default to 'ready' if models are available
        }));

        set((state) => {
          state.models.availableSuggestionModels = transformedModels;
          state.models.isLoadingSuggestionModels = false;
          
          // Set default model if none is selected and models are available
          if (!state.models.suggestionModel && transformedModels.length > 0) {
            const firstModelId = getFirstModelId(transformedModels);
            if (firstModelId) state.models.suggestionModel = firstModelId;
          }
        });
      } else {
        // No models returned from backend - show empty list
        console.warn('No suggestion models returned from backend');
        set((state) => {
          state.models.availableSuggestionModels = [];
          state.models.isLoadingSuggestionModels = false;
        });
      }
    } catch (error) {
      console.error('Error fetching suggestion models:', error);
      //show empty list on error
      set((state) => {
        state.models.availableSuggestionModels = [];
        state.models.isLoadingSuggestionModels = false;
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
          id: getModelId(model),
          name: model.name,
          description: model.description,
          tags: model.tags,
          supported_prompt_types: model.prompt_types_supported,
          supports_refinement: model.refinement_supported,
          model_status: model.model_status || 'ready', // Default to 'ready' if models are available
        }));

        set((state) => {
          state.models.availablePromptedModels = transformedModels;
          state.models.isLoadingModels = false;
          
          // Set default model if none is selected and models are available
          if (!state.models.promptedModel && transformedModels.length > 0) {
            const firstModelId = getFirstModelId(transformedModels);
            if (firstModelId) state.models.promptedModel = firstModelId;
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

  fetchAvailableInstanceModels: async () => {
    set((state) => {
      state.models.isLoadingInstanceModels = true;
    });

    try {
      const result = await getInstanceModels();
      const modelsList = Array.isArray(result?.result) ? result.result : [];
      if (result?.success && modelsList.length > 0) {
        // Transform backend models to frontend format
        const transformedModels = modelsList.map(model => ({
          id: getModelId(model),
          name: model.name,
          description: model.description,
          tags: model.tags,
          model_status: model.model_status || 'ready',
        }));

        set((state) => {
          state.models.availableInstanceModels = transformedModels;
          state.models.isLoadingInstanceModels = false;

          // Set default model if none is selected and models are available
          if (!state.models.instanceModel && transformedModels.length > 0) {
            const firstModelId = getFirstModelId(transformedModels);
            if (firstModelId) state.models.instanceModel = firstModelId;
          }
        });
      } else {
        // No models returned from backend - show empty list
        console.warn('No instance models returned from backend');
        set((state) => {
          state.models.availableInstanceModels = [];
          state.models.isLoadingInstanceModels = false;
        });
      }
    } catch (error) {
      console.error('Error fetching instance models:', error);
      // show empty list on error
      set((state) => {
        state.models.availableInstanceModels = [];
        state.models.isLoadingInstanceModels = false;
      });
    }
  },
});

