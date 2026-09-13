import React, { useEffect, useCallback } from 'react';
import ModeBanner from '../workspace/ModeBanner';
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

  // Sits above the control-points overlay (z65) so the exit control receives
  // clicks instead of dropping a prompt on the canvas beneath it.
  return (
    <ModeBanner
      title="Refinement Mode"
      subject={refinementObject.label || `Object #${refinementObject.id}`}
      hint={
        editModeActive
          ? 'Drag the control points, or add prompts and run the model'
          : 'Add prompts and run the model to refine this outline'
      }
      dotClass="bg-ac"
      exitLabel="Exit refinement"
      onExit={handleExitRefinementMode}
    />
  );
};

export default RefinementOverlay;
