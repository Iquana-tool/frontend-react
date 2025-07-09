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
}) => {
  const handleAddFromSegmentationToFinal = async (contoursToAdd) => {
    if (!selectedImage || contoursToAdd.length === 0) {
      setError("No image selected or no contours to add.");
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
    if (!selectedImage || !contours || contours.length === 0) {
      setError("No image selected or no contours provided");
      return;
    }

    try {
      // Format contours for the masks API with proper coordinate normalization
      const formattedContours = contours.map((contour) => {
        // Check if coordinates are already normalized (values between 0-1)
        const firstPoint = contour.coordinates[0];
        const isAlreadyNormalized = firstPoint && firstPoint.x <= 1 && firstPoint.y <= 1;
        
        if (isAlreadyNormalized) {
          // Already normalized, use as-is
          return {
            x: contour.coordinates.map((point) => point.x),
            y: contour.coordinates.map((point) => point.y),
            label: contour.label || 0,
          };
        } else {
          // Need to normalize from pixel coordinates to 0-1 range
          return {
            x: contour.coordinates.map((point) => point.x / selectedImage.width),
            y: contour.coordinates.map((point) => point.y / selectedImage.height),
            label: contour.label || 0,
          };
        }
      });

      // Add directly to final mask using masks API
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