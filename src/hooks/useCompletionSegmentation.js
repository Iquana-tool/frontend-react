import { useState, useCallback } from 'react';
import annotationSession from '../services/annotationSession';

/**
 * Hook for running completion segmentation to find similar instances
 * 
 * @param {Function} onSuccess - Optional callback on successful completion
 * @param {Function} onError - Optional callback on error
 * @returns {Object} - { runCompletion, isRunning }
 */
export function useCompletionSegmentation(onSuccess, onError) {
  const [isRunning, setIsRunning] = useState(false);

  const runCompletion = useCallback(async (contourId, completionModel, labelId) => {
    if (!contourId) {
      const error = new Error('Contour ID is required');
      if (onError) {
        onError(error);
      }
      return;
    }

    if (!completionModel) {
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
      await annotationSession.runCompletion(
        [contourId],      // Array of seed contour IDs
        completionModel,  // Model name
        labelId           // Label ID
      );
      
      console.log('Completion segmentation completed successfully');
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
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
  }, [onSuccess, onError]);

  return { runCompletion, isRunning };
}

