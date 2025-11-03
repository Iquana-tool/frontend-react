import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { calculateBoundingBox, calculateFocusTransformSimple } from '../utils/geometryUtils';
import { getLabelColor, getLabelColorByName } from '../utils/labelColors';

const generateObjectColor = (index) => {
  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red  
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ];
  return colors[index % colors.length];
};

/**
 * Get color for an object based on its label, or fallback to index-based color
 * @param {Object} object - Object with labelId, label, or labelName
 * @param {number} index - Fallback index for unlabeled objects
 * @returns {string} Hex color code
 */
const getObjectColor = (object, index) => {
  // If object has a labelId, use label-based color
  if (object.labelId) {
    return getLabelColor(object.labelId);
  }
  // If object has a label name (but no ID), use name-based color
  if (object.label && object.label !== 'Object') {
    return getLabelColorByName(object.label);
  }
  // Fallback to index-based color for unlabeled objects
  return generateObjectColor(index);
};

const useAnnotationStore = create()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
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
        
        
        // Actions 
        setCurrentTool: (tool) => set((state) => {
          state.ui.currentTool = tool;
        }),
        
        setSelectedModel: (model) => set((state) => {
          state.models.selectedModel = model;
        }),
        
        setCompletionModel: (model) => set((state) => {
          state.models.completionModel = model;
        }),
        
        // Canvas actions
        setPrompt: (prompt) => set((state) => {
          state.canvas.prompt = prompt;
        }),
        
        setIsPrompting: (isPrompting) => set((state) => {
          state.canvas.isPrompting = isPrompting;
        }),
        
        // Segmentation actions
        startSegmentation: () => set((state) => {
          // This is a placeholder - in real implementation this would trigger AI segmentation
          console.log('Starting segmentation...');
        }),
        
        setCurrentMask: (mask) => set((state) => {
          state.segmentation.currentMask = mask;
        }),
        
        // Object actions
        addObject: (object) => set((state) => {
          // Use contour_id from backend if available, otherwise generate a timestamp ID
          const objectId = object.contour_id || object.mask?.id || Date.now();
          const newObject = {
            id: objectId, // Store ID (can be contour_id or timestamp)
            contour_id: object.contour_id || object.mask?.id || null, // Backend contour ID for API calls
            pixelCount: object.pixelCount || 0,
            label: object.label || 'Object',
            path: object.path || object.mask?.path || null, // Preserve path from backend
            mask: object.mask,
            ...object,
            // Use label-based color if labeled, otherwise use index-based
            color: getObjectColor({ labelId: object.labelId, label: object.label }, state.objects.list.length)
          };
          state.objects.list.push(newObject);
          state.objects.colors[newObject.id] = newObject.color;
        }),
        
        // Replace all objects from a backend ContourHierarchy
        setObjectsFromHierarchy: (hierarchy) => set((state) => {
          const list = [];
          const colors = {};
          if (hierarchy && Array.isArray(hierarchy.root_contours)) {
            const queue = [...hierarchy.root_contours];
            while (queue.length > 0) {
              const c = queue.shift();
              const id = c.id ?? Date.now() + Math.random();
              const obj = {
                id,
                contour_id: c.id ?? null,
                label: c.label ?? null,
                labelId: c.label_id ?? c.labelId ?? null, // Support both label_id and labelId from backend
                x: c.x || [],
                y: c.y || [],
                path: c.path || null, // SVG path from backend
                added_by: c.added_by || null,
                temporary: !!c.temporary,
                parent_id: c.parent_id ?? null,
                quantification: c.quantification || null,
                // Use label-based color if labeled, otherwise use index-based
                color: getObjectColor({ labelId: c.label_id ?? c.labelId, label: c.label }, list.length),
              };
              list.push(obj);
              colors[obj.id] = obj.color;
              if (Array.isArray(c.children) && c.children.length > 0) {
                queue.push(...c.children);
              }
            }
          }
          state.objects.list = list;
          state.objects.selected = [];
          state.objects.colors = colors;
        }),
        
        clearObjects: () => set((state) => {
          state.objects.list = [];
          state.objects.selected = [];
          state.objects.colors = {};
        }),
        
        removeObject: (id) => set((state) => {
          state.objects.list = state.objects.list.filter(obj => obj.id !== id);
          delete state.objects.colors[id];
          state.objects.selected = state.objects.selected.filter(objId => objId !== id);
          
          // Clear focus mode if the focused object is removed
          if (state.focusMode.objectId === id) {
            state.focusMode.active = false;
            state.focusMode.objectId = null;
            state.focusMode.objectMask = null;
          }
        }),
        
        updateObject: (id, updates) => set((state) => {
          const objectIndex = state.objects.list.findIndex(obj => obj.id === id);
          if (objectIndex !== -1) {
            const existingObject = state.objects.list[objectIndex];
            // Merge updates into the existing object
            const updatedObject = {
              ...existingObject,
              ...updates
            };
            
            // If label or labelId is being updated, recalculate color based on label
            if (updates.labelId !== undefined || updates.label !== undefined) {
              updatedObject.color = getObjectColor(
                { 
                  labelId: updatedObject.labelId, 
                  label: updatedObject.label 
                }, 
                objectIndex
              );
              // Also update the colors map
              state.objects.colors[updatedObject.id] = updatedObject.color;
            }
            
            state.objects.list[objectIndex] = updatedObject;
          }
        }),
        
        selectObject: (id) => set((state) => {
          if (!state.objects.selected.includes(id)) {
            state.objects.selected.push(id);
          }
        }),
        
        deselectObject: (id) => set((state) => {
          state.objects.selected = state.objects.selected.filter(objId => objId !== id);
        }),
        
        clearSelection: () => set((state) => {
          state.objects.selected = [];
        }),
        
        toggleVisibility: (filter) => set((state) => {
          if (filter in state.objects.visibility) {
            state.objects.visibility[filter] = !state.objects.visibility[filter];
          } else if (filter.startsWith('label') && state.objects.visibility.labels[filter]) {
            state.objects.visibility.labels[filter] = !state.objects.visibility.labels[filter];
          }
        }),
        
        setVisibilityMode: (mode) => set((state) => {
          state.objects.visibility.showAll = false;
          state.objects.visibility.rootLevelOnly = false;
          state.objects.visibility.selectedLevelOnly = false;
          state.objects.visibility[mode] = true;
        }),
        
        setCurrentImage: (image) => set((state) => {
          state.images.currentImage = image;
          state.images.currentImageId = image?.id || null;
          
          // Clear focus mode when switching images
          state.focusMode.active = false;
          state.focusMode.objectId = null;
          state.focusMode.objectMask = null;
        }),
        
        setImageList: (images) => set((state) => {
          state.images.imageList = images;
        }),
        
        setAnnotationStatus: (status) => set((state) => {
          state.images.annotationStatus = status;
        }),
        
        // Image loading and display actions
        setImageObject: (imageObject) => set((state) => {
          state.images.imageObject = imageObject;
        }),
        
        setImageLoading: (loading) => set((state) => {
          state.images.imageLoading = loading;
        }),
        
        setImageError: (error) => set((state) => {
          state.images.imageError = error;
        }),
        
        // Zoom and pan actions
        setZoomLevel: (level) => set((state) => {
          state.images.zoomLevel = level;
        }),
        
        setPanOffset: (offset) => set((state) => {
          state.images.panOffset = offset;
        }),
        
        resetImageState: () => set((state) => {
          state.images.imageObject = null;
          state.images.imageLoading = false;
          state.images.imageError = null;
          state.images.zoomLevel = 1;
          state.images.panOffset = { x: 0, y: 0 };
          
          // Clear focus mode when resetting image state
          state.focusMode.active = false;
          state.focusMode.objectId = null;
          state.focusMode.objectMask = null;
        }),
        
        // Sidebar actions
        setLeftSidebarCollapsed: (collapsed) => set((state) => {
          state.ui.leftSidebarCollapsed = collapsed;
        }),
        
        setRightSidebarCollapsed: (collapsed) => set((state) => {
          state.ui.rightSidebarCollapsed = collapsed;
        }),
        
        toggleLeftSidebar: () => set((state) => {
          state.ui.leftSidebarCollapsed = !state.ui.leftSidebarCollapsed;
        }),
        
        toggleRightSidebar: () => set((state) => {
          state.ui.rightSidebarCollapsed = !state.ui.rightSidebarCollapsed;
        }),
        
        // Visibility controls actions
        setVisibilityControlsExpanded: (expanded) => set((state) => {
          state.ui.visibilityControlsExpanded = expanded;
        }),
        
        toggleVisibilityControls: () => set((state) => {
          state.ui.visibilityControlsExpanded = !state.ui.visibilityControlsExpanded;
        }),
        
        // AI Annotation actions
        addPointPrompt: (x, y, label) => set((state) => {
          // Save current state for undo
          const currentPrompts = [...state.aiAnnotation.prompts];
          state.aiAnnotation.undoStack = state.aiAnnotation.undoStack || [];
          state.aiAnnotation.undoStack.push(currentPrompts);
          
          // Clear redo stack (new action invalidates redo)
          state.aiAnnotation.redoStack = [];
          
          // Add new prompt
          state.aiAnnotation.prompts.push({
            id: `${Date.now()}-${Math.random()}`,
            type: 'point',
            coords: { x, y },
            label, // 'positive' or 'negative'
          });
        }),
        
        addBoxPrompt: (x1, y1, x2, y2) => set((state) => {
          // Save current state for undo
          const currentPrompts = [...state.aiAnnotation.prompts];
          state.aiAnnotation.undoStack = state.aiAnnotation.undoStack || [];
          state.aiAnnotation.undoStack.push(currentPrompts);
          
          // Clear redo stack (new action invalidates redo)
          state.aiAnnotation.redoStack = [];
          
          // Add new box prompt
          state.aiAnnotation.prompts.push({
            id: `${Date.now()}-${Math.random()}`,
            type: 'box',
            coords: { 
              x1: Math.min(x1, x2), 
              y1: Math.min(y1, y2), 
              x2: Math.max(x1, x2), 
              y2: Math.max(y1, y2) 
            },
          });
        }),
        
        removeLastPrompt: () => set((state) => {
          if (state.aiAnnotation.prompts.length > 0) {
            // Save current state for undo
            const currentPrompts = [...state.aiAnnotation.prompts];
            state.aiAnnotation.undoStack = state.aiAnnotation.undoStack || [];
            state.aiAnnotation.undoStack.push(currentPrompts);
            
            // Clear redo stack (new action invalidates redo)
            state.aiAnnotation.redoStack = [];
            
            // Remove last prompt
            state.aiAnnotation.prompts.pop();
          }
        }),
        
        clearAllPrompts: () => set((state) => {
          // Save current state for undo
          const currentPrompts = [...state.aiAnnotation.prompts];
          state.aiAnnotation.undoStack = state.aiAnnotation.undoStack || [];
          state.aiAnnotation.undoStack.push(currentPrompts);
          
          // Clear redo stack (new action invalidates redo)
          state.aiAnnotation.redoStack = [];
          
          // Clear all prompts
          state.aiAnnotation.prompts = [];
          state.aiAnnotation.activePreview = null;
        }),
        
        setActivePreview: (preview) => set((state) => {
          state.aiAnnotation.activePreview = preview;
        }),
        
        setIsSubmitting: (isSubmitting) => set((state) => {
          state.aiAnnotation.isSubmitting = isSubmitting;
        }),
        
        // Custom undo action
        undoLastAction: () => set((state) => {
          if (state.aiAnnotation.undoStack && state.aiAnnotation.undoStack.length > 0) {
            // Save current state to redo stack
            const currentState = [...state.aiAnnotation.prompts];
            state.aiAnnotation.redoStack = state.aiAnnotation.redoStack || [];
            state.aiAnnotation.redoStack.push(currentState);
            
            // Restore previous state
            const previousState = state.aiAnnotation.undoStack.pop();
            state.aiAnnotation.prompts = previousState;
          }
        }),
        
        // Custom redo action
        redoLastAction: () => set((state) => {
          if (state.aiAnnotation.redoStack && state.aiAnnotation.redoStack.length > 0) {
            // Save current state to undo stack
            const currentState = [...state.aiAnnotation.prompts];
            state.aiAnnotation.undoStack = state.aiAnnotation.undoStack || [];
            state.aiAnnotation.undoStack.push(currentState);
            
            // Restore next state
            const nextState = state.aiAnnotation.redoStack.pop();
            state.aiAnnotation.prompts = nextState;
          }
        }),
        
        // WebSocket actions
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
        
        // Context Menu actions
        showContextMenu: (x, y, targetObjectId) => set((state) => {
          state.contextMenu.visible = true;
          state.contextMenu.x = x;
          state.contextMenu.y = y;
          state.contextMenu.targetObjectId = targetObjectId;
        }),
        
        hideContextMenu: () => set((state) => {
          state.contextMenu.visible = false;
          state.contextMenu.targetObjectId = null;
        }),
        
        // Focus Mode actions
        enterFocusMode: (objectId, objectMask) => set((state) => {
          state.focusMode.active = true;
          state.focusMode.objectId = objectId;
          state.focusMode.objectMask = objectMask;
        }),
        
        enterFocusModeWithZoom: (objectId, objectMask, imageDimensions, containerDimensions, renderedImageDimensions) => set((state) => {
          state.focusMode.active = true;
          state.focusMode.objectId = objectId;
          state.focusMode.objectMask = objectMask;
          
          // Calculate and apply zoom/pan for focus
          if (objectMask && objectMask.points) {
            const boundingBox = calculateBoundingBox(objectMask.points);
            const focusTransform = calculateFocusTransformSimple(
              boundingBox, 
              imageDimensions, 
              containerDimensions, 
              renderedImageDimensions
            );
            
            // Set both zoom and pan
            state.images.zoomLevel = focusTransform.zoomLevel;
            state.images.panOffset = focusTransform.panOffset;
          }
        }),
        
        panZoomToObject: (objectMask, imageDimensions, containerDimensions, renderedImageDimensions) => set((state) => {
          if (objectMask && objectMask.points) {
            const boundingBox = calculateBoundingBox(objectMask.points);
            const focusTransform = calculateFocusTransformSimple(
              boundingBox, 
              imageDimensions, 
              containerDimensions, 
              renderedImageDimensions
            );
            
            state.images.zoomLevel = focusTransform.zoomLevel;
            state.images.panOffset = focusTransform.panOffset;
          }
        }),
        
        exitFocusMode: () => set((state) => {
          state.focusMode.active = false;
          state.focusMode.objectId = null;
          state.focusMode.objectMask = null;
        }),
      }))
    ),
    { name: 'annotation-store' }
  )
);

export default useAnnotationStore;
