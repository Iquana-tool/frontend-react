import React, { useEffect } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import {
  usePromptedModel,
  useSuggestionModel,
  useSetPromptedModel,
  useSetSuggestionModel,
  useCurrentTool,
  useAvailablePromptedModels,
  useAvailableSuggestionModels,
  useIsLoadingPromptedModels,
  useIsLoadingSuggestionModels,
  useFetchAvailablePromptedModels,
  useFetchAvailableSuggestionModels,
  useModelFavorites,
  useFetchModelFavorites,
  useSetFavoriteModel,
  useClearFavoriteModel,
} from '../../../stores/selectors/annotationSelectors';
import ModelDescription from './ModelDescription';
import annotationSession from '../../../services/annotationSession';
import useModelSwitchPreloader from '../../../hooks/useModelSwitchPreloader';

// A star that sets/clears the current selection as the user's default model for
// a task. The starred model is preselected next time the annotation page loads.
const FavoriteStar = ({ task, currentId, favorites, setFavorite, clearFavorite }) => {
  if (!currentId) return null;
  const isFav = favorites?.[task] === currentId;
  return (
    <button
      type="button"
      onClick={() => (isFav ? clearFavorite(task) : setFavorite(task, currentId))}
      aria-pressed={isFav}
      aria-label={isFav ? 'Remove default model' : 'Set as default model'}
      title={isFav ? 'Default model — preselected next time' : 'Set as your default for this task'}
      className="shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
    >
      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-gray-300 hover:text-amber-400'}`} />
    </button>
  );
};

const ModelSelectors = () => {
  const currentTool = useCurrentTool();
  const promptedModel = usePromptedModel();
  const suggestionModel = useSuggestionModel();
  const setPromptedModel = useSetPromptedModel();
  const setSuggestionModel = useSetSuggestionModel();
  const availableModels = useAvailablePromptedModels();
  const availableSuggestionModels = useAvailableSuggestionModels();
  const isLoadingModels = useIsLoadingPromptedModels();
  const isLoadingSuggestionModels = useIsLoadingSuggestionModels();
  const fetchAvailableModels = useFetchAvailablePromptedModels();
  const fetchAvailableSuggestionModels = useFetchAvailableSuggestionModels();

  const favorites = useModelFavorites();
  const fetchFavorites = useFetchModelFavorites();
  const setFavorite = useSetFavoriteModel();
  const clearFavorite = useClearFavoriteModel();

  const showAIAnnotationSelector = currentTool === 'ai_annotation';
  // Show suggestion selector when in suggestion tool OR ai_annotation tool (for "Suggest Similar" context menu feature)
  const showSuggestionSelector = currentTool === 'suggestion' || currentTool === 'ai_annotation';

  // Load favorites once so the star reflects state and defaults preselect.
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Fetch AI models from backend when AI annotation tool is selected
  useEffect(() => {
    if (showAIAnnotationSelector && availableModels.length === 0 && !isLoadingModels) {
      fetchAvailableModels();
    }
  }, [showAIAnnotationSelector, availableModels.length, isLoadingModels, fetchAvailableModels]);

  // Fetch suggestion models from backend when suggestion tool is selected
  useEffect(() => {
    if (showSuggestionSelector && availableSuggestionModels.length === 0 && !isLoadingSuggestionModels) {
      fetchAvailableSuggestionModels();
    }
  }, [showSuggestionSelector, availableSuggestionModels.length, isLoadingSuggestionModels, fetchAvailableSuggestionModels]);

  // Preload models when they change
  useModelSwitchPreloader(promptedModel, annotationSession.selectPromptedModel.bind(annotationSession), 'prompted');
  useModelSwitchPreloader(suggestionModel, annotationSession.selectSuggestionModel.bind(annotationSession), 'suggestion');

  return (
    <div className="space-y-3">
      {/* AI Annotation Model Selector */}
      {showAIAnnotationSelector && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            AI Segmentation Model
          </label>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <select
                value={promptedModel || ''}
                onChange={(e) => setPromptedModel(e.target.value)}
                disabled={isLoadingModels}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {isLoadingModels ? (
                  <option value="">Loading models...</option>
                ) : availableModels.length > 0 ? (
                  availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))
                ) : (
                  <option value="">No models available</option>
                )}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
            <FavoriteStar
              task="prompted-segmentation"
              currentId={promptedModel}
              favorites={favorites}
              setFavorite={setFavorite}
              clearFavorite={clearFavorite}
            />
          </div>

          {/* Model Description */}
          <div className="mt-1.5">
            <ModelDescription model={promptedModel} modelType="segmentation" />
          </div>
        </div>
      )}

      {/* Suggestion Model Selector */}
      {showSuggestionSelector && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Suggestion Model
          </label>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <select
                value={suggestionModel || ''}
                onChange={(e) => setSuggestionModel(e.target.value)}
                disabled={isLoadingSuggestionModels}
                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {isLoadingSuggestionModels ? (
                  <option value="">Loading models...</option>
                ) : availableSuggestionModels.length > 0 ? (
                  availableSuggestionModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))
                ) : (
                  <option value="">No models available</option>
                )}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
            <FavoriteStar
              task="instance-suggestion"
              currentId={suggestionModel}
              favorites={favorites}
              setFavorite={setFavorite}
              clearFavorite={clearFavorite}
            />
          </div>

          {/* Model Description */}
          <div className="mt-1.5">
            <ModelDescription model={suggestionModel} modelType="suggestion" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelectors;
