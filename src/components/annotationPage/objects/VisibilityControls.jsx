import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { 
  useObjectsVisibility, 
  useSetVisibilityMode, 
  useToggleVisibility,
  useVisibilityControlsExpanded,
  useToggleVisibilityControls,
  useInitializeLabelVisibility
} from '../../../stores/selectors/annotationSelectors';
import { useDataset } from '../../../contexts/DatasetContext';
import { fetchLabels } from '../../../api/labels';
import { extractLabelsFromResponse, buildLabelHierarchy } from '../../../utils/labelHierarchy';

const VisibilityControls = () => {
  const isExpanded = useVisibilityControlsExpanded();
  const toggleVisibilityControls = useToggleVisibilityControls();
  const visibility = useObjectsVisibility();
  const setVisibilityMode = useSetVisibilityMode();
  const toggleVisibility = useToggleVisibility();
  const initializeLabelVisibility = useInitializeLabelVisibility();
  const { currentDataset } = useDataset();
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch labels when dataset changes
  useEffect(() => {
    const loadLabels = async () => {
      if (!currentDataset) {
        setLabels([]);
        return;
      }

      setLoading(true);
      try {
        const labelsResponse = await fetchLabels(currentDataset.id);
        const labelsArray = extractLabelsFromResponse(labelsResponse);
        setLabels(labelsArray);
        
        // Initialize visibility state for all labels
        if (labelsArray.length > 0) {
          initializeLabelVisibility(labelsArray);
        }
      } catch (error) {
        console.error('Failed to fetch labels for Annotation Overview:', error);
        setLabels([]);
      } finally {
        setLoading(false);
      }
    };

    loadLabels();
  }, [currentDataset, initializeLabelVisibility]);

  // Build hierarchy to identify root labels
  const labelHierarchy = React.useMemo(() => {
    return buildLabelHierarchy(labels);
  }, [labels]);

  // Get root level labels (labels with no parent_id)
  const rootLabels = React.useMemo(() => {
    return labels.filter(label => !label.parent_id || label.parent_id === null);
  }, [labels]);

  // Get all labels (flat) for display
  const allLabels = React.useMemo(() => {
    return labels.filter(label => label && label.id !== undefined && label.name);
  }, [labels]);

  const visibilityOptions = [
    { id: 'showAll', label: 'Show All', description: 'Show all objects (ignores label filters)', active: visibility.showAll },
    { id: 'rootLevelOnly', label: 'Root Labels Only', description: 'Show only objects with root-level labels', active: visibility.rootLevelOnly },
    { id: 'selectedLevelOnly', label: 'Filter by Labels', description: 'Show only objects with selected labels', active: visibility.selectedLevelOnly },
  ];

  // Check if a label is visible
  const isLabelVisible = (labelId) => {
    const labelIdKey = String(labelId);
    // Default to true if not set (all labels visible by default)
    return visibility.labels[labelIdKey] !== false;
  };

  // Count visible labels
  const visibleLabelCount = React.useMemo(() => {
    return allLabels.filter(label => isLabelVisible(label.id)).length;
  }, [allLabels, visibility.labels]);

  // Select all labels
  const selectAllLabels = () => {
    allLabels.forEach(label => {
      const labelIdKey = String(label.id);
      if (visibility.labels[labelIdKey] === false) {
        toggleVisibility(label.id);
      }
    });
  };

  // Deselect all labels
  const deselectAllLabels = () => {
    allLabels.forEach(label => {
      const labelIdKey = String(label.id);
      if (visibility.labels[labelIdKey] !== false) {
        toggleVisibility(label.id);
      }
    });
  };

  // Check if label filters are disabled (when Show All is active)
  const labelFiltersDisabled = visibility.showAll;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Collapsible Header */}
      <button
        onClick={toggleVisibilityControls}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <Eye className="w-4 h-4 text-gray-700 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900 truncate">
            Visibility Settings
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Display Mode Section */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-gray-800 uppercase tracking-wide flex items-center gap-2">
              <div className="w-1 h-4 bg-teal-500 rounded-full"></div>
              Display Mode
            </div>
            <div className="space-y-2">
              {visibilityOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setVisibilityMode(option.id)}
                  className={`w-full text-left px-3 py-2.5 text-xs font-medium rounded-lg transition-all ${
                    option.active
                      ? 'bg-teal-50 text-teal-900 border-2 border-teal-500 shadow-md'
                      : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                  }`}
                  title={option.description}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{option.label}</span>
                    {option.active && (
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-teal-600" />
                        <span className="text-[9px] text-teal-600 font-bold">ACTIVE</span>
                      </div>
                    )}
                  </div>
                  {option.description && (
                    <div className={`text-[10px] leading-relaxed ${option.active ? 'text-teal-700' : 'text-gray-500'}`}>
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Label Filters Section - Only show when not in Root Labels Only or Show All mode */}
          {!visibility.rootLevelOnly && !visibility.showAll && (
            <div className="space-y-2.5 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                  Label Filters
                </div>
                {!labelFiltersDisabled && allLabels.length > 0 && (
                  <div className="flex gap-1.5 items-center">
                    <button
                      onClick={selectAllLabels}
                      className="px-2.5 py-1 text-[10px] font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-md transition-colors border border-teal-200"
                      title="Show all labels"
                    >
                      All
                    </button>
                    <button
                      onClick={deselectAllLabels}
                      className="px-2.5 py-1 text-[10px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors border border-gray-300"
                      title="Hide all labels"
                    >
                      None
                    </button>
                  </div>
                )}
              </div>
              
              {loading ? (
                <div className="text-xs text-gray-500 text-center py-3">Loading labels...</div>
              ) : allLabels.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-3">No labels available</div>
              ) : (
                <div className="space-y-2">
                  {labelFiltersDisabled ? (
                    <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-md mb-2">
                      <p className="text-xs text-amber-800 font-medium">
                        ⚠️ Label filters disabled in "Show All" mode
                      </p>
                      <p className="text-[10px] text-amber-700 mt-1">
                        Switch to "Filter by Labels" or "Root Labels Only" to use label filters
                      </p>
                    </div>
                  ) : visibility.selectedLevelOnly ? (
                    <div className="px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                      <p className="text-xs text-blue-900 font-medium mb-1">
                        ℹ️ Select labels to filter objects
                      </p>
                      <p className="text-[10px] text-blue-700">
                        Click on label buttons below to show/hide objects with those labels. 
                        {visibleLabelCount === 0 ? ' ⚠️ No labels selected - no objects will be visible.' : ` ${visibleLabelCount} label${visibleLabelCount > 1 ? 's' : ''} selected.`}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-1">
                      <div className="text-[10px] text-gray-600">
                        <span className="font-medium">{visibleLabelCount}</span> of <span className="font-medium">{allLabels.length}</span> labels visible
                      </div>
                      {visibleLabelCount === 0 && (
                        <span className="text-[10px] text-amber-600 font-medium">⚠️ No labels selected</span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {allLabels.map((label) => {
                      const isActive = isLabelVisible(label.id);
                      const isRootLabel = rootLabels.some(root => root.id === label.id);
                      const isDisabled = labelFiltersDisabled;
                      
                      return (
                        <button
                          key={label.id}
                          onClick={() => !isDisabled && toggleVisibility(label.id)}
                          disabled={isDisabled}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                            isDisabled
                              ? 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                              : isActive
                              ? 'bg-teal-100 text-teal-900 border-2 border-teal-400 hover:bg-teal-200 shadow-sm'
                              : 'bg-gray-50 text-gray-600 border border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                          }`}
                          title={isDisabled 
                            ? `"${label.name}" - Disabled in "Show All" mode` 
                            : `${label.name} - Click to ${isActive ? 'hide' : 'show'} objects with this label`
                          }
                        >
                          {!isDisabled && (
                            <>
                              {isActive ? (
                                <Eye className="w-3.5 h-3.5 text-teal-700" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                              )}
                            </>
                          )}
                          <span className="truncate max-w-[100px] font-medium">{label.name}</span>
                          {isRootLabel && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold whitespace-nowrap">
                              ROOT
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default VisibilityControls;