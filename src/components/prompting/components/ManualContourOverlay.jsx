import React from 'react';
import { Check, X, Trash2, PenTool, Eye } from 'lucide-react';

const ManualContourOverlay = ({
  manualContours,
  onAddToFinalMask,
  onRemoveContour,
  onClearAll,
  currentLabel,
  manualAddLoading,
  selectedContourId,
  onSelectContour
}) => {
  if (!manualContours || manualContours.length === 0) {
    return null;
  }

  const handleAddSingleContour = (contour) => {
    if (onAddToFinalMask) {
      onAddToFinalMask([contour]);
    }
  };

  const handleAddAllContours = () => {
    if (onAddToFinalMask) {
      onAddToFinalMask(manualContours);
    }
  };

  const handleSelectContour = (contourId) => {
    if (onSelectContour) {
      // Toggle selection - if already selected, deselect
      const newSelectedId = selectedContourId === contourId ? null : contourId;
      onSelectContour(newSelectedId);
    }
  };

  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-purple-600" />
          <span className="font-medium text-gray-900">Manual Contours</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleAddAllContours}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            title="Add all contours to Final Mask"
            disabled={manualAddLoading}
          >
            {manualAddLoading ? (
              <span className="flex items-center gap-1 animate-pulse"><Check className="w-3 h-3" /> Adding...</span>
            ) : (
              <><Check className="w-3 h-3" /> All</>
            )}
          </button>
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            title="Clear all manual contours"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {manualContours.map((contour, index) => {
          const isSelected = selectedContourId === contour.id;
          return (
            <div
              key={contour.id}
              className={`flex items-center justify-between p-2 rounded-md border transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-300' 
                  : 'bg-purple-50 border-purple-200 hover:bg-purple-75'
              }`}
              onClick={() => handleSelectContour(contour.id)}
              title="Click to highlight contour on canvas"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-purple-700' : 'bg-purple-500'}`}></div>
                <span className={`text-sm ${isSelected ? 'text-gray-800 font-medium' : 'text-gray-700'}`}>
                  Contour {index + 1} ({contour.coordinates.length} points)
                </span>
                {isSelected && (
                  <Eye className="w-3 h-3 text-purple-600" title="Currently highlighted" />
                )}
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleAddSingleContour(contour)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  title="Add to Final Mask"
                  disabled={manualAddLoading}
                >
                  {manualAddLoading ? (
                    <span className="flex items-center gap-1 animate-spin"><Check className="w-3 h-3" /></span>
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={() => onRemoveContour(contour.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  title="Remove contour"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
          <span>Click contour to highlight •</span>
          <Check className="w-3 h-3" />
          <span>to add to Final Mask</span>
        </div>
      </div>
    </div>
  );
};

export default ManualContourOverlay; 