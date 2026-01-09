/**
 * Hook to preload models into backend memory when websocket session is ready
 * This ensures models are loaded and ready when users need them
 */

import { useEffect, useRef } from 'react';
import { 
  usePromptedModel, 
  useCompletionModel,
  useWebSocketIsReady 
} from '../stores/selectors/annotationSelectors';
import annotationSession from '../services/annotationSession';

/**
 * Preload selected models when annotation session becomes ready
 * This hook should be used in the main annotation page
 */
const useModelPreloader = () => {
  const promptedModel = usePromptedModel();
  const completionModel = useCompletionModel();
  const isSessionReady = useWebSocketIsReady();
  const hasPreloadedRef = useRef(false);
  const currentImageIdRef = useRef(null);

  useEffect(() => {
    const currentImageId = annotationSession.getCurrentImageId();
    
    // Reset preload flag when image changes
    if (currentImageId !== currentImageIdRef.current) {
      hasPreloadedRef.current = false;
      currentImageIdRef.current = currentImageId;
    }

    // Preload models when session becomes ready (only once per image session)
    if (isSessionReady && !hasPreloadedRef.current) {
      hasPreloadedRef.current = true;
      
      console.log('[useModelPreloader] Session ready, preloading models', {
        promptedModel,
        completionModel,
      });

      // Preload models into backend memory
      annotationSession.preloadModels({
        promptedModel,
        completionModel,
      }).catch(err => {
        console.warn('[useModelPreloader] Failed to preload models:', err);
      });
    }
  }, [isSessionReady, promptedModel, completionModel]);
};

export default useModelPreloader;
