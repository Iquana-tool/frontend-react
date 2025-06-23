import React from 'react';

const PromptSelectionOverlay = ({
  selectedPromptIndex,
  prompts,
  onAddToFinalMask,
  onCancel
}) => {
  // Don't render if no prompt is selected
  if (selectedPromptIndex === null || !prompts || !prompts[selectedPromptIndex]) {
    return null;
  }

  return (
    <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white shadow-md rounded-md px-2 py-1 z-50 flex items-center gap-2 border border-blue-100 text-xs" style={{ minWidth: 0 }}>
      <span className="text-blue-700 font-medium whitespace-nowrap" style={{ fontSize: '0.85rem' }}>
        Prompt selected
      </span>
      <button
        className="px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
        style={{ fontSize: '0.85rem', minWidth: '0', height: '1.7rem' }}
        onClick={() => {
          if (onAddToFinalMask) {
            onAddToFinalMask([selectedPromptIndex]);
          }
        }}
      >
        Add to Final Mask
      </button>
      <button
        className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-medium"
        style={{ fontSize: '0.85rem', minWidth: '0', height: '1.7rem' }}
        onClick={() => {
          if (onCancel) {
            onCancel();
          }
        }}
      >
        Cancel
      </button>
    </div>
  );
};

export default PromptSelectionOverlay; 