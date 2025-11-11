import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSelectedModel, useCompletionModel, useSetSelectedModel, useSetCompletionModel, useCurrentTool } from '../../../stores/selectors/annotationSelectors';
import { getPromptedModels } from '../../../api/models';
import ModelDescription from './ModelDescription';

const ModelSelectors = () => {
  const currentTool = useCurrentTool();
  const selectedModel = useSelectedModel();
  const completionModel = useCompletionModel();
  const setSelectedModel = useSetSelectedModel();
  const setCompletionModel = useSetCompletionModel();

  const [aiModels, setAiModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  const showAIAnnotationSelector = currentTool === 'ai_annotation';
  const showCompletionSelector = currentTool === 'completion';

  const completionModels = [
    { id: 'DINOv3', name: 'DINOv3' },
    { id: 'DINOv2', name: 'DINOv2' }
  ];

  // Fetch AI models from backend
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
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
          setAiModels(transformedModels);
          
          // Set default model if none is selected and models are available
          if (!selectedModel && transformedModels.length > 0) {
            setSelectedModel(transformedModels[0].id);
          }
        } else {
          // Fallback to hardcoded models if backend doesn't return any
          const fallbackModels = [
            { id: 'SAM2', name: 'SAM2' },
            { id: 'SAM', name: 'SAM' }
          ];
          setAiModels(fallbackModels);
          if (!selectedModel && fallbackModels.length > 0) {
            setSelectedModel(fallbackModels[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching AI models:', error);
        // Fallback to hardcoded models on error
        const fallbackModels = [
          { id: 'SAM2', name: 'SAM2' },
          { id: 'SAM', name: 'SAM' }
        ];
        setAiModels(fallbackModels);
        if (!selectedModel && fallbackModels.length > 0) {
          setSelectedModel(fallbackModels[0].id);
        }
      } finally {
        setIsLoadingModels(false);
      }
    };

    if (showAIAnnotationSelector) {
      fetchModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAIAnnotationSelector]);

  return (
    <div className="space-y-3">
      {/* AI Annotation Model Selector */}
      {showAIAnnotationSelector && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Selected Model
          </label>
          <div className="relative">
            <select
              value={selectedModel || ''}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isLoadingModels}
              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {isLoadingModels ? (
                <option value="">Loading models...</option>
              ) : aiModels.length > 0 ? (
                aiModels.map((model) => (
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
            <ModelDescription model={selectedModel} modelType="segmentation" />
          </div>
        </div>
      )}

      {/* Completion Model Selector */}
      {showCompletionSelector && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Selected Model
          </label>
          <div className="relative">
            <select
              value={completionModel}
              onChange={(e) => setCompletionModel(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            >
              {completionModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
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
