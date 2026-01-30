import { useCallback } from 'react';
import { markContourAsReviewed } from '../api/contours';
import { getContourId } from '../utils/objectUtils';
import annotationSession from '../services/annotationSession';

/**
 * Shared hook for marking objects as reviewed
 * Handles updating review status via the API and store
 * 
 * @param {Function} updateObject - Function to update object in store
 * @param {Function} onSuccess - Optional callback on successful review
 * @param {Function} onError - Optional callback on error
 * @returns {Function} - Function to handle marking as reviewed
 */
export function useMarkAsReviewed(updateObject, onSuccess, onError) {
  const handleMarkAsReviewed = useCallback(async (object) => {
    if (!object) return;

    const contourId = getContourId(object);

    try {
      // Mark contour as reviewed via REST API
      const response = await markContourAsReviewed(contourId);
      
      // Also notify WebSocket session of this change
      // This ensures the session state is synchronized with the database
      if (annotationSession.isReady()) {
        try {
          await annotationSession.modifyObject(contourId, {
            reviewed_by: response.reviewed_by || ['current_user'],
          });
        } catch (wsError) {
          console.warn('[useMarkAsReviewed] Failed to notify WebSocket session:', wsError);
          // Continue anyway - the REST API call succeeded
        }
      }
      
      // Update the object in the store to mark it as reviewed
      // Use actual reviewer data from response if available
      updateObject(object.id, {
        reviewed_by: response.reviewed_by || ['current_user'],
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
        alert(`Failed to mark as reviewed: ${error.message || 'Unknown error'}`);
      }
      throw error;
    }
  }, [updateObject, onSuccess, onError]);

  return handleMarkAsReviewed;
}

