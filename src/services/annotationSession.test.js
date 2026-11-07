import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import annotationSession, { SessionState } from './annotationSession';
import websocketService, { ConnectionState } from './websocket';
import { CLIENT_MESSAGE_TYPES, SERVER_MESSAGE_TYPES } from '../utils/messageTypes';

describe('annotationSession.deleteObject', () => {
  let originalSessionState;
  let originalConnectionState;
  let originalWs;

  beforeEach(() => {
    originalSessionState = annotationSession.sessionState;
    originalConnectionState = websocketService.connectionState;
    originalWs = websocketService.ws;
  });

  afterEach(() => {
    annotationSession.sessionState = originalSessionState;
    websocketService.connectionState = originalConnectionState;
    websocketService.ws = originalWs;
    websocketService.pendingMessages.clear();
  });

  it('awaits the correlated OBJECT_REMOVED reply and runs OBJECT_REMOVED listeners before resolving', async () => {
    const sentFrames = [];
    websocketService.ws = {
      readyState: WebSocket.OPEN,
      send: vi.fn((frame) => {
        sentFrames.push(JSON.parse(frame));
      }),
    };
    websocketService.connectionState = ConnectionState.CONNECTED;
    annotationSession.sessionState = SessionState.READY;

    const events = [];
    const unsubscribe = websocketService.on(SERVER_MESSAGE_TYPES.OBJECT_REMOVED, (msg) => {
      events.push(`listener:${msg.data.deleted_contours.join(',')}`);
    });

    try {
      let settled = false;
      const pending = annotationSession.deleteObject(22501).then((reply) => {
        settled = true;
        events.push(`resolved:${reply.type}`);
        return reply;
      });

      expect(sentFrames).toHaveLength(1);
      expect(sentFrames[0].type).toBe(CLIENT_MESSAGE_TYPES.OBJECT_DELETE);
      expect(sentFrames[0].data).toEqual({ contour_id: 22501 });

      // Must NOT resolve fire-and-forget before the backend confirms deletion
      await Promise.resolve();
      expect(settled).toBe(false);

      // Simulate backend correlated OBJECT_REMOVED frame carrying id = client_msg.id
      websocketService._handleMessage({
        data: JSON.stringify({
          id: sentFrames[0].id,
          type: SERVER_MESSAGE_TYPES.OBJECT_REMOVED,
          success: true,
          message: 'Object removed from mask.',
          data: { deleted_contours: [22501] },
        }),
      });

      const response = await pending;
      expect(settled).toBe(true);
      expect(response.success).toBe(true);
      expect(events).toEqual([
        'listener:22501',
        `resolved:${SERVER_MESSAGE_TYPES.OBJECT_REMOVED}`,
      ]);
    } finally {
      unsubscribe();
    }
  });

  it('registers SESSION_INITIALIZED listener before connecting so immediate frames are captured', async () => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('auth_user', JSON.stringify({ username: 'test-user' }));

    let connectCalledWithListenerActive = false;
    vi.spyOn(websocketService, 'connect').mockImplementation(async () => {
      // Check if SESSION_INITIALIZED listener was registered before connect was called
      const listeners = websocketService.listeners.get(SERVER_MESSAGE_TYPES.SESSION_INITIALIZED);
      connectCalledWithListenerActive = Boolean(listeners && listeners.size > 0);

      // Simulate immediate server reply upon handshake
      websocketService._handleMessage({
        data: JSON.stringify({
          id: '0',
          type: SERVER_MESSAGE_TYPES.SESSION_INITIALIZED,
          success: true,
          message: 'Annotation session initialized.',
          data: {
            running: ['instance_segmentation'],
            failed: [],
            mask_id: 123,
            mask_status: 'in_progress',
          },
        }),
      });
    });

    try {
      const sessionData = await annotationSession.initialize(468);
      expect(connectCalledWithListenerActive).toBe(true);
      expect(sessionData.maskId).toBe(123);
      expect(annotationSession.isReady()).toBe(false); // ws.readyState is not mocked as open here, but sessionState is READY
      expect(annotationSession.getSessionState()).toBe(SessionState.READY);
    } finally {
      websocketService.connect.mockRestore?.();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      await annotationSession.close(false);
    }
  });
});
