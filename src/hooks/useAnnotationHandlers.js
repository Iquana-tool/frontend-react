import { useCallback } from 'react';
import * as api from '../api';

export const useAnnotationHandlers = ({
  currentDataset,
  selectedImage,
  setLabelOptions,
  resetImageState,
  resetSegmentationState,
  resetContourState,
  resetCanvasState,
  setPromptType,
  setCurrentLabel,
  selectedContours,
  setSelectedContours,
  bestMask,
  finalMasks,
  finalMask,
  selectedFinalMaskContour,
  setSelectedFinalMaskContour,
  setZoomLevel,
  setZoomCenter,
  findMatchingContour,
  isPointInContour,
  drawAnnotationCanvas,
  imageObject,
  canvasOps,
  setError,
  segmentationPromptingComplete,
  currentLabel,
  zoomLevel,
  zoomCenter,
  setSuccessMessageWithTimeout,
  contourAddToFinalMask,
  contourDeleteSelected,
  selectedMask,
  setSelectedMask,
  setBestMask,
  setSegmentationMasks,
  fetchFinalMask,
  promptingCanvasRef,
}) => {
  // Fetch labels from backend
  const fetchLabels = useCallback(async () => {
    if (!currentDataset) {
      return;
    }

    try {
      const labels = await api.fetchLabels(currentDataset.id);
      if (labels && labels.length > 0) {
        const formattedLabels = labels.map((label) => ({
          id: label.id,
          name: label.name,
        }));
        setLabelOptions(formattedLabels);
      }
    } catch (error) {
      console.error("Failed to fetch labels:", error);
    }
  }, [currentDataset, setLabelOptions]);

  // Enhanced prompting complete handler
  const handlePromptingComplete = useCallback(async (prompts, promptType) => {
    if (!selectedImage || !selectedImage) {
      setError("No image selected for segmentation");
      return;
    }

    try {
      const result = await segmentationPromptingComplete(
        prompts,
        promptType,
        selectedImage,
        currentLabel,
        false,
        zoomLevel,
        zoomCenter,
        imageObject,
        selectedContours,
        bestMask,
        finalMask
      );

      if (result) {
        // Set prompt type to select after successful segmentation
        setPromptType("select");
        if (promptingCanvasRef.current) {
          promptingCanvasRef.current.setActiveTool("select");
        }

        // Handle zoom state restoration if needed
        if (result.zoomState && result.zoomState.level && result.zoomState.center) {
          setTimeout(() => {
            setZoomLevel(result.zoomState.level);
            if (promptingCanvasRef.current) {
              promptingCanvasRef.current.setZoomParameters(
                result.zoomState.level,
                result.zoomState.center
              );
            }
          }, 100);
        }

        setSuccessMessageWithTimeout("Segmentation complete!");
      }
    } catch (error) {
      console.error("Segmentation failed:", error);
      setError(error.message);
    }
  }, [selectedImage, setError, segmentationPromptingComplete, currentLabel, zoomLevel, zoomCenter, imageObject, selectedContours, bestMask, finalMask, setSuccessMessageWithTimeout, setZoomLevel, setPromptType, promptingCanvasRef]);

  // Enhanced contour operations
  const handleAddSelectedContoursToFinalMask = useCallback(async () => {
    if (!selectedImage || selectedContours.length === 0) {
      setError("No contours selected or no current image");
      return;
    }

    try {
      const result = await contourAddToFinalMask(selectedImage, selectedContours, bestMask);
      if (result.success) {
        setSuccessMessageWithTimeout(result.message);
      }
    } catch (error) {
      setError(error.message);
    }
  }, [selectedImage, selectedContours, setError, contourAddToFinalMask, bestMask, setSuccessMessageWithTimeout]);

  const handleDeleteSelectedContours = useCallback(() => {
    try {
      const message = contourDeleteSelected(
        selectedMask,
        selectedContours,
        setSelectedMask,
        setBestMask,
        setSegmentationMasks
      );
      if (message) {
        setSuccessMessageWithTimeout(message);
      }
    } catch (error) {
      setError(error.message);
    }
  }, [contourDeleteSelected, selectedMask, selectedContours, setSelectedMask, setBestMask, setSegmentationMasks, setSuccessMessageWithTimeout, setError]);

  const handleFinalMaskContourSelect = useCallback((mask, contourIndex, setAnnotationZoomLevel, setAnnotationZoomCenter) => {
    // Check if we're deselecting the same contour
    if (
      selectedFinalMaskContour &&
      selectedFinalMaskContour.maskId === mask.id &&
      selectedFinalMaskContour.contourIndex === contourIndex
    ) {
      // Reset both zoom states when deselecting
      setAnnotationZoomLevel(1);
      setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
      
      // Reset prompting canvas view if available
      if (promptingCanvasRef.current && promptingCanvasRef.current.resetView) {
        promptingCanvasRef.current.resetView();
      }
    } else {
      // First, calculate the optimal zoom for the contour so we can sync both views
      const contour = mask.contours[contourIndex];
      if (contour && contour.x && contour.y && contour.x.length > 0) {
        // Use the same calculateOptimalZoomLevel function from canvas operations
        const { calculateOptimalZoomLevel } = canvasOps;
        const { zoomLevel: optimalZoom, centerX, centerY } = calculateOptimalZoomLevel(contour);
        
        // Sync the annotation drawing area zoom state
        setAnnotationZoomLevel(optimalZoom);
        setAnnotationZoomCenter({ x: centerX, y: centerY });
        
        // Also apply zoom to the prompting canvas if available
        if (promptingCanvasRef.current && promptingCanvasRef.current.setZoomParameters) {
          promptingCanvasRef.current.setZoomParameters(optimalZoom, { x: centerX, y: centerY });
        }
      }
    }

    // Then call the original final mask contour select function
    canvasOps.handleFinalMaskContourSelect(
      mask,
      contourIndex,
      setSelectedFinalMaskContour,
      setZoomCenter,
      setZoomLevel,
      setSelectedContours,
      bestMask,
      findMatchingContour,
      (bMask, cImage, sContours, sFinalMaskContour) =>
        drawAnnotationCanvas(bMask, cImage, sContours, sFinalMaskContour),
      imageObject,
      selectedFinalMaskContour
    );
  }, [selectedFinalMaskContour, canvasOps, setSelectedFinalMaskContour, setZoomCenter, setZoomLevel, setSelectedContours, bestMask, findMatchingContour, imageObject, drawAnnotationCanvas, promptingCanvasRef]);

  // Canvas event handlers with proper parameter passing
  const handleAnnotationCanvasClick = useCallback((event, handleFinalMaskContourSelectRef) => {
    canvasOps.handleAnnotationCanvasClick(
      event,
      bestMask,
      selectedContours,
      setSelectedContours,
      setSelectedFinalMaskContour,
      setZoomLevel,
      setZoomCenter,
      finalMasks,
      findMatchingContour,
      handleFinalMaskContourSelectRef,
      isPointInContour
    );
  }, [canvasOps, bestMask, selectedContours, setSelectedContours, setSelectedFinalMaskContour, setZoomLevel, setZoomCenter, finalMasks, findMatchingContour, isPointInContour]);

  const handleFinalMaskCanvasClick = useCallback((event, handleFinalMaskContourSelectRef) => {
    canvasOps.handleFinalMaskCanvasClick(
      event,
      finalMasks,
      selectedFinalMaskContour,
      setSelectedFinalMaskContour,
      setZoomLevel,
      setSelectedContours,
      imageObject,
      () => drawAnnotationCanvas(bestMask, imageObject, selectedContours, selectedFinalMaskContour),
      handleFinalMaskContourSelectRef,
      isPointInContour
    );
  }, [canvasOps, finalMasks, selectedFinalMaskContour, setSelectedFinalMaskContour, setZoomLevel, setSelectedContours, imageObject, isPointInContour, drawAnnotationCanvas, bestMask, selectedContours]);

  const handleReset = useCallback((setAnnotationZoomLevel, setAnnotationZoomCenter) => {
    resetImageState();
    resetSegmentationState();
    resetContourState();
    resetCanvasState();
    setPromptType("point");
    setCurrentLabel(null);
    // Reset annotation zoom states
    setAnnotationZoomLevel(1);
    setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
  }, [resetImageState, resetSegmentationState, resetContourState, resetCanvasState, setPromptType, setCurrentLabel]);

  const handleRunNewSegmentation = useCallback(() => {
    if (promptingCanvasRef && promptingCanvasRef.current) {
      promptingCanvasRef.current.clearPrompts();
      setSuccessMessageWithTimeout("Add new prompts to improve segmentation", 3000);
    }
  }, [setSuccessMessageWithTimeout, promptingCanvasRef]);

  return {
    fetchLabels,
    handlePromptingComplete,
    handleAddSelectedContoursToFinalMask,
    handleDeleteSelectedContours,
    handleFinalMaskContourSelect,
    handleAnnotationCanvasClick,
    handleFinalMaskCanvasClick,
    handleReset,
    handleRunNewSegmentation,
  };
}; 