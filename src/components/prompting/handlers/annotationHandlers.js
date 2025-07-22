import { addContoursToFinalMask } from "../../../api/masks";

export const createSegmentationHandlers = ({
  setSelectedContourIds,
  setSegmentationMasks,
  setBestMask,
  setSuccessMessageWithTimeout,
  resetSegmentationState,
  selectedImage,
  setError,
  fetchFinalMask,
  promptingCanvasRef,
}) => {
  const handleToggleContourSelection = (contourId) => {
    setSelectedContourIds((prev) => {
      const isCurrentlySelected = prev.includes(contourId);
      return isCurrentlySelected
        ? prev.filter((id) => id !== contourId)
        : [...prev, contourId];
    });
  };

  const handleSelectAllSegmentationContours = (segmentationMasks) => {
    const allContourIds = segmentationMasks.flatMap((mask) =>
      (mask.contours || []).map(
        (contour, index) => contour.id || `${mask.id}-${index}`
      )
    );
    setSelectedContourIds(allContourIds);
  };

  const handleClearSegmentationSelection = () => {
    setSelectedContourIds([]);
  };

  const handleDeleteSegmentationContour = (contourId, bestMask) => {
    setSegmentationMasks((prevMasks) => {
      const newMasks = prevMasks
        .map((mask) => ({
          ...mask,
          contours: mask.contours.filter((c) => c.id !== contourId),
        }))
        .filter((mask) => mask.contours.length > 0);

      // Also update selected contour IDs
      setSelectedContourIds((prevIds) =>
        prevIds.filter((id) => id !== contourId)
      );

      // Update best mask if it was affected
      if (bestMask && bestMask.contours.some((c) => c.id === contourId)) {
        const newBestMask = newMasks.find((m) => m.id === bestMask.id);
        setBestMask(newBestMask || null);
      }

      return newMasks;
    });
  };

  const handleClearAllSegmentationResults = () => {
    resetSegmentationState();
    setSuccessMessageWithTimeout("Cleared all segmentation results.");
  };

  return {
    handleToggleContourSelection,
    handleSelectAllSegmentationContours,
    handleClearSegmentationSelection,
    handleDeleteSegmentationContour,
    handleClearAllSegmentationResults,
  };
};

export const createContourAdditionHandlers = ({
  selectedImage,
  setError,
  setSuccessMessageWithTimeout,
  fetchFinalMask,
  setSegmentationMasks,
  setSelectedContourIds,
  promptingCanvasRef,
  setIsAddingToFinalMask,
  annotationState,
}) => {
  const handleAddFromSegmentationToFinal = async (contoursToAdd) => {
    if (!selectedImage || contoursToAdd.length === 0) {
      setError("No image selected or no contours to add.");
      return;
    }

    // Check if mask is finished and prevent adding contours
    if (annotationState.isMaskFinished) {
      setError("This mask is marked as finished. Please click 'Edit Mask' to continue editing.");
      return;
    }

    setIsAddingToFinalMask(true);

    try {
      // Use the same format as manual contour addition
      const formattedContours = contoursToAdd.map((contour) => ({
        x: contour.x || contour.coordinates.map((p) => p.x),
        y: contour.y || contour.coordinates.map((p) => p.y),
        label: contour.label || 0,
      }));

      const response = await addContoursToFinalMask(
        selectedImage.id,
        formattedContours
      );

      if (response.success) {
        setSuccessMessageWithTimeout(
          `${contoursToAdd.length} contour(s) added to final mask.`
        );

        // Refresh the final mask to show the new additions with quantifications
        await fetchFinalMask(selectedImage.id);
        
        // Additional fetch after delay to ensure quantifications are calculated
        setTimeout(async () => {
          await fetchFinalMask(selectedImage.id);
        }, 1500);

        // Remove the added contours from the segmentation results
        const addedContourIds = contoursToAdd.map((c) => c.id);
        setSegmentationMasks((prevMasks) =>
          prevMasks
            .map((mask) => ({
              ...mask,
              contours: mask.contours.filter(
                (c) => !addedContourIds.includes(c.id)
              ),
            }))
            .filter((mask) => mask.contours.length > 0)
        );
        setSelectedContourIds((prevIds) =>
          prevIds.filter((id) => !addedContourIds.includes(id))
        );

        // Force canvas redraw to clear the removed contours from annotation area
        setTimeout(() => {
          if (promptingCanvasRef.current) {
            promptingCanvasRef.current.forceRedraw?.();
          }
        }, 50);
      } else {
        setError(response.message || "Failed to add contours to final mask");
      }
    } catch (error) {
      console.error(
        "Error adding contours from segmentation to final mask:",
        error
      );
      setError("An error occurred while adding contours.");
    } finally {
      setIsAddingToFinalMask(false);
    }
  };

  const handleAddSingleContourToFinalMask = async (contoursToAdd) => {
    if (!selectedImage || contoursToAdd.length === 0) {
      setError("No image selected or no contours to add.");
      return;
    }

    // Check if mask is finished and prevent adding contours
    if (annotationState.isMaskFinished) {
      setError("This mask is marked as finished. Please click 'Edit Mask' to continue editing.");
      return;
    }

    setIsAddingToFinalMask(true);

    try {
      // Use the same format as manual contour addition
      const formattedContours = contoursToAdd.map((contour) => ({
        x: contour.x || contour.coordinates.map((p) => p.x),
        y: contour.y || contour.coordinates.map((p) => p.y),
        label: contour.label || 0,
      }));

      const response = await addContoursToFinalMask(
        selectedImage.id,
        formattedContours
      );

      if (response.success) {
        setSuccessMessageWithTimeout(
          `${contoursToAdd.length} contour(s) added to final mask.`
        );

        // Refresh the final mask to show the new additions with quantifications
        await fetchFinalMask(selectedImage.id);
        
        // Additional fetch after delay to ensure quantifications are calculated
        setTimeout(async () => {
          await fetchFinalMask(selectedImage.id);
        }, 1500);

        // Remove the added contours from the segmentation results
        const addedContourIds = contoursToAdd.map((c) => c.id);
        setSegmentationMasks((prevMasks) =>
          prevMasks
            .map((mask) => ({
              ...mask,
              contours: mask.contours.filter(
                (c) => !addedContourIds.includes(c.id)
              ),
            }))
            .filter((mask) => mask.contours.length > 0)
        );
        setSelectedContourIds((prevIds) =>
          prevIds.filter((id) => !addedContourIds.includes(id))
        );

        // Force canvas redraw to clear the removed contours from annotation area
        setTimeout(() => {
          if (promptingCanvasRef.current) {
            promptingCanvasRef.current.forceRedraw?.();
          }
        }, 50);
      } else {
        setError(response.message || "Failed to add contours to final mask");
      }
    } catch (error) {
      console.error("Error adding single contour to final mask:", error);
      setError("An error occurred while adding contours.");
    } finally {
      setIsAddingToFinalMask(false);
    }
  };

  const handleAddManualContoursToFinalMask = async (contours) => {
    if (!selectedImage || contours.length === 0) {
      setError("No image selected or no contours to add.");
      return;
    }

    // Check if mask is finished and prevent adding contours
    if (annotationState.isMaskFinished) {
      setError("This mask is marked as finished. Please click 'Edit Mask' to continue editing.");
      return;
    }

    try {
      // Format contours for API
      const formattedContours = contours.map((contour) => ({
        x: contour.coordinates.map((p) => p.x),
        y: contour.coordinates.map((p) => p.y),
        label: contour.label || 0,
      }));

      const response = await addContoursToFinalMask(
        selectedImage.id,
        formattedContours
      );

      if (response.success) {
        setSuccessMessageWithTimeout(
          "Manual contours added to final mask successfully"
        );
        
        // Refresh the final mask to get updated contours with quantifications
        await fetchFinalMask(selectedImage.id);
        
        // Additional delay to ensure backend has calculated quantifications
        setTimeout(async () => {
          await fetchFinalMask(selectedImage.id);
        }, 1500);
      } else {
        setError(
          response.message || "Failed to add manual contours to final mask"
        );
      }
    } catch (error) {
      console.error("Error adding manual contours to final mask:", error);
      setError("Failed to add manual contours to final mask");
    }
  };

  return {
    handleAddFromSegmentationToFinal,
    handleAddSingleContourToFinalMask,
    handleAddManualContoursToFinalMask,
  };
};

