/**
 * Initial state for the annotation store
 */
export const initialState = {
  // UI State
  ui: {
    currentTool: 'ai_annotation',
    leftSidebarCollapsed: false,
    rightSidebarCollapsed: false,
    visibilityControlsExpanded: true,
  },
  
  // Canvas State (needed for canvas components)
  canvas: {
    prompt: null,
    isPrompting: false,
  },
  
  // AI Annotation State (for AI-assisted annotation flow)
  aiAnnotation: {
    prompts: [],
    activePreview: null,
    isSubmitting: false,
    instantSegmentation: false, // Auto-trigger segmentation when prompt is added
    undoStack: [],
    redoStack: [],
    // Refinement mode
    refinementMode: {
      active: false,
      objectId: null, // Store ID for UI selection
      contourId: null, // Backend contour ID for refinement
    },
  },
  
  // Segmentation State (needed for canvas components)
  segmentation: {
    currentMask: null,
  },
  
  // Context Menu State (for object labeling)
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    targetObjectId: null,
  },
  
  // Focus Mode State (for focused annotation)
  focusMode: {
    active: false,
    objectId: null,
    objectMask: null, // Store mask for boundary checking
  },
  
  // Image State
  images: {
    currentImage: null,
    currentImageId: null,
    imageList: [],
    annotationStatus: 'not_started',
    // Image loading and display state
    imageObject: null,
    imageLoading: false,
    imageError: null,
    // Zoom and pan state
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
  },
  
  // Model State
  models: {
    selectedModel: {},
    completionModel: {}, // Default completion model
    availableModels: [], // List of available AI models from backend
    availableCompletionModels: [], // List of available completion models from backend
    isLoadingModels: false,
    isLoadingCompletionModels: false,
  },
  
  // Objects State
  objects: {
    list: [],
    selected: [],
    visibility: {
      showAll: true,
      rootLevelOnly: false,
      selectedLevelOnly: false,
      showRootLabels: true, // Toggle for root level labels visibility
      labels: {}, // Map of labelId -> boolean (dynamically populated from actual labels)
      rootLabelIds: [], // Array of root-level label IDs for filtering
    },
    colors: {},
    labelAssignmentCounter: 0, // Global counter to track label assignment order
  },
  
  // WebSocket State
  websocket: {
    connectionState: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
    sessionState: 'uninitialized',   // 'uninitialized' | 'initializing' | 'ready' | 'error'
    currentImageId: null,
    runningServices: [],
    failedServices: [],
    lastError: null,
    isReconnecting: false,
  },
};

