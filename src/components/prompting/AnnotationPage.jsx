import React, { useState, useRef, useEffect, useCallback } from "react";
import { Typography } from "@mui/material";
import { useDataset } from "../../contexts/DatasetContext";
import * as api from "../../api";

// Custom Hooks
import { useImageManagement } from "../../hooks/useImageManagement";
import { useSegmentation } from "../../hooks/useSegmentation";
import { useContourOperations } from "../../hooks/useContourOperations";
import { useCanvasOperations } from "../../hooks/useCanvasOperations";

// Components
import StatusBar from "./MainAnnotationPage/StatusBar";
import MainViewers from "./MainAnnotationPage/MainViewers";
import Sidebar from "./Sidebar/Sidebar"; // Adjust path as necessary

// Styles
import "./AnnotationPage.css";
import QuantificationTable from "./MainAnnotationPage/QuantificationTable";
import ToolsPanel from "./MainAnnotationPage/ToolsPanel";

const AnnotationPage = () => {
  const { currentDataset } = useDataset();

  // UI State
  const [promptType, setPromptType] = useState("point");
  const [currentLabel, setCurrentLabel] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showSaveMaskDialog, setShowSaveMaskDialog] = useState(false);
  const [, setSavingMaskIndex] = useState(null);
  const [saveMaskLabel, setSaveMaskLabel] = useState("coral");
  const [customSaveMaskLabel, setCustomSaveMaskLabel] = useState("");

  // Separate zoom state for annotation drawing area (prompting canvas)
  const [annotationZoomLevel, setAnnotationZoomLevel] = useState(1);
  const [annotationZoomCenter, setAnnotationZoomCenter] = useState({ x: 0.5, y: 0.5 });

  // Refs
  const promptingCanvasRef = useRef(null);

  // Instant Segmentation State
  const [instantSegmentationState, setInstantSegmentationState] = useState({
    isInstantSegmentationEnabled: false,
    isInstantSegmenting: false,
    shouldSuppressLoadingModal: false
  });

  const [labelOptions, setLabelOptions] = useState({});
  const maskLabelOptions = ["petri_dish", "coral", "polyp"];

  // Custom Hooks
  const imageManagement = useImageManagement();
  const segmentation = useSegmentation();
  const contourOps = useContourOperations();
  const canvasOps = useCanvasOperations();

  // Destructure hook returns for easier access
  const {
    selectedImage,
    imageObject,
    availableImages,
    selectedImageId,
    loading: imageLoading,
    error: imageError,
    fetchImagesFromAPI,
    handleImageSelect,
    handleFileUpload,
    resetImageState,
    setError: setImageError,
  } = imageManagement;

  const {
    segmentationMasks,
    selectedMask,
    bestMask,
    isSegmenting,
    selectedModel,
    handlePromptingComplete: segmentationPromptingComplete,
    handleMaskSelect,
    resetSegmentationState,
    handleModelChange,
    setSelectedMask,
    setBestMask,
    setSegmentationMasks,
  } = segmentation;

  const {
    selectedContours,
    finalMasks,
    finalMask,
    selectedFinalMaskContour,
    fetchingFinalMask,
    handleContourSelect,
    handleAddSelectedContoursToFinalMask: contourAddToFinalMask,
    handleDeleteSelectedContours: contourDeleteSelected,
    fetchFinalMask,
    handleDeleteFinalMaskContour,
    handleDeleteContourFromTable,
    clearAllFinalMaskContours,
    findMatchingContour,
    isPointInContour,
    resetContourState,
    setSelectedContours,
    setSelectedFinalMaskContour,
  } = contourOps;

  const {
    zoomLevel,
    zoomCenter,
    showAnnotationViewer,
    annotationCanvasRef,
    finalMaskCanvasRef,
    drawAnnotationCanvas,
    drawFinalMaskCanvas,
    handleAnnotationCanvasClick: canvasAnnotationClick,
    handleFinalMaskCanvasClick: canvasFinalMaskClick,
    handleFinalMaskContourSelect: canvasFinalMaskContourSelect,
    resetCanvasState,
    setZoomLevel,
    setZoomCenter,
  } = canvasOps;

  // Combined error state
  const error = imageError;
  const setError = setImageError;
  const loading = imageLoading || isSegmenting || fetchingFinalMask;

  // Fetch labels from backend - Note: This is also handled by LabelSelector
  // Consider removing this if LabelSelector handles all label management
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
  }, [currentDataset]);

  // Utility functions
  const setSuccessMessageWithTimeout = useCallback((message, timeout = 5000) => {
    setSuccessMessage(message);
    if (window.successMessageTimer) {
      clearTimeout(window.successMessageTimer);
    }
    window.successMessageTimer = setTimeout(() => {
      setSuccessMessage(null);
    }, timeout);
  }, []);

  // Annotation zoom handlers (for ToolsPanel - only affects prompting canvas)
  const handleAnnotationZoomIn = useCallback(() => {
    setAnnotationZoomLevel((prev) => {
      const newLevel = Math.min(prev * 1.2, 5);
      // Ensure we have a center when zooming from 1 → something
      if (newLevel !== 1 && (!annotationZoomLevel || annotationZoomLevel === 1)) {
        setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
      }
      return newLevel;
    });
    // Apply zoom to prompting canvas if available
    if (promptingCanvasRef.current && promptingCanvasRef.current.zoomIn) {
      promptingCanvasRef.current.zoomIn();
    }
  }, [annotationZoomLevel]);

  const handleAnnotationZoomOut = useCallback(() => {
    setAnnotationZoomLevel((prev) => {
      const newLevel = Math.max(prev / 1.2, 0.5);
      return newLevel;
    });
    // Apply zoom to prompting canvas if available
    if (promptingCanvasRef.current && promptingCanvasRef.current.zoomOut) {
      promptingCanvasRef.current.zoomOut();
    }
  }, []);

  const handleAnnotationResetView = useCallback(() => {
    setAnnotationZoomLevel(1);
    setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
    // Reset prompting canvas view if available
    if (promptingCanvasRef.current && promptingCanvasRef.current.resetView) {
      promptingCanvasRef.current.resetView();
    }
  }, []);

  // Initialize component
  useEffect(() => {
    if (currentDataset) {
      fetchImagesFromAPI();
      fetchLabels();
    }

    // Add CSS animations
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes slide-up {
        0% { opacity: 0; transform: translate(-50%, 20px); }
        100% { opacity: 1; transform: translate(-50%, 0); }
      }
      .animate-slide-up {
        animation: slide-up 0.3s ease-out forwards;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
      resetImageState();
      resetSegmentationState();
      resetContourState();
      resetCanvasState();
    };
  }, [currentDataset, fetchImagesFromAPI, fetchLabels, resetCanvasState, resetContourState, resetImageState, resetSegmentationState]);

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
  }, [selectedImage, selectedImage, setError, segmentationPromptingComplete, currentLabel, zoomLevel, zoomCenter, imageObject, selectedContours, bestMask, finalMask, setSuccessMessageWithTimeout, setZoomLevel]);

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

  const handleFinalMaskContourSelect = useCallback((mask, contourIndex) => {
    canvasFinalMaskContourSelect(
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
  }, [canvasFinalMaskContourSelect, setSelectedFinalMaskContour, setZoomCenter, setZoomLevel, setSelectedContours, bestMask, findMatchingContour, imageObject, selectedFinalMaskContour, drawAnnotationCanvas]);

  // Canvas event handlers with proper parameter passing
  const handleAnnotationCanvasClick = useCallback((event) => {
    canvasAnnotationClick(
      event,
      bestMask,
      selectedContours,
      setSelectedContours,
      setSelectedFinalMaskContour,
      setZoomLevel,
      setZoomCenter,
      finalMasks,
      findMatchingContour,
      handleFinalMaskContourSelect,
      isPointInContour
    );
  }, [canvasAnnotationClick, bestMask, selectedContours, setSelectedContours, setSelectedFinalMaskContour, setZoomLevel, setZoomCenter, finalMasks, findMatchingContour, handleFinalMaskContourSelect, isPointInContour]);

  const handleFinalMaskCanvasClick = useCallback((event) => {
    canvasFinalMaskClick(
      event,
      finalMasks,
      selectedFinalMaskContour,
      setSelectedFinalMaskContour,
      setZoomLevel,
      setSelectedContours,
        imageObject,
      () => drawAnnotationCanvas(bestMask, imageObject, selectedContours, selectedFinalMaskContour),
      handleFinalMaskContourSelect,
      isPointInContour
    );
  }, [canvasFinalMaskClick, finalMasks, selectedFinalMaskContour, setSelectedFinalMaskContour, setZoomLevel, setSelectedContours, handleFinalMaskContourSelect, isPointInContour, drawAnnotationCanvas, bestMask, selectedContours]);

  const handleReset = useCallback(() => {
    resetImageState();
    resetSegmentationState();
    resetContourState();
    resetCanvasState();
    setPromptType("point");
    setCurrentLabel(null);
  }, [resetImageState, resetSegmentationState, resetContourState, resetCanvasState]);

  const handleRunNewSegmentation = useCallback(() => {
    if (promptingCanvasRef && promptingCanvasRef.current) {
      promptingCanvasRef.current.clearPrompts();
      setSuccessMessageWithTimeout("Add new prompts to improve segmentation", 3000);
    }
  }, [setSuccessMessageWithTimeout]);

  // Load final mask when image changes
  useEffect(() => {
    if (selectedImage && selectedImage.id) {
      fetchFinalMask(selectedImage.id);
    }
  }, [selectedImage, fetchFinalMask]);

  // Handle file upload wrapper
  const handleFileUploadWrapper = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // Enhanced draw functions that pass proper parameters
  const drawAnnotationCanvasWrapper = useCallback(() => {
    drawAnnotationCanvas(bestMask, imageObject, selectedContours, selectedFinalMaskContour);
  }, [drawAnnotationCanvas, bestMask, imageObject, selectedContours, selectedFinalMaskContour]);

  const drawFinalMaskCanvasWrapper = useCallback(() => {
    drawFinalMaskCanvas(imageObject, finalMasks, selectedFinalMaskContour);
  }, [drawFinalMaskCanvas, imageObject, finalMasks, selectedFinalMaskContour]);

  // Draw final mask canvas when final mask data changes
  useEffect(() => {
    if (imageObject) {
      setTimeout(() => {
        drawFinalMaskCanvasWrapper();
      }, 100);
    }
  }, [finalMasks, imageObject, drawFinalMaskCanvasWrapper]);

    // Draw annotation canvas automatically when data changes (but not for zoom-triggered updates)
  // Zoom-triggered updates are handled manually in handleFinalMaskContourSelect
  useEffect(() => {
    if (bestMask && imageObject) {
      // Only auto-redraw if zoom level is 1 (not zoomed) or if it's an initial load
      if (zoomLevel === 1) {
        setTimeout(() => {
          drawAnnotationCanvasWrapper();
        }, 100);
      }
    }
  }, [bestMask, imageObject, selectedContours, selectedFinalMaskContour, drawAnnotationCanvasWrapper, zoomLevel]);

  // Show annotation viewer and draw canvas when segmentation completes
  useEffect(() => {
    if (bestMask && imageObject && !showAnnotationViewer) {
      // Don't automatically show the annotation viewer
      // Let users manually toggle it when they want to see the detailed contours
      // This allows them to continue drawing prompts in the main area
      console.log("Segmentation completed with bestMask, but keeping annotation viewer hidden for continued prompting");
    }
  }, [bestMask, imageObject, showAnnotationViewer]);

  // Update PromptingCanvas when segmentation completes
  useEffect(() => {
    if (bestMask && promptingCanvasRef.current && !showAnnotationViewer) {
      // Update the PromptingCanvas to show the new mask and clear old prompts
      setTimeout(() => {
        if (promptingCanvasRef.current) {
          // Clear any existing prompts first
          promptingCanvasRef.current.clearPrompts();
          // Then update with the new mask to show contours
          promptingCanvasRef.current.updateSelectedMask(bestMask);
        }
      }, 100);
    }
  }, [bestMask, showAnnotationViewer]);

  // Save mask functionality
  const saveSelectedMask = useCallback(async () => {
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
  }, [selectedMask, customSaveMaskLabel, saveMaskLabel, setError, setSuccessMessageWithTimeout]);

  // Wrapper for handleDeleteFinalMaskContour that includes current image context
  const handleDeleteFinalMaskContourWrapper = useCallback(async (contourId) => {
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
  }, [selectedImage, setError, handleDeleteFinalMaskContour, fetchFinalMask, setSuccessMessageWithTimeout]);

  // Wrapper for clearAllFinalMaskContours that includes current image context
  const clearAllFinalMaskContoursWrapper = useCallback(async () => {
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
  }, [selectedImage, finalMask, setError, clearAllFinalMaskContours, setSuccessMessageWithTimeout]);

  // Export quantifications as CSV
  const exportQuantificationsAsCsv = useCallback((masks) => {
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
  }, []);

  return (
    <div className="w-full">
      {/* Status Bar Component */}
      <StatusBar
        error={error}
        setError={setError}
        successMessage={successMessage}
        setSuccessMessage={setSuccessMessage}
        loading={loading}
        isSegmenting={isSegmenting}
        selectedModel={selectedModel}
        suppressLoadingModal={instantSegmentationState.shouldSuppressLoadingModal}
      />
      <div
        // Adjusted grid classes
        className={`grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 mb-6`} // Use auto for sidebar width, 1fr for main content
      >
        {/* Sidebar Component */}
        <Sidebar
          selectedImage={selectedImage}
          selectedImageId={selectedImageId}
          availableImages={availableImages}
          loading={loading}
          error={error}
          viewMode={viewMode}
          setViewMode={setViewMode}
          handleFileUpload={handleFileUploadWrapper}
          handleImageSelect={handleImageSelect}
          selectedModel={selectedModel}
          handleModelChange={handleModelChange}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          currentDataset={currentDataset}
        />
        <div
            className={`
                bg-white p-4 rounded-lg shadow-sm border border-gray-200
                ${isSidebarCollapsed ? "w-auto" : ""} // Push main content when sidebar is collapsed
              `}
        >
          {/* Tools Panel Component */}
          <ToolsPanel
              promptType={promptType}
              setPromptType={setPromptType}
              promptingCanvasRef={promptingCanvasRef}
              currentLabel={currentLabel}
              setCurrentLabel={setCurrentLabel}
              segmentationMasks={segmentationMasks}
              exportQuantificationsAsCsv={exportQuantificationsAsCsv}
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
              setZoomCenter={setZoomCenter}
              handleAnnotationZoomIn={handleAnnotationZoomIn}
              handleAnnotationZoomOut={handleAnnotationZoomOut}
              handleAnnotationResetView={handleAnnotationResetView}
          />
          <MainViewers
            selectedImage={selectedImage}
            imageObject={imageObject}
            segmentationMasks={segmentationMasks}
            selectedMask={selectedMask}
            bestMask={bestMask}
            isSegmenting={isSegmenting}
            selectedModel={selectedModel}
            handlePromptingComplete={handlePromptingComplete}
            handleMaskSelect={handleMaskSelect}
            resetSegmentationState={resetSegmentationState}
            setSelectedMask={setSelectedMask}
            setBestMask={setBestMask}
            setSegmentationMasks={setSegmentationMasks}
            zoomLevel={zoomLevel}
            zoomCenter={zoomCenter}
            showAnnotationViewer={showAnnotationViewer}
            annotationCanvasRef={annotationCanvasRef}
            finalMaskCanvasRef={finalMaskCanvasRef}
            drawAnnotationCanvasWrapper={drawAnnotationCanvasWrapper}
            drawFinalMaskCanvasWrapper={drawFinalMaskCanvasWrapper}
            handleAnnotationCanvasClick={handleAnnotationCanvasClick}
            handleFinalMaskCanvasClick={handleFinalMaskCanvasClick}
            handleFinalMaskContourSelect={handleFinalMaskContourSelect}
            resetCanvasState={resetCanvasState}
            setZoomLevel={setZoomLevel}
            setZoomCenter={setZoomCenter}
            handleReset={handleReset}
            handleRunNewSegmentation={handleRunNewSegmentation}
            promptingCanvasRef={promptingCanvasRef}
            imageLoading={imageLoading}
            imageError={imageError}
            setError={setError}
            handleFileUpload={handleFileUploadWrapper}
            handleImageSelect={handleImageSelect}
            resetImageState={resetImageState}
            labelOptions={labelOptions}
            promptType={promptType}
            setPromptType={setPromptType}
            currentLabel={currentLabel}
            setCurrentLabel={setCurrentLabel}
            handleAddSelectedContoursToFinalMask={handleAddSelectedContoursToFinalMask}
            handleDeleteSelectedContours={handleDeleteSelectedContours}
            selectedContours={selectedContours}
            setSelectedContours={setSelectedContours}
            handleDeleteFinalMaskContour={handleDeleteFinalMaskContourWrapper}
            clearAllFinalMaskContours={clearAllFinalMaskContoursWrapper}
            handleDeleteContourFromTable={handleDeleteContourFromTable}
            exportQuantificationsAsCsv={exportQuantificationsAsCsv}
            showSaveMaskDialog={showSaveMaskDialog}
            setShowSaveMaskDialog={setShowSaveMaskDialog}
            savingMaskIndex={null} // Not used in this context, can be removed
            setSavingMaskIndex={setSavingMaskIndex}
            saveMaskLabel={saveMaskLabel}
            setSaveMaskLabel={setSaveMaskLabel}
            customSaveMaskLabel={customSaveMaskLabel}
            setCustomSaveMaskLabel={setCustomSaveMaskLabel}
            saveSelectedMask={saveSelectedMask}
            instantSegmentationState={instantSegmentationState}
            setInstantSegmentationState={setInstantSegmentationState}
            fetchFinalMask={fetchFinalMask}
            finalMasks={finalMasks}
            finalMask={finalMask}
            selectedFinalMaskContour={selectedFinalMaskContour}
            setSelectedFinalMaskContour={setSelectedFinalMaskContour}
            handleContourSelect={handleContourSelect}
            findMatchingContour={findMatchingContour}
            isPointInContour={isPointInContour}
            drawFinalMaskCanvas={drawFinalMaskCanvasWrapper}
            drawAnnotationCanvas={drawAnnotationCanvasWrapper}
            />
          {/* Help text */}
          {!selectedImage && !loading && (
              <div className="mt-4 p-4 bg-teal-50 text-teal-700 rounded-md">
                <h3 className="font-medium mb-2">How to use:</h3>
                <ol className="list-decimal list-inside text-sm">
                  <li className="mb-1">Select or upload an image from the left panel</li>
                  <li className="mb-1">Choose a prompting tool (point, box, circle, or polygon)</li>
                  <li className="mb-1">Select foreground (1) or background (0) label</li>
                  <li className="mb-1">
                    <strong>For point prompts:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Left-click for positive points (green with +)</li>
                      <li>Right-click for negative points (red with -)</li>
                    </ul>
                  </li>
                  <li className="mb-1">Click and drag on the image to create other prompt types</li>
                  <li className="mb-1">Use zoom and pan controls for detailed work</li>
                  <li>Save your prompts when finished</li>
                </ol>
              </div>
          )}

          {/* Quantification Table */}
          <div style={{ marginTop: 24 }}>
            {finalMasks.length > 0 ? (
                <div>
                  <Typography variant="h6" style={{ marginBottom: 16 }}>Quantification</Typography>
                  <QuantificationTable
                      masks={finalMasks}
                      onContourSelect={(row) => {
                        // Find the corresponding contour and trigger zoom
                        if (finalMasks.length > 0 && finalMasks[0].contours) {
                          const contourIndex = finalMasks[0].contours.findIndex(c => c.id === row.contour_id);
                          if (contourIndex !== -1) {
                            const finalMask = finalMasks[0];

                            // Call the main function to update zoom and final mask viewer
                            // The annotation canvas will automatically redraw via the useEffect hook
                            handleFinalMaskContourSelect(finalMask, contourIndex);
                          }
                        }
                      }}
                      onContourDelete={(contourId) => {
                        return handleDeleteContourFromTable(contourId);
                      }}
                  />
                </div>
            ) : (
                <div>
                  <Typography variant="h6" style={{ marginBottom: 16 }}>Quantification</Typography>
                  <QuantificationTable masks={[]} />
                </div>
            )}
          </div>
        </div>
      </div>
      {/* Reset Button */}
      <div className="flex gap-4 mt-4">
        <button
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md flex items-center space-x-2 transition-colors"
            onClick={handleReset}
        >
          <span>Reset All</span>
        </button>
      </div>
    </div>
  );
};

export default AnnotationPage;