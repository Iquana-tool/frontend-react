import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  useCurrentTool,
  useSelectedModel,
  useAIPrompts,
  useIsSubmitting,
  useInstantSegmentation,
} from '../../../stores/selectors/annotationSelectors';

/**
 * Run AI Button Component
 * Button to trigger AI segmentation
 */
const RunAIButton = ({ onRunAI }) => {
  const currentTool = useCurrentTool();
  const selectedModel = useSelectedModel();
  const prompts = useAIPrompts();
  const isSubmitting = useIsSubmitting();
  const instantSegmentation = useInstantSegmentation();

  // Only show when AI annotation tool is active
  if (currentTool !== 'ai_annotation') {
    return null;
  }

  // Hide button completely when instant segmentation is enabled (segmentation happens automatically)
  if (instantSegmentation) {
    return null;
  }

  const canSubmit = selectedModel && prompts.length > 0 && !isSubmitting;

  const handleClick = () => {
    if (canSubmit && onRunAI) {
      onRunAI();
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <button
        onClick={handleClick}
        disabled={!canSubmit}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-full shadow-2xl
          font-semibold text-white text-sm
          transition-all duration-200 transform
          ${
            canSubmit
              ? 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:shadow-3xl hover:scale-105 active:scale-95'
              : 'bg-gray-300 cursor-not-allowed opacity-60'
          }
        `}
        title={
          !selectedModel
            ? 'Select a model first'
            : prompts.length === 0
            ? 'Add at least one prompt'
            : 'Run AI segmentation'
        }
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Run AI Segmentation</span>
            {prompts.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {prompts.length}
              </span>
            )}
          </>
        )}
      </button>

      {/* Prompt counter hint */}
      {canSubmit && prompts.length > 0 && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded shadow-lg">
            {prompts.filter((p) => p.type === 'point').length} point(s),{' '}
            {prompts.filter((p) => p.type === 'box').length} box(es)
          </div>
        </div>
      )}
    </div>
  );
};

export default RunAIButton;

