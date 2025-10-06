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
    <div className="border border-blue-200 rounded-lg overflow-hidden bg-white">
      {/* Collapsible Header */}
      <button
        onClick={toggleVisibilityControls}
        className="w-full flex items-center justify-between p-2 md:p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center space-x-1.5 md:space-x-2">
          <span className="text-xs md:text-sm font-semibold text-blue-900">
            Visibility of annotations
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-700" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-700" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-2 md:p-3 border-t border-blue-100 space-y-4">
          {/* Visibility options section */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {visibilityOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setVisibilityMode(option.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    option.active
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label filters section */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {labels.map((label) => {
                const isActive = visibility.labels[label.key];
                
                return (
                  <button
                    key={label.key}
                    onClick={() => toggleVisibility(label.key)}
                    className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                      isActive
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                    }`}
                  >
                    {label.name}
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