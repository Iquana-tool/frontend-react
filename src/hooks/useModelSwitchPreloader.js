/**
 * Hook to preload models when they are switched by the user
 * This is to ensure newly selected models are loaded into backend memory
 * Only sends message when model CHANGES, not on initial mount
 */

import { useEffect, useRef } from 'react';
import annotationSession from '../services/annotationSession';

/**
 * Preload a model when it changes
 * @param {string|object} model - Model ID string or model object
 * @param {Function} preloadFn - Function to call to preload the model (selectPromptedModel or selectCompletionModel)
 * @param {string} modelType - Type of model for logging (e.g., 'prompted', 'completion')
 */
const useModelSwitchPreloader = (model, preloadFn, modelType) => {
  const previousModel = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip on first render (initial mount)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousModel.current = model;
      return;
    }

    // Only send if model actually changed AND session is ready
    if (model && model !== previousModel.current && annotationSession.isReady()) {
      // Extract model ID (handle both string IDs and model objects)
      const modelId = typeof model === 'string' ? model : model?.id;
      if (modelId) {
        console.log(`[useModelSwitchPreloader] ${modelType} model changed to:`, modelId);
        preloadFn(modelId).catch((err) => {
          console.warn(`[useModelSwitchPreloader] Failed to preload ${modelType} model:`, err);
        });
      }
      previousModel.current = model;
    }
  }, [model, preloadFn, modelType]);
};

export default useModelSwitchPreloader;
