import React, { useRef, useEffect, useCallback } from "react";
import { Typography } from "@mui/material";
import { useDataset } from "../../contexts/DatasetContext";

// Custom Hooks
import { useImageManagement } from "../../hooks/useImageManagement";
import { useSegmentation } from "../../hooks/useSegmentation";
import { useContourOperations } from "../../hooks/useContourOperations";
import { useCanvasOperations } from "../../hooks/useCanvasOperations";
import { useAnnotationState } from "../../hooks/useAnnotationState";
import { useAnnotationZoom } from "../../hooks/useAnnotationZoom";
import { useAnnotationHandlers } from "../../hooks/useAnnotationHandlers";
import { useImageNavigation } from "../../hooks/useImageNavigation";

// Utilities
import {
  exportQuantificationsAsCsv,
  createSaveMaskHandler,
  createSuccessMessageHandler,
  createFinalMaskContourWrappers,
} from "../../utils/annotationUtils";
import { drawAnnotationCanvas as renderAnnotationCanvas } from "../../utils/canvasDrawUtils";

// Components
import StatusBar from "./MainAnnotationPage/StatusBar";
import MainViewers from "./MainAnnotationPage/MainViewers";
import Sidebar from "./Sidebar/Sidebar";
import QuantificationTable from "./MainAnnotationPage/QuantificationTable";
import ToolsPanel from "./MainAnnotationPage/ToolsPanel";
import HelpSection from "./HelpSection";

// Styles
import "./AnnotationPage.css";

