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
    selectedManualContourIds,
    setHighlightLabelWarning,
    showOverlay = true, // Control whether to show the overlay (now false by default for new layout)
    isMaskFinished = false,
}) => {
    const [activeTool, setActiveTool] = useState("point");
    const [manualContourCount, setManualContourCount] = useState(0);

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

    // Poll for manual contour count changes to update footer
    useEffect(() => {
        const interval = setInterval(() => {
            if (promptingCanvasRef.current && promptingCanvasRef.current.getManualContours) {
                const manualContours = promptingCanvasRef.current.getManualContours();
                const currentCount = manualContours.length;
                setManualContourCount(prev => prev !== currentCount ? currentCount : prev);
            }
        }, 100); // Check every 100ms

        return () => clearInterval(interval);
    }, [promptingCanvasRef]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm h-[65px] flex items-center">
                <div className="flex items-center gap-3 w-full">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <PenTool className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-800">Annotation Drawing Area</h3>
                        <div className="flex items-center gap-4 mt-0.5">
                            <p className="text-xs text-slate-500 whitespace-nowrap hidden 2xl:block">Draw prompts to segment the image</p>
                            
                            {/* Instructions inline */}
                            {promptType === "point" && (
                                <div className="flex items-center gap-3 text-xs text-slate-600 flex-shrink-0 2xl:flex">
                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                        <span>Left Click (+ Annotation)</span>
                                    </div>
                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                                        <span>Right Click (− Annotation)</span>
                                    </div>
                                </div>
                            )}
                            {promptType === "polygon" && (
                                <div className="text-xs text-slate-600 hidden 2xl:block">
                                    Click to add • Double-click to finish
                                </div>
                            )}
                            {promptType === "box" && (
                                <div className="text-xs text-slate-600 hidden 2xl:block">
                                    Click and drag
                                </div>
                            )}
                            {promptType === "manual-contour" && (
                                <div className="text-xs text-slate-600 hidden 2xl:block">
                                    Click to draw • Double-click to finish
                                </div>
                            )}
                            {activeTool === "drag" && (
                                <div className="text-xs text-slate-600">
                                    Drag to pan • Ctrl+Wheel to zoom
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
                    selectedManualContourIds={selectedManualContourIds}
                    isSegmenting={isSegmenting}
                    setError={setError}
                    setHighlightLabelWarning={setHighlightLabelWarning}
                    isMaskFinished={isMaskFinished}
                />
            </div>

            {/* Footer for manual contour tools */}
            {promptType === "manual-contour" && (
                <div className="px-4 py-3 border-t border-slate-200 bg-white/50 backdrop-blur-sm h-[60px] flex items-center">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        {manualContourCount > 0 ? (
                            <>
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span>
                                    {manualContourCount} manual contour{manualContourCount !== 1 ? 's' : ''} ready • 
                                    Manage in left panel
                                </span>
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span>Click to draw manual contours directly on the image</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnotationViewer;
