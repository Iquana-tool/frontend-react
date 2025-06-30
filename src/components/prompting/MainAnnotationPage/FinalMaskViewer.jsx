import React, { useState, useRef } from "react";
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
  handleFinalMaskContourSelect,
  drawFinalMaskCanvas,
}) => {
  // Add panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

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

  // Create a transformed event with adjusted coordinates
  const createTransformedEvent = (originalEvent) => {
    if (!containerRef.current || !finalMaskCanvasRef.current) {
      return originalEvent;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const canvasRect = finalMaskCanvasRef.current.getBoundingClientRect();

    // Get the click position relative to the container
    const containerX = originalEvent.clientX - containerRect.left;
    const containerY = originalEvent.clientY - containerRect.top;

    // Reverse the transform: subtract pan offset and divide by zoom
    const transformedX = (containerX - panOffset.x) / zoomLevel;
    const transformedY = (containerY - panOffset.y) / zoomLevel;

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

  // Handle wheel for zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      // Calculate zoom direction and factor
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoomLevel = Math.max(0.5, Math.min(5, zoomLevel * zoomFactor));

      if (newZoomLevel !== zoomLevel) {
        // Get mouse position relative to container
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate how much to adjust pan offset to keep mouse point fixed
        const scaleFactor = newZoomLevel / zoomLevel;
        const containerCenterX = rect.width / 2;
        const containerCenterY = rect.height / 2;

        // Calculate offset from center to mouse
        const offsetX = mouseX - containerCenterX;
        const offsetY = mouseY - containerCenterY;

        // Adjust pan offset to keep point under mouse fixed
        const newPanOffset = {
          x: panOffset.x + offsetX * (1 - scaleFactor),
          y: panOffset.y + offsetY * (1 - scaleFactor)
        };

        setZoomLevel(newZoomLevel);
        setPanOffset(newPanOffset);
      }
    }
  };

  // Reset pan when zoom is reset
  const handleResetZoom = (e) => {
    e.stopPropagation();
    setSelectedFinalMaskContour(null);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
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
        className="h-[340px] sm:h-[420px] relative overflow-hidden"
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
        {/* Panning instruction overlay */}
        <div className="absolute top-2 left-2 bg-white bg-opacity-75 p-2 rounded shadow z-10 text-xs">
          <div>Pan: Alt + Drag, Middle Mouse, or Right Click</div>
          <div>Zoom: Ctrl/Cmd + Mouse Wheel</div>
          <div>Click contours to select</div>
        </div>
          <>
            {/* Canvas container with transform-based panning */}
            <div style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
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

            {/* Zoom Controls - match the segmentation controls styling */}
            {zoomLevel > 1 && (
              <div className="absolute bottom-2 right-2 flex space-x-1 bg-white/95 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomLevel((prev) => Math.min(prev + 1, 5));
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title="Zoom In"
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
                    e.stopPropagation();
                    if (zoomLevel > 1) {
                      setZoomLevel((prev) => prev - 1);
                      if (zoomLevel === 2) {
                        setSelectedFinalMaskContour(null);
                        setZoomLevel(1);
                        setPanOffset({ x: 0, y: 0 });
                      }
                    }
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title="Zoom Out"
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
                <button
                  onClick={handleResetZoom}
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
              </div>
          </>
      </div>
        <div className="viewer-controls flex justify-end mt-2">
          <FinishButton
              maskId={finalMask?.id}
          />
          <NextButton dataset_id={1} />
        </div>
    </div>
  );
};

export default FinalMaskViewer;
