import React, { useState, useEffect } from 'react';
import {
  MousePointer,
  Square,
  Circle,
  Pentagon,
  Move, 
  Download, 
  Pointer, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw 
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
  setZoomCenter
}) => {
  const [isInstantSegmentationEnabled, setIsInstantSegmentationEnabled] = useState(false);

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
  const handleToolChange = (tool) => {
    setPromptType(tool);
    if (promptingCanvasRef.current) {
      promptingCanvasRef.current.setActiveTool(tool === 'point' ? 'point' : tool);
    }
  };

  const handleZoom = (direction) => {
    if (setZoomLevel) {
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
    if (setZoomLevel) {
      setZoomLevel(1);
    }
    if (setZoomCenter) {
      setZoomCenter(null);
    }
    if (promptingCanvasRef.current && promptingCanvasRef.current.resetView) {
      promptingCanvasRef.current.resetView();
    }
  };

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
        {/* Tool Selection */}
        <div className="flex space-x-1 bg-white border border-gray-200 rounded-md overflow-hidden p-0.5">
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
            title="Box Tool"
          >
            <Square className="w-4 h-4" />
          </button>
          
          {/* Circle tool */}
          <button
            className={`p-2 transition-colors ${
              promptType === "circle"
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => handleToolChange("circle")}
            title="Circle Tool"
          >
            <Circle className="w-4 h-4" />
          </button>
          
          {/* Polygon tool */}
          <button
            className={`p-2 transition-colors ${
              promptType === "polygon"
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => handleToolChange("polygon")}
            title="Polygon Tool"
          >
            <Pentagon className="w-4 h-4" />
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

        {/* Instant Segmentation Toggle */}
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

        {/* Export Button */}
        {/* <button
          className="p-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
          onClick={() => {}}
          title="Export quantifications as CSV"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button> */}
      </div>
      
      {/* Label Selection Warning */}
      {!currentLabel && (
        <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-orange-700 font-medium">
              Please select a label before drawing prompts or enabling segmentation
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsPanel; 