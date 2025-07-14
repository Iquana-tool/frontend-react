import PromptingCanvas from "../PromptingCanvas";
import React, { useState, useEffect } from "react";
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
    const [activeTool, setActiveTool] = useState("point");

    // Update activeTool when promptType changes or when canvas ref becomes available
    useEffect(() => {
        if (promptingCanvasRef.current && promptingCanvasRef.current.getActiveTool) {
            const currentActiveTool = promptingCanvasRef.current.getActiveTool();
            setActiveTool(currentActiveTool);
        } else {
            // Fallback to promptType if canvas ref is not available
            setActiveTool(promptType);
        }
    }, [promptType, promptingCanvasRef]);

    // Poll for activeTool changes since it's managed internally by the canvas
    useEffect(() => {
        const interval = setInterval(() => {
            if (promptingCanvasRef.current && promptingCanvasRef.current.getActiveTool) {
                const currentActiveTool = promptingCanvasRef.current.getActiveTool();
                setActiveTool(prev => prev !== currentActiveTool ? currentActiveTool : prev);
            }
        }, 100); // Check every 100ms

        return () => clearInterval(interval);
    }, [promptingCanvasRef]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <PenTool className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">Annotation Drawing Area</h3>
                        <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs text-slate-500">Draw prompts to segment the image</p>
                            
                            {/* Instructions inline */}
                            {promptType === "point" && (
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">+</span>
                                        </div>
                                        <span>Left-click for positive points</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">−</span>
                                        </div>
                                        <span>Right-click for negative points</span>
                                    </div>
                                </div>
                            )}

                            {promptType === "polygon" && (
                                <div className="text-xs text-slate-600">
                                    Left-click to add points • Double-click to finish
                                </div>
                            )}

                            {promptType === "box" && (
                                <div className="text-xs text-slate-600">
                                    Click and drag to draw box
                                </div>
                            )}

                            {promptType === "manual-contour" && (
                                <div className="text-xs text-slate-600">
                                    Click to draw contours • Double-click to finish
                                </div>
                            )}

                            {activeTool === "drag" && (
                                <div className="text-xs text-slate-600">
                                    Click and drag to pan • Ctrl/Cmd + Mouse Wheel to zoom
                                </div>
                            )}
                        </div>
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
