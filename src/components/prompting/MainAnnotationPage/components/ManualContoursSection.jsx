import React from 'react';
import { Check, X, Trash2, PenTool } from 'lucide-react';
import { getManualContourLabelName } from '../utils/labelUtils';

const ManualContoursSection = ({
  manualContours,
  selectedManualContourIds,
  onToggleManualContourSelection,
  onDeleteManualContour,
  onSelectAllManualContours,
  onClearManualContourSelection,
  onClearAllManualContours,
  onAddManualContoursToFinalMask,
  onAddSingleManualContourToFinalMask,
  isAddingManualToFinalMask,
  availableLabels,
}) => {
  const selectedManualCount = selectedManualContourIds.length;

  const handleAddManualToFinal = () => {
    if (onAddManualContoursToFinalMask) {
      const contoursToAdd = manualContours.filter(c => selectedManualContourIds.includes(c.id));
      onAddManualContoursToFinalMask(contoursToAdd);
    }
  };

  const handleAddSingleManualContour = (contour) => {
    if (onAddSingleManualContourToFinalMask) {
      onAddSingleManualContourToFinalMask([contour]);
    }
  };

  return (
    <div>
      <div className="px-4 py-3 bg-white/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-slate-800">Manual Contours</span>
            <span className="text-xs text-slate-500">({manualContours.length})</span>
          </div>
          
          <button
            onClick={onClearAllManualContours}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Clear all manual contours"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Manual Action buttons */}
        <div className="flex gap-2">
          {selectedManualCount > 0 && (
            <button
              onClick={handleAddManualToFinal}
              disabled={isAddingManualToFinalMask}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm"
            >
              {isAddingManualToFinalMask ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Add Selected ({selectedManualCount})
                </>
              )}
            </button>
          )}
          
          <div className="flex gap-1">
            <button 
              onClick={onSelectAllManualContours} 
              className="px-3 py-2 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            >
              All
            </button>
            <button 
              onClick={onClearManualContourSelection} 
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              None
            </button>
          </div>
        </div>
      </div>

      {/* Manual Contours list */}
      <div className="p-3 space-y-2">
        {manualContours.map((contour, index) => {
          const isSelected = selectedManualContourIds.includes(contour.id);
          
          return (
            <div
              key={contour.id}
              className={`group relative p-3 rounded-lg border transition-all duration-200 ${
                isSelected 
                  ? 'bg-purple-50 border-purple-200 shadow-sm ring-1 ring-purple-200' 
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleManualContourSelection(contour.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 transition-colors"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-purple-500' : 'bg-slate-400'}`}></div>
                    <span className="text-sm font-medium text-slate-800">
                      {getManualContourLabelName(contour, manualContours, availableLabels, index)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {contour.coordinates?.length || 0} points
                  </p>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleAddSingleManualContour(contour)}
                    disabled={isAddingManualToFinalMask}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Add to final mask"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteManualContour(contour.id)}
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

export default ManualContoursSection; 