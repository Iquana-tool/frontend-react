// Utility functions for annotation operations

export const exportQuantificationsAsCsv = (masks) => {
  if (!masks || masks.length === 0) return;

  // Prepare CSV header
  let csvContent = "ID,Label,Area,Perimeter,Circularity,Confidence\n";

  // Add data for each mask
  masks.forEach((mask, index) => {
    const q = mask.quantifications || {};
    const row = [
      index + 1,
      mask.label || "unlabeled",
      q.area?.toFixed(2) || 0,
      q.perimeter?.toFixed(2) || 0,
      q.circularity?.toFixed(2) || 0,
      (mask.quality * 100).toFixed(2) || 0,
    ].join(",");
    csvContent += row + "\n";
  });

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "quantifications.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const createSaveMaskHandler = (
  selectedMask,
  customSaveMaskLabel,
  saveMaskLabel,
  setError,
  setSuccessMessageWithTimeout,
  setShowSaveMaskDialog,
  setSavingMaskIndex,
  setSaveMaskLabel,
  setCustomSaveMaskLabel
) => {
  return async () => {
    if (!selectedMask) {
      setError("No mask selected to save");
      return;
    }

    const label = customSaveMaskLabel || saveMaskLabel;

    if (!label || label.trim() === "") {
      setError("Please provide a valid label for the mask");
      return;
    }

    try {
      // Here you would implement the actual save functionality
      // For now, we'll just show a success message
      setSuccessMessageWithTimeout(`Mask saved successfully with label: ${label}`);
      setShowSaveMaskDialog(false);
      setSavingMaskIndex(null);
      setSaveMaskLabel("coral");
      setCustomSaveMaskLabel("");
    } catch (error) {
      console.error("Error saving mask:", error);
      setError("Error saving mask: " + (error.message || "Unknown error"));
    }
  };
};

export const createSuccessMessageHandler = (setSuccessMessage) => {
  return (message, timeout = 5000) => {
    setSuccessMessage(message);
    if (window.successMessageTimer) {
      clearTimeout(window.successMessageTimer);
    }
    window.successMessageTimer = setTimeout(() => {
      setSuccessMessage(null);
    }, timeout);
  };
};

export const createFinalMaskContourWrappers = (
  selectedImage,
  setError,
  handleDeleteFinalMaskContour,
  fetchFinalMask,
  setSuccessMessageWithTimeout,
  clearAllFinalMaskContours,
  finalMask
) => {
  const handleDeleteFinalMaskContourWrapper = async (contourId) => {
    if (!selectedImage) {
      setError("No current image selected");
      return;
    }

    try {
      const result = await handleDeleteFinalMaskContour(contourId);
      if (result && result.success) {
        // Refresh the final mask after deletion
        await fetchFinalMask(selectedImage.id);
        setSuccessMessageWithTimeout(result.message);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const clearAllFinalMaskContoursWrapper = async () => {
    if (!selectedImage || !finalMask) {
      setError("No current image or final mask available");
      return;
    }

    try {
      const result = await clearAllFinalMaskContours(finalMask, selectedImage);
      if (result && result.success) {
        setSuccessMessageWithTimeout(result.message);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return {
    handleDeleteFinalMaskContourWrapper,
    clearAllFinalMaskContoursWrapper,
  };
};