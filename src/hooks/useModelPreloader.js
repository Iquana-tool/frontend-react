/**
 * Hook to preload models into backend memory when websocket session is ready
 * This ensures models are loaded and ready when users need them
 */

import { useEffect, useRef } from 'react';
import {
  usePromptedModel,
  useSuggestionModel,
  useInstanceModel,
  useWebSocketIsReady,
  useWebSocketConnectionState,
} from '../stores/selectors/annotationSelectors';
import annotationSession from '../services/annotationSession';

/**
 * Preload selected models when annotation session becomes ready
 * This hook should be used in the main annotation page
 */
const modelKey = (model) => (typeof model === 'string' ? model : model?.id) ?? null;

const useModelPreloader = () => {
  const promptedModel = usePromptedModel();
  const suggestionModel = useSuggestionModel();
  const instanceModel = useInstanceModel();
  const isSessionReady = useWebSocketIsReady();
  const connectionState = useWebSocketConnectionState();
  // What was last handed to the backend. Keyed on the models rather than on the image:
  // the session outlives the image now (switching sends a message instead of
  // reconnecting), so the loaded models survive a switch and re-selecting them for every
  // image would be pure round trips. A model the user actually changed still reloads.
  const preloadedRef = useRef(null);

  // Only a lost connection loses the loaded models. An image switch briefly leaves the
  // session "initializing", which must not be mistaken for one.
  useEffect(() => {
    if (connectionState !== 'connected') {
      preloadedRef.current = null;
    }
  }, [connectionState]);

  useEffect(() => {
    if (!isSessionReady) {
      return;
    }

    const selection = [
      modelKey(promptedModel),
      modelKey(suggestionModel),
      modelKey(instanceModel),
    ].join('|');

    if (preloadedRef.current === selection) {
      return;
    }
    preloadedRef.current = selection;

    // Preload models into backend memory
    annotationSession.preloadModels({
      promptedModel,
      suggestionModel,
      instanceModel,
    }).catch(err => {
      console.warn('[useModelPreloader] Failed to preload models:', err);
    });
  }, [isSessionReady, promptedModel, suggestionModel, instanceModel]);
};

export default useModelPreloader;
