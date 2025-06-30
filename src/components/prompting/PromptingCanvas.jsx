import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { Trash2, Play, Loader2 } from "lucide-react";
import { usePanZoom } from './hooks/usePanZoom';
import { usePromptDrawing } from './hooks/usePromptDrawing';
import { useInstantSegmentation } from './hooks/useInstantSegmentation';
import CanvasRenderer from './components/CanvasRenderer';
import SegmentationOverlay from './components/SegmentationOverlay';
import PromptSelectionOverlay from './components/PromptSelectionOverlay';

// This component allows users to add different types of prompts to an image for segmentation tasks.
const PromptingCanvas = forwardRef(({
  image,
  onPromptingComplete,
  selectedMask: selectedMaskProp,
  promptType,
  currentLabel,
  selectedContour,
  onContourSelect,
  onAddToFinalMask,
  onClearSegmentationResults,
  selectedFinalMaskContour,
  finalMasks,
  enableInstantSegmentation = false,
  instantSegmentationDebounce = 1000,
  onInstantSegmentationStateChange,
  isSegmenting = false,
}, ref) => {
  // Container and canvas refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Basic state
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [initialScale, setInitialScale] = useState(1);
  const [selectedMask, setSelectedMask] = useState(null);
  const [activeTool, setActiveTool] = useState("point");
  const [selectedContours, setSelectedContours] = useState([]);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(null);
  const [forceRender, setForceRender] = useState(0);

  // Initialize pan/zoom hook
  const panZoom = usePanZoom(image, canvasSize, initialScale);
  const {
    zoomLevel,
    panOffset,
    zoomCenter,
    isPanning,
    canvasToImageCoords,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleWheel,
    zoomIn,
    zoomOut,
    resetView,
    setZoomParameters,
    isDraggingRef
  } = panZoom;

  // Initialize prompt drawing hook
  const promptDrawing = usePromptDrawing(image, promptType, currentLabel, canvasToImageCoords);
  const {
    isDrawing,
    prompts,
    currentShape,
    currentPolygon,
    cursorPos,
    handlePromptMouseDown,
    handlePromptMouseMove,
    handlePromptMouseUp,
    handlePromptDoubleClick,
    clearPrompts,
    getFormattedPrompts
  } = promptDrawing;

  // Initialize instant segmentation hook
  const instantSegmentation = useInstantSegmentation(
    prompts,
    getFormattedPrompts,
    onPromptingComplete,
    promptType,
    currentLabel,
    enableInstantSegmentation,
    instantSegmentationDebounce
  );
  const {
    isInstantSegmentationEnabled,
    isInstantSegmenting,
    toggleInstantSegmentation,
    setIsInstantSegmentationEnabled,
    shouldSuppressLoadingModal
  } = instantSegmentation;

  // Notify parent of instant segmentation state changes
  useEffect(() => {
    if (onInstantSegmentationStateChange) {
      onInstantSegmentationStateChange({
        isInstantSegmentationEnabled,
        isInstantSegmenting,
        shouldSuppressLoadingModal
      });
    }
  }, [isInstantSegmentationEnabled, isInstantSegmenting, shouldSuppressLoadingModal, onInstantSegmentationStateChange]);

  useEffect(() => {
    if (selectedMaskProp) {
      setSelectedMask(selectedMaskProp);
    }
  }, [selectedMaskProp]);



  // Redraw function for canvas renderer
  const redrawCanvasCallback = useCallback((customPanOffset) => {
    // Force a re-render by incrementing the counter
    setForceRender(prev => prev + 1);
  }, []);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    getPrompts: () => prompts,
    clearPrompts: () => {
      clearPrompts();
    },
    updateSelectedMask: (mask) => {
      if (!selectedMask || mask === null || selectedMask.id !== mask?.id) {
        setSelectedMask(mask);
      }
    },
    setActiveTool: (tool) => {
      setActiveTool(tool);
    },
    getSelectedContours: () => selectedContours,
    clearSelectedContours: () => {
      setSelectedContours([]);
    },
    setZoomParameters: setZoomParameters,
    zoomIn: () => zoomIn(redrawCanvasCallback),
    zoomOut: () => zoomOut(redrawCanvasCallback),
    resetView: () => resetView(redrawCanvasCallback),
    // Instant segmentation controls
    toggleInstantSegmentation,
    setInstantSegmentationEnabled: setIsInstantSegmentationEnabled,
    isInstantSegmentationEnabled,
    isInstantSegmenting,
    shouldSuppressLoadingModal
  }), [prompts, clearPrompts, selectedMask, setSelectedMask, setActiveTool, selectedContours, setSelectedContours, setZoomParameters, zoomIn, zoomOut, resetView, redrawCanvasCallback, toggleInstantSegmentation, setIsInstantSegmentationEnabled, isInstantSegmentationEnabled, isInstantSegmenting, shouldSuppressLoadingModal]);

  // Handle completing prompting
  const handleComplete = () => {
    if (prompts.length === 0) {
      console.warn("No prompts to complete");
      return;
    }

    if (!currentLabel) {
      console.warn("No label selected. Please select a label before segmenting.");
      // You could also show a toast notification here if you have a notification system
      return;
    }

    const formattedPrompts = getFormattedPrompts();
    onPromptingComplete(formattedPrompts);
  };

  // Update canvas based on container size
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current || !image) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Set canvas to container size
    setCanvasSize({
      width: containerWidth,
      height: containerHeight,
    });

    // Calculate scale to fit image in canvas
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 10% margin

    setInitialScale(scale);
  }, [image]);

  // Initialize canvas when image changes
  useEffect(() => {
    if (!image) return;

    clearPrompts();

    // Update after a slight delay to ensure the container has been measured
    setTimeout(() => {
      updateCanvasSize();
    }, 100);
  }, [image, clearPrompts, updateCanvasSize]);

  // Monitor container size changes for responsive behavior
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.unobserve(container);
    };
  }, [updateCanvasSize]);

  // Function to check if a point is inside a contour
  const isPointInContour = useCallback((x, y, contour) => {
    if (!contour || !contour.x || !contour.y || contour.x.length < 3) return false;
    
    let inside = false;
    const n = contour.x.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = contour.x[i] * image.width;
      const yi = contour.y[i] * image.height;
      const xj = contour.x[j] * image.width;
      const yj = contour.y[j] * image.height;
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  }, [image]);

  // Handle mouse down event
  const handleMouseDown = useCallback((e) => {
    if (!canvasRef.current || !image) return;

    // Get canvas-relative coordinates
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Convert to image coordinates
    const imageCoords = canvasToImageCoords(canvasX, canvasY);
    if (!imageCoords) return;

    // Handle contour selection if activeTool is 'select'
    if (
      activeTool === "select" &&
      selectedMask &&
      selectedMask.contours &&
      selectedMask.contours.length > 0
    ) {
      let foundContourIndex = -1;
      for (let i = 0; i < selectedMask.contours.length; i++) {
        const contour = selectedMask.contours[i];
        if (isPointInContour(imageCoords.x, imageCoords.y, contour)) {
          foundContourIndex = i;
          break;
        }
      }
      if (foundContourIndex !== -1) {
        // Toggle selection state of this contour
        const newSelectedContours = [...selectedContours];
        const contourIndex = newSelectedContours.indexOf(foundContourIndex);
        if (contourIndex !== -1) {
          newSelectedContours.splice(contourIndex, 1);
        } else {
          newSelectedContours.push(foundContourIndex);
        }
        setSelectedContours(newSelectedContours);
        if (onContourSelect) onContourSelect(newSelectedContours);
        return;
      }
    }

    // Handle prompt selection if select tool is active
    if (activeTool === "select" && prompts.length > 0) {
      let foundPrompt = -1;
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        if (prompt.type === "point") {
          const dx = imageCoords.x - prompt.coordinates.x;
          const dy = imageCoords.y - prompt.coordinates.y;
          if (Math.sqrt(dx * dx + dy * dy) < 10) {
            foundPrompt = i;
            break;
          }
        } else if (prompt.type === "box") {
          const { startX, startY, endX, endY } = prompt.coordinates;
          if (
            imageCoords.x >= Math.min(startX, endX) &&
            imageCoords.x <= Math.max(startX, endX) &&
            imageCoords.y >= Math.min(startY, endY) &&
            imageCoords.y <= Math.max(startY, endY)
          ) {
            foundPrompt = i;
            break;
          }
        }
      }
      if (foundPrompt !== -1) {
        setSelectedPromptIndex(foundPrompt);
        return;
      } else {
        setSelectedPromptIndex(null);
      }
    }

    // Handle panning
    if (handlePanStart(e, activeTool)) {
      return;
    }

    // Handle prompt drawing
    if (e.button === 0 || e.button === 2) { // Left or right mouse button
      if (!isPanning) {
        const isRightClick = e.button === 2;
        handlePromptMouseDown(canvasX, canvasY, isRightClick);
      }
    }
  }, [
    image, 
    canvasToImageCoords, 
    activeTool, 
    selectedMask, 
    selectedContours, 
    prompts, 
    isPointInContour, 
    onContourSelect, 
    handlePanStart, 
    isPanning, 
    handlePromptMouseDown
  ]);

  // Handle mouse move event
  const handleMouseMove = useCallback((e) => {
    if (!image || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle panning if active
    if (isDraggingRef.current) {
      handlePanMove(e, redrawCanvasCallback);
      return;
    }

    // Handle prompt drawing
    handlePromptMouseMove(x, y);
  }, [image, isDraggingRef, handlePanMove, redrawCanvasCallback, handlePromptMouseMove]);

  // Handle mouse up event
  const handleMouseUp = useCallback((e) => {
    if (!image) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle pan end
    handlePanEnd();

    // Handle prompt drawing
    if (isDrawing) {
      handlePromptMouseUp(x, y);
    }
  }, [image, handlePanEnd, isDrawing, handlePromptMouseUp]);

  // Handle double click for completing polygons
  const handleDoubleClick = useCallback((e) => {
    handlePromptDoubleClick();
  }, [handlePromptDoubleClick]);

  // Handle context menu (right-click) to prevent default browser menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    return false;
  }, []);

  // Update canvas cursor based on active tool and panning state
  useEffect(() => {
    if (containerRef.current) {
      if (isDraggingRef.current) {
        containerRef.current.style.cursor = "grabbing";
      } else if (activeTool === "drag") {
        containerRef.current.style.cursor = "grab";
      } else {
        containerRef.current.style.cursor = "crosshair";
      }
    }
  }, [activeTool, isDraggingRef]);

  // Event listener management
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleCanvasWheel = (e) => {
      handleWheel(e, redrawCanvasCallback);
    };

    // Attach canvas events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });

    // Global mouse events for smooth panning outside canvas
    const handleGlobalMouseMove = (e) => {
      if (isDraggingRef.current) {
        handlePanMove(e, redrawCanvasCallback);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        handlePanEnd();
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('wheel', handleCanvasWheel);

      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleDoubleClick, handleContextMenu, handleWheel, handlePanMove, handlePanEnd, redrawCanvasCallback, isDraggingRef]);

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        style={{ cursor: activeTool === "drag" || isPanning ? (isPanning ? "grabbing" : "grab") : "crosshair" }}
      >
        <CanvasRenderer
          image={image}
          canvasSize={canvasSize}
          initialScale={initialScale}
          zoomLevel={zoomLevel}
          panOffset={panOffset}
          zoomCenter={zoomCenter}
          prompts={prompts}
          selectedPromptIndex={selectedPromptIndex}
          currentShape={currentShape}
          currentPolygon={currentPolygon}
          cursorPos={cursorPos}
          promptType={promptType}
          currentLabel={currentLabel}
          selectedMask={selectedMask}
          selectedContours={selectedContours}
          finalMasks={finalMasks}
          selectedFinalMaskContour={selectedFinalMaskContour}
          forceRender={forceRender}
          onCanvasRef={(canvas) => { canvasRef.current = canvas; }}
        />

        {/* Status messages */}
        {!isDrawing && promptType === "polygon" && currentPolygon && currentPolygon.length > 0 && (
          <div className="absolute bottom-2 left-2 bg-white bg-opacity-75 px-2 py-1 rounded-md text-xs">
            Double-click to finish polygon
          </div>
        )}
        
        {/* Point prompt instructions */}
        {promptType === "point" && (
          <div className="absolute top-2 left-2 bg-white bg-opacity-90 px-3 py-2 rounded-md text-xs shadow-md">
            <div className="font-medium mb-1">Point Prompts:</div>
            <div className="flex items-center gap-1 mb-1">
              <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">+</span>
              </div>
              <span>Left-click for positive points</span>
            </div>
            <div className="flex items-center gap-1 mb-1">
              <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">−</span>
              </div>
              <span>Right-click for negative points</span>
            </div>
          </div>
        )}

        {/* Polygon prompt instructions */}
        {promptType === "polygon" && (
          <div className="absolute top-2 left-2 bg-white bg-opacity-90 px-3 py-2 rounded-md text-xs shadow-md">
            <div className="font-medium mb-1">Polygon Prompts:</div>
            <div className="mb-1">Left-click to add points</div>
            <div className="mb-1">Double-click to finish</div>
            
          </div>
        )}

        {/* Box prompt instructions */}
        {promptType === "box" && (
          <div className="absolute top-2 left-2 bg-white bg-opacity-90 px-3 py-2 rounded-md text-xs shadow-md">
            <div className="font-medium mb-1">Box Prompts:</div>
            <div className="mb-1">Click and drag to draw box</div>
          </div>
        )}

        {/* Drag tool instructions */}
        {activeTool === "drag" && (
          <div className="absolute top-2 left-2 bg-white bg-opacity-90 px-3 py-2 rounded-md text-xs shadow-md">
            <div className="font-medium mb-1">Drag Tool Active:</div>
            <div className="mb-1">Click and drag to pan</div>
            <div className="mb-1">Ctrl/Cmd + Mouse Wheel to zoom</div>
            <div className="text-gray-600">Switch tools to draw prompts</div>
          </div>
        )}

        {/* Segmentation Overlay */}
        <SegmentationOverlay
          selectedMask={selectedMask}
          selectedContours={selectedContours}
          onClearSegmentationResults={() => {
            if (onClearSegmentationResults) {
              onClearSegmentationResults();
            }
            setSelectedMask(null);
            setSelectedContours([]);
          }}
          onAddToFinalMask={(contours) => {
            if (onAddToFinalMask) {
              onAddToFinalMask(contours);
              setSelectedMask(null);
              setSelectedContours([]);
            }
          }}
          onResetSelection={() => {
            setSelectedContours([]);
          }}
        />

        {/* Prompt Selection Overlay */}
        <PromptSelectionOverlay
          selectedPromptIndex={selectedPromptIndex}
          prompts={prompts}
          onAddToFinalMask={(promptIndices) => {
            if (onAddToFinalMask) {
              onAddToFinalMask(promptIndices);
            }
            setSelectedPromptIndex(null);
          }}
          onCancel={() => setSelectedPromptIndex(null)}
        />
      </div>

      <div className="flex justify-between items-center mt-4 gap-4 px-6 py-3">
          <button
            className="
              group flex items-center gap-2 justify-center px-4 py-2 rounded-xl text-white font-semibold
              transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]
              shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20
              bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
              shadow-red-500/25 hover:shadow-red-500/40
              min-w-[100px] relative overflow-hidden
              before:absolute before:inset-0 before:bg-white/10 before:translate-x-[-100%] 
              hover:before:translate-x-[100%] before:transition-transform before:duration-700 before:ease-out
            "
            onClick={() => {
              clearPrompts();
              setSelectedPromptIndex(null);
            }}
          >
            <Trash2 className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
            <span>Clear</span>
            
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                         opacity-0 group-hover:opacity-100 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] 
                         transition-all duration-700 ease-out"></div>
          </button>
          {!isInstantSegmentationEnabled && (
            <button
              className={`
                group flex items-center gap-2 justify-center px-4 py-2 rounded-xl text-white font-semibold
                transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]
                shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20
                ${
                  prompts.length === 0 || isInstantSegmenting || !currentLabel
                    ? "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed shadow-none scale-100"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25 hover:shadow-blue-500/40"
                }
                min-w-[140px] relative overflow-hidden
                before:absolute before:inset-0 before:bg-white/10 before:translate-x-[-100%] 
                hover:before:translate-x-[100%] before:transition-transform before:duration-700 before:ease-out
              `}
              onClick={handleComplete}
              disabled={prompts.length === 0 || isInstantSegmenting || !currentLabel}
              title={!currentLabel ? "Please select a label before segmenting" : ""}
            >
              {isSegmenting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="animate-pulse">Segmenting...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                  <span>Segment Object</span>
                </>
              )}
              
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                           opacity-0 group-hover:opacity-100 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] 
                           transition-all duration-700 ease-out"></div>
            </button>
          )}
        </div>
    </div>
  );
});

PromptingCanvas.displayName = "PromptingCanvas";

export default PromptingCanvas; 