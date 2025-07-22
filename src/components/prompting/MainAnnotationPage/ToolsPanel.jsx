import React, { useState, useEffect } from 'react';
import {
  MousePointer,
  Square,
  Pentagon,
  Move, 
  Pointer, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  PenTool,
  X
} from 'lucide-react';
import LabelSelector from '../LabelSelector';

const ToolsPanel = ({
  promptType,
  setPromptType,
  promptingCanvasRef,
  currentLabel,
  setCurrentLabel,
  segmentationMasks,
  zoomLevel,
  setZoomLevel,
  setZoomCenter,
  handleAnnotationZoomIn,
  handleAnnotationZoomOut,
  handleAnnotationResetView,
  highlightLabelWarning,
  setHighlightLabelWarning
}) => {
  const [isInstantSegmentationEnabled, setIsInstantSegmentationEnabled] = useState(false);
  const [showManualContourInstructions, setShowManualContourInstructions] = useState(true);

  // Poll for instant segmentation state changes
  useEffect(() => {
    const checkInstantSegmentationState = () => {
      if (promptingCanvasRef.current?.isInstantSegmentationEnabled !== undefined) {
        setIsInstantSegmentationEnabled(promptingCanvasRef.current.isInstantSegmentationEnabled);
      }
    };

    // Initial check
    checkInstantSegmentationState();

    // Periodic check for state changes
    const interval = setInterval(checkInstantSegmentationState, 100);

    return () => clearInterval(interval);
  }, [promptingCanvasRef]);

  // Auto-remove highlight after animation
  useEffect(() => {
    if (highlightLabelWarning) {
      const timer = setTimeout(() => {
        if (setHighlightLabelWarning) {
          setHighlightLabelWarning(false);
        }
      }, 2000); // Remove highlight after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [highlightLabelWarning, setHighlightLabelWarning]);
  
  const handleToolChange = (tool) => {
    setPromptType(tool);
    // Reset manual contour instructions visibility when switching to manual-contour tool
    if (tool === "manual-contour") {
      setShowManualContourInstructions(true);
    }
    if (promptingCanvasRef.current) {
      promptingCanvasRef.current.setActiveTool(tool === 'point' ? 'point' : tool);
    }
  };

  const handleZoom = (direction) => {
    // Use the new annotation zoom handlers if available, otherwise fallback to old behavior
    if (direction === 'in' && handleAnnotationZoomIn) {
      handleAnnotationZoomIn();
    } else if (direction === 'out' && handleAnnotationZoomOut) {
      handleAnnotationZoomOut();
    } else if (setZoomLevel) {
      // Fallback to old shared zoom behavior
      setZoomLevel((prev) => {
        const newLevel = direction === 'in' ? Math.min(prev * 1.2, 5) : Math.max(prev / 1.2, 0.5);
        if (!setZoomCenter) return newLevel;
        // Ensure we have a center when zooming from 1 → something
        if (newLevel !== 1 && (!zoomLevel || zoomLevel === 1)) {
          setZoomCenter({ x: 0.5, y: 0.5 });
        }
        return newLevel;
      });
    } else if (promptingCanvasRef.current) {
      // Fallback to internal canvas zoom helpers
      if (direction === 'in' && promptingCanvasRef.current.zoomIn) promptingCanvasRef.current.zoomIn();
      if (direction === 'out' && promptingCanvasRef.current.zoomOut) promptingCanvasRef.current.zoomOut();
    }
  };

  const handleResetView = () => {
    // Use the new annotation reset handler if available, otherwise fallback to old behavior
    if (handleAnnotationResetView) {
      handleAnnotationResetView();
    } else if (setZoomLevel) {
      setZoomLevel(1);
      if (setZoomCenter) {
        setZoomCenter(null);
      }
    }
    if (promptingCanvasRef.current && promptingCanvasRef.current.resetView) {
      promptingCanvasRef.current.resetView();
    }
  };

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
        {/* Selection and Dragging Tools */}
        <div className="flex space-x-1 bg-white border border-gray-200 rounded-md overflow-hidden p-0.5" title="Selection & Dragging">
          {/* Select tool */}
          <button
            className={`p-2 transition-colors ${
              promptType === "select"
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => handleToolChange("select")}
            title="Select Tool (Contour selection mode)"
          >
            <Pointer className="w-4 h-4" />
          </button>
          
          {/* Drag tool */}
          <button
            className={`p-2 transition-colors ${
              promptType === "drag"
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => handleToolChange("drag")}
            title="Drag Tool (Pan image)"
          >
            <Move className="w-4 h-4" />
          </button>
        </div>

        {/* AI Tools */}
        <div className="flex space-x-1 bg-white border border-gray-200 rounded-md overflow-hidden p-0.5" title="AI Tools">
          {/* Point tool */}
          <button
            className={`p-2 transition-colors ${
              promptType === "point"
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => handleToolChange("point")}
            title="Point Tool"
          >
            <MousePointer className="w-4 h-4" />
          </button>
          
          {/* Box tool */}
          <button
            className={`p-2 transition-colors ${
              promptType === "box"
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => handleToolChange("box")}
            title="Box Tool - Multiple boxes will be processed one by one"
          >
            <Square className="w-4 h-4" />
          </button>
          

          
          {/* Polygon tool */}
          <button
            className={`p-2 transition-colors ${
              promptType === "polygon"
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => handleToolChange("polygon")}
            title="Polygon Tool - Multiple polygons will be processed one by one"
          >
            <Pentagon className="w-4 h-4" />
          </button>
        </div>

        {/* Manual Tools */}
        <div className="flex space-x-1 bg-white border border-gray-200 rounded-md overflow-hidden p-0.5" title="Manual Tools">
          {/* Manual Contour Tool */}
          <button
            className={`p-2 transition-colors ${
              promptType === "manual-contour"
                ? "bg-purple-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => handleToolChange("manual-contour")}
            title="Manual Contour Tool (Draw contours directly)"
          >
            <PenTool className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex space-x-1 bg-white border border-gray-200 rounded-md overflow-hidden p-0.5">
          <button
            className="p-2 transition-colors hover:bg-gray-100"
            onClick={() => handleZoom('in')}
            title="Zoom In (Ctrl + Scroll Up)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            className="p-2 transition-colors hover:bg-gray-100"
            onClick={() => handleZoom('out')}
            title="Zoom Out (Ctrl + Scroll Down)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            className="p-2 transition-colors hover:bg-gray-100"
            onClick={handleResetView}
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Help text about Alt/Option key */}
        <div className="text-sm text-gray-600 flex items-center">
          <span className="hidden sm:inline">Pan with:</span>
          <kbd className="px-1.5 py-0.5 mx-1 bg-gray-100 rounded text-xs border border-gray-300">
            Alt/Option
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 ml-1 bg-gray-100 rounded text-xs border border-gray-300">
            Drag
          </kbd>
        </div>

        {/* Label Selection */}
        <div className="flex-grow max-w-xs">
          <LabelSelector
            currentLabel={currentLabel}
            setCurrentLabel={setCurrentLabel}
          />
        </div>

        {/* Instant Segmentation Toggle - Hide for manual contour tool */}
        {promptType !== "manual-contour" && (
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md">
            <span className="text-sm font-medium text-gray-700">Instant Segmentation</span>
            <button
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                !currentLabel 
                  ? 'bg-gray-200 cursor-not-allowed opacity-50'
                  : isInstantSegmentationEnabled
                  ? 'bg-blue-600' 
                  : 'bg-gray-300'
              }`}
              onClick={() => {
                if (!currentLabel) {
                  return; // Prevent toggle when no label is selected
                }
                if (promptingCanvasRef.current?.toggleInstantSegmentation) {
                  promptingCanvasRef.current.toggleInstantSegmentation();
                }
              }}
              disabled={!currentLabel}
              title={!currentLabel ? "Please select a label before enabling instant segmentation" : "Toggle automatic segmentation on prompt placement"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isInstantSegmentationEnabled && currentLabel
                    ? 'translate-x-4' 
                    : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        )}
      </div>
      
      {/* Label Selection Warning */}
      {!currentLabel && (
        <div className={`mt-2 p-3 rounded-lg transition-all duration-300 ${
          highlightLabelWarning 
            ? 'bg-red-100 border-2 border-red-400 shadow-lg animate-pulse' 
            : 'bg-orange-50 border border-orange-200'
        }`}>
          <div className="flex items-center">
            <svg className={`w-4 h-4 mr-2 ${
              highlightLabelWarning ? 'text-red-500' : 'text-orange-500'
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className={`text-sm font-medium ${
              highlightLabelWarning ? 'text-red-700' : 'text-orange-700'
            }`}>
              Please select a label before drawing prompts or enabling segmentation
            </span>
          </div>
        </div>
      )}

      {/* Manual Contour Tool Instructions */}
      {promptType === "manual-contour" && showManualContourInstructions && (
        <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <PenTool className="w-4 h-4 text-purple-500 mr-2" />
              <span className="text-sm text-purple-700 font-medium">Manual Contour Drawing</span>
            </div>
            <button
              onClick={() => setShowManualContourInstructions(false)}
              className="p-1 hover:bg-purple-100 rounded transition-colors"
              title="Close instructions"
            >
              <X className="w-4 h-4 text-purple-500" />
            </button>
          </div>
          <div className="text-sm text-purple-600 space-y-1">
            <div>• Click to add points for polygon mode</div>
            <div>• Double-click to finish the contour</div>
            <div>• No AI segmentation needed</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsPanel; 