import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
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
  zoomLevel: externalZoomLevel,
  zoomCenter: externalZoomCenter,
  selectedContour,
  onContourSelect,
  onAddToFinalMask,
  onClearSegmentationResults,
  selectedFinalMaskContour,
  finalMasks,
  enableInstantSegmentation = false,
  instantSegmentationDebounce = 1000,
  onInstantSegmentationStateChange,
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

  // Update zoom level and center when external props change
  useEffect(() => {
    if (externalZoomLevel !== undefined && externalZoomLevel !== zoomLevel) {
      setZoomParameters(externalZoomLevel, zoomCenter);
    }
  }, [externalZoomLevel, zoomLevel, zoomCenter, setZoomParameters]);

  useEffect(() => {
    if (externalZoomCenter !== undefined) {
      setZoomParameters(zoomLevel, externalZoomCenter);
    }
  }, [externalZoomCenter, zoomLevel, setZoomParameters]);

  // Redraw function for canvas renderer
  const redrawCanvasCallback = useCallback((customPanOffset) => {
    // This will be handled by the CanvasRenderer component
  }, []);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    getPrompts: () => prompts,
    clearPrompts: () => {
      console.log("PromptingCanvas: clearPrompts called");
      clearPrompts();
    },
    updateSelectedMask: (mask) => {
      console.log("PromptingCanvas: updateSelectedMask called", mask?.id);
      if (!selectedMask || mask === null || selectedMask.id !== mask?.id) {
        setSelectedMask(mask);
      }
    },
    setActiveTool: (tool) => {
      console.log("PromptingCanvas: setActiveTool called with", tool);
      setActiveTool(tool);
    },
    getSelectedContours: () => selectedContours,
    clearSelectedContours: () => {
      console.log("PromptingCanvas: clearSelectedContours called");
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
    if (!canvas) return;

    const handleCanvasWheel = (e) => handleWheel(e, redrawCanvasCallback);

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
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">−</span>
              </div>
              <span>Right-click for negative points</span>
            </div>
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

      <div className="flex justify-between mt-3">
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            onClick={() => {
              clearPrompts();
              setSelectedPromptIndex(null);
            }}
          >
            Clear
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleComplete}
            disabled={prompts.length === 0 || isInstantSegmenting || !currentLabel}
            title={!currentLabel ? "Please select a label before segmenting" : ""}
          >
            {isInstantSegmentationEnabled ? 'Segment Now' : 'Complete'} {prompts.length > 0 && `(${prompts.length})`}
          </button>
        </div>
    </div>
  );
});

PromptingCanvas.displayName = "PromptingCanvas";

export default PromptingCanvas; 