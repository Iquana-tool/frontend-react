import React, { useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
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
  useFetchAvailableSuggestionModels
} from '../../../stores/selectors/annotationSelectors';
import ModelDescription from './ModelDescription';
import annotationSession from '../../../services/annotationSession';
import useModelSwitchPreloader from '../../../hooks/useModelSwitchPreloader';

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

  const showAIAnnotationSelector = currentTool === 'ai_annotation';
  // Show suggestion selector when in suggestion tool OR ai_annotation tool (for "Suggest Similar" context menu feature)
  const showSuggestionSelector = currentTool === 'suggestion' || currentTool === 'ai_annotation';

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
          <div className="relative">
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
          <div className="relative">
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
