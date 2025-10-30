import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import {
  useAIPrompts,
  useActivePreview,
  useAddPointPrompt,
  useAddBoxPrompt,
  useSetActivePreview,
  useCurrentTool,
  useSelectedModel,
  useCurrentImage,
  useImageObject,
  useImageLoading,
  useImageError,
  useZoomLevel,
  usePanOffset,
  useSetZoomLevel,
  useSetPanOffset,
  useFocusModeActive,
  useFocusModeObjectMask,
} from '../../../stores/selectors/annotationSelectors';
import { isPointInFocusedObject, isBoxInFocusedObject } from '../../../utils/geometryUtils';
import PointPromptMarker from './prompts/PointPromptMarker';
import BoxPromptMarker from './prompts/BoxPromptMarker';
import LiveBoxPreview from './prompts/LiveBoxPreview';

/**
 * AI Prompt Canvas Component
 * Handles interactive prompt creation (points and boxes) using Konva
 * Only active when currentTool is 'ai_annotation'
 */
const AIPromptCanvas = ({ width, height, renderBackground = true }) => {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const [dragStart, setDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [isPanMode, setIsPanMode] = useState(false);
  const [containerSize, setContainerSize] = useState({ width, height });
  const [focusModeWarning, setFocusModeWarning] = useState(null);

  // Store state
  const currentTool = useCurrentTool();
  const selectedModel = useSelectedModel();
  const currentImage = useCurrentImage();
  const prompts = useAIPrompts();
  const activePreview = useActivePreview();
  const imageObject = useImageObject();
  const imageLoading = useImageLoading();
  const imageError = useImageError();
  const zoomLevel = useZoomLevel();
  const panOffset = usePanOffset();
  const focusModeActive = useFocusModeActive();
  const focusedObjectMask = useFocusModeObjectMask();

  // Show focus mode warning
  const showFocusModeWarning = useCallback((message) => {
    setFocusModeWarning(message);
    setTimeout(() => setFocusModeWarning(null), 3000); // Clear after 3 seconds
  }, []);

  // Store actions
  const addPointPrompt = useAddPointPrompt();
  const addBoxPrompt = useAddBoxPrompt();
  const setActivePreview = useSetActivePreview();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();

  // Calculate fitted image dimensions
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, x: 0, y: 0, scale: 1 });

  useEffect(() => {
    if (imageObject && containerSize.width && containerSize.height) {
      const imageAspect = imageObject.width / imageObject.height;
      const containerAspect = containerSize.width / containerSize.height;

      let baseScale, imageWidth, imageHeight, x, y;

      if (imageAspect > containerAspect) {
        // Image is wider than container
        baseScale = containerSize.width / imageObject.width;
        imageWidth = containerSize.width;
        imageHeight = imageObject.height * baseScale;
        x = 0;
        y = (containerSize.height - imageHeight) / 2;
      } else {
        // Image is taller than container
        baseScale = containerSize.height / imageObject.height;
        imageWidth = imageObject.width * baseScale;
        imageHeight = containerSize.height;
        x = (containerSize.width - imageWidth) / 2;
        y = 0;
      }

      // Apply zoom and pan transforms
      const finalScale = baseScale * zoomLevel;
      const finalX = x + panOffset.x;
      const finalY = y + panOffset.y;

      setImageDimensions({ 
        width: imageWidth * zoomLevel, 
        height: imageHeight * zoomLevel, 
        x: finalX, 
        y: finalY, 
        scale: finalScale 
      });
    }
  }, [imageObject, containerSize, zoomLevel, panOffset]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Convert stage coordinates to image pixel coordinates
  const stageToImageCoords = useCallback((stageX, stageY) => {
    if (!imageObject || !imageDimensions.scale) return null;

    // Adjust for image position in container
    const relativeX = stageX - imageDimensions.x;
    const relativeY = stageY - imageDimensions.y;

    // Check if click is within image bounds
    if (
      relativeX < 0 ||
      relativeY < 0 ||
      relativeX > imageDimensions.width ||
      relativeY > imageDimensions.height
    ) {
      return null; // Outside image bounds
    }

    // Convert to image pixel space
    const imageX = Math.round(relativeX / imageDimensions.scale);
    const imageY = Math.round(relativeY / imageDimensions.scale);

    return { 
      imageX, 
      imageY, 
      stageX: relativeX + imageDimensions.x, 
      stageY: relativeY + imageDimensions.y 
    };
  }, [imageObject, imageDimensions]);

  // Handle point prompt (click) - for right-click only
  const handleStageClick = useCallback((e) => {
    // Only handle if AI annotation tool is active and model is selected
    if (currentTool !== 'ai_annotation' || !selectedModel || isDragging) return;

    // Only handle right-click for points
    if (e.evt.button !== 2) return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    
    const coords = stageToImageCoords(pointerPosition.x, pointerPosition.y);
    if (!coords) return; // Click outside image

    // Validate prompt is within focused object if in focus mode
    if (!isPointInFocusedObject(coords.imageX, coords.imageY, focusedObjectMask)) {
      // Show visual feedback to user
      showFocusModeWarning('Point annotation is outside the focused object boundary');
      return;
    }

    // Add negative point
    addPointPrompt(coords.imageX, coords.imageY, 'negative');
  }, [currentTool, selectedModel, isDragging, stageToImageCoords, addPointPrompt, focusModeActive, focusedObjectMask]);

  // Handle pan start
  const handlePanStart = useCallback((e) => {
    // Only pan with middle mouse button or when explicitly in pan mode
    if (e.evt.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.evt.clientX, y: e.evt.clientY });
    } else if (e.evt.button === 0 && isPanMode) {
      setIsPanning(true);
      setPanStart({ x: e.evt.clientX, y: e.evt.clientY });
    }
  }, [isPanMode]);

  // Handle pan move
  const handlePanMove = useCallback((e) => {
    if (!isPanning || !panStart) return;
    
    const deltaX = e.evt.clientX - panStart.x;
    const deltaY = e.evt.clientY - panStart.y;
    
    setPanOffset({
      x: panOffset.x + deltaX,
      y: panOffset.y + deltaY
    });
    
    setPanStart({ x: e.evt.clientX, y: e.evt.clientY });
  }, [isPanning, panStart, panOffset, setPanOffset]);

  // Handle pan end
  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

  // Handle box drag start and pan start
  const handleMouseDown = useCallback((e) => {
    if (currentTool !== 'ai_annotation' || !selectedModel) return;

    // Handle pan start (middle mouse button only, or left click when explicitly in pan mode)
    if (e.evt.button === 1) {
      // Middle mouse button - always pan
      handlePanStart(e);
      return;
    }
    
    if (e.evt.button === 0 && isPanMode) {
      // Left click in pan mode - pan
      handlePanStart(e);
      return;
    }

    // Handle box creation (left click when NOT in pan mode)
    if (e.evt.button !== 0) return;
    
    // If we're in pan mode, don't create boxes
    if (isPanMode) return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    
    const coords = stageToImageCoords(pointerPosition.x, pointerPosition.y);
    if (!coords) return;

    // Start drag for box creation
    setDragStart({ imageX: coords.imageX, imageY: coords.imageY, stageX: coords.stageX, stageY: coords.stageY });
    // Don't set isDragging immediately - wait for actual movement
  }, [currentTool, selectedModel, isPanMode, stageToImageCoords, handlePanStart]);

  // Handle box drag move and pan move
  const handleMouseMove = useCallback((e) => {
    // Handle panning
    if (isPanning) {
      handlePanMove(e);
      return;
    }

    // Handle box dragging
    if (!dragStart) return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    
    const coords = stageToImageCoords(pointerPosition.x, pointerPosition.y);
    if (!coords) return;

    // Start dragging if we've moved enough (to distinguish from clicks)
    if (!isDragging) {
      const distance = Math.sqrt(
        Math.pow(pointerPosition.x - dragStart.stageX, 2) + 
        Math.pow(pointerPosition.y - dragStart.stageY, 2)
      );
      if (distance > 5) { // 5px threshold
        setIsDragging(true);
      }
    }

    // Update preview in stage coordinates for visual feedback
    setActivePreview({
      x1: dragStart.stageX,
      y1: dragStart.stageY,
      x2: coords.stageX,
      y2: coords.stageY,
    });
  }, [isPanning, handlePanMove, isDragging, dragStart, stageToImageCoords, setActivePreview]);

  // Handle box drag end, left-click for positive points, and pan end
  const handleMouseUp = useCallback((e) => {
    // Handle pan end
    if (isPanning) {
      handlePanEnd();
      return;
    }

    if (isDragging && dragStart) {
      // Handle box completion
      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();
      
      const coords = stageToImageCoords(pointerPosition.x, pointerPosition.y);
      
      if (coords) {
        const width = Math.abs(coords.imageX - dragStart.imageX);
        const height = Math.abs(coords.imageY - dragStart.imageY);

        // Only create box if minimum size met (3px in image space)
        if (width >= 3 && height >= 3) {
          // Validate box is within focused object if in focus mode
          if (!isBoxInFocusedObject(dragStart.imageX, dragStart.imageY, coords.imageX, coords.imageY, focusedObjectMask)) {
            showFocusModeWarning('Box annotation is outside the focused object boundary');
          } else {
            addBoxPrompt(
              dragStart.imageX,
              dragStart.imageY,
              coords.imageX,
              coords.imageY
            );
          }
        }
      }

      // Clear drag state
      setDragStart(null);
      setIsDragging(false);
      setActivePreview(null);
    } else if (dragStart && currentTool === 'ai_annotation' && selectedModel && e.evt.button === 0) {
      // Handle left-click for positive points (when we have dragStart but didn't actually drag)
      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();
      
      const coords = stageToImageCoords(pointerPosition.x, pointerPosition.y);
      if (!coords) return; // Click outside image

      // Validate prompt is within focused object if in focus mode
      if (!isPointInFocusedObject(coords.imageX, coords.imageY, focusedObjectMask)) {
        showFocusModeWarning('Point annotation is outside the focused object boundary');
        // Clear drag state
        setDragStart(null);
        setIsDragging(false);
        setActivePreview(null);
        return;
      }

      // Add positive point
      addPointPrompt(coords.imageX, coords.imageY, 'positive');
      
      // Clear drag state
      setDragStart(null);
      setIsDragging(false);
      setActivePreview(null);
    }
  }, [isPanning, handlePanEnd, isDragging, dragStart, currentTool, selectedModel, stageToImageCoords, addBoxPrompt, addPointPrompt, setActivePreview]);

  // Handle wheel zoom
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    
    // Calculate zoom factor
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? zoomLevel / scaleBy : zoomLevel * scaleBy;
    
    // Clamp zoom level
    const clampedScale = Math.max(0.1, Math.min(10, newScale));
    
    // Calculate new pan offset to zoom towards mouse position
    const mouseX = pointerPosition.x;
    const mouseY = pointerPosition.y;
    
    const newPanX = panOffset.x - (mouseX - panOffset.x) * (clampedScale / zoomLevel - 1);
    const newPanY = panOffset.y - (mouseY - panOffset.y) * (clampedScale / zoomLevel - 1);
    
    setZoomLevel(clampedScale);
    setPanOffset({ x: newPanX, y: newPanY });
  }, [zoomLevel, panOffset, setZoomLevel, setPanOffset]);

  // Handle keyboard shortcuts
  useEffect(() => {
    let spacebarPressed = false;
    
    const handleKeyDown = (e) => {
      if (currentTool !== 'ai_annotation') return;
      
      // Only handle spacebar if not already pressed
      if (e.code === 'Space' && !spacebarPressed) {
        e.preventDefault();
        e.stopPropagation();
        spacebarPressed = true;
        setIsPanMode(true);
      }
    };

    const handleKeyUp = (e) => {
      if (currentTool !== 'ai_annotation') return;
      
      // Only handle spacebar if it was pressed
      if (e.code === 'Space' && spacebarPressed) {
        e.preventDefault();
        e.stopPropagation();
        spacebarPressed = false;
        setIsPanMode(false);
      }
    };

    // Also handle when focus is lost to reset pan mode
    const handleBlur = () => {
      spacebarPressed = false;
      setIsPanMode(false);
    };

    // Handle when window loses focus
    const handleVisibilityChange = () => {
      if (document.hidden) {
        spacebarPressed = false;
        setIsPanMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentTool]);

  // Prevent context menu
  const handleContextMenu = useCallback((e) => {
    e.evt.preventDefault();
  }, []);

  // Don't render if not AI annotation tool
  if (currentTool !== 'ai_annotation') return null;

  // Show loading state
  if (imageLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading image...</p>
        </div>
      </div>
    );
  }

  // Don't render if no image
  if (!imageObject) return null;

  // Show error state if image failed to load
  if (imageError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load image</p>
          <p className="text-sm text-gray-600">{imageError}</p>
        </div>
      </div>
    );
  }

  const cursor = !selectedModel 
    ? 'not-allowed' 
    : isPanning 
      ? 'grabbing' 
      : isPanMode 
        ? 'grab' 
        : isDragging 
          ? 'crosshair' 
          : 'crosshair';

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-10"
      style={{ cursor }}
    >
      {/* Pan mode indicator */}
      {isPanMode && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg z-50">
          Pan Mode - Hold Space + Drag
        </div>
      )}
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // End drag if mouse leaves
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        <Layer>
          {/* Background Image (optional when overlaying native <img>) */}
          {renderBackground && (
            <KonvaImage
              image={imageObject}
              x={imageDimensions.x}
              y={imageDimensions.y}
              width={imageDimensions.width}
              height={imageDimensions.height}
            />
          )}

          {/* Box Prompts (render first, lower z-index) */}
          {prompts
            .filter((p) => p.type === 'box')
            .map((prompt) => {
              // Convert image coords to stage coords for rendering
              const stagePrompt = {
                ...prompt,
                coords: {
                  x1: prompt.coords.x1 * imageDimensions.scale + imageDimensions.x,
                  y1: prompt.coords.y1 * imageDimensions.scale + imageDimensions.y,
                  x2: prompt.coords.x2 * imageDimensions.scale + imageDimensions.x,
                  y2: prompt.coords.y2 * imageDimensions.scale + imageDimensions.y,
                },
              };
              return <BoxPromptMarker key={prompt.id} prompt={stagePrompt} />;
            })}

          {/* Live Box Preview */}
          <LiveBoxPreview preview={activePreview} />

          {/* Point Prompts (render last, higher z-index) */}
          {prompts
            .filter((p) => p.type === 'point')
            .map((prompt) => {
              // Convert image coords to stage coords for rendering
              const stagePrompt = {
                ...prompt,
                coords: {
                  x: prompt.coords.x * imageDimensions.scale + imageDimensions.x,
                  y: prompt.coords.y * imageDimensions.scale + imageDimensions.y,
                },
              };
              return <PointPromptMarker key={prompt.id} prompt={stagePrompt} />;
            })}
        </Layer>
      </Stage>
      
      {/* Focus Mode Warning */}
      {focusModeWarning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{focusModeWarning}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPromptCanvas;

