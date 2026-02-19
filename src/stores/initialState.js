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
    /** When true, Services opens the semantic segmentation warning modal (e.g. from shortcut "3") */
    semanticRunRequested: false,
    /** True while the semantic segmentation warning modal is open (so shortcuts don't steal Enter) */
    semanticWarningModalOpen: false,
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
  
  // Edit Mode State (for contour editing)
  editMode: {
    active: false,
    objectId: null,
    contourId: null,
    originalCoordinates: null, // { x: [], y: [] }
    draftCoordinates: null, // { x: [], y: [] }
    isDirty: false, // Track if changes have been made
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
    promptedModel: null, // Store model ID as string, not object
    completionModel: null, // Store model ID as string, not object
    semanticModel: null, // Store model ID as string, not object
    availablePromptedModels: [], // List of available AI models from backend
    availableCompletionModels: [], // List of available completion models from backend
    availableSemanticModels: [], // List of available semantic segmentation models from backend
    isLoadingModels: false,
    isLoadingCompletionModels: false,
    isLoadingSemanticModels: false,
    isRunningCompletion: false, // Track when completion segmentation (suggest similar) is running
    isRunningSemantic: false, // Track when semantic segmentation is running
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

