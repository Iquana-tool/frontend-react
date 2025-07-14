import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { Trash2, Play, Loader2, } from "lucide-react";
import { usePanZoom } from './hooks/usePanZoom';
import { usePromptDrawing } from './hooks/usePromptDrawing';
import { useInstantSegmentation } from './hooks/useInstantSegmentation';
import CanvasRenderer from './components/CanvasRenderer';

import PromptSelectionOverlay from './components/PromptSelectionOverlay';

// This component allows users to add different types of prompts to an image for segmentation tasks.
const PromptingCanvas = forwardRef(({
  image,
  onPromptingComplete,
  promptType,
  currentLabel,
  selectedContour,
  onContourSelect,
  onAddToFinalMask,
  selectedFinalMaskContour,
  finalMasks,
  segmentationMasks = [],
  selectedContourIds = [],
  enableInstantSegmentation = false,
  instantSegmentationDebounce = 1000,
  onInstantSegmentationStateChange,
  isSegmenting = false,
  setError,
  setHighlightLabelWarning,
}, ref) => {
  // Container and canvas refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Basic state
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [initialScale, setInitialScale] = useState(1);
  const [activeTool, setActiveTool] = useState("point");
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
  const promptDrawing = usePromptDrawing(image, promptType, currentLabel, canvasToImageCoords, setHighlightLabelWarning);
  const {
    isDrawing,
    prompts,
    currentShape,
    currentPolygon,
    currentManualContour,
    manualContours,
    cursorPos,
    handlePromptMouseDown,
    handlePromptMouseMove,
    handlePromptMouseUp,
    handlePromptDoubleClick,
    clearPrompts,
    clearManualContours,
    removeManualContour,
    getFormattedPrompts,
    getFormattedManualContours,
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

  // Synchronize local contour selection with parent component/state
  useEffect(() => {
    if (onContourSelect) {
      onContourSelect([]);
    }
  }, [onContourSelect]);

  // Redraw function for canvas renderer
  const redrawCanvasCallback = useCallback((customPanOffset) => {
    // Force a re-render by incrementing the counter
    setForceRender(prev => prev + 1);
  }, []);

  // Handle manual contour completion
  const handleManualContourComplete = useCallback((contour) => {
    // Do nothing here—just let the contour appear in the overlay for user review
    // (Previously, this would call onAddToFinalMask, but that's not desired)
    return;
  }, []);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    getPrompts: () => prompts,
    clearPrompts: () => {
      clearPrompts();
    },
    setActiveTool: (tool) => {
      setActiveTool(tool);
    },
    getActiveTool: () => activeTool,
    getSelectedContours: () => [],
    setZoomParameters: setZoomParameters,
    zoomIn: () => zoomIn(redrawCanvasCallback),
    zoomOut: () => zoomOut(redrawCanvasCallback),
    resetView: () => resetView(redrawCanvasCallback),
    // Instant segmentation controls
    toggleInstantSegmentation,
    setInstantSegmentationEnabled: setIsInstantSegmentationEnabled,
    isInstantSegmentationEnabled,
    isInstantSegmenting,
    shouldSuppressLoadingModal,
    // Manual contour controls
    getManualContours: () => manualContours,
    clearManualContours,
    removeManualContour,
    getFormattedManualContours,
    // Force redraw for external updates
    forceRedraw: () => setForceRender(prev => prev + 1),
    }), [activeTool, setZoomParameters, toggleInstantSegmentation, setIsInstantSegmentationEnabled, isInstantSegmentationEnabled, isInstantSegmenting, shouldSuppressLoadingModal, clearManualContours, removeManualContour, getFormattedManualContours, prompts, clearPrompts, zoomIn, redrawCanvasCallback, zoomOut, resetView, manualContours]);

  // Handle completing prompting
  const handleComplete = () => {
    if (prompts.length === 0) {
      if (setError) {
        setError("No prompts to complete. Please draw prompts on the image first.");
      }
      return;
    }

    if (!currentLabel) {
      if (setHighlightLabelWarning) {
        setHighlightLabelWarning(true);
      }
      return;
    }

    const formattedPrompts = getFormattedPrompts();
    onPromptingComplete(formattedPrompts);
  };

  // Update canvas based on container size
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current || !image) return;

    const container = containerRef.current;
    // Use offsetWidth/Height to include padding, since canvas CSS is 100% of container
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

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



  // Handle mouse down event
  const handleMouseDown = useCallback((e) => {
    if (!image || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    let canvasX = e.clientX - rect.left;
    let canvasY = e.clientY - rect.top;
    
    // Scale mouse coordinates to match canvas internal dimensions
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    canvasX *= scaleX;
    canvasY *= scaleY;
    
    const imageCoords = canvasToImageCoords(canvasX, canvasY);
    if (!imageCoords) return;



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
        const drawingResult = handlePromptMouseDown(canvasX, canvasY, isRightClick);
        
        // If we're drawing a manual contour and it was just completed, handle it
        if (promptType === "manual-contour" && drawingResult && typeof drawingResult === 'object') {
          // This is a completed manual contour
          setTimeout(() => {
            handleManualContourComplete(drawingResult);
          }, 50);
        }
      }
    }
  }, [image, canvasToImageCoords, activeTool, prompts, handlePanStart, isPanning, handlePromptMouseDown, promptType, handleManualContourComplete]);

  // Handle mouse move event
  const handleMouseMove = useCallback((e) => {
    if (!image || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // Scale mouse coordinates to match canvas internal dimensions
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    x *= scaleX;
    y *= scaleY;

    // Handle panning if active
    if (isDraggingRef.current) {
      handlePanMove(e, redrawCanvasCallback);
      return;
    }

    // Only update cursor position when actively drawing to reduce re-renders
    if (isDrawing || (promptType === "polygon" && currentPolygon && currentPolygon.length > 0) || 
        (promptType === "manual-contour" && currentManualContour && currentManualContour.length > 0)) {
      handlePromptMouseMove(x, y);
    }
  }, [image, isDraggingRef, handlePanMove, redrawCanvasCallback, handlePromptMouseMove, isDrawing, promptType, currentPolygon, currentManualContour]);

  // Handle mouse up event
  const handleMouseUp = useCallback((e) => {
    if (!image) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // Scale mouse coordinates to match canvas internal dimensions
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    x *= scaleX;
    y *= scaleY;

    // Handle pan end
    handlePanEnd();

    // Handle prompt drawing
    if (isDrawing) {
      handlePromptMouseUp(x, y);
    }
  }, [image, handlePanEnd, isDrawing, handlePromptMouseUp]);

  // Handle double click for completing polygons and manual contours
  const handleDoubleClick = useCallback((e) => {
    const result = handlePromptDoubleClick();
    
    // If we're drawing a manual contour and it was just completed, handle it
    if (promptType === "manual-contour" && result && typeof result === 'object') {
      // This is a completed manual contour
      setTimeout(() => {
        handleManualContourComplete(result);
      }, 50);
    }
  }, [handlePromptDoubleClick, promptType, handleManualContourComplete]);

  // Handle context menu (right-click) to prevent default browser menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    return false;
  }, []);

  // Update canvas cursor based on active tool and panning state
  const getCursor = useCallback(() => {
    if (activeTool === "drag" || isPanning) {
      return isPanning ? "grabbing" : "grab";
    }
    if (promptType === "manual-contour") {
      return "crosshair";
    }
    return "crosshair";
  }, [activeTool, isPanning, promptType]);

  // Don't render if no image
  if (!image) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No image loaded</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={containerRef}
        className="relative flex-1 overflow-hidden p-2"
        style={{ cursor: getCursor() }}
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
          currentManualContour={currentManualContour}
          manualContours={manualContours}
          cursorPos={cursorPos}
          promptType={promptType}
          currentLabel={currentLabel}

          selectedContours={[]}
          finalMasks={finalMasks}
          selectedFinalMaskContour={selectedFinalMaskContour}
          segmentationMasks={segmentationMasks}
          selectedContourIds={selectedContourIds}
          forceRender={forceRender}
          onCanvasRef={(canvas) => { canvasRef.current = canvas; }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          onWheel={handleWheel}
        />

        {/* Status messages */}
        {!isDrawing && promptType === "polygon" && currentPolygon && currentPolygon.length > 0 && (
          <div className="absolute bottom-2 left-2 bg-white bg-opacity-75 px-2 py-1 rounded-md text-xs">
            Double-click to finish polygon
          </div>
        )}

        {/* Manual contour status messages */}
        {!isDrawing && promptType === "manual-contour" && currentManualContour && currentManualContour.length > 0 && (
          <div className="absolute bottom-2 left-2 bg-purple-100 bg-opacity-90 px-3 py-2 rounded-md text-sm shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-purple-700 font-medium">
                {currentManualContour.length} points • Double-click to finish
              </span>
            </div>
          </div>
        )}


        {/* AI segmentation results are now handled by SegmentationOverlay in AnnotationPage.jsx */}

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

        {/* Manual contours are managed by the unified SegmentationResultsPanel in the left column */}
      </div>

      {/* Complete segmentation button - Always show for non-manual contour tools */}
      {promptType !== "manual-contour" && (
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {prompts.length > 0 ? (
              <span className="text-sm text-gray-600">
                {prompts.length} prompt{prompts.length !== 1 ? 's' : ''} added
              </span>
            ) : (
              <span className="text-sm text-gray-500 italic">
                Draw prompts on the image to segment objects
              </span>
            )}
            
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearPrompts}
              disabled={prompts.length === 0}
              className={`flex items-center gap-1 px-3 py-1 text-sm transition-colors ${
                prompts.length === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={handleComplete}
              disabled={!currentLabel || isSegmenting || prompts.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                !currentLabel || isSegmenting || prompts.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSegmenting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Segmenting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Segment Object
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual contour help info when tool is selected but no contours yet */}
      {promptType === "manual-contour" && manualContours.length === 0 && (
        <div className="p-4 bg-purple-50 border-t border-purple-200">
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Click to draw manual contours directly on the image</span>
          </div>
        </div>
      )}

      {/* Show info about manual contours being managed in left panel */}
      {promptType === "manual-contour" && manualContours.length > 0 && (
        <div className="p-4 bg-purple-50 border-t border-purple-200">
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>
              {manualContours.length} manual contour{manualContours.length !== 1 ? 's' : ''} ready • 
              Manage in left panel
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default PromptingCanvas; 