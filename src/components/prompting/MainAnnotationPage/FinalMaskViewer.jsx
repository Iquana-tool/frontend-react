import React, { useState, useRef, useEffect } from "react";
import { Trash2, Layers } from "lucide-react";
import FinishButton from "./FinishButton"; // Adjust the import path as necessary
import NextButton from "./NextButton";

const FinalMaskViewer = ({
  segmentationMasks,
  selectedMask,
  selectedContours,
  isSegmenting,
  loading,
  finalMasks,
  finalMask,
  selectedFinalMaskContour,
  zoomLevel,
  zoomCenter,
  canvasImage,
  finalMaskCanvasRef,
  handleAddSelectedContoursToFinalMask,
  handleDeleteSelectedContours,
  setSelectedContours,
  handleRunNewSegmentation,
  handleFinalMaskCanvasClick,
  handleDeleteFinalMaskContour,
  clearAllFinalMaskContours,
  setSelectedFinalMaskContour,
  setZoomLevel,
  setZoomCenter,
  handleFinalMaskContourSelect,
  drawFinalMaskCanvas,
  annotationZoomLevel,
  annotationZoomCenter,
  setAnnotationZoomLevel,
  setAnnotationZoomCenter,
  promptingCanvasRef,
}) => {
  // Add panning state (simplified - only for user-initiated panning)
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Reset pan when zoom level reaches 1
  useEffect(() => {
    if (zoomLevel === 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [zoomLevel]);

  // Trigger canvas redraw when masks or image change (not on zoom changes)
  useEffect(() => {
    if (drawFinalMaskCanvas && canvasImage && finalMasks) {
      setTimeout(() => {
        drawFinalMaskCanvas();
      }, 20);
    }
  }, [drawFinalMaskCanvas, canvasImage, finalMasks]);



  // Handle mouse events for panning
  const handleMouseDown = (e) => {
    // Check for panning conditions: Alt key, middle mouse, or right click
    if (e.altKey || e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    // For normal clicks, transform coordinates and pass to canvas handler
    if (e.button === 0) { // Left click
      const transformedEvent = createTransformedEvent(e);
      handleFinalMaskCanvasClick(transformedEvent);
    }
  };

  // Create a transformed event with adjusted coordinates (simplified for pan-only)
  const createTransformedEvent = (originalEvent) => {
    if (!containerRef.current || !finalMaskCanvasRef.current) {
      return originalEvent;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const canvasRect = finalMaskCanvasRef.current.getBoundingClientRect();

    // Get the click position relative to the container
    const containerX = originalEvent.clientX - containerRect.left;
    const containerY = originalEvent.clientY - containerRect.top;
    
    // Adjust for pan offset only (zoom is handled by canvas utilities)
    const transformedX = containerX - panOffset.x;
    const transformedY = containerY - panOffset.y;
    
    // Create a new event-like object with transformed coordinates
    return {
      ...originalEvent,
      clientX: transformedX + canvasRect.left,
      clientY: transformedY + canvasRect.top,
      target: finalMaskCanvasRef.current,
      currentTarget: finalMaskCanvasRef.current
    };
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      e.preventDefault();
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;

      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e) => {
    setIsPanning(false);
  };

  const handleMouseLeave = (e) => {
    setIsPanning(false);
  };

  // Handle wheel for panning (zoom is handled by canvas utilities)
  const handleWheel = (e) => {
    // Allow normal scroll behavior
    // Zoom is handled internally by the canvas drawing utilities
  };

  // Reset zoom and pan
  const handleResetZoom = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFinalMaskContour(null);
    setZoomLevel(1);
    if (setZoomCenter) {
      setZoomCenter({ x: 0.5, y: 0.5 });
    }
    setPanOffset({ x: 0, y: 0 });
    
    // Sync with annotation drawing area
    if (setAnnotationZoomLevel) {
      setAnnotationZoomLevel(1);
    }
    if (setAnnotationZoomCenter) {
      setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
    }
    
    // Reset prompting canvas view if available
    if (promptingCanvasRef && promptingCanvasRef.current && promptingCanvasRef.current.resetView) {
      promptingCanvasRef.current.resetView();
    }
  };

  return (
    <div className="viewer-panel flex-1 w-full xl:min-w-[400px] 2xl:min-w-[450px]">
      <div className="viewer-header flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600" />
          <span>Final Mask</span>
        </div>

        {finalMasks.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all masks?")) {
                clearAllFinalMaskContours();
              }
            }}
            className="text-xs px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Adjusted height to account for missing Clear/Complete buttons */}
      <div
        ref={containerRef}
        className="h-[340px] sm:h-[420px] relative overflow-hidden py-5"
        style={{
          cursor: isPanning ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right click
      >
        {/* Canvas container with panning only (zoom handled by canvas utilities) */}
        <div style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          width: '100%',
          height: '100%',
          position: 'relative'
        }}>
          <canvas
            ref={finalMaskCanvasRef}
            className="w-full h-full object-contain"
            style={{ cursor: isPanning ? 'grabbing' : 'pointer' }}
          />
        </div>

        {/* Zoom Controls - only visible when a contour is selected */}
        {selectedFinalMaskContour && (
          <div className="absolute bottom-2 right-2 flex items-center space-x-1 bg-white/95 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-200">
            {/* Zoom level indicator */}
            <span className="text-xs text-gray-600 px-1 font-mono">
              {zoomLevel % 1 === 0 ? `${zoomLevel}x` : `${zoomLevel.toFixed(1)}x`}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Zoom in with 1x increments
                const newZoomLevel = Math.min(zoomLevel + 1, 6);
                setZoomLevel(newZoomLevel);
                
                // Sync with annotation drawing area
                if (setAnnotationZoomLevel) {
                  setAnnotationZoomLevel(newZoomLevel);
                }
                
                // Apply zoom to prompting canvas if available
                if (promptingCanvasRef && promptingCanvasRef.current && promptingCanvasRef.current.setZoomParameters) {
                  promptingCanvasRef.current.setZoomParameters(newZoomLevel, zoomCenter);
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className={`p-1.5 rounded transition-colors ${
                zoomLevel >= 6 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'hover:bg-gray-100 cursor-pointer'
              }`}
              title="Zoom In"
              disabled={zoomLevel >= 6}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Zoom out with 1x increments - no reset logic
                const newZoomLevel = Math.max(zoomLevel - 1, 1);
                setZoomLevel(newZoomLevel);
                
                // Sync with annotation drawing area
                if (setAnnotationZoomLevel) {
                  setAnnotationZoomLevel(newZoomLevel);
                }
                
                // Apply zoom to prompting canvas if available
                if (promptingCanvasRef && promptingCanvasRef.current && promptingCanvasRef.current.setZoomParameters) {
                  promptingCanvasRef.current.setZoomParameters(newZoomLevel, zoomCenter);
                }
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className={`p-1.5 rounded transition-colors ${
                zoomLevel <= 1 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'hover:bg-gray-100 cursor-pointer'
              }`}
              title="Zoom Out"
              disabled={zoomLevel <= 1}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            </button>
            {zoomLevel > 1 && (
              <button
                onClick={handleResetZoom}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                title="Reset Zoom"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom spacing to match the button area height */}
      <div>
        <div className="viewer-controls flex justify-end items-center mt-2 gap-4 px-4 py-3 pr-8">
          <FinishButton
            maskId={finalMask?.id}
          />
          {/* <NextButton dataset_id={"1"} /> */}
        </div>
      </div>
    </div>
  );
};

export default FinalMaskViewer;
