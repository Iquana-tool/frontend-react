import React, {useEffect} from 'react';
import FinalMaskViewer from './FinalMaskViewer';
import AnnotationViewer from './AnnotationViewer';

const ImageDisplay = ({
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
  onInstantSegmentationStateChange
}) => {
  useEffect(() => {
    console.log("Selected Final Mask Contour changed:", selectedFinalMaskContour);
  }, [selectedFinalMaskContour]);
  useEffect(() => {
    console.log("Final Masks updated:", finalMasks);
  }, [finalMasks]);
  return (
    <div className="flex flex-col xl:flex-row gap-3 mb-4">
      {/* Annotation Viewer - Only show when imageObject is available */}
      <AnnotationViewer
        imageObject={imageObject}
        loading={loading}
        isSegmenting={isSegmenting}
        segmentationMasks={segmentationMasks}
        selectedMask={selectedMask}
        selectedContours={selectedContours}
        selectedFinalMaskContour={selectedFinalMaskContour}
        promptingCanvasRef={promptingCanvasRef}
        handlePromptingComplete={handlePromptingComplete}
        promptType={promptType}
        currentLabel={currentLabel}
        handleContourSelect={handleContourSelect}
        handleAddSelectedContoursToFinalMask={handleAddSelectedContoursToFinalMask}
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
      />
      {/* Final Mask Viewer - Only show when there are final masks with contours or selected contours */}
      {((finalMasks.length > 0 && finalMasks.some(mask => mask.contours && mask.contours.length > 0)) || selectedContours.length > 0) && (
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
          handleFinalMaskContourSelect={handleFinalMaskContourSelect}
          drawFinalMaskCanvas={drawFinalMaskCanvas}
        />
      )}
    </div>
  );
};

export default ImageDisplay; 