export const createZoomHandlers = ({
  handleAnnotationZoomIn,
  handleAnnotationZoomOut,
  handleAnnotationResetView,
  selectedFinalMaskContour,
  setZoomLevel,
  setZoomCenter,
  setSelectedFinalMaskContour,
  promptingCanvasRef,
}) => {
  const handleAnnotationZoomInWrapper = () => {
    handleAnnotationZoomIn(
      selectedFinalMaskContour,
      setZoomLevel,
      promptingCanvasRef
    );
  };

  const handleAnnotationZoomOutWrapper = () => {
    handleAnnotationZoomOut(
      selectedFinalMaskContour,
      setZoomLevel,
      promptingCanvasRef
    );
  };

  const handleAnnotationResetViewWrapper = () => {
    handleAnnotationResetView(
      setZoomLevel,
      setZoomCenter,
      setSelectedFinalMaskContour,
      promptingCanvasRef
    );
  };

  return {
    handleAnnotationZoomInWrapper,
    handleAnnotationZoomOutWrapper,
    handleAnnotationResetViewWrapper,
  };
};

export const createWrapperHandlers = ({
  handlers,
  setAnnotationZoomLevel,
  setAnnotationZoomCenter,
  imageNavigation,
  handleFileUpload,
}) => {
  const handleFinalMaskContourSelectWrapper = (mask, contourIndex) => {
    handlers.handleFinalMaskContourSelect(
      mask,
      contourIndex,
      setAnnotationZoomLevel,
      setAnnotationZoomCenter
    );
  };

  const handleAnnotationCanvasClickWrapper = (event) => {
    handlers.handleAnnotationCanvasClick(
      event,
      handleFinalMaskContourSelectWrapper
    );
  };

  const handleFinalMaskCanvasClickWrapper = (event) => {
    handlers.handleFinalMaskCanvasClick(
      event,
      handleFinalMaskContourSelectWrapper
    );
  };

  const handleResetWrapper = () => {
    handlers.handleReset(setAnnotationZoomLevel, setAnnotationZoomCenter);
  };

  const handleFileUploadWrapper = (e) => {
    imageNavigation.handleFileUploadWrapper(e, handleFileUpload);
  };

  return {
    handleFinalMaskContourSelectWrapper,
    handleAnnotationCanvasClickWrapper,
    handleFinalMaskCanvasClickWrapper,
    handleResetWrapper,
    handleFileUploadWrapper,
  };
}; 