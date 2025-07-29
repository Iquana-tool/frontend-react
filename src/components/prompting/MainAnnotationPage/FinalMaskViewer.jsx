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
  onMaskStatusChange,
  isMaskFinished,
  setIsMaskFinished,
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

    // For normal clicks, - let the canvas handle it directly
    // The canvas click handler will receive the raw event and handle coordinate transformation
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
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleMouseLeave = (e) => {
    if (isPanning) {
      setIsPanning(false);
    }
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm h-[65px] flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Layers className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Final Mask</h3>
              <p className="text-xs text-slate-500">
                {finalMasks.length > 0 && finalMasks[0].contours ? 
                  `${finalMasks[0].contours.length} contour${finalMasks[0].contours.length !== 1 ? 's' : ''}` :
                  'No contours yet'
                }
              </p>
            </div>
          </div>

          {finalMasks.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to clear all masks?")) {
                  clearAllFinalMaskContours();
                }
              }}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
              title="Clear all masks"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-slate-50 p-4"
        style={{
          cursor: isPanning ? 'grabbing' : 'default'
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
            style={{ 
              cursor: isPanning ? 'grabbing' : 'pointer',
              pointerEvents: 'auto'
            }}
            onClick={(e) => {
              // Only handle click if not panning
              if (!isPanning) {
                const canvas = finalMaskCanvasRef.current;
                if (!canvas) return;
                
                // Calculate click coordinates in canvas space with object-fit: contain correction
                const rect = canvas.getBoundingClientRect();
                
                // Get the actual image dimensions if we have canvas image
                const actualImageAspect = canvasImage ? canvasImage.width / canvasImage.height : canvas.width / canvas.height;
                const displayAspect = rect.width / rect.height;
                
                let imageDisplayWidth, imageDisplayHeight, offsetX = 0, offsetY = 0;
                
                if (actualImageAspect > displayAspect) {
                  // Image is wider - fit to width, center vertically
                  imageDisplayWidth = rect.width;
                  imageDisplayHeight = rect.width / actualImageAspect;
                  offsetY = (rect.height - imageDisplayHeight) / 2;
                } else {
                  // Image is taller - fit to height, center horizontally  
                  imageDisplayHeight = rect.height;
                  imageDisplayWidth = rect.height * actualImageAspect;
                  offsetX = (rect.width - imageDisplayWidth) / 2;
                }
                
                // Adjust click coordinates for the centered/scaled image
                const relativeX = (e.clientX - rect.left - offsetX) / imageDisplayWidth;
                const relativeY = (e.clientY - rect.top - offsetY) / imageDisplayHeight;
                
                let x = relativeX * canvas.width;
                let y = relativeY * canvas.height;
                
                // Account for zoom transformation (exactly like useCanvasOperations.js)
                if (zoomLevel > 1 && zoomCenter) {
                  const centerX = zoomCenter.x * canvas.width;
                  const centerY = zoomCenter.y * canvas.height;
                  x = (x - centerX) / zoomLevel + centerX;
                  y = (y - centerY) / zoomLevel + centerY;
                }
                
                // Look for clicked contour
                let foundMask = null;
                let foundContourIndex = -1;
                
                for (const mask of finalMasks) {
                  if (!mask.contours || !Array.isArray(mask.contours)) continue;
                  
                  for (let i = 0; i < mask.contours.length; i++) {
                    const contour = mask.contours[i];
                    if (!contour?.x?.length || contour.x.length < 3) continue;
                    
                    // Use the same point-in-contour logic as useContourOperations.js
                    const canvasWidth = canvas.width;
                    const canvasHeight = canvas.height;

                    const points = [];
                    for (let j = 0; j < contour.x.length; j++) {
                      points.push([contour.x[j] * canvasWidth, contour.y[j] * canvasHeight]);
                    }

                    let inside = false;
                    for (let j = 0, k = points.length - 1; j < points.length; k = j++) {
                      const xi = points[j][0], yi = points[j][1];
                      const xj = points[k][0], yj = points[k][1];

                      const intersect =
                        (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

                      if (intersect) inside = !inside;
                    }

                    // Check proximity to edges if not inside (within 5 pixels)
                    if (!inside) {
                      for (let j = 0; j < points.length; j++) {
                        const [px, py] = points[j];
                        const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
                        if (distance <= 5) {
                          inside = true;
                          break;
                        }
                      }
                    }

                    if (inside) {
                      foundMask = mask;
                      foundContourIndex = i;
                      break;
                    }
                  }
                  
                  if (foundMask) break;
                }
                
                if (foundMask && foundContourIndex !== -1) {
                  // If a contour was clicked, handle selection through the provided handler
                  if (handleFinalMaskContourSelect) {
                    handleFinalMaskContourSelect(foundMask, foundContourIndex);
                  }
                } else if (zoomLevel > 1) {
                  // If no contour was clicked but we're zoomed in, reset zoom to default
                  setSelectedFinalMaskContour(null);
                  setZoomLevel(1);
                  if (setZoomCenter) {
                    setZoomCenter({ x: 0.5, y: 0.5 });
                  }
                  
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
                }
              }
            }}
            onMouseDown={(e) => {
              // Prevent the container's mouse down from interfering with direct canvas clicks
              if (e.button === 0) { // Left click
                e.stopPropagation();
              }
            }}
          />
        </div>

        {/* Zoom Controls - only visible when a contour is selected */}
        {selectedFinalMaskContour && (
          <div className="absolute bottom-4 right-4 flex items-center space-x-1 bg-white/95 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-200">
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
                  
                  // Add a small delay to ensure state synchronization before any coordinate transformations
                  setTimeout(() => {
                    // Force a redraw to ensure everything is properly updated
                    if (promptingCanvasRef.current && promptingCanvasRef.current.forceRedraw) {
                      promptingCanvasRef.current.forceRedraw();
                    }
                  }, 50);
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
                // Zoom out with 1x increments
                const newZoomLevel = Math.max(zoomLevel - 1, 1);
                setZoomLevel(newZoomLevel);
                
                // Sync with annotation drawing area
                if (setAnnotationZoomLevel) {
                  setAnnotationZoomLevel(newZoomLevel);
                }
                
                // Apply zoom to prompting canvas if available
                if (promptingCanvasRef && promptingCanvasRef.current && promptingCanvasRef.current.setZoomParameters) {
                  promptingCanvasRef.current.setZoomParameters(newZoomLevel, zoomCenter);
                  
                  // Add a small delay to ensure state synchronization before any coordinate transformations
                  setTimeout(() => {
                    // Force a redraw to ensure everything is properly updated
                    if (promptingCanvasRef.current && promptingCanvasRef.current.forceRedraw) {
                      promptingCanvasRef.current.forceRedraw();
                    }
                  }, 50);
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

      {/* Footer with action buttons */}
      {finalMasks.length > 0 ? (
        <div className="px-4 py-3 border-t border-slate-200 bg-white/50 backdrop-blur-sm h-[60px] flex items-center justify-end">
          <div className="flex items-center gap-3">
            <FinishButton maskId={finalMask?.id} onStatusChange={onMaskStatusChange} isMaskFinished={isMaskFinished} setIsMaskFinished={setIsMaskFinished} />
            <NextButton />
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-slate-200 bg-white/50 backdrop-blur-sm h-[60px] flex items-center">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            <span>Final mask will appear here</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalMaskViewer;
