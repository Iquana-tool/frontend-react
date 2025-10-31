/**
 * Annotation Session Service
 * 
 * API for WebSocket-based annotation operations.
 * Provides type-safe wrappers around WebSocket messages and manages
 * the annotation session lifecycle.
 */

import websocketService from './websocket';
import { MessageBuilders, SERVER_MESSAGE_TYPES } from '../utils/messageTypes';

/**
 * Session states
 */
export const SessionState = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error',
};

/**
 * Generates a temporary user ID
 * @returns {number} User ID
 */
const getUserId = () => {
  let userId = sessionStorage.getItem('temp_user_id');
  if (!userId) {
    // Generate a timestamp-based ID
    const numericId = Date.now();
    sessionStorage.setItem('temp_user_id', numericId.toString());
    return numericId;
  }
  const parsedId = parseInt(userId, 10);
  // If parsing fails, generate a new ID
  if (isNaN(parsedId)) {
    const numericId = Date.now();
    sessionStorage.setItem('temp_user_id', numericId.toString());
    return numericId;
  }
  return parsedId;
};

/**
 * Annotation Session Manager
 */
class AnnotationSession {
  constructor() {
    this.sessionState = SessionState.UNINITIALIZED;
    this.currentImageId = null;
    this.currentUserId = null;
    this.runningServices = [];
    this.failedServices = [];
    this.sessionListeners = new Set();
    
    // WebSocket base URL from environment
    this.wsBaseUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
  }

  /**
   * Initialize annotation session for an image
   * @param {number|string} imageId - Image ID
   * @param {number} userId - User ID (optional, will use temp ID if not provided)
   * @returns {Promise<Object>} Session initialization data
   */
  async initialize(imageId, userId = null) {
    try {
      this.currentImageId = imageId;
      this.currentUserId = userId || getUserId();
      this._updateSessionState(SessionState.INITIALIZING);

      // Construct WebSocket URL
      const wsUrl = `${this.wsBaseUrl}/annotation_session/ws/user=${this.currentUserId}&image=${this.currentImageId}`;

      // Connect to WebSocket
      await websocketService.connect(wsUrl, {
        reconnectAttempts: 3,
        reconnectDelay: 1000,
      });

      // Wait for session_initialized message
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubscribe();
          this._updateSessionState(SessionState.ERROR);
          reject(new Error('Session initialization timeout'));
        }, 10000);

