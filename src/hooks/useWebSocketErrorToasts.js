/**
 * useWebSocketErrorToasts
 *
 * Surfaces backend-reported errors to the user. The server now keeps the
 * annotation WebSocket open when a single message fails and instead sends an
 * `error` message back. This watches for those messages and shows a toast,
 * so a failed action is announced without the connection dropping.
 *
 * Mount once on the annotation page (inside the ToastProvider).
 */
import { useEffect } from 'react';
import websocketService from '../services/websocket';
import { useToast } from '../contexts/ToastContext';
import { SERVER_MESSAGE_TYPES, extractError } from '../utils/messageTypes';

const useWebSocketErrorToasts = () => {
  const { addToast } = useToast();

  useEffect(() => {
    const unsubscribe = websocketService.on(
      SERVER_MESSAGE_TYPES.ERROR,
      (message) => {
        const { message: detail } = extractError(message);
        addToast({
          message: `Oops! This didn't work. Error: ${detail}`,
          type: 'error',
          duration: 8000,
        });
      }
    );

    return unsubscribe;
  }, [addToast]);
};

export default useWebSocketErrorToasts;
