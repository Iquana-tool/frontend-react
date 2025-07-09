import React, { useState, useEffect } from 'react';
import { Check, X, Trash2, Brain, Layers, Sparkles } from 'lucide-react';
import { getLabelColor, getLabelColorByName } from '../../../utils/labelColors';
import { useDataset } from '../../../contexts/DatasetContext';
import * as api from '../../../api';

const SegmentationResultsPanel = ({
  segmentationMasks = [],
  selectedContourIds = [],
  onToggleContourSelection,
  onDeleteContour,
  onSelectAllContours,
  onClearContourSelection,
  onClearAllResults,
  onAddToFinalMask,
  onAddSingleContourToFinalMask,
  isAddingToFinalMask = false,
}) => {
  const { currentDataset } = useDataset();
  const [availableLabels, setAvailableLabels] = useState([]);

  // Fetch available labels when component mounts or dataset changes
  useEffect(() => {
    const fetchLabels = async () => {
      if (!currentDataset) {
        setAvailableLabels([]);
        return;
      }

      try {
        const labels = await api.fetchLabels(currentDataset.id);
        setAvailableLabels(labels || []);
      } catch (err) {
        console.error("Error fetching labels:", err);
        setAvailableLabels([]);
      }
    };
    
    fetchLabels();
  }, [currentDataset]);
  const allContours = React.useMemo(() => {
    const flattened = segmentationMasks.flatMap((mask, maskIndex) => {
      return (mask.contours || []).map((contour, index) => {
        const computedId = contour.id || `${mask.id}-${index}`;
        
        return {
          ...contour,
          id: computedId,
          maskIndex,
          contourIndex: index,
        };
      });
    });
    
    return flattened;
  }, [segmentationMasks]);

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

  const getContourPointCount = (contour) => {
    if (contour.coordinates) return contour.coordinates.length;
    if (contour.x) return contour.x.length;
    return 'N/A';
  };

  const getContourLabelName = (contour, allContours, currentIndex) => {
    // Get the base label name by looking up in availableLabels
    let baseLabelName;
    if (contour.label_name) {
      baseLabelName = contour.label_name;
    } else if (contour.label && availableLabels.length > 0) {
      const labelInfo = availableLabels.find(label => label.id === contour.label);
      baseLabelName = labelInfo ? labelInfo.name : `Label ${contour.label}`;
    } else {
      baseLabelName = 'Unlabeled';
    }
    
    // Group contours by their base label name and count occurrences
    const contoursWithSameLabel = allContours.filter(c => {
      let cBaseLabelName;
      if (c.label_name) {
        cBaseLabelName = c.label_name;
      } else if (c.label && availableLabels.length > 0) {
        const labelInfo = availableLabels.find(label => label.id === c.label);
        cBaseLabelName = labelInfo ? labelInfo.name : `Label ${c.label}`;
      } else {
        cBaseLabelName = 'Unlabeled';
      }
      return cBaseLabelName === baseLabelName;
    });
    
    // If there's only one contour with this label, don't add a number
    if (contoursWithSameLabel.length === 1) {
      return baseLabelName;
    }
    
    // Find the position of current contour within contours of the same type
    const indexInGroup = contoursWithSameLabel.findIndex(c => c.id === contour.id) + 1;
    
    return `${baseLabelName} ${indexInGroup}`;
  };

  const selectedCount = selectedContourIds.length;
  const hasResults = allContours.length > 0;

  if (!hasResults) {
    return (
      <div className="w-80 bg-gradient-to-br from-slate-50 to-slate-100 border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">AI Segmentation</h3>
              <p className="text-xs text-slate-500">Results will appear here</p>
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-4 bg-blue-50 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          <h4 className="font-medium text-slate-700 mb-2">No results yet</h4>
          <p className="text-sm text-slate-500 leading-relaxed">
            Run AI segmentation to see contours here. Use the tools above to draw prompts and segment the image.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gradient-to-br from-slate-50 to-slate-100 border-r border-slate-200 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">AI Segmentation</h3>
              <p className="text-xs text-slate-500">{allContours.length} contour{allContours.length !== 1 ? 's' : ''} found</p>
            </div>
          </div>
          
          <button
            onClick={onClearAllResults}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Clear all results"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {selectedCount > 0 && (
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
                  Add Selected ({selectedCount})
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

      {/* Contours list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
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
                      {getContourLabelName(contour, allContours, index)}
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

      {/* Footer info */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white/50">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
          <span>Select contours and add to final mask</span>
        </div>
      </div>
    </div>
  );
};

export default SegmentationResultsPanel; 