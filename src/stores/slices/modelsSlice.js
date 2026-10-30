import {
  getPromptedModels,
  getSuggestionModels,
  getModelFavorites,
  setModelFavorite,
  clearModelFavorite,
} from '../../api/models';
import { getInstanceModels } from '../../api/instance_segmentation';
import { getInferenceModelCatalog } from '../../api/inference';

/**
 * Models slice - manages AI model selection, available models, and per-task
 * favorite (default) models.
 */
const getModelId = (model) =>
  model?.id ?? model?.registry_key ?? model?.identifier ?? null;

// Default selection for a task: the user's favorite if it is currently
// available, otherwise the first model in the list.
const pickDefaultId = (models, favorite) => {
  const ids = (models || []).map(getModelId).filter(Boolean);
  if (favorite && ids.includes(favorite)) return favorite;
  return ids[0] ?? null;
};

const normalizeFavorites = (result) =>
  result?.success && result?.favorites && typeof result.favorites === 'object'
    ? result.favorites
    : {};

const extractLabelIds = (model) => {
  if (Array.isArray(model?.label_ids)) return model.label_ids;
  if (model?.label_id != null) return [model.label_id];
  return [];
};

let favoritesInFlightPromise = null;

const reconcileFavorites = async (set, fallback) => {
  try {
    const result = await getModelFavorites();
    if (!result?.success) throw new Error('Favorites refresh failed');
    const favorites = normalizeFavorites(result);
    set((state) => {
      state.models.favorites = favorites;
      state.models.favoritesLoaded = true;
    });
    return favorites;
  } catch (_) {
    set((state) => {
      state.models.favorites = fallback;
      state.models.favoritesLoaded = true;
    });
    return fallback;
  }
};

let instanceModelsRequestId = 0;

