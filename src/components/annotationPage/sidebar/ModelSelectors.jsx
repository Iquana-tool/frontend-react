import React, { useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { 
  usePromptedModel,
  useCompletionModel, 
  useSetPromptedModel,
  useSetCompletionModel, 
  useCurrentTool,
  useAvailablePromptedModels,
  useAvailableCompletionModels,
  useIsLoadingPromptedModels,
  useIsLoadingCompletionModels,
  useFetchAvailablePromptedModels,
  useFetchAvailableCompletionModels
} from '../../../stores/selectors/annotationSelectors';
import ModelDescription from './ModelDescription';
import annotationSession from '../../../services/annotationSession';
import useModelSwitchPreloader from '../../../hooks/useModelSwitchPreloader';

const ModelSelectors = () => {
  const currentTool = useCurrentTool();
  const promptedModel = usePromptedModel();
  const completionModel = useCompletionModel();
  const setPromptedModel = useSetPromptedModel();
  const setCompletionModel = useSetCompletionModel();
  const availableModels = useAvailablePromptedModels();
  const availableCompletionModels = useAvailableCompletionModels();
  const isLoadingModels = useIsLoadingPromptedModels();
  const isLoadingCompletionModels = useIsLoadingCompletionModels();
  const fetchAvailableModels = useFetchAvailablePromptedModels();
  const fetchAvailableCompletionModels = useFetchAvailableCompletionModels();

  const showAIAnnotationSelector = currentTool === 'ai_annotation';
  // Show completion selector when in completion tool OR ai_annotation tool (for "Suggest Similar" context menu feature)
  const showCompletionSelector = currentTool === 'completion' || currentTool === 'ai_annotation';

  // Fetch AI models from backend when AI annotation tool is selected
  useEffect(() => {
    if (showAIAnnotationSelector && availableModels.length === 0 && !isLoadingModels) {
      fetchAvailableModels();
    }
  }, [showAIAnnotationSelector, availableModels.length, isLoadingModels, fetchAvailableModels]);

  // Fetch completion models from backend when completion tool is selected
  useEffect(() => {
    if (showCompletionSelector && availableCompletionModels.length === 0 && !isLoadingCompletionModels) {
      fetchAvailableCompletionModels();
    }
  }, [showCompletionSelector, availableCompletionModels.length, isLoadingCompletionModels, fetchAvailableCompletionModels]);

  // Preload models when they change
  useModelSwitchPreloader(promptedModel, annotationSession.selectPromptedModel.bind(annotationSession), 'prompted');
  useModelSwitchPreloader(completionModel, annotationSession.selectCompletionModel.bind(annotationSession), 'completion');

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

      {/* Completion Model Selector */}
      {showCompletionSelector && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Completion Model
          </label>
          <div className="relative">
            <select
              value={completionModel || ''}
              onChange={(e) => setCompletionModel(e.target.value)}
              disabled={isLoadingCompletionModels}
              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {isLoadingCompletionModels ? (
                <option value="">Loading models...</option>
              ) : availableCompletionModels.length > 0 ? (
                availableCompletionModels.map((model) => (
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
            <ModelDescription model={completionModel} modelType="completion" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelectors;