const AnnotationPage = ({ initialImageId = null }) => {
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

  // Destructure state
  const {
    promptType,
    setPromptType,
    currentLabel,
    setCurrentLabel,
    viewMode,
    setViewMode,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    successMessage,
    setSuccessMessage,
    showSaveMaskDialog,
    setShowSaveMaskDialog,
    savingMaskIndex,
    setSavingMaskIndex,
    saveMaskLabel,
    setSaveMaskLabel,
    customSaveMaskLabel,
    setCustomSaveMaskLabel,
    isTransitioning,
    setIsTransitioning,
    labelOptions,
    setLabelOptions,
    instantSegmentationState,
    setInstantSegmentationState,
  } = annotationState;

  const {
    annotationZoomLevel,
    setAnnotationZoomLevel,
    annotationZoomCenter,
    setAnnotationZoomCenter,
    resetZoomStates,
    handleAnnotationZoomIn,
    handleAnnotationZoomOut,
    handleAnnotationResetView,
  } = annotationZoom;

  // Destructure hook returns for easier access
  const {
    selectedImage,
    imageObject,
    availableImages,
    selectedImageId,
    loading: imageLoading,
    error: imageError,
    fetchImagesFromAPI,
    handleImageSelect: originalHandleImageSelect,
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
    resetCanvasState,
    setZoomLevel,
    setZoomCenter,
  } = canvasOps;

  // Combined error state
  const error = imageError;
  const setError = setImageError;

  // Create utility functions
  const setSuccessMessageWithTimeout = createSuccessMessageHandler(setSuccessMessage);

  const resetZoomStatesWrapper = useCallback(() => {
    resetZoomStates(setZoomLevel, setZoomCenter, setSelectedFinalMaskContour, promptingCanvasRef);
  }, [resetZoomStates, setZoomLevel, setZoomCenter, setSelectedFinalMaskContour]);

  // Navigation hook
  const imageNavigation = useImageNavigation({
    originalHandleImageSelect,
    resetSegmentationState,
    resetContourState,
    resetCanvasState,
    resetZoomStates: resetZoomStatesWrapper,
    setIsTransitioning,
    setError,
  });

  // Handlers hook
  const handlers = useAnnotationHandlers({
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
  });

  // Create wrapper functions for final mask contour operations
  const { handleDeleteFinalMaskContourWrapper, clearAllFinalMaskContoursWrapper } =
    createFinalMaskContourWrappers(
      selectedImage,
      setError,
      handleDeleteFinalMaskContour,
      fetchFinalMask,
      setSuccessMessageWithTimeout,
      clearAllFinalMaskContours,
      finalMask
    );

  // Save mask handler
  const saveSelectedMask = createSaveMaskHandler(
    selectedMask,
    customSaveMaskLabel,
    saveMaskLabel,
    setError,
    setSuccessMessageWithTimeout,
    setShowSaveMaskDialog,
    setSavingMaskIndex,
    setSaveMaskLabel,
    setCustomSaveMaskLabel
  );

  // Enhanced wrapper functions with zoom parameters
  const handleAnnotationZoomInWrapper = useCallback(() => {
    handleAnnotationZoomIn(selectedFinalMaskContour, setZoomLevel, promptingCanvasRef);
  }, [handleAnnotationZoomIn, selectedFinalMaskContour, setZoomLevel]);

  const handleAnnotationZoomOutWrapper = useCallback(() => {
    handleAnnotationZoomOut(selectedFinalMaskContour, setZoomLevel, promptingCanvasRef);
  }, [handleAnnotationZoomOut, selectedFinalMaskContour, setZoomLevel]);

  const handleAnnotationResetViewWrapper = useCallback(() => {
    handleAnnotationResetView(setZoomLevel, setZoomCenter, setSelectedFinalMaskContour, promptingCanvasRef);
  }, [handleAnnotationResetView, setZoomLevel, setZoomCenter, setSelectedFinalMaskContour]);

  const handleFinalMaskContourSelectWrapper = useCallback((mask, contourIndex) => {
    handlers.handleFinalMaskContourSelect(mask, contourIndex, setAnnotationZoomLevel, setAnnotationZoomCenter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAnnotationZoomLevel, setAnnotationZoomCenter]);

  const handleAnnotationCanvasClickWrapper = useCallback((event) => {
    handlers.handleAnnotationCanvasClick(event, handleFinalMaskContourSelectWrapper);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleFinalMaskContourSelectWrapper]);

  const handleFinalMaskCanvasClickWrapper = useCallback((event) => {
    handlers.handleFinalMaskCanvasClick(event, handleFinalMaskContourSelectWrapper);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleFinalMaskContourSelectWrapper]);

  const handleResetWrapper = useCallback(() => {
    handlers.handleReset(setAnnotationZoomLevel, setAnnotationZoomCenter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAnnotationZoomLevel, setAnnotationZoomCenter]);

  const handleFileUploadWrapper = useCallback((e) => {
    imageNavigation.handleFileUploadWrapper(e, handleFileUpload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleFileUpload]);

  // Enhanced draw functions that pass proper parameters
  const drawAnnotationCanvasWrapper = useCallback(() => {
    renderAnnotationCanvas({
      canvasRef: annotationCanvasRef,
      bestMask,
      canvasImage: imageObject,
      selectedContours,
      selectedFinalMaskContour,
      zoomLevel: annotationZoomLevel,      // Use annotation zoom instead of final mask zoom
      zoomCenter: annotationZoomCenter,    // Use annotation zoom center instead of final mask zoom center
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestMask, imageObject, selectedContours, selectedFinalMaskContour, annotationZoomLevel, annotationZoomCenter]);

  const drawFinalMaskCanvasWrapper = useCallback(() => {
    drawFinalMaskCanvas(imageObject, finalMasks, selectedFinalMaskContour);
  }, [drawFinalMaskCanvas, imageObject, finalMasks, selectedFinalMaskContour]);

  // Initialize component
  useEffect(() => {
    if (currentDataset) {
      fetchImagesFromAPI();
      handlers.fetchLabels();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDataset, fetchImagesFromAPI, resetCanvasState, resetContourState, resetImageState, resetSegmentationState]);

  // Handle initial image selection from URL
  useEffect(() => {
    if (initialImageId && availableImages.length > 0 && !isNavigatingRef.current) {
      // Check if we need to switch to a different image
      if (selectedImageId !== initialImageId) {
        const targetImage = availableImages.find(img => img.id === initialImageId);
        if (targetImage) {
          // Set flag to prevent circular dependency
          isNavigatingRef.current = true;
          
          // Set transitioning state for URL-triggered changes too
          setIsTransitioning(true);
          
          // Clear image-specific state for cleaner transition
          resetSegmentationState();
          resetContourState();
          resetCanvasState();
          
          // Reset zoom states to ensure clean transition
          resetZoomStatesWrapper();
          
          // Use original handler to avoid circular dependency with URL updates
          originalHandleImageSelect(targetImage).finally(() => {
            setIsTransitioning(false);
            isNavigatingRef.current = false;
          });
        } else {
          console.warn(`Image with ID ${initialImageId} not found in available images`);
        }
      }
    }
  }, [initialImageId, availableImages, selectedImageId, originalHandleImageSelect, resetSegmentationState, resetContourState, resetCanvasState, resetZoomStatesWrapper, setIsTransitioning]);

  // Load final mask when image changes
  useEffect(() => {
    if (selectedImage && selectedImage.id) {
      fetchFinalMask(selectedImage.id);
    }
  }, [selectedImage, fetchFinalMask]);

  // Draw final mask canvas when final mask data changes
  useEffect(() => {
    if (imageObject) {
      setTimeout(() => {
        drawFinalMaskCanvasWrapper();
      }, 100);
    }
  }, [finalMasks, imageObject, drawFinalMaskCanvasWrapper]);

  // Draw annotation canvas automatically when data changes (but not for zoom-triggered updates)
  useEffect(() => {
    if (bestMask && imageObject) {
      // Only auto-redraw if annotation zoom level is 1 (not zoomed) or if it's an initial load
      if (annotationZoomLevel === 1) {
        setTimeout(() => {
          drawAnnotationCanvasWrapper();
        }, 100);
      }
    }
  }, [bestMask, imageObject, selectedContours, selectedFinalMaskContour, drawAnnotationCanvasWrapper, annotationZoomLevel]);

  // Force redraw annotation canvas when annotation zoom changes
  useEffect(() => {
    if (bestMask && imageObject) {
      setTimeout(() => {
        drawAnnotationCanvasWrapper();
      }, 10);
    }
  }, [annotationZoomLevel, annotationZoomCenter, drawAnnotationCanvasWrapper, bestMask, imageObject]);

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

  return (
    <div className="w-full">
      {/* Status Bar Component */}
      <StatusBar
        error={error}
        setError={setError}
        successMessage={successMessage}
        setSuccessMessage={setSuccessMessage}
        loading={imageLoading || isSegmenting || fetchingFinalMask || isTransitioning}
        isSegmenting={isSegmenting}
        selectedModel={selectedModel}
        suppressLoadingModal={instantSegmentationState.shouldSuppressLoadingModal}
      />
      
      <div className={`grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 mb-6`}>
        {/* Sidebar Component */}
        <Sidebar
          selectedImage={selectedImage}
          selectedImageId={selectedImageId}
          availableImages={availableImages}
          loading={imageLoading || isSegmenting || fetchingFinalMask || isTransitioning}
          error={error}
          viewMode={viewMode}
          setViewMode={setViewMode}
          handleFileUpload={handleFileUploadWrapper}
          handleImageSelect={imageNavigation.handleImageSelect}
          selectedModel={selectedModel}
          handleModelChange={handleModelChange}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          currentDataset={currentDataset}
        />
        
        <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${isSidebarCollapsed ? "w-auto" : ""}`}>
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
            handleAnnotationZoomIn={handleAnnotationZoomInWrapper}
            handleAnnotationZoomOut={handleAnnotationZoomOutWrapper}
            handleAnnotationResetView={handleAnnotationResetViewWrapper}
          />
          
          <MainViewers
            selectedImage={selectedImage}
            imageObject={imageObject}
            segmentationMasks={segmentationMasks}
            selectedMask={selectedMask}
            bestMask={bestMask}
            isSegmenting={isSegmenting}
            selectedModel={selectedModel}
            handlePromptingComplete={handlers.handlePromptingComplete}
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
            handleAnnotationCanvasClick={handleAnnotationCanvasClickWrapper}
            handleFinalMaskCanvasClick={handleFinalMaskCanvasClickWrapper}
            handleFinalMaskContourSelect={handleFinalMaskContourSelectWrapper}
            resetCanvasState={resetCanvasState}
            setZoomLevel={setZoomLevel}
            setZoomCenter={setZoomCenter}
            handleReset={handleResetWrapper}
            handleRunNewSegmentation={handlers.handleRunNewSegmentation}
            promptingCanvasRef={promptingCanvasRef}
            imageLoading={imageLoading}
            imageError={error}
            setError={setError}
            handleFileUpload={handleFileUploadWrapper}
            handleImageSelect={imageNavigation.handleImageSelect}
            resetImageState={resetImageState}
            labelOptions={labelOptions}
            promptType={promptType}
            setPromptType={setPromptType}
            currentLabel={currentLabel}
            setCurrentLabel={setCurrentLabel}
            handleAddSelectedContoursToFinalMask={handlers.handleAddSelectedContoursToFinalMask}
            handleDeleteSelectedContours={handlers.handleDeleteSelectedContours}
            selectedContours={selectedContours}
            setSelectedContours={setSelectedContours}
            handleDeleteFinalMaskContour={handleDeleteFinalMaskContourWrapper}
            clearAllFinalMaskContours={clearAllFinalMaskContoursWrapper}
            handleDeleteContourFromTable={handleDeleteContourFromTable}
            exportQuantificationsAsCsv={exportQuantificationsAsCsv}
            showSaveMaskDialog={showSaveMaskDialog}
            setShowSaveMaskDialog={setShowSaveMaskDialog}
            savingMaskIndex={savingMaskIndex}
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
            annotationZoomLevel={annotationZoomLevel}
            annotationZoomCenter={annotationZoomCenter}
            setAnnotationZoomLevel={setAnnotationZoomLevel}
            setAnnotationZoomCenter={setAnnotationZoomCenter}
          />
          
          {/* Help Section */}
          <HelpSection selectedImage={selectedImage} imageLoading={imageLoading} />

          {/* Quantification Table */}
          <div style={{ marginTop: 24 }}>
            {finalMasks.length > 0 ? (
              <div>
                <Typography variant="h6" style={{ marginBottom: 16 }}>Quantification</Typography>
                <QuantificationTable
                  masks={finalMasks}
                  onContourSelect={(row) => {
                    // Handle zoom-out when row is null
                    if (row === null) {
                      setZoomLevel(1);
                      setZoomCenter({ x: 0.5, y: 0.5 });
                      setAnnotationZoomLevel(1);
                      setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
                      setSelectedFinalMaskContour(null);
                      setSelectedContours([]);
                      
                      // Reset prompting canvas view if available
                      if (promptingCanvasRef.current && promptingCanvasRef.current.resetView) {
                        promptingCanvasRef.current.resetView();
                      }
                      
                      // Force redraw of annotation canvas with updated zoom state
                      setTimeout(() => {
                        renderAnnotationCanvas({
                          canvasRef: annotationCanvasRef,
                          bestMask,
                          canvasImage: imageObject,
                          selectedContours: [],
                          selectedFinalMaskContour: null,
                          zoomLevel: 1,
                          zoomCenter: { x: 0.5, y: 0.5 },
                        });
                      }, 50); // Longer delay to ensure state updates
                      
                      return;
                    }
                    
                    // Find the corresponding contour and trigger zoom
                    if (finalMasks.length > 0 && finalMasks[0].contours) {
                      const contourIndex = finalMasks[0].contours.findIndex(c => c.id === row.contour_id);
                      if (contourIndex !== -1) {
                        const finalMask = finalMasks[0];
                        const contour = finalMask.contours[contourIndex];
                        
                        // Calculate optimal zoom for synchronization
                        if (contour && contour.x && contour.y && contour.x.length > 0) {
                          const { calculateOptimalZoomLevel } = canvasOps;
                          const { zoomLevel: optimalZoom, centerX, centerY } = calculateOptimalZoomLevel(contour);
                          
                          // Sync annotation zoom with final mask zoom
                          setAnnotationZoomLevel(optimalZoom);
                          setAnnotationZoomCenter({ x: centerX, y: centerY });
                          
                          // Also apply zoom to prompting canvas if available
                          if (promptingCanvasRef.current && promptingCanvasRef.current.setZoomParameters) {
                            promptingCanvasRef.current.setZoomParameters(optimalZoom, { x: centerX, y: centerY });
                          }
                        }
                        
                        handleFinalMaskContourSelectWrapper(finalMask, contourIndex);
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
          onClick={handleResetWrapper}
        >
          <span>Reset All</span>
        </button>
      </div>
    </div>
  );
};

export default AnnotationPage; 