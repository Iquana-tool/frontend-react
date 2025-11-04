import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { 
  useObjectsVisibility, 
  useSetVisibilityMode, 
  useToggleVisibility,
  useVisibilityControlsExpanded,
  useToggleVisibilityControls
} from '../../../stores/selectors/annotationSelectors';

const VisibilityControls = () => {
  const isExpanded = useVisibilityControlsExpanded();
  const toggleVisibilityControls = useToggleVisibilityControls();
  const visibility = useObjectsVisibility();
  const setVisibilityMode = useSetVisibilityMode();
  const toggleVisibility = useToggleVisibility();

  const visibilityOptions = [
    { id: 'showAll', label: 'All', active: visibility.showAll },
    { id: 'rootLevelOnly', label: 'Root level only', active: visibility.rootLevelOnly },
    { id: 'selectedLevelOnly', label: 'Selected level only', active: visibility.selectedLevelOnly },
  ];

  const labels = [
    { key: 'label1', name: 'Label 1' },
    { key: 'label2', name: 'Label 2' },
    { key: 'label3', name: 'Label 3' },
    { key: 'label4', name: 'Label 4' },
    { key: 'label5', name: 'Label 5' },
    { key: 'label6', name: 'Label 6' },
  ];


  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden bg-white opacity-50 pointer-events-none">
      {/* Collapsible Header */}
      <button
        onClick={toggleVisibilityControls}
        disabled
        className="w-full flex items-center justify-between p-2 lg:p-3 bg-blue-50 transition-colors cursor-not-allowed"
      >
        <div className="flex items-center space-x-1.5 lg:space-x-2 min-w-0 flex-1">
          <span className="text-xs lg:text-sm font-semibold text-blue-900 truncate">
            Visibility of annotations
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-700 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-700 flex-shrink-0" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-2 lg:p-3 border-t border-blue-100 space-y-3 lg:space-y-4">
          {/* Visibility options section */}
          <div className="space-y-2 lg:space-y-3">
            <div className="flex flex-wrap gap-1 lg:gap-1.5">
              {visibilityOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setVisibilityMode(option.id)}
                  disabled
                  className={`px-1.5 lg:px-2 py-1 text-xs font-medium rounded transition-colors flex-shrink-0 min-w-0 cursor-not-allowed ${
                    option.active
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}
                  title={option.label}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Label filters section */}
          <div className="space-y-2 lg:space-y-3">
            <div className="flex flex-wrap gap-1 lg:gap-1.5">
              {labels.map((label) => {
                const isActive = visibility.labels[label.key];
                
                return (
                  <button
                    key={label.key}
                    onClick={() => toggleVisibility(label.key)}
                    disabled
                    className={`px-1.5 lg:px-2 py-1 text-xs font-medium rounded transition-colors flex-shrink-0 min-w-0 cursor-not-allowed ${
                      isActive
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                    title={label.name}
                  >
                    <span className="truncate">{label.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisibilityControls;