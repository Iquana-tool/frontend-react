import React from 'react';
import { useZoomLevel, useSetZoomLevel } from '../../../stores/selectors/annotationSelectors';

/**
 * Zoom controls component that works directly with the Zustand store
 */
const ZoomControls = () => {
  const zoomLevel = useZoomLevel();
  const setZoomLevel = useSetZoomLevel();

  const handleZoomIn = () => {
    const newLevel = Math.min(zoomLevel * 1.2, 10);
    setZoomLevel(newLevel);
  };

  const handleZoomOut = () => {
    const newLevel = Math.max(zoomLevel / 1.2, 0.1);
    setZoomLevel(newLevel);
  };

  const handleReset = () => {
    setZoomLevel(1);
  };

  return (
    <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
      <button
        onClick={handleZoomOut}
        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
        title="Zoom Out"
      >
        −
      </button>
      
      <span className="text-sm font-medium min-w-[60px] text-center">
        {Math.round(zoomLevel * 100)}%
      </span>
      
      <button
        onClick={handleZoomIn}
        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
        title="Zoom In"
      >
        +
      </button>
      
      <button
        onClick={handleReset}
        className="px-3 py-1 bg-teal-200 hover:bg-teal-300 rounded text-sm font-medium transition-colors"
        title="Reset View"
      >
        Reset
      </button>
    </div>
  );
};

export default ZoomControls;
