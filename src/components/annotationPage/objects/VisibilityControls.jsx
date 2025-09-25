import React from 'react';
import { useObjectsVisibility, useSetVisibilityMode, useToggleVisibility } from '../../../stores/selectors/annotationSelectors';

const VisibilityControls = () => {
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
    <div className="space-y-4 lg:space-y-6">
      {/* Visibility of annotations section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-600">Visibility of annotations</h3>
        
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
  );
};

export default VisibilityControls;