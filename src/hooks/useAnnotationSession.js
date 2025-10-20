/**
 * useAnnotationSession Hook
 * 
 * Hook for managing WebSocket annotation session lifecycle.
 * Handles connection, session initialization, reconnection on image change,
 * and cleanup on unmount.
 */

import { useEffect, useCallback, useRef } from 'react';
import annotationSession from '../services/annotationSession';
import {
  useSetWebSocketConnectionState,
  useSetWebSocketSessionState,
  useSetWebSocketSessionData,
  useSetWebSocketError,
  useSetWebSocketImageId,
  useResetWebSocketState,
  useWebSocketIsReady,
} from '../stores/selectors/annotationSelectors';
import { ConnectionState } from '../services/websocket';
import { SessionState } from '../services/annotationSession';

/**
 * Hook to manage annotation session lifecycle
 * @param {number|string|null} imageId - Current image ID
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Auto-connect when imageId is available (default: true)
 * @param {Function} options.onSessionReady - Callback when session is ready
 * @param {Function} options.onSessionError - Callback when session fails
 * @returns {Object} Session state and controls
 */
const useAnnotationSession = (imageId, options = {}) => {
  const {
    autoConnect = true,
    onSessionReady = null,
    onSessionError = null,
  } = options;

  // Store actions
  const setConnectionState = useSetWebSocketConnectionState();
  const setSessionState = useSetWebSocketSessionState();
  const setSessionData = useSetWebSocketSessionData();
  const setError = useSetWebSocketError();
  const setImageId = useSetWebSocketImageId();
  const resetState = useResetWebSocketState();
  const isReady = useWebSocketIsReady();

  // Track initialization state
  const isInitializing = useRef(false);
  const previousImageId = useRef(null);
  const isMounted = useRef(true);

  /**
   * Initialize session for current image
   */
  const initializeSession = useCallback(async () => {
    if (!imageId || isInitializing.current) {
      return;
    }

    // Prevent duplicate initialization for the same image
    if (annotationSession.getCurrentImageId() === imageId && annotationSession.isReady()) {
      console.log('[useAnnotationSession] Session already ready for image:', imageId);
      return;
    }

    try {
      isInitializing.current = true;
      console.log('[useAnnotationSession] Initializing session for image:', imageId);

      setSessionState(SessionState.INITIALIZING);
      setImageId(imageId);

      const sessionData = await annotationSession.initialize(imageId);

      setSessionData(sessionData);
      console.log('[useAnnotationSession] Session initialized successfully');

      if (onSessionReady) {
        onSessionReady(sessionData);
      }
    } catch (error) {
      console.error('[useAnnotationSession] Session initialization failed:', error);
      setError(error.message || 'Failed to initialize session');

      if (onSessionError) {
        onSessionError(error);
      }
    } finally {
      isInitializing.current = false;
    }
  }, [imageId, setSessionState, setImageId, setSessionData, setError, onSessionReady, onSessionError]);

  /**
   * Close current session
   */
  const closeSession = useCallback(async (sendFinish = true) => {
    try {
      console.log('[useAnnotationSession] Closing session');
      await annotationSession.close(sendFinish);
      resetState();
    } catch (error) {
      console.error('[useAnnotationSession] Error closing session:', error);
      resetState();
    }
  }, [resetState]);

  /**
   * Switch to a different image
   */
  const switchImage = useCallback(async (newImageId) => {
    if (!newImageId) return;

    try {
      console.log('[useAnnotationSession] Switching to image:', newImageId);
      setSessionState(SessionState.INITIALIZING);
      setImageId(newImageId);

      const sessionData = await annotationSession.switchImage(newImageId);
      setSessionData(sessionData);

      if (onSessionReady) {
        onSessionReady(sessionData);
      }
    } catch (error) {
      console.error('[useAnnotationSession] Failed to switch image:', error);
      setError(error.message || 'Failed to switch image');

      if (onSessionError) {
        onSessionError(error);
      }
    }
  }, [setSessionState, setImageId, setSessionData, setError, onSessionReady, onSessionError]);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = annotationSession.onConnectionStateChange((state) => {
      setConnectionState(state);
    });

    return unsubscribe;
  }, [setConnectionState]);

  // Subscribe to session state changes
  useEffect(() => {
    const unsubscribe = annotationSession.onSessionStateChange((state) => {
      setSessionState(state);
    });

    return unsubscribe;
  }, [setSessionState]);

  // Handle image changes
  useEffect(() => {
    if (!autoConnect) return;

    const hasImageChanged = imageId !== null && imageId !== previousImageId.current;

    if (hasImageChanged) {
      // Image changed - switch session
      if (previousImageId.current !== null) {
        // Not the first image - switch
        switchImage(imageId);
      } else {
        // First image - initialize
        initializeSession();
      }

      previousImageId.current = imageId;
    }
  }, [imageId, autoConnect, initializeSession, switchImage]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      console.log('[useAnnotationSession] Cleaning up on unmount');
      
      // Small delay to avoid closing during React StrictMode double-mount
      setTimeout(() => {
        if (!isMounted.current && annotationSession.getCurrentImageId() !== null) {
          closeSession(true);
        }
      }, 100);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on actual unmount

  return {
    // State
    isReady,
    sessionState: annotationSession.getSessionState(),
    runningServices: annotationSession.getRunningServices(),
    failedServices: annotationSession.getFailedServices(),
    
    // Actions
    initialize: initializeSession,
    close: closeSession,
    switchImage,
    
    // Session service (for advanced usage)
    session: annotationSession,
  };
};

export default useAnnotationSession;


