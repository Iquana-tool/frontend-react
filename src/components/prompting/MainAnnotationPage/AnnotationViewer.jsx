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
        <div className="viewer-panel flex-1 w-full">
            <div className="viewer-header flex items-center">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2 text-blue-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                    />
                </svg>
                <span>Annotation Drawing Area</span>
            </div>
            <div className="h-[400px] sm:h-[500px] lg:h-[600px] relative">
                {/* Use the PromptingCanvas for adding annotations */}
                <PromptingCanvas
                    ref={promptingCanvasRef}
                    image={imageObject}
                    onPromptingComplete={handlePromptingComplete}
                    selectedMask={selectedMask}
                    promptType={promptType}
                    activeTool={promptType}
                    currentLabel={currentLabel}
                    onContourSelect={handleContourSelect}
                    onAddToFinalMask={handleAddSelectedContoursToFinalMask}
                    onClearSegmentationResults={handleClearSegmentationResults}
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
    );
};

export default AnnotationViewer;
