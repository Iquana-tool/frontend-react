import { useRef, useState } from "react";
import { useDataset } from "../../../contexts/DatasetContext";

// Custom Hooks
import { useImageManagement } from "../../../hooks/useImageManagement";
import { useSegmentation } from "../../../hooks/useSegmentation";
import { useContourOperations } from "../../../hooks/useContourOperations";
import { useCanvasOperations } from "../../../hooks/useCanvasOperations";
import { useAnnotationState } from "../../../hooks/useAnnotationState";
import { useAnnotationZoom } from "../../../hooks/useAnnotationZoom";
import { useAnnotationHandlers } from "../../../hooks/useAnnotationHandlers";
import { useImageNavigation } from "../../../hooks/useImageNavigation";

export const useAnnotationPageState = (initialImageId) => {
  const { currentDataset } = useDataset();

  // Refs
  const promptingCanvasRef = useRef(null);
  const isNavigatingRef = useRef(false);

  // Custom Hooks
  const annotationState = useAnnotationState();
  const annotationZoom = useAnnotationZoom();
  const contourOps = useContourOperations();
  const imageManagement = useImageManagement(contourOps.fetchFinalMask);
  const segmentation = useSegmentation();
  const canvasOps = useCanvasOperations();

  // Additional state
  const [isAddingToFinalMask, setIsAddingToFinalMask] = useState(false);

  // Create reset function for zoom states
  const resetZoomStatesWrapper = () => {
    annotationZoom.resetZoomStates(
      canvasOps.setZoomLevel,
      canvasOps.setZoomCenter,
      contourOps.setSelectedFinalMaskContour,
      promptingCanvasRef
    );
  };

  // Navigation hook
  const imageNavigation = useImageNavigation({
    originalHandleImageSelect: imageManagement.handleImageSelect,
    resetSegmentationState: segmentation.resetSegmentationState,
    resetContourState: contourOps.resetContourState,
    resetCanvasState: canvasOps.resetCanvasState,
    resetZoomStates: resetZoomStatesWrapper,
    setIsTransitioning: annotationState.setIsTransitioning,
    setError: imageManagement.setError,
  });

  // Handlers hook
  const handlers = useAnnotationHandlers({
    currentDataset,
    selectedImage: imageManagement.selectedImage,
    currentLabel: annotationState.currentLabel,
    setCurrentLabel: annotationState.setCurrentLabel,
    setLabelOptions: annotationState.setLabelOptions,
    resetImageState: imageManagement.resetImageState,
    resetSegmentationState: segmentation.resetSegmentationState,
    resetContourState: contourOps.resetContourState,
    resetCanvasState: canvasOps.resetCanvasState,
    setPromptType: annotationState.setPromptType,
    segmentationPromptingComplete: segmentation.handlePromptingComplete,
    zoomLevel: canvasOps.zoomLevel,
    zoomCenter: canvasOps.zoomCenter,
    imageObject: imageManagement.imageObject,
    selectedContours: contourOps.selectedContours,
    setSelectedContours: contourOps.setSelectedContours,
    bestMask: segmentation.bestMask,
    finalMasks: contourOps.finalMasks,
    finalMask: contourOps.finalMask,
    selectedFinalMaskContour: contourOps.selectedFinalMaskContour,
    setSelectedFinalMaskContour: contourOps.setSelectedFinalMaskContour,
    setZoomLevel: canvasOps.setZoomLevel,
    setZoomCenter: canvasOps.setZoomCenter,
    findMatchingContour: contourOps.findMatchingContour,
    isPointInContour: contourOps.isPointInContour,
    drawAnnotationCanvas: canvasOps.drawAnnotationCanvas,
    canvasOps,
    setError: imageManagement.setError,
    setSuccessMessageWithTimeout: annotationState.setSuccessMessage,
    setSelectedContourIds: segmentation.setSelectedContourIds,
    setSegmentationMasks: segmentation.setSegmentationMasks,
    setBestMask: segmentation.setBestMask,
    contourAddToFinalMask: contourOps.handleAddSelectedContoursToFinalMask,
    contourDeleteSelected: contourOps.handleDeleteSelectedContours,
    selectedMask: segmentation.selectedMask,
    setSelectedMask: segmentation.setSelectedMask,
    fetchFinalMask: contourOps.fetchFinalMask,
    promptingCanvasRef,
    annotationState,
  });

  return {
    // Core state
    currentDataset,
    promptingCanvasRef,
    isNavigatingRef,
    isAddingToFinalMask,
    setIsAddingToFinalMask,

    // Hook returns
    annotationState,
    annotationZoom,
    contourOps,
    imageManagement,
    segmentation,
    canvasOps,
    imageNavigation,
    handlers,

    // Helper functions
    resetZoomStatesWrapper,

    // Combined error state
    error: imageManagement.error,
    setError: imageManagement.setError,
  };
}; 