export const createModelsSlice = (set, get) => ({
  setPromptedModel: (model) => set((state) => {
    state.models.promptedModel = model;
  }),

  setSuggestionModel: (model) => set((state) => {
    state.models.suggestionModel = model;
  }),

  setInstanceModel: (model) => set((state) => {
    state.models.instanceModel = model;
    state.models.autoSelectedInstanceModel = null;
  }),

  setIsRunningSuggestion: (isRunning) => set((state) => {
    state.models.isRunningSuggestion = isRunning;
  }),

  setIsRunningInstance: (isRunning) => set((state) => {
    state.models.isRunningInstance = isRunning;
  }),

  // --- Favorites ---------------------------------------------------------

  // Load the user's favorite model per task ({ task: registry_key }).
  fetchModelFavorites: async () => {
    if (favoritesInFlightPromise) return favoritesInFlightPromise;
    favoritesInFlightPromise = (async () => {
      try {
        const result = await getModelFavorites();
        const favorites = result?.success
          ? normalizeFavorites(result)
          : get().models.favorites || {};
        set((state) => {
          state.models.favorites = favorites;
          state.models.favoritesLoaded = true;
        });
        return favorites;
      } catch (_) {
        const favorites = get().models.favorites || {};
        set((state) => {
          state.models.favoritesLoaded = true;
        });
        return favorites;
      } finally {
        favoritesInFlightPromise = null;
      }
    })();
    return favoritesInFlightPromise;
  },

  // Fetch favorites once, before defaults are computed.
  ensureFavoritesLoaded: async () => {
    if (get().models.favoritesLoaded) return;
    try {
      await get().fetchModelFavorites();
    } catch (_) {
      set((state) => {
        state.models.favorites = {};
        state.models.favoritesLoaded = true;
      });
    }
  },

  // Make `registryKey` the favorite (default) model for `task`. Optimistic;
  // reverts by refetching on failure.
  setFavoriteModel: async (task, registryKey) => {
    const previousFavorites = { ...(get().models.favorites || {}) };
    set((state) => {
      if (!state.models.favorites) state.models.favorites = {};
      state.models.favorites[task] = registryKey;
      state.models.favoritesLoaded = true;
    });
    try {
      const res = await setModelFavorite(task, registryKey);
      if (!res?.success) {
        await reconcileFavorites(set, previousFavorites);
      }
    } catch (_) {
      await reconcileFavorites(set, previousFavorites);
    }
  },

  // Clear the favorite model for `task`.
  clearFavoriteModel: async (task) => {
    const previousFavorites = { ...(get().models.favorites || {}) };
    set((state) => {
      if (state.models.favorites) {
        delete state.models.favorites[task];
      }
      state.models.favoritesLoaded = true;
    });
    try {
      const res = await clearModelFavorite(task);
      if (!res?.success) {
        await reconcileFavorites(set, previousFavorites);
      }
    } catch (_) {
      await reconcileFavorites(set, previousFavorites);
    }
  },

  // Star / unstar a model for a specific task.
  toggleFavorite: async (task, modelId) => {
    const current = get().models.favorites?.[task];
    if (current === modelId) {
      await get().clearFavoriteModel(task);
    } else {
      await get().setFavoriteModel(task, modelId);
    }
  },

  // --- Available models --------------------------------------------------

  fetchAvailableSuggestionModels: async () => {
    set((state) => {
      state.models.isLoadingSuggestionModels = true;
    });
    await get().ensureFavoritesLoaded();

    try {
      const result = await getSuggestionModels();
      if (result.success && result.models && result.models.length > 0) {
        const transformedModels = result.models.map(model => ({
          id: getModelId(model),
          registry_key: getModelId(model),
          task: 'instance-suggestion',
          name: model.name,
          description: model.description,
          tags: model.tags,
          label_ids: extractLabelIds(model),
          supports_refinement: model.refinement_supported,
          model_status: model.model_status || 'ready',
        }));

        set((state) => {
          state.models.availableSuggestionModels = transformedModels;
          state.models.isLoadingSuggestionModels = false;
          if (!state.models.suggestionModel) {
            const chosen = pickDefaultId(transformedModels, state.models.favorites?.['instance-suggestion']);
            if (chosen) state.models.suggestionModel = chosen;
          }
        });
      } else {
        console.warn('No suggestion models returned from backend');
        set((state) => {
          state.models.availableSuggestionModels = [];
          state.models.isLoadingSuggestionModels = false;
        });
      }
    } catch (error) {
      console.error('Error fetching suggestion models:', error);
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
    await get().ensureFavoritesLoaded();

    try {
      const result = await getPromptedModels();
      if (result.success && result.models && result.models.length > 0) {
        const transformedModels = result.models.map(model => ({
          id: getModelId(model),
          registry_key: getModelId(model),
          task: 'prompted-segmentation',
          name: model.name,
          description: model.description,
          tags: model.tags,
          label_ids: extractLabelIds(model),
          supported_prompt_types: model.prompt_types_supported,
          supports_refinement: model.refinement_supported,
          model_status: model.model_status || 'ready',
        }));

        set((state) => {
          state.models.availablePromptedModels = transformedModels;
          state.models.isLoadingModels = false;
          if (!state.models.promptedModel) {
            const chosen = pickDefaultId(transformedModels, state.models.favorites?.['prompted-segmentation']);
            if (chosen) state.models.promptedModel = chosen;
          }
        });
      } else {
        console.warn('No prompted models returned from backend');
        set((state) => {
          state.models.availablePromptedModels = [];
          state.models.isLoadingModels = false;
        });
      }
    } catch (error) {
      console.error('Error fetching AI models:', error);
      set((state) => {
        state.models.availablePromptedModels = [];
        state.models.isLoadingModels = false;
      });
    }
  },

  fetchAvailableInstanceModels: async (datasetId = null) => {
    const reqId = ++instanceModelsRequestId;
    const targetDatasetId = datasetId ?? get().objects?.labelDatasetId ?? null;

    set((state) => {
      state.models.isLoadingInstanceModels = true;
    });
    await get().ensureFavoritesLoaded();
    if (reqId !== instanceModelsRequestId) return;

    try {
      let rawList = [];
      try {
        const result = await getInstanceModels();
        if (result?.success && Array.isArray(result.result)) {
          rawList = [...result.result];
        }
      } catch (_) {
        // Fallback to catalog or local definition
      }
      if (reqId !== instanceModelsRequestId) return;

      if (targetDatasetId != null) {
        try {
          const catalog = await getInferenceModelCatalog(targetDatasetId);
          if (reqId !== instanceModelsRequestId) return;
          if (Array.isArray(catalog?.models)) {
            for (const catModel of catalog.models) {
              if (catModel.task === 'instance-segmentation') {
                const catId = getModelId(catModel);
                const existingIndex = rawList.findIndex((m) => getModelId(m) === catId);
                if (existingIndex >= 0) {
                  const existing = rawList[existingIndex];
                  rawList[existingIndex] = {
                    ...existing,
                    ...catModel,
                    class_mappings: catModel.class_mappings ?? existing.class_mappings,
                    label_ids: catModel.label_ids ?? existing.label_ids,
                    classes: catModel.classes ?? existing.classes,
                    tags: { ...existing.tags, ...catModel.tags },
                  };
                } else if (catId) {
                  rawList.push(catModel);
                }
              }
            }
          }
        } catch (_) {}
      }
      if (reqId !== instanceModelsRequestId) return;

      const transformedModels = rawList.map((model) => {
        const id = getModelId(model);
        const isExperimental = Boolean(model.is_experimental) || model.tags?.maturity === 'provisional';
        return {
          id,
          registry_key: id,
          task: 'instance-segmentation',
          name: model.name ?? '',
          description: model.description,
          tags: model.tags,
          label_ids: extractLabelIds(model),
          classes: model.classes,
          class_mappings: model.class_mappings,
          checkpoint_sha256: model.checkpoint_sha256 || model.tags?.default_checkpoint_sha256,
          roi_input: model.roi_input ?? model.tags?.roi_input ?? null,
          is_experimental: isExperimental,
          model_status: model.model_status || 'ready',
        };
      });

      if (reqId !== instanceModelsRequestId) return;

      set((state) => {
        state.models.availableInstanceModels = transformedModels;
        state.models.isLoadingInstanceModels = false;
        state.models.modelsDatasetId = targetDatasetId;
        if (!state.models.instanceModel || !transformedModels.some((m) => m.id === state.models.instanceModel)) {
          const chosen = pickDefaultId(transformedModels, state.models.favorites?.['instance-segmentation']);
          state.models.instanceModel = chosen;
          state.models.autoSelectedInstanceModel = chosen;
        }
      });
    } catch (error) {
      if (reqId !== instanceModelsRequestId) return;
      console.error('Error fetching instance models:', error);
      set((state) => {
        state.models.availableInstanceModels = [];
        state.models.isLoadingInstanceModels = false;
      });
    }
  },
});
