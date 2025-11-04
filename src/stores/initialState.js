/**
 * Initial state for the annotation store
 */
export const initialState = {
  // UI State
  ui: {
    currentTool: 'selection',
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
    undoStack: [],
    redoStack: [],
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
    selectedModel: 'SAM2',
    completionModel: 'DINOv3',
  },
  
  // Objects State
  objects: {
    list: [],
    selected: [],
    visibility: {
      showAll: true,
      rootLevelOnly: false,
      selectedLevelOnly: false,
      labels: {
        label1: true, 
        label2: true, 
        label3: true,
        label4: true, 
        label5: true, 
        label6: true,
      }
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

