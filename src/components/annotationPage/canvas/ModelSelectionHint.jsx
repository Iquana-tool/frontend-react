import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useCurrentTool, useSelectedModel } from '../../../stores/selectors/annotationSelectors';

/**
 * Model Selection Hint Component
 * Shows inline hint when AI annotation tool is active but no model is selected
 */
const ModelSelectionHint = () => {
  const currentTool = useCurrentTool();
  const selectedModel = useSelectedModel();

  // Only show when AI annotation tool is active and no model selected
  if (currentTool !== 'ai_annotation' || selectedModel) {
    return null;
  }

  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg px-4 py-3 shadow-xl pointer-events-auto animate-pulse">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Select a Segmentation Model
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Choose a model from the left sidebar to start annotating
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelectionHint;

