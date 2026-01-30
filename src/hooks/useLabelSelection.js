import { useCallback } from 'react';
import { editContourLabel } from '../api/masks';
import { getContourId, extractLabelInfo } from '../utils/objectUtils';
import annotationSession from '../services/annotationSession';

/**
 * Shared hook for label selection logic
 * Handles updating object labels via the API and store
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
      // Update label using REST API endpoint
      // Backend automatically adds current user to reviewed_by when label is assigned
      const response = await editContourLabel(contourId, labelId);

      // Extract reviewed_by from response (it's inside the contour object)
      const reviewedBy = response.contour?.reviewed_by || ['current_user'];

      // Also notify WebSocket session of this change
      // This ensures the session state is synchronized with the database
      if (annotationSession.isReady()) {
        try {
          await annotationSession.modifyObject(contourId, {
            label_id: labelId,
            reviewed_by: reviewedBy,
          });
        } catch (wsError) {
          // Continue anyway - the REST API call succeeded
        }
      }

      // Update the object in the store
      // The store will automatically assign labelAssignmentOrder when label is assigned
      // Backend returns updated reviewed_by list inside contour object
      updateObject(object.id, {
        label: labelName, // Store label name for display
        labelId: labelId, // Store label ID for future reference
        reviewed_by: reviewedBy, // Update reviewed_by from response
      });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Call error callback if provided, otherwise show alert
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

