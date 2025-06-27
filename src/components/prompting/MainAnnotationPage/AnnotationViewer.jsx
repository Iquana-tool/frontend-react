import PromptingCanvas from "../PromptingCanvas";
import AddContourModal from "./AddContourModal";
import React from "react";


const AnnotationViewer = ({
    promptingCanvasRef,
    imageObject,
    handlePromptingComplete,
    selectedMask,
    promptType,
    currentLabel,
    handleContourSelect,
    handleAddSelectedContoursToFinalMask,
    handleClearSegmentationResults,
    zoomLevel,
    zoomCenter,
    selectedFinalMaskContour,
    finalMasks,
    onInstantSegmentationStateChange,
    selectedContours,
    isSegmenting,
    segmentationMasks,
    loading,
    setError,
    handleDeleteSelectedContours,
    setSelectedContours,
    }) => {
    return (
        <div className="viewer-panel flex-1 w-full xl:min-w-[400px] 2xl:min-w-[450px]">
            <div className="viewer-header">
              Annotation Drawing Area
            </div>
            <div className="h-[400px] sm:h-[500px] relative">
              {/* Use the PromptingCanvas for adding annotations */}
              <PromptingCanvas
                  ref={promptingCanvasRef}
                  image={imageObject}
                  onPromptingComplete={
                      handlePromptingComplete
                  }
                  selectedMask={selectedMask}
                  promptType={promptType}
                  activeTool={promptType}
                  currentLabel={currentLabel}
                  onContourSelect={handleContourSelect}
                  onAddToFinalMask={
                      handleAddSelectedContoursToFinalMask
                  }
                  onClearSegmentationResults={handleClearSegmentationResults}
                  zoomLevel={zoomLevel}
                  zoomCenter={zoomCenter}
                  onInstantSegmentationStateChange={onInstantSegmentationStateChange}
                  selectedFinalMaskContour={selectedFinalMaskContour}
                  finalMasks={finalMasks}
                  isSegmenting={isSegmenting}
              />

              {/* Overlay segmentation controls when segmentation is complete and we have masks */}
              {segmentationMasks.length > 0 && selectedMask && (
                    <AddContourModal
                        selectedContours={selectedContours}
                        isSegmenting={isSegmenting}
                        loading={loading}
                        handleAddSelectedContoursToFinalMask={handleAddSelectedContoursToFinalMask}
                        handleDeleteSelectedContours={handleDeleteSelectedContours}
                        setSelectedContours={setSelectedContours}
                        setError={setError}
                    />
              )}
            </div>
          </div>
    )
}

export default AnnotationViewer;
