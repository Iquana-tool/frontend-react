import React from "react";
import FinalMaskViewer from "./FinalMaskViewer";
import AnnotationViewer from "./AnnotationViewer";

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
                       setZoomCenter
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

  const showFinalMaskViewer =
      (finalMasks.length > 0 &&
          finalMasks.some((mask) => mask.contours?.length > 0)) ||
      selectedContours.length > 0;

  return (
      <div className="flex flex-col xl:flex-row gap-3 mb-4">
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

        {showFinalMaskViewer && (
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

export default MainViewers;