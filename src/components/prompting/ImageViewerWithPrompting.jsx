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
import ContourEditor from "./ContourEditor";
import PromptingCanvas from "./PromptingCanvas";
import QuantificationTable from "../QuantificationTable";
import ImageUploader from "../ui/ImageUploader";
import StatusBar from "../ui/StatusBar";
import ToolsPanel from "../ui/ToolsPanel";
import ImageDisplay from "../ui/ImageDisplay";

// Utils
import { exportQuantificationsAsCsv } from "../../utils/exportUtils";

// Styles
import "./ImageViewerWithPrompting.css";

const ImageViewerWithPrompting = () => {
  const { currentDataset } = useDataset();

  // UI State
  const [promptType, setPromptType] = useState("point");
  const [currentLabel, setCurrentLabel] = useState(1);
  const [viewMode, setViewMode] = useState("grid");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showSaveMaskDialog, setShowSaveMaskDialog] = useState(false);
  const [savingMaskIndex, setSavingMaskIndex] = useState(null);
  const [saveMaskLabel, setSaveMaskLabel] = useState("coral");
  const [customSaveMaskLabel, setCustomSaveMaskLabel] = useState("");
  const [editingMask, setEditingMask] = useState(null);
  const [showExpandedQuantifications, setShowExpandedQuantifications] = useState(false);

  // Missing state variables from original
  const [promptingResult, setPromptingResult] = useState(null);
  const [cutoutImage, setCutoutImage] = useState(null);
  const [cutoutPosition, setCutoutPosition] = useState(null);
  const [cutoutsList, setCutoutsList] = useState([]);
  const [annotationViewerCollapsed, setAnnotationViewerCollapsed] = useState(false);
  const [errorMessages, setErrorMessages] = useState([]);
  const [finalMaskContours, setFinalMaskContours] = useState([]);
  const [allMasks, setAllMasks] = useState([]);
  const [displayState, setDisplayState] = useState("original");
  const [maskImages, setMaskImages] = useState({});
  const [recentSegmentations, setRecentSegmentations] = useState([]);
  const [cutouts, setCutouts] = useState([]);
  const [quantifications, setQuantifications] = useState(null);
  const [selectedCutout, setSelectedCutout] = useState(null);
  const [zoomedOnCutout, setZoomedOnCutout] = useState(false);
  const [refiningMask, setRefiningMask] = useState(false);
  const [model, setModel] = useState("SAM2Tiny");
  const [userPrompts, setUserPrompts] = useState([]);
  const [refinementPrompts, setRefinementPrompts] = useState([]);

  // Label Management
  const [labelOptions, setLabelOptions] = useState([
    { id: 1, name: "coral" },
    { id: 2, name: "petri dish" },
  ]);
  const maskLabelOptions = ["petri_dish", "coral", "polyp"];

  // Refs
  const promptingCanvasRef = useRef(null);
  const segmentationResultsRef = useRef(null);
  const annotationPromptingCanvasRef = useRef(null);

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
    currentImage,
    canvasImage,
    imageLoaded,
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
    isZoomedContourRefinement,
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
    setShowAnnotationViewer,
    setIsZoomedContourRefinement,
  } = canvasOps;

  // Combined error state
  const error = imageError;
  const setError = setImageError;
  const loading = imageLoading || isSegmenting || fetchingFinalMask;

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
  }, [currentDataset]);

  // Fetch labels from backend - Note: This is also handled by LabelSelector
  // Consider removing this if LabelSelector handles all label management
  const fetchLabels = useCallback(async () => {
    if (!currentDataset) {
      setLabelOptions([
        { id: 1, name: "coral" },
        { id: 2, name: "petri dish" },
      ]);
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
        // Don't auto-select first label - let LabelSelector handle this
      } else {
        // Set default labels if none exist
        setLabelOptions([
          { id: 1, name: "coral" },
          { id: 2, name: "petri dish" },
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch labels:", error);
      // Set default labels on error
      setLabelOptions([
        { id: 1, name: "coral" },
        { id: 2, name: "petri dish" },
      ]);
    }
  }, [currentDataset]);

  // Enhanced prompting complete handler
  const handlePromptingComplete = useCallback(async (prompts, promptType) => {
    if (!selectedImage || !currentImage) {
      setError("No image selected for segmentation");
      return;
    }

    try {
      const result = await segmentationPromptingComplete(
        prompts,
        promptType,
        selectedImage,
        currentLabel,
        isZoomedContourRefinement,
        zoomLevel,
        zoomCenter,
        canvasImage,
        selectedContours,
        bestMask
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
  }, [
    selectedImage,
    currentImage,
    currentLabel,
    isZoomedContourRefinement,
    zoomLevel,
    zoomCenter,
    canvasImage,
    selectedContours,
    bestMask,
    segmentationPromptingComplete,
  ]);

  // Enhanced contour operations
  const handleAddSelectedContoursToFinalMask = useCallback(async () => {
    if (!currentImage || selectedContours.length === 0) {
      setError("No contours selected or no current image");
      return;
    }

    try {
      const result = await contourAddToFinalMask(currentImage, selectedContours, bestMask);
      if (result.success) {
        setSuccessMessageWithTimeout(result.message);
      }
    } catch (error) {
      setError(error.message);
    }
  }, [currentImage, selectedContours, bestMask, contourAddToFinalMask]);

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
  }, [selectedMask, selectedContours, contourDeleteSelected]);

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
  }, [
    bestMask,
    selectedContours,
    finalMasks,
    canvasAnnotationClick,
    findMatchingContour,
    isPointInContour,
  ]);

  const handleFinalMaskCanvasClick = useCallback((event) => {
    canvasFinalMaskClick(
      event,
      finalMasks,
      selectedFinalMaskContour,
      setSelectedFinalMaskContour,
      setZoomLevel,
      setSelectedContours,
      canvasImage,
      () => drawAnnotationCanvas(bestMask, canvasImage, selectedContours, selectedFinalMaskContour),
      handleFinalMaskContourSelect,
      isPointInContour
    );
  }, [
    finalMasks,
    selectedFinalMaskContour,
    canvasImage,
    bestMask,
    selectedContours,
    canvasFinalMaskClick,
    drawAnnotationCanvas,
    isPointInContour,
  ]);

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
      canvasImage,
      selectedFinalMaskContour
    );
  }, [
    canvasFinalMaskContourSelect,
    bestMask,
    findMatchingContour,
    drawAnnotationCanvas,
    canvasImage,
    selectedFinalMaskContour,
  ]);

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

  const handleReset = useCallback(() => {
    resetImageState();
    resetSegmentationState();
    resetContourState();
    resetCanvasState();
    setPromptType("point");
    setCurrentLabel(1);
  }, [resetImageState, resetSegmentationState, resetContourState, resetCanvasState]);

  const handleRunNewSegmentation = useCallback(() => {
    if (promptingCanvasRef && promptingCanvasRef.current) {
      promptingCanvasRef.current.clearPrompts();
      setSuccessMessageWithTimeout("Add new prompts to improve segmentation", 3000);
    }
  }, []);

  // Load final mask when image changes
  useEffect(() => {
    if (currentImage && currentImage.id) {
      fetchFinalMask(currentImage.id);
    }
  }, [currentImage, fetchFinalMask]);

  // Handle file upload wrapper
  const handleFileUploadWrapper = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // Enhanced draw functions that pass proper parameters
  const drawAnnotationCanvasWrapper = useCallback(() => {
    drawAnnotationCanvas(bestMask, canvasImage, selectedContours, selectedFinalMaskContour);
  }, [drawAnnotationCanvas, bestMask, canvasImage, selectedContours, selectedFinalMaskContour]);

  const drawFinalMaskCanvasWrapper = useCallback(() => {
    drawFinalMaskCanvas(canvasImage, finalMasks, selectedFinalMaskContour);
  }, [drawFinalMaskCanvas, canvasImage, finalMasks, selectedFinalMaskContour]);

  // Draw final mask canvas when final mask data changes
  useEffect(() => {
    if (canvasImage) {
      setTimeout(() => {
        drawFinalMaskCanvasWrapper();
      }, 100);
    }
  }, [finalMasks, canvasImage, drawFinalMaskCanvasWrapper]);

  // Show annotation viewer and draw canvas when segmentation completes
  useEffect(() => {
    if (bestMask && canvasImage && !showAnnotationViewer) {
      // Don't automatically show the annotation viewer
      // Let users manually toggle it when they want to see the detailed contours
      // This allows them to continue drawing prompts in the main area
      console.log("Segmentation completed with bestMask, but keeping annotation viewer hidden for continued prompting");
    }
  }, [bestMask, canvasImage, showAnnotationViewer]);

  // Draw annotation canvas when bestMask or showAnnotationViewer changes
  useEffect(() => {
    if (bestMask && canvasImage && showAnnotationViewer) {
      setTimeout(() => {
        drawAnnotationCanvasWrapper();
      }, 100);
    }
  }, [bestMask, canvasImage, showAnnotationViewer, selectedContours, drawAnnotationCanvasWrapper]);

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
  }, [selectedMask, customSaveMaskLabel, saveMaskLabel]);

  // Handle mask updates
  const handleMaskUpdated = useCallback((updatedMask) => {
    if (updatedMask.is_final) {
      // Handle final mask update
      console.log("Final mask updated:", updatedMask);
    } else {
      setSegmentationMasks((prev) =>
        prev.map((mask) => (mask.id === updatedMask.id ? updatedMask : mask))
      );
    }
    setEditingMask(null);
  }, []);

  // Handle save mask dialog
  const handleSaveMask = useCallback(async (maskIndex) => {
    setSavingMaskIndex(maskIndex);
    setSaveMaskLabel("coral");
    setCustomSaveMaskLabel("");
    setShowSaveMaskDialog(true);
  }, []);

  // Wrapper for handleDeleteFinalMaskContour that includes current image context
  const handleDeleteFinalMaskContourWrapper = useCallback(async (contourId) => {
    if (!currentImage) {
      setError("No current image selected");
      return;
    }

    try {
      const result = await handleDeleteFinalMaskContour(contourId);
      if (result && result.success) {
        // Refresh the final mask after deletion
        await fetchFinalMask(currentImage.id);
        setSuccessMessageWithTimeout(result.message);
      }
    } catch (error) {
      setError(error.message);
    }
  }, [currentImage, handleDeleteFinalMaskContour, fetchFinalMask]);

  // Wrapper for clearAllFinalMaskContours that includes current image context
  const clearAllFinalMaskContoursWrapper = useCallback(async () => {
    if (!currentImage || !finalMask) {
      setError("No current image or final mask available");
      return;
    }

    try {
      const result = await clearAllFinalMaskContours(finalMask, currentImage);
      if (result && result.success) {
        setSuccessMessageWithTimeout(result.message);
      }
    } catch (error) {
      setError(error.message);
    }
  }, [currentImage, finalMask, clearAllFinalMaskContours]);

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

  // Show dataset selection message if no dataset is selected
  if (!currentDataset) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-white rounded-lg border">
          <Typography variant="h6" className="text-gray-600 mb-2">
            No Dataset Selected
          </Typography>
          <Typography variant="body2" className="text-gray-500">
            Please select a dataset from the dropdown above to start working with images and labels.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Image Viewer with Prompting
      </h1>

      {/* Status Bar Component */}
      <StatusBar
        error={error}
        setError={setError}
        successMessage={successMessage}
        setSuccessMessage={setSuccessMessage}
        loading={loading}
        isSegmenting={isSegmenting}
        selectedModel={selectedModel}
      />

      <div
        className={`grid grid-cols-1 ${
          isSidebarCollapsed ? "md:grid-cols-6" : "md:grid-cols-3"
        } gap-4 mb-6`}
      >
        {/* Image Uploader Component */}
        <ImageUploader
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
        />

        {/* Main Viewer Container */}
        <div
          className={`${
            isSidebarCollapsed ? "md:col-span-5" : "md:col-span-2"
          } bg-white p-4 rounded-lg shadow-sm border border-gray-200`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              {!isZoomedContourRefinement && (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                  </svg>
                  Image Viewer with Prompting
                </>
              )}
            </h2>
          </div>

          {selectedImage ? (
            imageObject ? (
              <>
                {/* Tools Panel Component */}
                <ToolsPanel
                  promptType={promptType}
                  setPromptType={setPromptType}
                  promptingCanvasRef={promptingCanvasRef}
                  currentLabel={currentLabel}
                  setCurrentLabel={setCurrentLabel}
                  segmentationMasks={segmentationMasks}
                  exportQuantificationsAsCsv={exportQuantificationsAsCsv}
                />

                {/* Image Display Component */}
                <ImageDisplay
                  selectedImage={selectedImage}
                  imageObject={imageObject}
                  loading={loading}
                  isSegmenting={isSegmenting}
                  segmentationMasks={segmentationMasks}
                  selectedMask={selectedMask}
                  bestMask={bestMask}
                  promptType={promptType}
                  setPromptType={setPromptType}
                  currentLabel={currentLabel}
                  selectedModel={selectedModel}
                  promptingCanvasRef={promptingCanvasRef}
                  annotationCanvasRef={annotationCanvasRef}
                  finalMaskCanvasRef={finalMaskCanvasRef}
                  handlePromptingComplete={handlePromptingComplete}
                  handleMaskSelect={handleMaskSelect}
                  showAnnotationViewer={showAnnotationViewer}
                  isZoomedContourRefinement={isZoomedContourRefinement}
                  zoomLevel={zoomLevel}
                  zoomCenter={zoomCenter}
                  selectedContours={selectedContours}
                  setSelectedContours={setSelectedContours}
                  handleRunNewSegmentation={handleRunNewSegmentation}
                  setError={setError}
                  handleContourSelect={handleContourSelect}
                  handleAddSelectedContoursToFinalMask={handleAddSelectedContoursToFinalMask}
                  handleDeleteSelectedContours={handleDeleteSelectedContours}
                  finalMasks={finalMasks}
                  finalMask={finalMask}
                  selectedFinalMaskContour={selectedFinalMaskContour}
                  fetchingFinalMask={fetchingFinalMask}
                  drawAnnotationCanvas={drawAnnotationCanvas}
                  drawFinalMaskCanvas={drawFinalMaskCanvas}
                  handleAnnotationCanvasClick={handleAnnotationCanvasClick}
                  handleFinalMaskCanvasClick={handleFinalMaskCanvasClick}
                  handleFinalMaskContourSelect={handleFinalMaskContourSelect}
                  handleDeleteFinalMaskContour={handleDeleteFinalMaskContourWrapper}
                  clearAllFinalMaskContours={clearAllFinalMaskContoursWrapper}
                  setSelectedFinalMaskContour={setSelectedFinalMaskContour}
                  setZoomLevel={setZoomLevel}
                  canvasImage={canvasImage}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-md">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-t-teal-600 border-r-teal-300 border-b-teal-200 border-l-teal-400 rounded-full loading-spinner mb-2"></div>
                  <p>Loading image...</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-md">
              <p className="text-gray-500">Select an image to start prompting</p>
            </div>
          )}

          {/* Help text */}
          {!selectedImage && !loading && (
            <div className="mt-4 p-4 bg-teal-50 text-teal-700 rounded-md">
              <h3 className="font-medium mb-2">How to use:</h3>
              <ol className="list-decimal list-inside text-sm">
                <li className="mb-1">Select or upload an image from the left panel</li>
                <li className="mb-1">Choose a prompting tool (point, box, circle, or polygon)</li>
                <li className="mb-1">Select foreground (1) or background (0) label</li>
                <li className="mb-1">Click and drag on the image to create prompts</li>
                <li className="mb-1">Use zoom and pan controls for detailed work</li>
                <li>Save your prompts when finished</li>
              </ol>
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center max-w-md w-full transform transition-all">
                <div className="relative w-20 h-20 mb-4">
                  <div className="absolute inset-0 border-4 border-teal-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-teal-600 border-r-teal-300 border-b-teal-200 border-l-teal-400 rounded-full loading-spinner"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-teal-600 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Processing</h3>
                <p className="text-sm text-gray-600 text-center mb-3">
                  {isSegmenting
                    ? `Applying ${selectedModel} segmentation model to your image`
                    : "Loading..."}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1 overflow-hidden">
                  <div className="bg-teal-600 h-1.5 rounded-full loading-progress"></div>
                </div>
                <p className="text-xs text-gray-500">This may take a few moments...</p>
              </div>
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
                        const selectedContour = finalMask.contours[contourIndex];
                        
                        // Create the updated final mask contour object
                        const updatedFinalMaskContour = {
                          mask: finalMask,
                          contour: selectedContour,
                          contourIndex: contourIndex
                        };
                        
                        // Call the main function to update zoom and final mask viewer
                        handleFinalMaskContourSelect(finalMask, contourIndex);
                        
                        // Force a redraw of the annotation canvas with the updated contour
                        setTimeout(() => {
                          if (bestMask && canvasImage) {
                            drawAnnotationCanvas(bestMask, canvasImage, selectedContours, updatedFinalMaskContour);
                          }
                        }, 150);
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

      {/* Contour Editor */}
      {editingMask && (
        <ContourEditor
          mask={editingMask}
          image={imageObject}
          onMaskUpdated={handleMaskUpdated}
          onCancel={() => setEditingMask(null)}
        />
      )}

      {/* Save Mask Dialog */}
      {showSaveMaskDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Save Mask As</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Select a class label:
              </label>
              <div className="flex flex-col space-y-2">
                <select
                  className="border border-gray-300 rounded-md p-2 bg-white"
                  value={saveMaskLabel}
                  onChange={(e) => {
                    setSaveMaskLabel(e.target.value);
                    setCustomSaveMaskLabel(""); // Clear custom label when selecting from dropdown
                  }}
                >
                  {maskLabelOptions.map((label) => (
                    <option key={label} value={label}>
                      {label.replace("_", " ")}
                    </option>
                  ))}
                </select>

                <div className="flex items-center">
                  <span className="text-sm mr-2">Or create new class:</span>
                  <input
                    type="text"
                    placeholder="Custom class label"
                    className="border border-gray-300 rounded-md p-2 flex-grow"
                    value={customSaveMaskLabel}
                    onChange={(e) => {
                      setCustomSaveMaskLabel(e.target.value);
                      if (e.target.value.trim()) {
                        setSaveMaskLabel(""); // Clear dropdown selection when custom label is entered
                      } else {
                        setSaveMaskLabel("coral"); // Reset to default if custom field is empty
                      }
                    }}
                  />
                </div>
              </div>

              <div className="mt-2 p-2 bg-teal-50 text-teal-700 rounded">
                Saving mask as:{" "}
                <strong>{customSaveMaskLabel.trim() || saveMaskLabel}</strong>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => {
                  setShowSaveMaskDialog(false);
                  setSavingMaskIndex(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md shadow-sm transition-all duration-200 font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(
                    "Save button clicked in dialog - explicit function call"
                  );
                  saveSelectedMask();
                }}
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageViewerWithPrompting; 