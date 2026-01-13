import { useState, useCallback } from 'react';
import annotationSession from '../services/annotationSession';
import {useCompletionModel, useSetCompletionModel} from "../stores/selectors/annotationSelectors";

/**
 * Hook for running completion segmentation to find similar instances
 * 
 * @param {Function} onSuccess - Optional callback on successful completion
 * @param {Function} onError - Optional callback on error
 * @returns {Object} - { runCompletion, isRunning }
 * 
 * runCompletion accepts either a single contour ID or an array of contour IDs as seeds
 */
export function useCompletionSegmentation(onSuccess, onError) {
  const [isRunning, setIsRunning] = useState(false);
  const completionModelId = useCompletionModel(); // This is a string ID, not an object
  const setCompletionModel = useSetCompletionModel();

  const runCompletion = useCallback(async (contourIdOrIds, labelId) => {
    // Note: Model status is handled by the backend, no need to update here
    
    // Normalize to array
    const contourIds = Array.isArray(contourIdOrIds) ? contourIdOrIds : [contourIdOrIds];
    
    if (!contourIds || contourIds.length === 0) {
      const error = new Error('Contour ID(s) required');
      if (onError) {
        onError(error);
      }
      return;
    }

    if (!completionModelId) {
      const error = new Error('Please select a completion model first');
      if (onError) {
        onError(error);
      } else {
        alert('Please select a completion model first');
      }
      return;
    }

    // Check if completion service is available
    if (!annotationSession.isServiceAvailable('completion_segmentation')) {
      const error = new Error('Completion segmentation service is not available');
      if (onError) {
        onError(error);
      } else {
        alert('Completion segmentation service is not available. Please check your connection.');
      }
      return;
    }

    setIsRunning(true);

    try {
      // Call WebSocket method - objects will be added automatically via OBJECT_ADDED messages
      // completionModelId is already the string identifier we need
      const response = await annotationSession.runCompletion(
        contourIds,         // Array of seed contour IDs (can be single or multiple)
        completionModelId,  // Model identifier (string)
        labelId             // Label ID
      );
      
      // Note: Model status is handled by the backend, no need to update here
      if (!response.success) {
        throw new Error(response.message || 'Completion failed');
      }
    } catch (error) {
      console.error('Completion segmentation error:', error);
      
      // Call error callback if provided
      if (onError) {
        onError(error);
      } else {
        alert(`Failed to suggest similar instances: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsRunning(false);
    }
  }, [completionModelId, onSuccess, onError]);

  return { runCompletion, isRunning };
}

