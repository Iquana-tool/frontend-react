import React, { useEffect } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import {
  useObjectsVisibility,
  useSetVisibilityMode,
  useToggleVisibility,
  useVisibilityControlsExpanded,
  useToggleVisibilityControls,
  useInitializeLabelVisibility,
  useDatasetLabels
} from '../../../stores/selectors/annotationSelectors';

const VisibilityControls = () => {
  const isExpanded = useVisibilityControlsExpanded();
  const toggleVisibilityControls = useToggleVisibilityControls();
  const visibility = useObjectsVisibility();
  const setVisibilityMode = useSetVisibilityMode();
  const toggleVisibility = useToggleVisibility();
  const initializeLabelVisibility = useInitializeLabelVisibility();
  
  // Use cached labels from the store (populated by AnnotationPageV2)
  const labels = useDatasetLabels();

  // Initialize visibility state when cached labels arrive
  useEffect(() => {
    if (labels.length > 0) {
      initializeLabelVisibility(labels);
    }
  }, [labels, initializeLabelVisibility]);

  // Get root level labels (labels with no parent_id)
  const rootLabels = React.useMemo(() => {
    return labels.filter(label => !label.parent_id || label.parent_id === null);
  }, [labels]);

  // Get all labels (flat) for display
  const allLabels = React.useMemo(() => {
    return labels.filter(label => label && label.id !== undefined && label.name);
  }, [labels]);

  const visibilityOptions = [
    { id: 'showAll', label: 'All', description: 'Show all objects (ignores label filters)', active: visibility.showAll },
    { id: 'rootLevelOnly', label: 'Root', description: 'Show only objects with root-level labels', active: visibility.rootLevelOnly },
    { id: 'selectedLevelOnly', label: 'Filter', description: 'Show only objects with selected labels', active: visibility.selectedLevelOnly },
  ];

  const activeOption = visibilityOptions.find((option) => option.active);

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

  return (
    <div>
      {/* Collapsible Header */}
      <button
        onClick={toggleVisibilityControls}
        className="w-full flex items-center justify-between pb-2 border-b-2 border-gray-200 group"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-1 h-4 bg-gray-400 rounded-full shrink-0" />
          <Eye className="w-4 h-4 text-gray-600 shrink-0" />
          <span className="text-sm font-semibold text-gray-900 truncate">Visibility</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Show the active mode when collapsed so it stays informative */}
          {!isExpanded && activeOption && (
            <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {activeOption.label}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-700 transition-colors" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="pt-2.5 space-y-2.5">
          {/* Display Mode — compact segmented control */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg">
            {visibilityOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setVisibilityMode(option.id)}
                title={option.description}
                className={`px-2 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
                  option.active
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Label Filters — only in "Filter" mode */}
          {!visibility.rootLevelOnly && !visibility.showAll && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Labels{allLabels.length > 0 ? ` · ${visibleLabelCount}/${allLabels.length}` : ''}
                </span>
                {allLabels.length > 0 && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={selectAllLabels}
                      className="text-[10px] font-semibold text-teal-700 hover:text-teal-900 transition-colors"
                      title="Show all labels"
                    >
                      All
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      onClick={deselectAllLabels}
                      className="text-[10px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                      title="Hide all labels"
                    >
                      None
                    </button>
                  </div>
                )}
              </div>

              {allLabels.length === 0 ? (
                <div className="text-[11px] text-gray-500 py-1">No labels available</div>
              ) : (
                <>
                  {visibleLabelCount === 0 && (
                    <p className="text-[10px] text-amber-600 font-medium">
                      No labels selected — nothing will show.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {allLabels.map((label) => {
                      const isActive = isLabelVisible(label.id);
                      const isRootLabel = rootLabels.some((root) => root.id === label.id);

                      return (
                        <button
                          key={label.id}
                          onClick={() => toggleVisibility(label.id)}
                          className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 ${
                            isActive
                              ? 'bg-teal-100 text-teal-800 border border-teal-300 hover:bg-teal-200'
                              : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                          }`}
                          title={`${label.name} — click to ${isActive ? 'hide' : 'show'} objects with this label`}
                        >
                          {isActive ? (
                            <Eye className="w-3 h-3 text-teal-700" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-gray-400" />
                          )}
                          <span className="truncate max-w-[90px]">{label.name}</span>
                          {isRootLabel && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-blue-400"
                              title="Root label"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VisibilityControls;