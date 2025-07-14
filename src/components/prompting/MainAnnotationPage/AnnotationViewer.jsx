import PromptingCanvas from "../PromptingCanvas";
import React from "react";
import { PenTool } from "lucide-react";

const AnnotationViewer = ({
    promptingCanvasRef,
    imageObject,
    handlePromptingComplete,
    promptType,
    currentLabel,
    handleContourSelect,
    handleAddSelectedContoursToFinalMask,
    handleAddManualContoursToFinalMask,
    zoomLevel,
    zoomCenter,
    selectedFinalMaskContour,
    finalMasks,
    onInstantSegmentationStateChange,
    isSegmenting,
    segmentationMasks,
    loading,
    setError,
    handleDeleteSelectedContours,
    setSelectedContours,
    selectedContourIds,
    setHighlightLabelWarning,
    showOverlay = true, // Control whether to show the overlay (now false by default for new layout)
}) => {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <PenTool className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Annotation Drawing Area</h3>
                        <p className="text-xs text-slate-500">Draw prompts to segment the image</p>
                    </div>
                </div>
            </div>

            {/* Canvas Container */}
            <div className="flex-1 relative bg-slate-50 overflow-hidden">
                <PromptingCanvas
                    ref={promptingCanvasRef}
                    image={imageObject}
                    onPromptingComplete={handlePromptingComplete}
                    promptType={promptType}
                    activeTool={promptType}
                    currentLabel={currentLabel}
                    onContourSelect={handleContourSelect}
                    onAddToFinalMask={
                        promptType === "manual-contour" 
                        ? handleAddManualContoursToFinalMask 
                        : handleAddSelectedContoursToFinalMask
                    }
                    onInstantSegmentationStateChange={onInstantSegmentationStateChange}
                    selectedFinalMaskContour={selectedFinalMaskContour}
                    finalMasks={finalMasks}
                    segmentationMasks={segmentationMasks}
                    selectedContourIds={selectedContourIds}
                    isSegmenting={isSegmenting}
                    setError={setError}
                    setHighlightLabelWarning={setHighlightLabelWarning}
                />
            </div>
        </div>
    );
};

export default AnnotationViewer;
