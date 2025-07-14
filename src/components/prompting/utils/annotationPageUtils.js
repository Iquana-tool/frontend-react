import {
  exportQuantificationsAsCsv,
  createSaveMaskHandler,
  createSuccessMessageHandler,
  createFinalMaskContourWrappers,
} from "../../../utils/annotationUtils";
import { drawAnnotationCanvas as renderAnnotationCanvas } from "../../../utils/canvasDrawUtils";

export const createUtilityFunctions = ({
  selectedMask,
  customSaveMaskLabel,
  saveMaskLabel,
  setError,
  setSuccessMessageWithTimeout,
  setShowSaveMaskDialog,
  setSavingMaskIndex,
  setSaveMaskLabel,
  setCustomSaveMaskLabel,
  selectedImage,
  handleDeleteFinalMaskContour,
  fetchFinalMask,
  clearAllFinalMaskContours,
  finalMask,
}) => {
  // Create success message handler
  const setSuccessMessageWithTimeoutHandler =
    createSuccessMessageHandler(setSuccessMessageWithTimeout);

  // Save mask handler
  const saveSelectedMask = createSaveMaskHandler(
    selectedMask,
    customSaveMaskLabel,
    saveMaskLabel,
    setError,
    setSuccessMessageWithTimeoutHandler,
    setShowSaveMaskDialog,
    setSavingMaskIndex,
    setSaveMaskLabel,
    setCustomSaveMaskLabel
  );

  // Create wrapper functions for final mask contour operations
  const {
    handleDeleteFinalMaskContourWrapper,
    clearAllFinalMaskContoursWrapper,
  } = createFinalMaskContourWrappers(
    selectedImage,
    setError,
    handleDeleteFinalMaskContour,
    fetchFinalMask,
    setSuccessMessageWithTimeoutHandler,
    clearAllFinalMaskContours,
    finalMask
  );

  return {
    saveSelectedMask,
    handleDeleteFinalMaskContourWrapper,
    clearAllFinalMaskContoursWrapper,
    setSuccessMessageWithTimeoutHandler,
    exportQuantificationsAsCsv,
    renderAnnotationCanvas,
  };
};

export const createQuantificationTableHandlers = ({
  setZoomLevel,
  setZoomCenter,
  setAnnotationZoomLevel,
  setAnnotationZoomCenter,
  setSelectedFinalMaskContour,
  setSelectedContours,
  promptingCanvasRef,
  annotationCanvasRef,
  bestMask,
  imageObject,
  finalMasks,
  canvasOps,
  handleFinalMaskContourSelectWrapper,
  handleDeleteContourFromTable,
}) => {
  const handleContourSelect = (row) => {
    // Handle zoom-out when row is null
    if (row === null) {
      setZoomLevel(1);
      setZoomCenter({ x: 0.5, y: 0.5 });
      setAnnotationZoomLevel(1);
      setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
      setSelectedFinalMaskContour(null);
      setSelectedContours([]);

      // Reset prompting canvas view if available
      if (
        promptingCanvasRef.current &&
        promptingCanvasRef.current.resetView
      ) {
        promptingCanvasRef.current.resetView();
      }

      // Force redraw of annotation canvas with updated zoom state
      renderAnnotationCanvas({
        canvasRef: annotationCanvasRef,
        bestMask,
        canvasImage: imageObject,
        selectedContours: [],
        selectedFinalMaskContour: null,
        zoomLevel: 1,
        zoomCenter: { x: 0.5, y: 0.5 },
      });

      return;
    }

    // Find the corresponding contour and trigger zoom
    if (finalMasks.length > 0 && finalMasks[0].contours) {
      const contourIndex = finalMasks[0].contours.findIndex(
        (c) => c.id === row.contour_id
      );
      if (contourIndex !== -1) {
        const finalMask = finalMasks[0];
        const contour = finalMask.contours[contourIndex];

        // Calculate optimal zoom for synchronization
        if (
          contour &&
          contour.x &&
          contour.y &&
          contour.x.length > 0
        ) {
          const { calculateOptimalZoomLevel } = canvasOps;
          const {
            zoomLevel: optimalZoom,
            centerX,
            centerY,
          } = calculateOptimalZoomLevel(contour);

          // Sync annotation zoom with final mask zoom
          setAnnotationZoomLevel(optimalZoom);
          setAnnotationZoomCenter({ x: centerX, y: centerY });

          // Also apply zoom to prompting canvas if available
          if (
            promptingCanvasRef.current &&
            promptingCanvasRef.current.setZoomParameters
          ) {
            promptingCanvasRef.current.setZoomParameters(
              optimalZoom,
              { x: centerX, y: centerY }
            );
          }
        }

        handleFinalMaskContourSelectWrapper(
          finalMask,
          contourIndex
        );
      }
    }
  };

  const handleContourDelete = (contourId) => {
    return handleDeleteContourFromTable(contourId);
  };

  return {
    handleContourSelect,
    handleContourDelete,
  };
}; 