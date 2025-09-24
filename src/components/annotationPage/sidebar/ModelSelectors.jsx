import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useSelectedModel, useCompletionModel, useSetSelectedModel, useSetCompletionModel, useCurrentTool } from '../../../stores/selectors/annotationSelectors';
import ModelDescription from './ModelDescription';

const ModelSelectors = () => {
  const currentTool = useCurrentTool();
  const selectedModel = useSelectedModel();
  const completionModel = useCompletionModel();
  const setSelectedModel = useSetSelectedModel();
  const setCompletionModel = useSetCompletionModel();

  const showAIAnnotationSelector = currentTool === 'ai_annotation';
  const showCompletionSelector = currentTool === 'completion';

  const aiModels = [
    { id: 'SAM2', name: 'SAM2' },
    { id: 'SAM', name: 'SAM' }
  ];

  const completionModels = [
    { id: 'DINOv3', name: 'DINOv3' },
    { id: 'DINOv2', name: 'DINOv2' }
  ];

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
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            >
              {aiModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
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
