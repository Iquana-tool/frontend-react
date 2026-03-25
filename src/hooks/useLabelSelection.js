import { useCallback } from 'react';
import { getContourId, extractLabelInfo } from '../utils/objectUtils';
import annotationSession from '../services/annotationSession';

/**
 * Shared hook for label selection logic
 * Handles updating object labels via the WebSocket session (OBJECT_MODIFY message).
 * The backend validates the label against the dataset hierarchy, adds the current
 * user to reviewed_by automatically, and responds with OBJECT_MODIFIED.
 *
 * @param {Function} updateObject - Function to update object in store
 * @param {Function} onSuccess - Optional callback on successful label assignment
 * @param {Function} onError - Optional callback on error
 * @returns {Function} - Function to handle label selection
 */
export function useLabelSelection(updateObject, onSuccess, onError) {
  const handleLabelSelect = useCallback(async (object, label) => {
    if (!object || !label) return;

    // Extract contour ID and label info
    const contourId = getContourId(object);
    const { id: labelId, name: labelName } = extractLabelInfo(label);

    try {
      // Send label update over WebSocket.
      // Backend automatically adds the current user to reviewed_by when label_id is assigned.
      const response = await annotationSession.modifyObject(contourId, {
        label_id: labelId,
        reviewed_by: ['current_user'], // resolved to actual user_id on the backend
      });

      // Extract reviewed_by from the response (backend echoes fields_to_be_updated)
      const reviewedBy = response?.data?.fields_to_be_updated?.reviewed_by || ['current_user'];

      // Update the object in the store
      updateObject(object.id, {
        label: labelName,    // Store label name for display
        labelId: labelId,    // Store label ID for future reference
        reviewed_by: reviewedBy,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        alert(`Failed to apply label: ${error.message || 'Unknown error'}`);
      }
      throw error;
    }
  }, [updateObject, onSuccess, onError]);

  return handleLabelSelect;
}
