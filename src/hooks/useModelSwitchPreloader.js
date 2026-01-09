/**
 * Hook to preload models when they are switched by the user
 * This is to ensure newly selected models are loaded into backend memory
 */

import { useEffect } from 'react';
import annotationSession from '../services/annotationSession';

/**
 * Preload a model when it changes
 * @param {string|object} model - Model ID string or model object
 * @param {Function} preloadFn - Function to call to preload the model (selectPromptedModel or selectCompletionModel)
 * @param {string} modelType - Type of model for logging (e.g., 'prompted', 'completion')
 */
const useModelSwitchPreloader = (model, preloadFn, modelType) => {
  useEffect(() => {
    if (model && annotationSession.isReady()) {
      // Extract model ID (handle both string IDs and model objects)
      const modelId = typeof model === 'string' ? model : model?.id;
      if (modelId) {
        preloadFn(modelId).catch(() => {
          // Error handled silently
        });
      }
    }
  }, [model, preloadFn, modelType]);
};

export default useModelSwitchPreloader;
