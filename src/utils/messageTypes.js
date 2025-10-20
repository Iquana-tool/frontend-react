/**
 * WebSocket Message Type Constants
 * 
 * Defines all message types used in the WebSocket communication
 * between the frontend and backend annotation system.
 * 
 */

// ==================== CLIENT MESSAGE TYPES ====================

/**
 * Client sends these message types to the server
 */
export const CLIENT_MESSAGE_TYPES = {
  // Image Focus
  FOCUS_IMAGE: 'focus_image',
  UNFOCUS_IMAGE: 'unfocus_image',
  
  // AI Segmentation
  PROMPTED_SELECT_MODEL: 'prompted_select_model',
  PROMPTED_SEGMENTATION: 'prompted_segmentation',
  
  // Object Management
  OBJECT_ADD_MANUAL: 'object_add_manual',
  OBJECT_FINALISE: 'object_finalise',
  OBJECT_DELETE: 'object_delete',
  OBJECT_MODIFY: 'object_modify',
  
  // Session Management
  COMPLETION_ENABLE: 'completion_enable',
  FINISH_ANNOTATION: 'finish_annotation',
};

// ==================== SERVER MESSAGE TYPES ====================

/**
 * Server sends these message types to the client
 */
export const SERVER_MESSAGE_TYPES = {
  // Session
  SESSION_INITIALIZED: 'session_initialized',
  
  // Object Operations
  OBJECT_ADDED: 'object_added',
  OBJECT_MODIFIED: 'object_modified',
  OBJECT_DELETED: 'object_deleted',
  OBJECT_FINALISED: 'object_finalised',
  
  // AI Segmentation
  SEGMENTATION_RESULT: 'segmentation_result',
  MODEL_SELECTED: 'model_selected',
  
  // Errors
  ERROR: 'error',
};

// ==================== MESSAGE BUILDERS ====================

/**
 * Generates a unique message ID
 * @returns {string} Unique message identifier
 */
export const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Creates a base message structure
 * @param {string} type - Message type from CLIENT_MESSAGE_TYPES
 * @param {Object} data - Message payload
 * @returns {Object} Formatted message object
 */
const createMessage = (type, data) => ({
  id: generateMessageId(),
  type,
  data,
});

/**
 * Message builders for each client message type
 * These ensure consistent message formatting
 */
export const MessageBuilders = {
  /**
   * Focus on a specific contour in the image
   * @param {number} contourId - ID of the contour to focus on
   */
  focusImage: (contourId) => createMessage(
    CLIENT_MESSAGE_TYPES.FOCUS_IMAGE,
    { focussed_contour_id: contourId }
  ),

  /**
   * Remove focus from image
   */
  unfocusImage: () => createMessage(
    CLIENT_MESSAGE_TYPES.UNFOCUS_IMAGE,
    {}
  ),

  /**
   * Select AI model for segmentation
   * @param {string} modelName - Segmentation Model identifier
   */
  selectModel: (modelName) => createMessage(
    CLIENT_MESSAGE_TYPES.PROMPTED_SELECT_MODEL,
    { selected_model: modelName }
  ),

  /**
   * Request AI segmentation with prompts
   * @param {string} modelIdentifier - Model to use for segmentation
   * @param {Object} prompts - Prompts object containing points, boxes, and masks
   * @param {Array} prompts.points - Array of point prompts {x: float, y: float, label: boolean}
   * @param {Array} prompts.boxes - Array of box prompts {min_x, min_y, max_x, max_y}
   * @param {Array} prompts.masks - Array of mask prompts
   */
  runSegmentation: (modelIdentifier, prompts) => createMessage(
    CLIENT_MESSAGE_TYPES.PROMPTED_SEGMENTATION,
    {
      model_identifier: modelIdentifier,
      prompts: {
        points: prompts.points || [],
        boxes: prompts.boxes || [],
        masks: prompts.masks || [],
      }
    }
  ),

  /**
   * Add a manually drawn object
   * @param {Array<number>} x - Array of x coordinates (normalized 0-1)
   * @param {Array<number>} y - Array of y coordinates (normalized 0-1)
   * @param {string|null} label - Object label
   * @param {number|null} parentId - Parent contour ID
   * @param {number} confidence - Confidence score (0-1)
   */
  addObject: (x, y, label = null, parentId = null, confidence = 1.0) => createMessage(
    CLIENT_MESSAGE_TYPES.OBJECT_ADD_MANUAL,
    {
      x,
      y,
      label,
      parent_id: parentId,
      confidence,
    }
  ),

  /**
   * Finalize a temporary object
   * @param {number} contourId - ID of the contour to finalize
   */
  finalizeObject: (contourId) => createMessage(
    CLIENT_MESSAGE_TYPES.OBJECT_FINALISE,
    { contour_id: contourId }
  ),

  /**
   * Delete an object
   * @param {number} contourId - ID of the contour to delete
   */
  deleteObject: (contourId) => createMessage(
    CLIENT_MESSAGE_TYPES.OBJECT_DELETE,
    { contour_id: contourId }
  ),

  /**
   * Modify an object's properties
   * @param {number} contourId - ID of the contour to modify
   * @param {Object} fieldsToUpdate - Fields to update (e.g., {confidence: 0.95, label: 'new_label'})
   */
  modifyObject: (contourId, fieldsToUpdate) => createMessage(
    CLIENT_MESSAGE_TYPES.OBJECT_MODIFY,
    {
      contour_id: contourId,
      fields_to_be_updated: fieldsToUpdate,
    }
  ),

  /**
   * Enable completion mode
   */
  enableCompletion: () => createMessage(
    CLIENT_MESSAGE_TYPES.COMPLETION_ENABLE,
    {}
  ),

  /**
   * Finish annotation session
   */
  finishAnnotation: () => createMessage(
    CLIENT_MESSAGE_TYPES.FINISH_ANNOTATION,
    {}
  ),
};

// ==================== MESSAGE VALIDATORS ====================

/**
 * Validates if a message has the required base structure
 * @param {Object} message - Message to validate
 * @returns {boolean} True if valid
 */
export const isValidMessage = (message) => {
  return (
    message &&
    typeof message === 'object' &&
    typeof message.id === 'string' &&
    typeof message.type === 'string' &&
    typeof message.success === 'boolean' &&
    message.hasOwnProperty('data')
  );
};

/**
 * Checks if a message is an error message
 * @param {Object} message - Message to check
 * @returns {boolean} True if error message
 */
export const isErrorMessage = (message) => {
  return message?.type === SERVER_MESSAGE_TYPES.ERROR || message?.success === false;
};

/**
 * Extracts error information from a message
 * @param {Object} message - Error message
 * @returns {Object} Error details {message, data}
 */
export const extractError = (message) => ({
  message: message?.message || 'Unknown error occurred',
  data: message?.data || null,
  id: message?.id || null,
});


