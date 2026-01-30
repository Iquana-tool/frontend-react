import { useCallback } from 'react';
import annotationSession from '../services/annotationSession';
import {useSemanticModel, useIsRunningSemantic, useSetIsRunningSemantic} from "../stores/selectors/annotationSelectors";

/**
 * Hook for running semantic segmentation inference
 * 
 * @param {Function} onSuccess - Optional callback on successful completion
 * @param {Function} onError - Optional callback on error
 * @returns {Object} - { runSemantic, isRunning }
 */
export function useSemanticSegmentation(onSuccess, onError) {
  const isRunning = useIsRunningSemantic();
  const setIsRunning = useSetIsRunningSemantic();
  const semanticModelId = useSemanticModel(); // This is a string ID, not an object

  const runSemantic = useCallback(async () => {
    if (!semanticModelId) {
      const error = new Error('Please select a semantic segmentation model first');
      if (onError) {
        onError(error);
      } else {
        alert('Please select a semantic segmentation model first');
      }
      return;
    }

    // Check if semantic service is available
    if (!annotationSession.isServiceAvailable('semantic_segmentation')) {
      const error = new Error('Semantic segmentation service is not available');
      if (onError) {
        onError(error);
      } else {
        alert('Semantic segmentation service is not available. Please check your connection.');
      }
      return;
    }

    setIsRunning(true);

    try {
      // Call WebSocket method - objects will be added automatically via OBJECT_ADDED messages
      // semanticModelId is already the string identifier we need
      const response = await annotationSession.runSemantic(
        semanticModelId  // Model identifier (string)
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Semantic segmentation failed');
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      console.error('Semantic segmentation error:', error);
      
      // Call error callback if provided
      if (onError) {
        onError(error);
      } else {
        alert(`Failed to run semantic segmentation: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsRunning(false);
    }
  }, [semanticModelId, onSuccess, onError, setIsRunning]);

  return { runSemantic, isRunning };
}
