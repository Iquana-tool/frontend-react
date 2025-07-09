import React, { useState, useEffect } from 'react';
import { Check, X, Trash2, Brain } from 'lucide-react';
import { useDataset } from '../../../contexts/DatasetContext';
import * as api from '../../../api';

const SegmentationOverlay = ({
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

  if (allContours.length === 0) {
    return null;
  }



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

  return (
    <div 
      className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-10"
      role="dialog"
      aria-label="AI Segmentation Results"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-600" aria-hidden="true" />
          <span className="font-medium text-gray-900">AI Segmentation Results</span>
        </div>
        <div className="flex items-center gap-1">
          {selectedCount > 0 && (
            <button
              onClick={handleAddToFinal}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title={`Add ${selectedCount} selected contour${selectedCount > 1 ? 's' : ''} to Final Mask`}
              disabled={isAddingToFinalMask}
            >
              {isAddingToFinalMask ? (
                <span className="flex items-center gap-1">
                  <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
                  Adding...
                </span>
              ) : (
                <>
                  <Check className="w-3 h-3" aria-hidden="true" />
                  Selected ({selectedCount})
                </>
              )}
            </button>
          )}
          <button
            onClick={onClearAllResults}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            title="Clear all segmentation results"
            aria-label="Clear all segmentation results"
          >
            <Trash2 className="w-3 h-3" aria-hidden="true" />
            Clear All
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
        <span>Select contours to manage:</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={onSelectAllContours} 
            className="text-blue-600 hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
            aria-label="Select all contours"
          >
            All
          </button>
          <span aria-hidden="true">•</span>
          <button 
            onClick={onClearContourSelection} 
            className="text-blue-600 hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
            aria-label="Clear contour selection"
          >
            None
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {allContours.map((contour, index) => {
          const isSelected = selectedContourIds.includes(contour.id);
          
          return (
            <div
              key={contour.id}
              className={`flex items-center justify-between p-2 rounded-md border transition-colors ${
                isSelected 
                  ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleContourSelection(contour.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label={`Select ${getContourLabelName(contour, allContours, index)}`}
                />
                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-blue-500'}`}></div>
                <span className="text-sm text-gray-700">
                  {getContourLabelName(contour, allContours, index)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAddSingleContour(contour)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  title="Add this contour to Final Mask"
                  disabled={isAddingToFinalMask}
                  aria-label="Add this contour to Final Mask"
                >
                  {isAddingToFinalMask ? (
                    <span className="flex items-center gap-1"><div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div></span>
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={() => onDeleteContour(contour.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  title="Remove this contour"
                  aria-label={`Remove ${getContourLabelName(contour, allContours, index)}`}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
          <span>Click</span>
          <Check className="w-3 h-3" />
          <span>to add individual contours, or select multiple and click "Selected"</span>
        </div>
      </div>
    </div>
  );
};

export default SegmentationOverlay; 