import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { Trash2, Play, Loader2} from "lucide-react";
import { usePanZoom } from './hooks/usePanZoom';
import { usePromptDrawing } from './hooks/usePromptDrawing';
import { useInstantSegmentation } from './hooks/useInstantSegmentation';
import CanvasRenderer from './components/CanvasRenderer';
import InferImageButton from "./MainAnnotationPage/components/InferImageButton";
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
  selectedManualContourIds = [],
  enableInstantSegmentation = false,
  instantSegmentationDebounce = 1000,
  onInstantSegmentationStateChange,
  isSegmenting = false,
  setError,
  setHighlightLabelWarning,
  isMaskFinished = false,
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
  const [isSequentialProcessing, setIsSequentialProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");

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

  // Reset sequential processing state when segmentation completes
  useEffect(() => {
    if (!isSegmenting && isSequentialProcessing) {
      setIsSequentialProcessing(false);
      setProcessingStatus("");
    }
  }, [isSegmenting, isSequentialProcessing]);

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

    // Check if we have multiple prompts of the same type that will be processed sequentially
    const pointPrompts = prompts.filter(p => p.type === "point");
    const boxPrompts = prompts.filter(p => p.type === "box");
    const polygonPrompts = prompts.filter(p => p.type === "polygon");
    
    const hasMultipleBoxes = boxPrompts.length > 1;
    const hasMultiplePolygons = polygonPrompts.length > 1;
    const hasMultipleTypes = (boxPrompts.length > 0 && polygonPrompts.length > 0) || 
                           (boxPrompts.length > 0 && pointPrompts.length > 0) || 
                           (polygonPrompts.length > 0 && pointPrompts.length > 0);

    // Show informative message about sequential processing
    if (hasMultipleBoxes || hasMultiplePolygons || hasMultipleTypes) {
      setIsSequentialProcessing(true);
      let message = "Processing multiple prompts sequentially";
      if (hasMultipleBoxes) {
        message += ` (${boxPrompts.length} boxes)`;
      }
      if (hasMultiplePolygons) {
        message += ` (${polygonPrompts.length} polygons)`;
      }
      if (hasMultipleTypes) {
        message += " (mixed types)";
      }
      
      setProcessingStatus(message);
      console.log(message);
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

    // Prevent interactions if mask is finished
    if (isMaskFinished) {
      e.preventDefault();
      if (setError) {
        setError("This mask is marked as finished. Please click 'Edit Mask' to continue editing.");
      }
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
    // Scale mouse coordinates to match canvas internal dimensions
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    x *= scaleX;
    y *= scaleY;

    //  try tostart panning first - let handlePanStart determine if conditions are met
    const panningStarted = handlePanStart(e, activeTool);
    if (panningStarted) {
      return;
    }

    // Handle prompt drawing
    if (e.button === 0 || e.button === 2) { // Left or right mouse button
      if (!isPanning) {
        const isRightClick = e.button === 2;
        const drawingResult = handlePromptMouseDown(x, y, isRightClick);
        
        // If we're drawing a manual contour and it was just completed, handle it
        if (promptType === "manual-contour" && drawingResult && typeof drawingResult === 'object') {
          // This is a completed manual contour
          setTimeout(() => {
            handleManualContourComplete(drawingResult);
          }, 50);
        }
      }
    }
  }, [image, isMaskFinished, handlePanStart, activeTool, setError, isPanning, handlePromptMouseDown, promptType, handleManualContourComplete]);

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
          selectedManualContourIds={selectedManualContourIds}
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

      {/* Finished Mask Overlay */}
      {isMaskFinished && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm mx-4 text-center border border-amber-100">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mask is Complete</h3>
            <p className="text-gray-600 mb-4 text-sm">
              This mask has been marked as finished. To continue annotation, please click the "Edit Mask" button in the Final Mask panel.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Click "Edit Mask" to continue editing</span>
            </div>
          </div>
        </div>
      )}

      {/* Complete segmentation button - Always show for non-manual contour tools */}
      {promptType !== "manual-contour" && (
        <div className="px-4 py-3 border-t border-slate-200 bg-white/50 backdrop-blur-sm h-[60px] flex items-center justify-between">
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
            
            {/* Show sequential processing status */}
            {isSequentialProcessing && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>{processingStatus}</span>
              </div>
            )}


          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearPrompts}
              disabled={prompts.length === 0 || isSegmenting}
              className={`flex items-center gap-1 px-3 py-1 text-sm transition-colors ${
                prompts.length === 0 || isSegmenting
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
            <InferImageButton image={image}/>
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
                  {isSequentialProcessing ? "Processing..." : "Segmenting..."}
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
    </div>
  );
});

export default PromptingCanvas; 