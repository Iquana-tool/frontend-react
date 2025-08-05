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
      {/* Small Screen Message - Hide annotation page on screens below 1024px */}
      <div className="block lg:hidden">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-3">Larger Screen Required</h1>
              <p className="text-slate-600 text-lg mb-6">
                Annotation tools require a larger screen for optimal precision and usability.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800 text-sm">
                  <strong>Minimum screen width:</strong> 1024px (Large tablet or desktop)
                </p>
              </div>
              <p className="text-slate-500 text-sm">
                Please use a desktop computer, laptop, or large tablet to access the annotation features.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Large Screen Content - Show annotation page on screens 1024px and above */}
      <div className="hidden lg:block">
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

        <div className={`grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 mb-6 w-full max-w-full min-w-0 overflow-x-hidden`}>
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
          className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 overflow-x-hidden ${
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
            image_id={imageManagement.selectedImageId}
            dataset_id={currentDataset.id}
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
    </div>
  );
};

export default AnnotationPage;
