/**
 * Hook to preload selected models once the WS session is ready.
 * Sends on initial default selection and whenever the selection changes.
 */

import { useEffect, useRef } from 'react';
import { useWebSocketIsReady } from '../stores/selectors/annotationSelectors';

/**
 * Preload a model when it changes
 * @param {string|object} model - Model ID string or model object
 * @param {Function} preloadFn - Function to call to preload the model (selectPromptedModel or selectSuggestionModel)
 * @param {string} modelType - Type of model for logging (e.g., 'prompted', 'suggestion')
 */
const useModelSwitchPreloader = (model, preloadFn, modelType) => {
  const wsIsReady = useWebSocketIsReady();
  const lastSentModel = useRef(null);

  useEffect(() => {
    if (!wsIsReady || !model) {
      return;
    }

    // Extract model ID (handle both string IDs and model objects)
    const modelId = typeof model === 'string' ? model : model?.id;
    if (!modelId || modelId === lastSentModel.current) {
      return;
    }

    console.log(`[useModelSwitchPreloader] ${modelType} model selected:`, modelId);
    preloadFn(modelId).catch((err) => {
      console.warn(`[useModelSwitchPreloader] Failed to preload ${modelType} model:`, err);
    });
    lastSentModel.current = modelId;
  }, [model, preloadFn, modelType, wsIsReady]);
};

export default useModelSwitchPreloader;
