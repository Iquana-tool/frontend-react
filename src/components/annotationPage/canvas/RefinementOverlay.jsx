import React, { useEffect, useCallback } from 'react';
import {
  useRefinementModeActive,
  useRefinementModeObjectId,
  useExitRefinementMode,
  useObjectsList,
  useSetZoomLevel,
  useSetPanOffset,
  useExitEditMode,
  useEditModeActive,
  useUpdateObject,
} from '../../../stores/selectors/annotationSelectors';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import annotationSession from '../../../services/annotationSession';

const RefinementOverlay = () => {
  const refinementModeActive = useRefinementModeActive();
  const refinementModeObjectId = useRefinementModeObjectId();
  const exitRefinementMode = useExitRefinementMode();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();
  const objectsList = useObjectsList();
  const exitEditMode = useExitEditMode();
  const editModeActive = useEditModeActive();
  const updateObject = useUpdateObject();

  // Find the object being refined
  const refinementObject = refinementModeActive && refinementModeObjectId
    ? objectsList.find(obj => obj.id === refinementModeObjectId)
    : null;

  /**
   * Save any pending edit-mode changes, then exit edit mode.
   * Reads the latest state directly from the store to avoid stale closures.
   */
  const saveAndExitEdit = useCallback(() => {
    const { editMode, objects } = useAnnotationStore.getState();
    if (!editMode.active) return;

    if (editMode.isDirty && editMode.draftCoordinates && editMode.objectId) {
      const editObj = objects.list.find(o => o.id === editMode.objectId);
      if (editObj) {
        updateObject(editMode.objectId, {
          x: [...editMode.draftCoordinates.x],
          y: [...editMode.draftCoordinates.y],
          path: null,
        });
        annotationSession
          .modifyObject(editMode.contourId, { x: editMode.draftCoordinates.x, y: editMode.draftCoordinates.y })
          .catch(err => console.error('Save on exit refinement failed:', err));
      }
    }
    exitEditMode();
  }, [exitEditMode, updateObject]);

  const handleExitRefinementMode = useCallback(async () => {
    try {
      // Save any pending contour edits before leaving
      saveAndExitEdit();

      // Send unselect message to backend
      await annotationSession.unselectRefinementObject();
      
      // Reset zoom and pan
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      
      // Exit refinement mode in store
      exitRefinementMode();
    } catch (error) {
      console.error('Failed to exit refinement mode:', error);
      alert(`Failed to exit refinement mode: ${error.message || 'Unknown error'}`);
    }
  }, [saveAndExitEdit, exitRefinementMode, setZoomLevel, setPanOffset]);

  // Handle Escape key to exit refinement mode (and save edits)
  useEffect(() => {
    if (!refinementModeActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Prevent EditableContourOverlay from also handling Escape
        e.stopImmediatePropagation();
        handleExitRefinementMode();
      }
    };

    // Use capture phase so this fires before EditableContourOverlay's bubble-phase listener
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [refinementModeActive, handleExitRefinementMode]);

  if (!refinementModeActive || !refinementObject) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
      {/* Exit refinement mode button — top-right */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button
          onClick={handleExitRefinementMode}
          className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm text-gray-800 rounded-lg shadow-xl hover:bg-white border border-gray-200/50 transition-all duration-200 hover:shadow-2xl"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="text-sm font-semibold">Exit Refinement</span>
          <span className="text-xs text-gray-500 font-normal">(ESC)</span>
        </button>
      </div>

      {/* Refinement mode indicator — top-left */}
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
            <span className="text-xs text-gray-500">
              {editModeActive
                ? 'Drag blue points to edit contour · Click to add prompts · Run AI to refine · ESC to save & exit'
                : 'Add prompts and Run AI Segmentation to refine · ESC to exit'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefinementOverlay;
