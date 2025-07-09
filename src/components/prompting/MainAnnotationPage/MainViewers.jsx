import React from "react";
import FinalMaskViewer from "./FinalMaskViewer";
import AnnotationViewer from "./AnnotationViewer";
import SegmentationResultsPanel from "./SegmentationResultsPanel";

const MainViewers = ({
  selectedImage,
  imageObject,
  loading,
  isSegmenting,
  segmentationMasks,
  selectedMask,
  selectedContours,
  promptingCanvasRef,
  handlePromptingComplete,
  promptType,
  currentLabel,
  handleContourSelect,
  handleAddSelectedContoursToFinalMask,
  handleAddManualContoursToFinalMask,
  handleClearSegmentationResults,
  zoomLevel,
  zoomCenter,
  canvasImage,
  handleDeleteSelectedContours,
  setSelectedContours,
  handleRunNewSegmentation,
  setError,
  finalMasks,
  finalMask,
  selectedFinalMaskContour,
  finalMaskCanvasRef,
  handleFinalMaskCanvasClick,
  handleDeleteFinalMaskContour,
  clearAllFinalMaskContours,
  setSelectedFinalMaskContour,
  setZoomLevel,
  handleFinalMaskContourSelect,
  drawFinalMaskCanvas,
  onInstantSegmentationStateChange,
  setZoomCenter,
  annotationZoomLevel,
  annotationZoomCenter,
  setAnnotationZoomLevel,
  setAnnotationZoomCenter,
  // Segmentation overlay props (now used by the panel)
  selectedContourIds,
  onToggleContourSelection,
  onDeleteContour,
  onSelectAllContours,
  onClearContourSelection,
  onClearAllResults,
  onAddToFinalMask,
  onAddSingleContourToFinalMask,
  isAddingToFinalMask,
}) => {
  if (!selectedImage) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-md">
        <p className="text-gray-500">Select an image to start prompting</p>
      </div>
    );
  }

  if (!imageObject) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-md">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-t-teal-600 border-r-teal-300 border-b-teal-200 border-l-teal-400 rounded-full loading-spinner mb-2"></div>
          <p>Loading image...</p>
        </div>
      </div>
    );
  }

  const showFinalMaskViewer = finalMasks.length > 0 && finalMasks.some((mask) => mask.contours?.length > 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-4">
      <div className="flex h-[600px]">
        {/* Left Panel - Segmentation Results */}
        <SegmentationResultsPanel
          segmentationMasks={segmentationMasks}
          selectedContourIds={selectedContourIds}
          onToggleContourSelection={onToggleContourSelection}
          onDeleteContour={onDeleteContour}
          onSelectAllContours={onSelectAllContours}
          onClearContourSelection={onClearContourSelection}
          onClearAllResults={onClearAllResults}
          onAddToFinalMask={onAddToFinalMask}
          onAddSingleContourToFinalMask={onAddSingleContourToFinalMask}
          isAddingToFinalMask={isAddingToFinalMask}
        />

        {/* Center Panel - Annotation Drawing Area */}
        <div className={`${showFinalMaskViewer ? 'flex-1 border-r border-slate-200' : 'flex-1'}`}>
          <AnnotationViewer
            imageObject={imageObject}
            loading={loading}
            isSegmenting={isSegmenting}
            segmentationMasks={segmentationMasks}
            selectedContours={selectedContours}
            selectedFinalMaskContour={selectedFinalMaskContour}
            promptingCanvasRef={promptingCanvasRef}
            handlePromptingComplete={handlePromptingComplete}
            promptType={promptType}
            currentLabel={currentLabel}
            handleContourSelect={handleContourSelect}
            handleAddSelectedContoursToFinalMask={handleAddSelectedContoursToFinalMask}
            handleAddManualContoursToFinalMask={handleAddManualContoursToFinalMask}
            handleClearSegmentationResults={handleClearSegmentationResults}
            zoomLevel={zoomLevel}
            zoomCenter={zoomCenter}
            canvasImage={canvasImage}
            handleDeleteSelectedContours={handleDeleteSelectedContours}
            setSelectedContours={setSelectedContours}
            handleRunNewSegmentation={handleRunNewSegmentation}
            setError={setError}
            onInstantSegmentationStateChange={onInstantSegmentationStateChange}
            finalMasks={finalMasks}
            selectedContourIds={selectedContourIds}
            // Remove segmentation overlay since it's now in the left panel
            showOverlay={false}
          />
        </div>

        {/* Right Panel - Final Mask (only when there are results) */}
        {showFinalMaskViewer && (
          <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100">
            <FinalMaskViewer
              segmentationMasks={segmentationMasks}
              selectedMask={selectedMask}
              selectedContours={selectedContours}
              isSegmenting={isSegmenting}
              loading={loading}
              finalMasks={finalMasks}
              finalMask={finalMask}
              selectedFinalMaskContour={selectedFinalMaskContour}
              zoomLevel={zoomLevel}
              zoomCenter={zoomCenter}
              canvasImage={canvasImage}
              finalMaskCanvasRef={finalMaskCanvasRef}
              handleAddSelectedContoursToFinalMask={handleAddSelectedContoursToFinalMask}
              handleDeleteSelectedContours={handleDeleteSelectedContours}
              setSelectedContours={setSelectedContours}
              handleRunNewSegmentation={handleRunNewSegmentation}
              handleFinalMaskCanvasClick={handleFinalMaskCanvasClick}
              handleDeleteFinalMaskContour={handleDeleteFinalMaskContour}
              clearAllFinalMaskContours={clearAllFinalMaskContours}
              setSelectedFinalMaskContour={setSelectedFinalMaskContour}
              setZoomLevel={setZoomLevel}
              setZoomCenter={setZoomCenter}
              handleFinalMaskContourSelect={handleFinalMaskContourSelect}
              drawFinalMaskCanvas={drawFinalMaskCanvas}
              annotationZoomLevel={annotationZoomLevel}
              annotationZoomCenter={annotationZoomCenter}
              setAnnotationZoomLevel={setAnnotationZoomLevel}
              setAnnotationZoomCenter={setAnnotationZoomCenter}
              promptingCanvasRef={promptingCanvasRef}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MainViewers;