import { useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import * as api from '../api';

export const useContourOperations = () => {
  const [selectedContours, setSelectedContours] = useState([]);
  const [finalMasks, setFinalMasks] = useState([]);
  const [finalMask, setFinalMask] = useState(null);
  const [selectedFinalMaskContour, setSelectedFinalMaskContour] = useState(null);
  const [fetchingFinalMask, setFetchingFinalMask] = useState(false);

  const handleContourSelect = useCallback((contoursOrIndex) => {
    console.log("handleContourSelect called with:", contoursOrIndex);

    if (Array.isArray(contoursOrIndex)) {
      console.log("Received array of contours from PromptingCanvas:", contoursOrIndex);
      setSelectedContours(contoursOrIndex);
    } else if (typeof contoursOrIndex === "number") {
      const contourIndex = contoursOrIndex;
      setSelectedContours((prevSelected) => {
        if (prevSelected.includes(contourIndex)) {
          return prevSelected.filter((index) => index !== contourIndex);
        }
        return [...prevSelected, contourIndex];
      });
    } else {
      console.error("handleContourSelect received invalid input:", contoursOrIndex);
    }
  }, []);

  const fetchFinalMask = useCallback(async (imageId) => {
    const targetImageId = imageId;

    if (!targetImageId) {
      return;
    }

    setFetchingFinalMask(true);
    try {
      const response = await api.getFinalMask(targetImageId);

              if (response.success && response.mask) {
        setFinalMask(response.mask);
        setFinalMasks([response.mask]);

        if (response.mask.contours) {
          // Additional processing if needed
        }
      } else {
        setFinalMask(null);
        setFinalMasks([]);
      }
    } catch (error) {
      console.error("Error fetching final mask:", error);
      setFinalMask(null);
      setFinalMasks([]);
    } finally {
      setFetchingFinalMask(false);
    }
  }, []);

  const handleAddSelectedContoursToFinalMask = useCallback(async (currentImage, selectedContours, bestMask) => {
    if (!currentImage || selectedContours.length === 0) {
      console.log("No contours selected or no current image");
      return;
    }

    console.log(`Adding ${selectedContours.length} selected contours to final mask for image ID: ${currentImage.id}`);

    try {
      const contours = selectedContours.map((contourIndex) => {
        const contour = bestMask?.contours?.[contourIndex];
        if (!contour) {
          console.error(`Contour with index ${contourIndex} not found in bestMask contours`);
          throw new Error(`Contour with index ${contourIndex} not found`);
        }
        return {
          x: contour.x,
          y: contour.y,
          label: contour.label || 0,
        };
      });

      console.log("Contours being sent to API:", JSON.stringify(contours));

      let response;
      try {
        response = await api.addContoursToFinalMask(currentImage.id, contours);
      } catch (batchError) {
        console.error("Batch operation failed, falling back to individual contour adds:", batchError);

        let successCount = 0;
        for (const contour of contours) {
          try {
            const individualResponse = await api.addContourToFinalMask(currentImage.id, contour);
            if (individualResponse.success) {
              successCount++;
            }
          } catch (singleError) {
            console.error("Error adding individual contour:", singleError);
          }
        }

        response = {
          success: successCount > 0,
          message: `Added ${successCount} out of ${contours.length} contours individually.`,
          contourIds: [],
        };
      }

      if (response.success) {
        console.log(`Successfully added contours to final mask:`, response);
        await fetchFinalMask(currentImage.id);
        setSelectedContours([]);
        return { success: true, message: "Selected contour added to Final Mask" };
      } else {
        console.error("Failed to add contours to final mask:", response.message);
        throw new Error(`Failed to add contours to final mask: ${response.message}`);
      }
    } catch (error) {
      console.error("Error adding selected contours to final mask:", error);
      throw new Error(`Error adding contours to final mask: ${error.message}`);
    }
  }, [fetchFinalMask]);

  const handleDeleteSelectedContours = useCallback((selectedMask, selectedContours, setSelectedMask, setBestMask, setSegmentationMasks) => {
    if (!selectedMask || selectedContours.length === 0) return;

    const updatedContours = selectedMask.contours.filter(
      (_, index) => !selectedContours.includes(index)
    );

    const updatedMask = {
      ...selectedMask,
      contours: updatedContours,
    };

    setSelectedContours([]);

    setTimeout(() => {
      setSelectedMask(updatedMask);
      setBestMask(updatedMask);

      setSegmentationMasks((prev) =>
        prev.map((mask) => (mask.id === selectedMask.id ? updatedMask : mask))
      );
    }, 0);

    return "Selected contours deleted";
  }, []);

  const handleDeleteFinalMaskContour = useCallback(async (contourId, currentImageId = null) => {
    if (!contourId) {
      console.error("No contour ID provided for deletion");
      return;
    }

    try {
      console.log(`Deleting contour with ID: ${contourId} from final mask`);
      const response = await api.deleteContour(contourId);

      if (response.success) {
        console.log(`Successfully deleted contour with ID: ${contourId}`);
        
        // Update local state immediately by removing the contour
        setFinalMasks(prevMasks => 
          prevMasks.map(mask => ({
            ...mask,
            contours: mask.contours.filter(contour => contour.id !== contourId)
          }))
        );

        setFinalMask(prevMask => 
          prevMask ? {
            ...prevMask,
            contours: prevMask.contours.filter(contour => contour.id !== contourId)
          } : prevMask
        );
        
        // Clear selected contour if it was the deleted one
        if (
          selectedFinalMaskContour &&
          selectedFinalMaskContour.contour &&
          selectedFinalMaskContour.contour.id === contourId
        ) {
          setSelectedFinalMaskContour(null);
        }

        // Optionally refresh from server if currentImageId is provided
        if (currentImageId) {
          try {
            await fetchFinalMask(currentImageId);
          } catch (refreshError) {
            console.warn("Failed to refresh final mask after deletion:", refreshError);
          }
        }

        return { success: true, message: "Contour removed from final mask successfully" };
      } else {
        throw new Error(`Failed to delete contour: ${response.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting contour:", error);
      throw new Error(`Error deleting contour: ${error.message}`);
    }
  }, [selectedFinalMaskContour, fetchFinalMask]);

  // New function specifically for handling deletion from quantification table
  const handleDeleteContourFromTable = useCallback(async (contourId) => {
    if (!contourId) {
      console.error("No contour ID provided for deletion");
      return;
    }

    try {
      // Update local state immediately for better UX
      flushSync(() => {
        setFinalMasks(prevMasks => {
          const updatedMasks = prevMasks.map(mask => ({
            ...mask,
            contours: mask.contours ? mask.contours.filter(contour => contour.id !== contourId) : []
          }));
          return updatedMasks;
        });

        // Also update the current final mask if it contains this contour
        setFinalMask(prevMask => {
          if (prevMask && prevMask.contours) {
            const updatedMask = {
              ...prevMask,
              contours: prevMask.contours.filter(contour => contour.id !== contourId)
            };
            return updatedMask;
          }
          return prevMask;
        });

        // Clear selected contour if it was the deleted one
        if (selectedFinalMaskContour && selectedFinalMaskContour.id === contourId) {
          setSelectedFinalMaskContour(null);
        }
      });

      return { success: true, message: "Contour deleted successfully" };
    } catch (error) {
      console.error(`Error deleting contour from table:`, error);
      throw error;
    }
  }, [selectedFinalMaskContour, setFinalMasks, setFinalMask, setSelectedFinalMaskContour]);

  const clearAllFinalMaskContours = useCallback(async (finalMask, currentImage) => {
    if (!finalMask || !finalMask.contours || finalMask.contours.length === 0) {
      console.log("No contours to clear");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to remove all ${finalMask.contours.length} contours from the final mask?`
      )
    ) {
      return;
    }

    try {
      console.log(`Clearing all ${finalMask.contours.length} contours from final mask`);

      let successCount = 0;
      let failCount = 0;

      for (const contour of finalMask.contours) {
        try {
          const response = await api.deleteContour(contour.id);
          if (response.success) {
            successCount++;
          } else {
            failCount++;
            console.error(
              `Failed to delete contour ${contour.id}: ${response.message || "Unknown error"}`
            );
          }
        } catch (contourError) {
          failCount++;
          console.error(`Error deleting contour ${contour.id}:`, contourError);
        }
      }

      await fetchFinalMask(currentImage.id);
      setSelectedFinalMaskContour(null);

      if (failCount === 0) {
        return { 
          success: true, 
          message: `Successfully cleared all ${successCount} contours from the final mask` 
        };
      } else if (successCount > 0) {
        return { 
          success: true, 
          message: `Cleared ${successCount} contours successfully, but failed to clear ${failCount} contours` 
        };
      } else {
        throw new Error(`Failed to clear any of the ${failCount} contours from the final mask`);
      }
    } catch (error) {
      console.error("Error clearing contours:", error);
      throw new Error(`Error clearing contours: ${error.message}`);
    }
  }, [fetchFinalMask]);

  const findMatchingContour = useCallback((targetContour, contours) => {
    if (!targetContour || !contours || contours.length === 0) return -1;

    for (let i = 0; i < contours.length; i++) {
      const contour = contours[i];

      if (
        contour.x &&
        contour.y &&
        targetContour.x &&
        targetContour.y &&
        contour.x.length === targetContour.x.length &&
        contour.y.length === targetContour.y.length
      ) {
        let match = true;
        for (let j = 0; j < contour.x.length; j++) {
          if (
            Math.abs(contour.x[j] - targetContour.x[j]) > 0.001 ||
            Math.abs(contour.y[j] - targetContour.y[j]) > 0.001
          ) {
            match = false;
            break;
          }
        }

        if (match) return i;
      }
    }

    return -1;
  }, []);

  const isPointInContour = useCallback((x, y, contour, canvas) => {
    if (!contour || !contour.x || !contour.y || contour.x.length < 3) {
      return false;
    }

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const points = [];
    for (let i = 0; i < contour.x.length; i++) {
      points.push([contour.x[i] * canvasWidth, contour.y[i] * canvasHeight]);
    }

    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0], yi = points[i][1];
      const xj = points[j][0], yj = points[j][1];

      const intersect =
        (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    if (!inside) {
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i][0], yi = points[i][1];
        const xj = points[j][0], yj = points[j][1];

        const lineLength = Math.sqrt((xj - xi) ** 2 + (yj - yi) ** 2);
        if (lineLength === 0) continue;

        const t = Math.max(
          0,
          Math.min(
            1,
            ((x - xi) * (xj - xi) + (y - yi) * (yj - yi)) /
              (lineLength * lineLength)
          )
        );
        const projX = xi + t * (xj - xi);
        const projY = yi + t * (yj - yi);
        const distance = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);

        if (distance < 5) {
          return true;
        }
      }
    }

    return inside;
  }, []);

  const resetContourState = useCallback(() => {
    setSelectedContours([]);
    setFinalMasks([]);
    setFinalMask(null);
    setSelectedFinalMaskContour(null);
    setFetchingFinalMask(false);
  }, []);

  return {
    // State
    selectedContours,
    finalMasks,
    finalMask,
    selectedFinalMaskContour,
    fetchingFinalMask,

    // Actions
    handleContourSelect,
    handleAddSelectedContoursToFinalMask,
    handleDeleteSelectedContours,
    fetchFinalMask,
    handleDeleteFinalMaskContour,
    handleDeleteContourFromTable,
    clearAllFinalMaskContours,
    findMatchingContour,
    isPointInContour,
    resetContourState,

    // Setters
    setSelectedContours,
    setFinalMasks,
    setFinalMask,
    setSelectedFinalMaskContour,
  };
}; 