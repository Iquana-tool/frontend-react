import React from 'react';
import { useObjectsVisibility, useSetVisibilityMode } from '../../../stores/selectors/annotationSelectors';

const VisibilityControls = () => {
  const visibility = useObjectsVisibility();
  const setVisibilityMode = useSetVisibilityMode();

  const visibilityOptions = [
    { id: 'showAll', label: 'All', active: visibility.showAll },
    { id: 'rootLevelOnly', label: 'Root level only', active: visibility.rootLevelOnly },
    { id: 'selectedLevelOnly', label: 'Selected level only', active: visibility.selectedLevelOnly },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">Visibility of annotations</h3>
      
      <div className="flex flex-wrap gap-2">
        {visibilityOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setVisibilityMode(option.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              option.active
                ? 'bg-purple-200 text-purple-800 border border-purple-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VisibilityControls;