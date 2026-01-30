/**
 * WebSocket slice - manages WebSocket connection and session state
 */
export const createWebSocketSlice = (set) => ({
  setWebSocketConnectionState: (connectionState) => set((state) => {
    state.websocket.connectionState = connectionState;
  }),
  
  setWebSocketSessionState: (sessionState) => set((state) => {
    state.websocket.sessionState = sessionState;
  }),
  
  setWebSocketSessionData: (data) => set((state) => {
    state.websocket.runningServices = data.running || [];
    state.websocket.failedServices = data.failed || [];
    state.websocket.sessionState = 'ready';
  }),
  
  setWebSocketError: (error) => set((state) => {
    state.websocket.lastError = error;
    state.websocket.sessionState = 'error';
  }),
  
  clearWebSocketError: () => set((state) => {
    state.websocket.lastError = null;
  }),
  
  setWebSocketImageId: (imageId) => set((state) => {
    state.websocket.currentImageId = imageId;
  }),
  
  setWebSocketReconnecting: (isReconnecting) => set((state) => {
    state.websocket.isReconnecting = isReconnecting;
  }),
  
  resetWebSocketState: () => set((state) => {
    state.websocket.connectionState = 'disconnected';
    state.websocket.sessionState = 'uninitialized';
    state.websocket.currentImageId = null;
    state.websocket.runningServices = [];
    state.websocket.failedServices = [];
    state.websocket.lastError = null;
    state.websocket.isReconnecting = false;
  }),
});

