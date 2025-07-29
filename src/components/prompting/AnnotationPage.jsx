import React, { useCallback, useState } from "react";
import { Typography } from "@mui/material";

// Modular Hooks and Utilities
import { useAnnotationPageState } from "./hooks/useAnnotationPageState";
import { useAnnotationPageEffects } from "./hooks/useAnnotationPageEffects";
import {
  createSegmentationHandlers,
  createContourAdditionHandlers,
  createZoomHandlers,
  createWrapperHandlers,
} from "./handlers/annotationHandlers";
import {
  createUtilityFunctions,
  createQuantificationTableHandlers,
} from "./utils/annotationPageUtils";

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
  // Label warning highlighting state
  const [highlightLabelWarning, setHighlightLabelWarning] = useState(false);

  // Use the consolidated state management hook
  const state = useAnnotationPageState(initialImageId);

  // Destructure state for easier access
  const {
    currentDataset,
    promptingCanvasRef,
    isNavigatingRef,
    isAddingToFinalMask,
    setIsAddingToFinalMask,
    annotationState,
    annotationZoom,
    contourOps,
    imageManagement,
    segmentation,
    canvasOps,
    imageNavigation,
    handlers,
    resetZoomStatesWrapper,
    error,
    setError,
  } = state;

  // Create utility functions
  const utilityFunctions = createUtilityFunctions({
    selectedMask: segmentation.selectedMask,
    customSaveMaskLabel: annotationState.customSaveMaskLabel,
    saveMaskLabel: annotationState.saveMaskLabel,
    setError,
    setSuccessMessageWithTimeout: annotationState.setSuccessMessage,
    setShowSaveMaskDialog: annotationState.setShowSaveMaskDialog,
    setSavingMaskIndex: annotationState.setSavingMaskIndex,
    setSaveMaskLabel: annotationState.setSaveMaskLabel,
    setCustomSaveMaskLabel: annotationState.setCustomSaveMaskLabel,
    selectedImage: imageManagement.selectedImage,
    handleDeleteFinalMaskContour: contourOps.handleDeleteFinalMaskContour,
    fetchFinalMask: contourOps.fetchFinalMask,
    clearAllFinalMaskContours: contourOps.clearAllFinalMaskContours,
    finalMask: contourOps.finalMask,
  });



  // Create segmentation handlers
  const segmentationHandlers = createSegmentationHandlers({
    setSelectedContourIds: segmentation.setSelectedContourIds,
    setSegmentationMasks: segmentation.setSegmentationMasks,
    setBestMask: segmentation.setBestMask,
    setSuccessMessageWithTimeout: utilityFunctions.setSuccessMessageWithTimeoutHandler,
    resetSegmentationState: segmentation.resetSegmentationState,
    selectedImage: imageManagement.selectedImage,
    setError,
    fetchFinalMask: contourOps.fetchFinalMask,
    promptingCanvasRef,
  });

  // Create contour addition handlers
  const contourAdditionHandlers = createContourAdditionHandlers({
    selectedImage: imageManagement.selectedImage,
    setError,
    setSuccessMessageWithTimeout: utilityFunctions.setSuccessMessageWithTimeoutHandler,
    fetchFinalMask: contourOps.fetchFinalMask,
    setSegmentationMasks: segmentation.setSegmentationMasks,
    setSelectedContourIds: segmentation.setSelectedContourIds,
    promptingCanvasRef,
    setIsAddingToFinalMask,
    annotationState,
  });

  // Create zoom handlers
  const zoomHandlers = createZoomHandlers({
    handleAnnotationZoomIn: annotationZoom.handleAnnotationZoomIn,
    handleAnnotationZoomOut: annotationZoom.handleAnnotationZoomOut,
    handleAnnotationResetView: annotationZoom.handleAnnotationResetView,
    selectedFinalMaskContour: contourOps.selectedFinalMaskContour,
    setZoomLevel: canvasOps.setZoomLevel,
    setZoomCenter: canvasOps.setZoomCenter,
    setSelectedFinalMaskContour: contourOps.setSelectedFinalMaskContour,
    promptingCanvasRef,
  });

  // Create wrapper handlers
  const wrapperHandlers = createWrapperHandlers({
    handlers,
    setAnnotationZoomLevel: annotationZoom.setAnnotationZoomLevel,
    setAnnotationZoomCenter: annotationZoom.setAnnotationZoomCenter,
    imageNavigation,
    handleFileUpload: imageManagement.handleFileUpload,
  });

  // Create final mask canvas drawing wrapper
  const drawFinalMaskCanvasWrapper = useCallback(() => {
    canvasOps.drawFinalMaskCanvas(
      imageManagement.imageObject,
      contourOps.finalMasks,
      contourOps.selectedFinalMaskContour
    );
  }, [
    canvasOps,
    imageManagement.imageObject,
    contourOps.finalMasks,
    contourOps.selectedFinalMaskContour,
  ]);

  // Create quantification table handlers
  const quantificationTableHandlers = createQuantificationTableHandlers({
    setZoomLevel: canvasOps.setZoomLevel,
    setZoomCenter: canvasOps.setZoomCenter,
    setAnnotationZoomLevel: annotationZoom.setAnnotationZoomLevel,
    setAnnotationZoomCenter: annotationZoom.setAnnotationZoomCenter,
    setSelectedFinalMaskContour: contourOps.setSelectedFinalMaskContour,
    setSelectedContours: contourOps.setSelectedContours,
    promptingCanvasRef,
    annotationCanvasRef: canvasOps.annotationCanvasRef,
    bestMask: segmentation.bestMask,
    imageObject: imageManagement.imageObject,
    finalMasks: contourOps.finalMasks,
    canvasOps,
    handleFinalMaskContourSelectWrapper: wrapperHandlers.handleFinalMaskContourSelectWrapper,
    handleDeleteContourFromTable: contourOps.handleDeleteContourFromTable,
  });

  // Handle mask status changes to update sidebar gallery
  const handleMaskStatusChange = (isFinished) => {
    const currentImageId = imageManagement.selectedImageId;
    if (currentImageId) {
      imageManagement.setAvailableImages(prevImages => 
        prevImages.map(img => 
          img.id === currentImageId 
            ? { ...img, finished: isFinished }
            : img
        )
      );
    }
    
    // Update the local finished state
    annotationState.setIsMaskFinished(isFinished);
  };

  // Use the effects hook to handle all useEffect logic
  useAnnotationPageEffects({
    currentDataset,
    initialImageId,
    availableImages: imageManagement.availableImages,
    selectedImageId: imageManagement.selectedImageId,
    selectedImage: imageManagement.selectedImage,
    imageObject: imageManagement.imageObject,
    finalMasks: contourOps.finalMasks,
    segmentationMasks: segmentation.segmentationMasks,
    selectedContourIds: segmentation.selectedContourIds,
    isNavigatingRef,
    fetchImagesFromAPI: imageManagement.fetchImagesFromAPI,
    handlers,
    setIsTransitioning: annotationState.setIsTransitioning,
    resetSegmentationState: segmentation.resetSegmentationState,
    resetContourState: contourOps.resetContourState,
    resetCanvasState: canvasOps.resetCanvasState,
    resetZoomStatesWrapper,
    originalHandleImageSelect: imageManagement.handleImageSelect,
    fetchFinalMask: contourOps.fetchFinalMask,
    drawFinalMaskCanvasWrapper,
    promptingCanvasRef,
    resetImageState: imageManagement.resetImageState,
  });

  return (
    <div className="w-full">
      {/* Status Bar Component */}
      <StatusBar
        error={error}
        setError={setError}
        successMessage={annotationState.successMessage}
        setSuccessMessage={annotationState.setSuccessMessage}
        loading={
          imageManagement.loading ||
          segmentation.isSegmenting ||
          contourOps.fetchingFinalMask ||
          annotationState.isTransitioning
        }
        isSegmenting={segmentation.isSegmenting}
        selectedModel={segmentation.selectedModel}
        suppressLoadingModal={
          annotationState.instantSegmentationState.shouldSuppressLoadingModal
        }
      />

      <div className={`grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 mb-6`}>
        {/* Sidebar Component */}
        <Sidebar
          selectedImage={imageManagement.selectedImage}
          selectedImageId={imageManagement.selectedImageId}
          availableImages={imageManagement.availableImages}
          loading={
            imageManagement.loading ||
            segmentation.isSegmenting ||
            contourOps.fetchingFinalMask ||
            annotationState.isTransitioning
          }
          error={error}
          handleFileUpload={wrapperHandlers.handleFileUploadWrapper}
          handleImageSelect={imageNavigation.handleImageSelect}
          selectedModel={segmentation.selectedModel}
          handleModelChange={segmentation.handleModelChange}
          isSidebarCollapsed={annotationState.isSidebarCollapsed}
          setIsSidebarCollapsed={annotationState.setIsSidebarCollapsed}
        />

        <div
          className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${
            annotationState.isSidebarCollapsed ? "w-auto" : ""
          }`}
        >
          {/* Tools Panel Component */}
          <ToolsPanel
            promptType={annotationState.promptType}
            setPromptType={annotationState.setPromptType}
            promptingCanvasRef={promptingCanvasRef}
            currentLabel={annotationState.currentLabel}
            setCurrentLabel={annotationState.setCurrentLabel}
            segmentationMasks={segmentation.segmentationMasks}
            exportQuantificationsAsCsv={utilityFunctions.exportQuantificationsAsCsv}
            zoomLevel={canvasOps.zoomLevel}
            setZoomLevel={canvasOps.setZoomLevel}
            setZoomCenter={canvasOps.setZoomCenter}
            handleAnnotationZoomIn={zoomHandlers.handleAnnotationZoomInWrapper}
            handleAnnotationZoomOut={zoomHandlers.handleAnnotationZoomOutWrapper}
            handleAnnotationResetView={zoomHandlers.handleAnnotationResetViewWrapper}
            highlightLabelWarning={highlightLabelWarning}
            setHighlightLabelWarning={setHighlightLabelWarning}
            isMaskFinished={annotationState.isMaskFinished}
          />

          <MainViewers
            selectedImage={imageManagement.selectedImage}
            imageObject={imageManagement.imageObject}
            segmentationMasks={segmentation.segmentationMasks}
            selectedMask={segmentation.selectedMask}
            bestMask={segmentation.bestMask}
            isSegmenting={segmentation.isSegmenting}
            selectedModel={segmentation.selectedModel}
            handlePromptingComplete={handlers.handlePromptingComplete}
            handleMaskSelect={segmentation.handleMaskSelect}
            resetSegmentationState={segmentation.resetSegmentationState}
            setSelectedMask={segmentation.setSelectedMask}
            setBestMask={segmentation.setBestMask}
            setSegmentationMasks={segmentation.setSegmentationMasks}
            zoomLevel={canvasOps.zoomLevel}
            zoomCenter={canvasOps.zoomCenter}
            showAnnotationViewer={canvasOps.showAnnotationViewer}
            annotationCanvasRef={canvasOps.annotationCanvasRef}
            finalMaskCanvasRef={canvasOps.finalMaskCanvasRef}
            drawFinalMaskCanvasWrapper={drawFinalMaskCanvasWrapper}
            handleAnnotationCanvasClick={wrapperHandlers.handleAnnotationCanvasClickWrapper}
            handleFinalMaskContourSelect={wrapperHandlers.handleFinalMaskContourSelectWrapper}
            resetCanvasState={canvasOps.resetCanvasState}
            setZoomLevel={canvasOps.setZoomLevel}
            setZoomCenter={canvasOps.setZoomCenter}
            handleReset={wrapperHandlers.handleResetWrapper}
            handleRunNewSegmentation={handlers.handleRunNewSegmentation}
            promptingCanvasRef={promptingCanvasRef}
            imageLoading={imageManagement.loading}
            imageError={error}
            setError={setError}
            handleFileUpload={wrapperHandlers.handleFileUploadWrapper}
            promptType={annotationState.promptType}
            currentLabel={annotationState.currentLabel}
            handleContourSelect={contourOps.handleContourSelect}
            handleAddSelectedContoursToFinalMask={contourOps.handleAddSelectedContoursToFinalMask}
            handleAddManualContoursToFinalMask={contourAdditionHandlers.handleAddManualContoursToFinalMask}
            handleClearSegmentationResults={segmentation.resetSegmentationState}
            canvasImage={imageManagement.imageObject}
            handleDeleteSelectedContours={contourOps.handleDeleteSelectedContours}
            setSelectedContours={contourOps.setSelectedContours}
            finalMasks={contourOps.finalMasks}
            finalMask={contourOps.finalMask}
            selectedFinalMaskContour={contourOps.selectedFinalMaskContour}
            handleDeleteFinalMaskContour={contourOps.handleDeleteFinalMaskContour}
            clearAllFinalMaskContours={contourOps.clearAllFinalMaskContours}
            setSelectedFinalMaskContour={contourOps.setSelectedFinalMaskContour}
            drawFinalMaskCanvas={canvasOps.drawFinalMaskCanvas}
            onInstantSegmentationStateChange={annotationState.setInstantSegmentationState}
            annotationZoomLevel={annotationZoom.annotationZoomLevel}
            annotationZoomCenter={annotationZoom.annotationZoomCenter}
            setAnnotationZoomLevel={annotationZoom.setAnnotationZoomLevel}
            setAnnotationZoomCenter={annotationZoom.setAnnotationZoomCenter}
            selectedContourIds={segmentation.selectedContourIds}
            onToggleContourSelection={segmentationHandlers.handleToggleContourSelection}
            onDeleteContour={segmentationHandlers.handleDeleteSegmentationContour}
            onSelectAllContours={segmentationHandlers.handleSelectAllSegmentationContours}
            onClearContourSelection={segmentationHandlers.handleClearSegmentationSelection}
            onClearAllResults={segmentationHandlers.handleClearAllSegmentationResults}
            onAddToFinalMask={contourAdditionHandlers.handleAddFromSegmentationToFinal}
            onAddSingleContourToFinalMask={
              contourAdditionHandlers.handleAddSingleContourToFinalMask
            }
            isAddingToFinalMask={isAddingToFinalMask}
            onMaskStatusChange={handleMaskStatusChange}
            setHighlightLabelWarning={setHighlightLabelWarning}
            isMaskFinished={annotationState.isMaskFinished}
            setIsMaskFinished={annotationState.setIsMaskFinished}
          />

          {/* Help Section */}
          <HelpSection
            selectedImage={imageManagement.selectedImage}
            imageLoading={imageManagement.loading}
          />

          {/* Quantification Table */}
          <div style={{ marginTop: 24 }}>
            {contourOps.finalMasks.length > 0 ? (
              <div>
                <Typography variant="h6" style={{ marginBottom: 16 }}>
                  Quantification
                </Typography>
                <QuantificationTable
                  masks={contourOps.finalMasks}
                  onContourSelect={quantificationTableHandlers.handleContourSelect}
                  onContourDelete={quantificationTableHandlers.handleContourDelete}
                />
              </div>
            ) : (
              <div>
                <Typography variant="h6" style={{ marginBottom: 16 }}>
                  Quantification
                </Typography>
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
          onClick={wrapperHandlers.handleResetWrapper}
        >
          <span>Reset All</span>
        </button>
      </div>
    </div>
  );
};

export default AnnotationPage;
