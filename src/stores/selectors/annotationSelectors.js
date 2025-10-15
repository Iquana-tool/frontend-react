import useAnnotationStore from '../useAnnotationStore';
import { shallow } from 'zustand/shallow';

// Simple state selectors 
export const useCurrentTool = () => useAnnotationStore(state => state.ui.currentTool);
export const useLeftSidebarCollapsed = () => useAnnotationStore(state => state.ui.leftSidebarCollapsed);
export const useRightSidebarCollapsed = () => useAnnotationStore(state => state.ui.rightSidebarCollapsed);
export const useVisibilityControlsExpanded = () => useAnnotationStore(state => state.ui.visibilityControlsExpanded);

// Canvas selectors
export const useCanvasPrompt = () => useAnnotationStore(state => state.canvas.prompt);
export const useIsPrompting = () => useAnnotationStore(state => state.canvas.isPrompting);

// Segmentation selectors
export const useCurrentMask = () => useAnnotationStore(state => state.segmentation.currentMask);

export const useCurrentImage = () => useAnnotationStore(state => state.images.currentImage);
export const useCurrentImageId = () => useAnnotationStore(state => state.images.currentImageId);
export const useImageList = () => useAnnotationStore(state => state.images.imageList);
export const useAnnotationStatus = () => useAnnotationStore(state => state.images.annotationStatus);

// Image loading and display selectors
export const useImageObject = () => useAnnotationStore(state => state.images.imageObject);
export const useImageLoading = () => useAnnotationStore(state => state.images.imageLoading);
export const useImageError = () => useAnnotationStore(state => state.images.imageError);

// Zoom and pan selectors
export const useZoomLevel = () => useAnnotationStore(state => state.images.zoomLevel);
export const usePanOffset = () => useAnnotationStore(state => state.images.panOffset);

export const useSelectedModel = () => useAnnotationStore(state => state.models.selectedModel);
export const useCompletionModel = () => useAnnotationStore(state => state.models.completionModel);

export const useObjectsList = () => useAnnotationStore(state => state.objects.list);
export const useSelectedObjects = () => useAnnotationStore(state => state.objects.selected);
export const useObjectsVisibility = () => useAnnotationStore(
  state => state.objects.visibility,
  (a, b) => 
    a.showAll === b.showAll && 
    a.rootLevelOnly === b.rootLevelOnly && 
    a.selectedLevelOnly === b.selectedLevelOnly &&
    JSON.stringify(a.labels) === JSON.stringify(b.labels)
);
export const useObjectColors = () => useAnnotationStore(state => state.objects.colors);

// Action selectors
export const useSetCurrentTool = () => useAnnotationStore(state => state.setCurrentTool);

// Canvas actions
export const useSetPrompt = () => useAnnotationStore(state => state.setPrompt);
export const useSetIsPrompting = () => useAnnotationStore(state => state.setIsPrompting);

// Segmentation actions
export const useStartSegmentation = () => useAnnotationStore(state => state.startSegmentation);
export const useSetCurrentMask = () => useAnnotationStore(state => state.setCurrentMask);

// Object actions
export const useAddObject = () => useAnnotationStore(state => state.addObject);
export const useRemoveObject = () => useAnnotationStore(state => state.removeObject);
export const useSelectObject = () => useAnnotationStore(state => state.selectObject);
export const useDeselectObject = () => useAnnotationStore(state => state.deselectObject);
export const useClearSelection = () => useAnnotationStore(state => state.clearSelection);

export const useSetSelectedModel = () => useAnnotationStore(state => state.setSelectedModel);
export const useSetCompletionModel = () => useAnnotationStore(state => state.setCompletionModel);
export const useSetVisibilityMode = () => useAnnotationStore(state => state.setVisibilityMode);
export const useToggleVisibility = () => useAnnotationStore(state => state.toggleVisibility);
export const useSetCurrentImage = () => useAnnotationStore(state => state.setCurrentImage);
export const useSetImageList = () => useAnnotationStore(state => state.setImageList);
export const useSetAnnotationStatus = () => useAnnotationStore(state => state.setAnnotationStatus);

// Image loading and display actions
export const useSetImageObject = () => useAnnotationStore(state => state.setImageObject);
export const useSetImageLoading = () => useAnnotationStore(state => state.setImageLoading);
export const useSetImageError = () => useAnnotationStore(state => state.setImageError);

// Zoom and pan actions
export const useSetZoomLevel = () => useAnnotationStore(state => state.setZoomLevel);
export const useSetPanOffset = () => useAnnotationStore(state => state.setPanOffset);
export const useResetImageState = () => useAnnotationStore(state => state.resetImageState);

// Sidebar actions
export const useSetLeftSidebarCollapsed = () => useAnnotationStore(state => state.setLeftSidebarCollapsed);
export const useSetRightSidebarCollapsed = () => useAnnotationStore(state => state.setRightSidebarCollapsed);
export const useToggleLeftSidebar = () => useAnnotationStore(state => state.toggleLeftSidebar);
export const useToggleRightSidebar = () => useAnnotationStore(state => state.toggleRightSidebar);

// Visibility controls actions
export const useSetVisibilityControlsExpanded = () => useAnnotationStore(state => state.setVisibilityControlsExpanded);
export const useToggleVisibilityControls = () => useAnnotationStore(state => state.toggleVisibilityControls);

// AI Annotation selectors
export const useAIPrompts = () => useAnnotationStore(state => state.aiAnnotation.prompts);
export const useActivePreview = () => useAnnotationStore(state => state.aiAnnotation.activePreview);
export const useIsSubmitting = () => useAnnotationStore(state => state.aiAnnotation.isSubmitting);

// AI Annotation actions
export const useAddPointPrompt = () => useAnnotationStore(state => state.addPointPrompt);
export const useAddBoxPrompt = () => useAnnotationStore(state => state.addBoxPrompt);
export const useRemoveLastPrompt = () => useAnnotationStore(state => state.removeLastPrompt);
export const useClearAllPrompts = () => useAnnotationStore(state => state.clearAllPrompts);
export const useSetActivePreview = () => useAnnotationStore(state => state.setActivePreview);
export const useSetIsSubmittingAI = () => useAnnotationStore(state => state.setIsSubmitting);
export const useUndoLastAction = () => useAnnotationStore(state => state.undoLastAction);
export const useRedoLastAction = () => useAnnotationStore(state => state.redoLastAction);


