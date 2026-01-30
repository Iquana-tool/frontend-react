import React from 'react';
import { useObjectsVisibility, useToggleVisibility } from '../../../stores/selectors/annotationSelectors';

const LabelFilters = () => {
  const visibility = useObjectsVisibility();
  const toggleVisibility = useToggleVisibility();

  const labels = [
    { key: 'label1', name: 'Label 1' },
    { key: 'label2', name: 'Label 2' },
    { key: 'label3', name: 'Label 3' },
    { key: 'label4', name: 'Label 4' },
    { key: 'label5', name: 'Label 5' },
    { key: 'label6', name: 'Label 6' },
  ];

  return (
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
                  ? 'bg-purple-200 text-purple-800 border border-purple-300'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {label.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LabelFilters;