        const unsubscribe = websocketService.on(
          SERVER_MESSAGE_TYPES.SESSION_INITIALIZED,
          (message) => {
            clearTimeout(timeout);
            unsubscribe();

            // Always process the session data, regardless of success status
            this.runningServices = message.data?.running || [];
            this.failedServices = message.data?.failed || [];
            
            if (message.success) {
              this._updateSessionState(SessionState.READY);
            } else {
              this._updateSessionState(SessionState.ERROR);
            }

            // Always resolve with the session data, even if some services failed
            resolve({
              running: this.runningServices,
              failed: this.failedServices,
              objects: message.data?.objects || null,
            });
          }
        );
      });
    } catch (error) {
      console.error('[AnnotationSession] Initialization failed:', error);
      this._updateSessionState(SessionState.ERROR);
      throw error;
    }
  }

  /**
   * Close the current session
   * @param {boolean} sendFinishMessage - Whether to send finish_annotation message
   * @returns {Promise<void>}
   */
  async close(sendFinishMessage = true) {
    try {
      if (sendFinishMessage && websocketService.isConnected()) {
        const message = MessageBuilders.finishAnnotation();
        await websocketService.send(message);
      }

      websocketService.disconnect();
      this.currentImageId = null;
      this._updateSessionState(SessionState.UNINITIALIZED);
    } catch (error) {
      console.error('[AnnotationSession] Error closing session:', error);
      // Disconnect anyway
      websocketService.disconnect();
      this.currentImageId = null;
      this._updateSessionState(SessionState.UNINITIALIZED);
    }
  }

  /**
   * Switch to a different image (close current session and open new one)
   * @param {number|string} newImageId - New image ID
   * @returns {Promise<Object>} New session initialization data
   */
  async switchImage(newImageId) {
    if (this.currentImageId === newImageId) {
      return {
        running: this.runningServices,
        failed: this.failedServices,
      };
    }

    // Close current session
    await this.close(true);

    // Initialize new session
    return this.initialize(newImageId, this.currentUserId);
  }

  // ==================== AI SEGMENTATION OPERATIONS ====================

  /**
   * Select AI model for segmentation
   * @param {string} modelName - Segmentation Model identifier
   * @returns {Promise<Object>} Response message
   */
  async selectModel(modelName) {
    this._ensureReady();
    const message = MessageBuilders.selectModel(modelName);
    return websocketService.send(message, true);
  }

  /**
   * Run AI segmentation with prompts
   * @param {string} modelIdentifier - Model to use
   * @param {Object} prompts - Prompts object {points, boxes, masks}
   * @returns {Promise<Object>} Segmentation result
   */
  async runSegmentation(modelIdentifier, prompts) {
    this._ensureReady();
    const message = MessageBuilders.runSegmentation(modelIdentifier, prompts);
    return websocketService.send(message, true);
  }

  // ==================== OBJECT OPERATIONS ====================

  /**
   * Add a manually drawn object
   * @param {Array<number>} x - X coordinates (normalized)
   * @param {Array<number>} y - Y coordinates (normalized)
   * @param {string|null} label - Object label
   * @param {number|null} parentId - Parent contour ID
   * @param {number} confidence - Confidence score
   * @returns {Promise<Object>} Response with added objects
   */
  async addObject(x, y, label = null, parentId = null, confidence = 1.0) {
    this._ensureReady();
    const message = MessageBuilders.addObject(x, y, label, parentId, confidence);
    return websocketService.send(message, true);
  }

  /**
   * Finalize a temporary object
   * @param {number} contourId - Contour ID to finalize
   * @returns {Promise<Object>} Response message
   */
  async finalizeObject(contourId) {
    this._ensureReady();
    const message = MessageBuilders.finalizeObject(contourId);
    return websocketService.send(message, true);
  }

  /**
   * Delete an object
   * @param {number} contourId - Contour ID to delete
   * @returns {Promise<Object>} Response message
   */
  async deleteObject(contourId) {
    this._ensureReady();
    const message = MessageBuilders.deleteObject(contourId);
    return websocketService.send(message, true);
  }

  /**
   * Modify object properties
   * @param {number} contourId - Contour ID to modify
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Response message
   */
  async modifyObject(contourId, updates) {
    this._ensureReady();
    const message = MessageBuilders.modifyObject(contourId, updates);
    return websocketService.send(message, true);
  }

  // ==================== IMAGE FOCUS OPERATIONS ====================

  /**
   * Focus on a specific contour
   * @param {number} contourId - Contour ID to focus on
   * @returns {Promise<void>}
   */
  async focusImage(contourId) {
    this._ensureReady();
    const message = MessageBuilders.focusImage(contourId);
    return websocketService.send(message);
  }

  /**
   * Remove focus from image
   * @returns {Promise<void>}
   */
  async unfocusImage() {
    this._ensureReady();
    const message = MessageBuilders.unfocusImage();
    return websocketService.send(message);
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Enable completion mode
   * @returns {Promise<void>}
   */
  async enableCompletion() {
    this._ensureReady();
    const message = MessageBuilders.enableCompletion();
    return websocketService.send(message);
  }

  // ==================== EVENT SUBSCRIPTIONS ====================

  /**
   * Subscribe to session state changes
   * @param {Function} callback - Callback (state) => void
   * @returns {Function} Unsubscribe function
   */
  onSessionStateChange(callback) {
    this.sessionListeners.add(callback);
    return () => this.sessionListeners.delete(callback);
  }

  /**
   * Subscribe to WebSocket messages
   * @param {string} messageType - Message type to listen for
   * @param {Function} callback - Callback (message) => void
   * @returns {Function} Unsubscribe function
   */
  onMessage(messageType, callback) {
    return websocketService.on(messageType, callback);
  }

  /**
   * Subscribe to all WebSocket messages
   * @param {Function} callback - Callback (message) => void
   * @returns {Function} Unsubscribe function
   */
  onAnyMessage(callback) {
    return websocketService.onAny(callback);
  }

  /**
   * Subscribe to connection state changes
   * @param {Function} callback - Callback (state) => void
   * @returns {Function} Unsubscribe function
   */
  onConnectionStateChange(callback) {
    return websocketService.onConnectionStateChange(callback);
  }

  // ==================== STATE GETTERS ====================

  /**
   * Get current session state
   * @returns {string} Session state
   */
  getSessionState() {
    return this.sessionState;
  }

  /**
   * Get current image ID
   * @returns {number|string|null} Image ID
   */
  getCurrentImageId() {
    return this.currentImageId;
  }

  /**
   * Get running services
   * @returns {Array<string>} Running services
   */
  getRunningServices() {
    return [...this.runningServices];
  }

  /**
   * Get failed services
   * @returns {Array<string>} Failed services
   */
  getFailedServices() {
    return [...this.failedServices];
  }

  /**
   * Check if session is ready
   * @returns {boolean} True if ready
   */
  isReady() {
    return this.sessionState === SessionState.READY && websocketService.isConnected();
  }

  /**
   * Check if a specific service is available
   * @param {string} serviceName - Service name (e.g., 'prompted_segmentation')
   * @returns {boolean} True if service is running
   */
  isServiceAvailable(serviceName) {
    return this.runningServices.includes(serviceName);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Ensure session is ready
   * @private
   * @throws {Error} If session is not ready
   */
  _ensureReady() {
    if (!this.isReady()) {
      throw new Error('Session not ready. Initialize session first.');
    }
  }

  /**
   * Update session state and notify listeners
   * @private
   * @param {string} newState - New session state
   */
  _updateSessionState(newState) {
    if (this.sessionState !== newState) {
      this.sessionState = newState;
      
      this.sessionListeners.forEach(callback => {
        try {
          callback(newState);
        } catch (error) {
          console.error('[AnnotationSession] Listener error:', error);
        }
      });
    }
  }
}

// Singleton instance
const annotationSession = new AnnotationSession();

export default annotationSession;



