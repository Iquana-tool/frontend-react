/**
 * useWebSocketStatusToasts
 *
 * Surfaces WebSocket connection drops to the user via toasts. The annotation
 * session can drop silently (the small status indicator is easy to miss), so
 * this watches the connection state and announces losses, reconnect attempts,
 * and recoveries.
 *
 * Mount once on the annotation page (inside the ToastProvider).
 */
import { useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import {
  useWebSocketConnectionState,
  useWebSocketLastError,
} from '../stores/selectors/annotationSelectors';

const useWebSocketStatusToasts = () => {
  const connectionState = useWebSocketConnectionState();
  const lastError = useWebSocketLastError();
  const { addToast } = useToast();

  const prevState = useRef(connectionState);
  // Only warn about drops after we've successfully connected at least once,
  // so the initial connecting/disconnected sequence stays quiet.
  const hasConnected = useRef(false);
  // Guard so a single drop produces one notification, not one per intermediate
  // state (disconnected -> reconnecting -> ...).
  const dropNotified = useRef(false);

  useEffect(() => {
    const prev = prevState.current;
    if (connectionState === prev) return;
    prevState.current = connectionState;

    if (connectionState === 'connected') {
      // Announce recovery only if we previously told the user about a drop.
      if (hasConnected.current && dropNotified.current) {
        addToast({ message: 'Reconnected to the annotation server.', type: 'success' });
      }
      hasConnected.current = true;
      dropNotified.current = false;
      return;
    }

    // Stay quiet until the very first successful connection.
    if (!hasConnected.current) return;

    if (connectionState === 'error') {
      // Reconnection gave up — this needs user action.
      dropNotified.current = true;
      addToast({
        message: lastError
          ? `Lost connection to the annotation server: ${lastError}. Please refresh the page.`
          : 'Lost connection to the annotation server. Please refresh the page to continue.',
        type: 'error',
        duration: 8000,
      });
    } else if (
      (connectionState === 'disconnected' || connectionState === 'reconnecting') &&
      !dropNotified.current
    ) {
      dropNotified.current = true;
      addToast({
        message: 'Connection to the annotation server was lost. Attempting to reconnect…',
        type: 'error',
        duration: 6000,
      });
    }
  }, [connectionState, lastError, addToast]);
};

export default useWebSocketStatusToasts;
