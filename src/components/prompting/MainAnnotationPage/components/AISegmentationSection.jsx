import React from 'react';
import { Check, X, Trash2, Brain } from 'lucide-react';
import { getContourLabelName } from '../utils/labelUtils';

const AISegmentationSection = ({
  allContours,
  selectedContourIds,
  onToggleContourSelection,
  onDeleteContour,
  onSelectAllContours,
  onClearContourSelection,
  onClearAllResults,
  onAddToFinalMask,
  onAddSingleContourToFinalMask,
  isAddingToFinalMask,
  availableLabels,
}) => {
  const selectedAICount = selectedContourIds.length;

  const handleAddToFinal = () => {
    if (onAddToFinalMask) {
      const contoursToAdd = allContours.filter(c => selectedContourIds.includes(c.id));
      onAddToFinalMask(contoursToAdd);
    }
  };

  const handleAddSingleContour = (contour) => {
    if (onAddSingleContourToFinalMask) {
      onAddSingleContourToFinalMask([contour]);
    }
  };

  return (
    <div className="border-b border-slate-200">
      <div className="px-4 py-3 bg-white/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-slate-800">AI Segmentation</span>
            <span className="text-xs text-slate-500">({allContours.length})</span>
          </div>
          
          <button
            onClick={onClearAllResults}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Clear all AI results"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* AI Action buttons */}
        <div className="flex gap-2">
          {selectedAICount > 0 && (
            <button
              onClick={handleAddToFinal}
              disabled={isAddingToFinalMask}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm"
            >
              {isAddingToFinalMask ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Add Selected ({selectedAICount})
                </>
              )}
            </button>
          )}
          
          <div className="flex gap-1">
            <button 
              onClick={onSelectAllContours} 
              className="px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              All
            </button>
            <button 
              onClick={onClearContourSelection} 
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              None
            </button>
          </div>
        </div>
      </div>

      {/* AI Contours list */}
      <div className="p-3 space-y-2">
        {allContours.map((contour, index) => {
          const isSelected = selectedContourIds.includes(contour.id);
          
          return (
            <div
              key={contour.id}
              className={`group relative p-3 rounded-lg border transition-all duration-200 ${
                isSelected 
                  ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' 
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleContourSelection(contour.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-colors"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                    <span className="text-sm font-medium text-slate-800">
                      {getContourLabelName(contour, allContours, availableLabels, index)}
                    </span>
                  </div>

                  {contour.quantifications && (
                    <p className="text-xs text-slate-500 mt-1">
                      Area: {contour.quantifications.area?.toFixed(1) || 'N/A'}
                    </p>
                  )}
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleAddSingleContour(contour)}
                    disabled={isAddingToFinalMask}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Add to final mask"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteContour(contour.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove contour"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AISegmentationSection; 