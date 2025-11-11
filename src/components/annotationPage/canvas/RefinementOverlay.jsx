import React from 'react';
import {
  useRefinementModeActive,
  useRefinementModeObjectId,
  useExitRefinementMode,
  useObjectsList,
  useSetZoomLevel,
  useSetPanOffset,
} from '../../../stores/selectors/annotationSelectors';
import annotationSession from '../../../services/annotationSession';

const RefinementOverlay = () => {
  const refinementModeActive = useRefinementModeActive();
  const refinementModeObjectId = useRefinementModeObjectId();
  const exitRefinementMode = useExitRefinementMode();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();
  const objectsList = useObjectsList();

  // Find the object being refined
  const refinementObject = refinementModeActive && refinementModeObjectId
    ? objectsList.find(obj => obj.id === refinementModeObjectId)
    : null;

  const handleExitRefinementMode = async () => {
    try {
      // Send unselect message to backend
      await annotationSession.unselectRefinementObject();
      
      // Reset zoom and pan before exiting
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      
      // Exit refinement mode in store
      exitRefinementMode();
      
      console.log('Exited refinement mode');
    } catch (error) {
      console.error('Failed to exit refinement mode:', error);
      alert(`Failed to exit refinement mode: ${error.message || 'Unknown error'}`);
    }
  };

  if (!refinementModeActive || !refinementObject) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
      {/* Exit refinement mode button - fixed to viewport top-right */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button
          onClick={handleExitRefinementMode}
          className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm text-gray-800 rounded-lg shadow-xl hover:bg-white border border-gray-200/50 transition-all duration-200 hover:shadow-2xl"
        >
          <svg
            className="w-4 h-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span className="text-sm font-semibold">Exit Refinement</span>
          <span className="text-xs text-gray-500 font-normal">(ESC)</span>
        </button>
      </div>

      {/* Refinement mode indicator - fixed to viewport top-left */}
      <div className="absolute top-4 left-4 px-4 py-2.5 bg-white/95 backdrop-blur-sm text-gray-800 rounded-lg shadow-xl border border-gray-200/50 text-sm font-medium pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-2.5 h-2.5 bg-purple-400 rounded-full animate-ping opacity-75"></div>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-700">Refinement Mode</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600 font-medium">{refinementObject.label || `Object #${refinementObject.id}`}</span>
            </div>
            <span className="text-xs text-gray-500">Press ESC to exit refinement mode</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefinementOverlay;

