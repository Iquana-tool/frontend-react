import { useCallback } from 'react';
import {
  useEditModeActive,
  useEditModeContourId,
  useEditModeDraftCoordinates,
  useEditModeIsDirty,
  useEditModeObjectId,
  useEnterEditMode,
  useUpdateDraftPoint,
  useResetDraft,
  useExitEditMode,
  useUpdateObject,
  useObjectsList,
} from '../stores/selectors/annotationSelectors';
import annotationSession from '../services/annotationSession';

/**
 * Hook for managing contour editing operations
 * Handles entering/exiting edit mode and saving changes via WebSocket
 */
export const useContourEditing = () => {
  // State selectors
  const isEditModeActive = useEditModeActive();
  const editingObjectId = useEditModeObjectId();
  const editingContourId = useEditModeContourId();
  const draftCoordinates = useEditModeDraftCoordinates();
  const isDirty = useEditModeIsDirty();
  const objects = useObjectsList();

  // Actions
  const enterEditMode = useEnterEditMode();
  const updateDraftPoint = useUpdateDraftPoint();
  const resetDraft = useResetDraft();
  const exitEditMode = useExitEditMode();
  const updateObject = useUpdateObject();

  /**
   * Start editing a contour
   * @param {number|string} objectId - Store object ID for local state management
   * @param {number} contourId - Backend contour ID for API calls
   * @param {Array<number>} x - Original x coordinates (normalized 0-1)
   * @param {Array<number>} y - Original y coordinates (normalized 0-1)
   */
  const startEditing = useCallback((objectId, contourId, x, y) => {
    if (!x || !y || x.length === 0 || y.length === 0) {
      return;
    }
    
    enterEditMode(objectId, contourId, x, y);
  }, [enterEditMode]);

  /**
   * Update a single point in the draft contour with interpolation
   * @param {number} pointIndex - Index of the point to update
   * @param {number} normalizedX - New x coordinate (normalized 0-1)
   * @param {number} normalizedY - New y coordinate (normalized 0-1)
   * @param {number} decimationFactor - Factor for point decimation 
   */
  const updatePoint = useCallback((pointIndex, normalizedX, normalizedY, decimationFactor = 1) => {
    if (!isEditModeActive) {
      return;
    }
    
    updateDraftPoint(pointIndex, normalizedX, normalizedY, decimationFactor);
  }, [isEditModeActive, updateDraftPoint]);

  /**
   * Cancel editing and revert to original coordinates
   */
  const cancelEditing = useCallback(() => {
    if (!isEditModeActive) return;
    
    exitEditMode();
  }, [isEditModeActive, exitEditMode]);

  /**
   * Reset draft to original coordinates without exiting edit mode
   */
  const resetChanges = useCallback(() => {
    if (!isEditModeActive) return;
    
    resetDraft();
  }, [isEditModeActive, resetDraft]);

  /**
   * Save the edited contour to the backend
   * Sends WebSocket message and updates local store immediately
   */
  const saveEditing = useCallback(async () => {
    if (!isEditModeActive || !editingObjectId || !editingContourId || !draftCoordinates) {
      return;
    }

    if (!isDirty) {
      // No changes made, just exit
      exitEditMode();
      return;
    }

    try {
      // Find the object being edited
      const currentObject = objects.find(obj => obj.id === editingObjectId);
      if (!currentObject) {
        return;
      }

      // Store original coordinates and path for potential revert
      const originalCoordinates = {
        x: [...currentObject.x],
        y: [...currentObject.y],
        path: currentObject.path,
      };

      // Update local state immediately (optimistic update)
      // updateObject expects (id, updates) not the full object
      // Clear the cached path so it regenerates from new x,y coordinates
      updateObject(editingObjectId, {
        x: [...draftCoordinates.x],
        y: [...draftCoordinates.y],
        path: null, // Clear cached path to force regeneration
      });
      
      // Exit edit mode immediately to show the changes on the canvas
      exitEditMode();

      // Send update to backend via WebSocket (in background)
      try {
        const response = await annotationSession.modifyObject(editingContourId, {
          x: draftCoordinates.x,
          y: draftCoordinates.y,
        });

        if (!response.success) {
          // Revert local changes on failure
          updateObject(editingObjectId, originalCoordinates);
          alert('Failed to save contour changes. Changes have been reverted.');
        }
      } catch (error) {
        // Revert local changes on network error
        updateObject(editingObjectId, originalCoordinates);
        alert('Network error while saving. Changes have been reverted.');
      }
    } catch (error) {
      throw error;
    }
  }, [
    isEditModeActive,
    editingObjectId,
    editingContourId,
    draftCoordinates,
    isDirty,
    objects,
    updateObject,
    exitEditMode,
  ]);

  return {
    // State
    isEditModeActive,
    editingContourId,
    draftCoordinates,
    isDirty,
    
    // Actions
    startEditing,
    updatePoint,
    cancelEditing,
    resetChanges,
    saveEditing,
  };
};
