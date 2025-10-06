import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

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
        
        // Segmentation State (needed for canvas components)
        segmentation: {
          currentMask: null,
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
          const newObject = {
            id: Date.now(),
            pixelCount: object.pixelCount || 0,
            label: object.label || 'Object',
            mask: object.mask,
            ...object,
            color: generateObjectColor(state.objects.list.length)
          };
          state.objects.list.push(newObject);
          state.objects.colors[newObject.id] = newObject.color;
        }),
        
        removeObject: (id) => set((state) => {
          state.objects.list = state.objects.list.filter(obj => obj.id !== id);
          delete state.objects.colors[id];
          state.objects.selected = state.objects.selected.filter(objId => objId !== id);
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
      }))
    ),
    { name: 'annotation-store' }
  )
);

export default useAnnotationStore;
