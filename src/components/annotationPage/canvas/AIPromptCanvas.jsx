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
  useRefinementModeActive,
  useExitRefinementMode,
} from '../../../stores/selectors/annotationSelectors';
import annotationSession from '../../../services/annotationSession';
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
  const refinementModeActive = useRefinementModeActive();
  const exitRefinementMode = useExitRefinementMode();

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

  const [imageDimensions, setImageDimensions] = useState({ 
    width: 0, 
    height: 0, 
    x: 0, 
    y: 0, 
    baseScale: 1,
    displayWidth: 0,
    displayHeight: 0,
    displayX: 0,
    displayY: 0
  });

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

      // Apply zoom and pan 
      // CSS transform applies translate in the SCALED coordinate system
      // we need to multiply panOffset by zoomLevel to get the actual pixel offset
      const zoomedWidth = imageWidth * zoomLevel;
      const zoomedHeight = imageHeight * zoomLevel;
      const baseCenterX = x + imageWidth / 2;
      const baseCenterY = y + imageHeight / 2;
      const zoomedX = baseCenterX - zoomedWidth / 2;
      const zoomedY = baseCenterY - zoomedHeight / 2;
      // Apply panOffset in scaled coordinate system (matching CSS transform behavior)
      const finalX = zoomedX + (panOffset.x * zoomLevel);
      const finalY = zoomedY + (panOffset.y * zoomLevel);

      setImageDimensions({ 
        width: imageWidth, 
        height: imageHeight, 
        x: x, 
        y: y,
        baseScale: baseScale,
        displayWidth: zoomedWidth, 
        displayHeight: zoomedHeight, 
        displayX: finalX, 
        displayY: finalY
      });
    }
  }, [imageObject, containerSize, zoomLevel, panOffset]);

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

  const stageToImageCoords = useCallback((stageX, stageY) => {
    if (!imageObject || !imageDimensions.baseScale) return null;

    const relativeX = stageX - imageDimensions.displayX;
    const relativeY = stageY - imageDimensions.displayY;

    if (
      relativeX < 0 ||
      relativeY < 0 ||
      relativeX > imageDimensions.displayWidth ||
      relativeY > imageDimensions.displayHeight
    ) {
      return null;
    }

    const finalScale = imageDimensions.baseScale * zoomLevel;
    const imageX = Math.round(relativeX / finalScale);
    const imageY = Math.round(relativeY / finalScale);
    
    // Clamp to image bounds
    const clampedImageX = Math.max(0, Math.min(imageObject.width - 1, imageX));
    const clampedImageY = Math.max(0, Math.min(imageObject.height - 1, imageY));

    return { 
      imageX: clampedImageX, 
      imageY: clampedImageY, 
      stageX: relativeX + imageDimensions.displayX, 
      stageY: relativeY + imageDimensions.displayY 
    };
  }, [imageObject, imageDimensions, zoomLevel, panOffset]);

  const handleStageClick = useCallback((e) => {
    if (currentTool !== 'ai_annotation' || !selectedModel || isDragging) return;
    if (e.evt.button !== 2) return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const coords = stageToImageCoords(pointerPosition.x, pointerPosition.y);
    if (!coords) return;

    if (!isPointInFocusedObject(coords.imageX, coords.imageY, focusedObjectMask)) {
      showFocusModeWarning('Point annotation is outside the focused object boundary');
      return;
    }

    addPointPrompt(coords.imageX, coords.imageY, 'negative');
  }, [currentTool, selectedModel, isDragging, stageToImageCoords, addPointPrompt, focusedObjectMask, showFocusModeWarning]);

  const handlePanStart = useCallback((e) => {
    if (e.evt.button === 1 || (e.evt.button === 0 && isPanMode)) {
      setIsPanning(true);
      setPanStart({ x: e.evt.clientX, y: e.evt.clientY });
    }
  }, [isPanMode]);

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

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (currentTool !== 'ai_annotation' || !selectedModel) return;

    if (e.evt.button === 1 || (e.evt.button === 0 && isPanMode)) {
      handlePanStart(e);
      return;
    }

    if (e.evt.button !== 0 || isPanMode) return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    
    const coords = stageToImageCoords(pointerPosition.x, pointerPosition.y);
    if (!coords) return;

    setDragStart({ imageX: coords.imageX, imageY: coords.imageY, stageX: coords.stageX, stageY: coords.stageY });
  }, [currentTool, selectedModel, isPanMode, stageToImageCoords, handlePanStart]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      handlePanMove(e);
      return;
    }

    if (!dragStart) return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    
    const coords = stageToImageCoords(pointerPosition.x, pointerPosition.y);
    if (!coords) return;

    if (!isDragging) {
      const distance = Math.sqrt(
        Math.pow(pointerPosition.x - dragStart.stageX, 2) + 
        Math.pow(pointerPosition.y - dragStart.stageY, 2)
      );
      if (distance > 5) {
        setIsDragging(true);
      }
    }

    setActivePreview({
      x1: dragStart.stageX,
      y1: dragStart.stageY,
      x2: coords.stageX,
      y2: coords.stageY,
    });
  }, [isPanning, handlePanMove, isDragging, dragStart, stageToImageCoords, setActivePreview]);

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      handlePanEnd();
      return;
    }

    if (isDragging && dragStart) {
      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();
      
      const coords = stageToImageCoords(pointerPosition.x, pointerPosition.y);
      
      if (coords) {
        const width = Math.abs(coords.imageX - dragStart.imageX);
        const height = Math.abs(coords.imageY - dragStart.imageY);

        if (width >= 3 && height >= 3) {
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

      setDragStart(null);
      setIsDragging(false);
      setActivePreview(null);
    } else if (dragStart && currentTool === 'ai_annotation' && selectedModel && e.evt.button === 0) {
      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();
      const coords = stageToImageCoords(pointerPosition.x, pointerPosition.y);
      if (!coords) return;

      if (!isPointInFocusedObject(coords.imageX, coords.imageY, focusedObjectMask)) {
        showFocusModeWarning('Point annotation is outside the focused object boundary');
        setDragStart(null);
        setIsDragging(false);
        setActivePreview(null);
        return;
      }

      addPointPrompt(coords.imageX, coords.imageY, 'positive');
      setDragStart(null);
      setIsDragging(false);
      setActivePreview(null);
    }
  }, [isPanning, handlePanEnd, isDragging, dragStart, currentTool, selectedModel, stageToImageCoords, addBoxPrompt, addPointPrompt, setActivePreview, focusedObjectMask, showFocusModeWarning]);

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    
    if (!imageObject || !containerSize.width || !containerSize.height) return;
    
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? zoomLevel / scaleBy : zoomLevel * scaleBy;
    const clampedScale = Math.max(0.1, Math.min(10, newScale));
    const imageAspect = imageObject.width / imageObject.height;
    const containerAspect = containerSize.width / containerSize.height;
    
    let baseScale, imageWidth, imageHeight, x, y;
    
    if (imageAspect > containerAspect) {
      baseScale = containerSize.width / imageObject.width;
      imageWidth = containerSize.width;
      imageHeight = imageObject.height * baseScale;
      x = 0;
      y = (containerSize.height - imageHeight) / 2;
    } else {
      baseScale = containerSize.height / imageObject.height;
      imageWidth = imageObject.width * baseScale;
      imageHeight = containerSize.height;
      x = (containerSize.width - imageWidth) / 2;
      y = 0;
    }
    
    const baseCenterX = x + imageWidth / 2;
    const baseCenterY = y + imageHeight / 2;
    const currentZoomedWidth = imageWidth * zoomLevel;
    const currentZoomedHeight = imageHeight * zoomLevel;
    const currentZoomedX = baseCenterX - currentZoomedWidth / 2;
    const currentZoomedY = baseCenterY - currentZoomedHeight / 2;
    const currentImageX = currentZoomedX + panOffset.x;
    const currentImageY = currentZoomedY + panOffset.y;
    const relativeX = pointerPosition.x - currentImageX;
    const relativeY = pointerPosition.y - currentImageY;
    const imagePixelX = relativeX / (baseScale * zoomLevel);
    const imagePixelY = relativeY / (baseScale * zoomLevel);
    const newZoomedWidth = imageWidth * clampedScale;
    const newZoomedHeight = imageHeight * clampedScale;
    const newZoomedX = baseCenterX - newZoomedWidth / 2;
    const newZoomedY = baseCenterY - newZoomedHeight / 2;
    const newPanX = pointerPosition.x - newZoomedX - (imagePixelX * baseScale * clampedScale);
    const newPanY = pointerPosition.y - newZoomedY - (imagePixelY * baseScale * clampedScale);
    
    setZoomLevel(clampedScale);
    setPanOffset({ x: newPanX, y: newPanY });
  }, [zoomLevel, panOffset, setZoomLevel, setPanOffset, imageObject, containerSize]);

  useEffect(() => {
    let spacebarPressed = false;
    
    const handleKeyDown = async (e) => {
      if (currentTool !== 'ai_annotation') return;
      
      // Handle ESC key for exiting refinement mode
      if (e.code === 'Escape' && refinementModeActive) {
        e.preventDefault();
        e.stopPropagation();
        try {
          // Send unselect message to backend
          await annotationSession.unselectRefinementObject();
          
          // Reset zoom and pan before exiting
          setZoomLevel(1);
          setPanOffset({ x: 0, y: 0 });
          
          // Exit refinement mode in store
          exitRefinementMode();
          
          console.log('Exited refinement mode via ESC key');
        } catch (error) {
          console.error('Failed to exit refinement mode:', error);
        }
        return;
      }
      
      // Handle Space key for pan mode
      if (e.code === 'Space' && !spacebarPressed) {
        e.preventDefault();
        e.stopPropagation();
        spacebarPressed = true;
        setIsPanMode(true);
      }
    };

    const handleKeyUp = (e) => {
      if (currentTool !== 'ai_annotation') return;
      if (e.code === 'Space' && spacebarPressed) {
        e.preventDefault();
        e.stopPropagation();
        spacebarPressed = false;
        setIsPanMode(false);
      }
    };

    const handleBlur = () => {
      spacebarPressed = false;
      setIsPanMode(false);
    };

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
  }, [currentTool, refinementModeActive, exitRefinementMode, setZoomLevel, setPanOffset]);

  const handleContextMenu = useCallback((e) => {
    e.evt.preventDefault();
  }, []);

  if (currentTool !== 'ai_annotation') return null;

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

  if (!imageObject) return null;

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
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        <Layer>
          {renderBackground && (
            <KonvaImage
              image={imageObject}
              x={imageDimensions.displayX}
              y={imageDimensions.displayY}
              width={imageDimensions.displayWidth}
              height={imageDimensions.displayHeight}
            />
          )}

          {prompts
            .filter((p) => p.type === 'box')
            .map((prompt) => {
              const finalScale = imageDimensions.baseScale * zoomLevel;
              const stagePrompt = {
                ...prompt,
                coords: {
                  x1: prompt.coords.x1 * finalScale + imageDimensions.displayX,
                  y1: prompt.coords.y1 * finalScale + imageDimensions.displayY,
                  x2: prompt.coords.x2 * finalScale + imageDimensions.displayX,
                  y2: prompt.coords.y2 * finalScale + imageDimensions.displayY,
                },
              };
              return <BoxPromptMarker key={prompt.id} prompt={stagePrompt} />;
            })}

          <LiveBoxPreview preview={activePreview} />

          {prompts
            .filter((p) => p.type === 'point')
            .map((prompt) => {
              const finalScale = imageDimensions.baseScale * zoomLevel;
              const stagePrompt = {
                ...prompt,
                coords: {
                  x: prompt.coords.x * finalScale + imageDimensions.displayX,
                  y: prompt.coords.y * finalScale + imageDimensions.displayY,
                },
              };
              return <PointPromptMarker key={prompt.id} prompt={stagePrompt} />;
            })}
        </Layer>
      </Stage>
      
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

