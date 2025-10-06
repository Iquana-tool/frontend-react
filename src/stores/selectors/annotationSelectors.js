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

// Sidebar actions
export const useSetLeftSidebarCollapsed = () => useAnnotationStore(state => state.setLeftSidebarCollapsed);
export const useSetRightSidebarCollapsed = () => useAnnotationStore(state => state.setRightSidebarCollapsed);
export const useToggleLeftSidebar = () => useAnnotationStore(state => state.toggleLeftSidebar);
export const useToggleRightSidebar = () => useAnnotationStore(state => state.toggleRightSidebar);

// Visibility controls actions
export const useSetVisibilityControlsExpanded = () => useAnnotationStore(state => state.setVisibilityControlsExpanded);
export const useToggleVisibilityControls = () => useAnnotationStore(state => state.toggleVisibilityControls);

