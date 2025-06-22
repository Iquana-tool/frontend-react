import { useState, useRef, useCallback, useEffect } from 'react';

export const usePanZoom = (image, canvasSize, initialScale) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoomCenter, setZoomCenter] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);

  // Improved panning refs for smooth performance
  const panStartRef = useRef(null);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const panRafIdRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Keep panOffsetRef synchronized with panOffset state
  useEffect(() => {
    panOffsetRef.current = { ...panOffset };
  }, [panOffset]);

  // Clamp pan offset to prevent showing empty space
  const clampPanOffset = useCallback((offset, image, canvasSize, scale, zoomLevel) => {
    if (!image) return offset;
    const scaledWidth = image.width * scale * zoomLevel;
    const scaledHeight = image.height * scale * zoomLevel;

    let x, y;

    if (scaledWidth <= canvasSize.width) {
      // Center image horizontally
      x = (canvasSize.width - scaledWidth) / 2;
    } else {
      // Clamp so no empty space is shown
      const minX = canvasSize.width - scaledWidth;
      const maxX = 0;
      x = Math.min(maxX, Math.max(offset.x, minX));
    }

    if (scaledHeight <= canvasSize.height) {
      // Center image vertically
      y = (canvasSize.height - scaledHeight) / 2;
    } else {
      // Clamp so no empty space is shown
      const minY = canvasSize.height - scaledHeight;
      const maxY = 0;
      y = Math.min(maxY, Math.max(offset.y, minY));
    }

    return { x, y };
  }, []);

  // Convert canvas coordinates to image coordinates
  const canvasToImageCoords = useCallback((canvasX, canvasY) => {
    if (!image) return null;
  
    const scale = initialScale * zoomLevel;
    const center = zoomCenter || { x: 0.5, y: 0.5 };
  
    const imageWidth = image.width * scale;
    const imageHeight = image.height * scale;
  
    // Calculate the offset to center the image in the canvas
    let centerX = (canvasSize.width - imageWidth) / 2;
    let centerY = (canvasSize.height - imageHeight) / 2;
  
    // If zoomed, adjust for zoomCenter
    if (zoomLevel > 1 && center) {
      // The offset to keep zoomCenter in the center of the canvas
      const zoomCenterOffsetX = (center.x - 0.5) * imageWidth;
      const zoomCenterOffsetY = (center.y - 0.5) * imageHeight;
      centerX -= zoomCenterOffsetX;
      centerY -= zoomCenterOffsetY;
    }
  
    // Add pan offset
    centerX += panOffset.x;
    centerY += panOffset.y;
  
    // Now invert the transform
    const imageX = (canvasX - centerX) / scale;
    const imageY = (canvasY - centerY) / scale;
  
    if (
      imageX >= 0 &&
      imageX <= image.width &&
      imageY >= 0 &&
      imageY <= image.height
    ) {
      return { x: imageX, y: imageY };
    }
  
    return null;
  }, [image, initialScale, zoomLevel, zoomCenter, canvasSize, panOffset]);

  // Handle pan start
  const handlePanStart = useCallback((e, activeTool) => {
    if (!image) return false;
    
    // Begin panning in three situations:
    // 1. Middle-mouse button (button === 1)
    // 2. Alt/Option + Left click
    // 3. Drag tool is active with primary button
    const leftClick = e.button === 0;
    const middleClick = e.button === 1;
    const altDrag = leftClick && e.altKey;
    const dragToolActive = activeTool === "drag" && leftClick;

    if (middleClick || altDrag || dragToolActive) {
      e.preventDefault();
      e.stopPropagation();
      
      // Set panning state
      setIsPanning(true);
      isDraggingRef.current = true;
      
      // Store start position and current offset
      const startPos = { x: e.clientX, y: e.clientY };
      panStartRef.current = startPos;
      setPanStart(startPos);
      
      return true; // Indicate that panning started
    }
    
    return false;
  }, [image]);

  // Handle pan move
  const handlePanMove = useCallback((e, redrawCallback) => {
    if (!image || !isDraggingRef.current || !panStartRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate movement delta from the start position
    const deltaX = e.clientX - panStartRef.current.x;
    const deltaY = e.clientY - panStartRef.current.y;
    
    // Get the initial pan offset when dragging started (stored in panOffset state)
    const initialPanOffset = panOffset;
    
    // Calculate new offset from the initial position when dragging started
    let newOffset = {
      x: initialPanOffset.x + deltaX,
      y: initialPanOffset.y + deltaY,
    };
    
    // Apply boundary constraints
    newOffset = clampPanOffset(newOffset, image, canvasSize, initialScale, zoomLevel);
    
    // Update the ref for immediate use
    panOffsetRef.current = { ...newOffset };
    
    // Throttle redraws using requestAnimationFrame for smooth performance
    if (panRafIdRef.current === null) {
      panRafIdRef.current = window.requestAnimationFrame(() => {
        if (redrawCallback) {
          redrawCallback(newOffset);
        }
        panRafIdRef.current = null;
      });
    }
  }, [image, canvasSize, initialScale, zoomLevel, panOffset, clampPanOffset]);

  // Handle pan end
  const handlePanEnd = useCallback(() => {
    if (isDraggingRef.current) {
      // Sync the final pan offset from ref to state
      const finalOffset = panOffsetRef.current;
      setPanOffset({ ...finalOffset });
      
      // Reset panning state
      setIsPanning(false);
      isDraggingRef.current = false;
      panStartRef.current = null;
      setPanStart(null);
      
      // Cancel any pending animation frames
      if (panRafIdRef.current !== null) {
        cancelAnimationFrame(panRafIdRef.current);
        panRafIdRef.current = null;
      }
      
      return true; // Indicate that panning ended
    }
    
    return false;
  }, []);

  // Handle wheel event for zooming
  const handleWheel = useCallback((e, redrawCallback) => {
    if (!image) return;
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate new zoom level
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoomLevel = Math.max(0.1, Math.min(10, zoomLevel * zoomFactor));

    // Simple zoom at canvas center approach to avoid dependency issues
    const oldZoomLevel = zoomLevel;
    const scaleFactor = newZoomLevel / oldZoomLevel;

    // Calculate how much the view should shift to keep the mouse point fixed
    const canvasCenterX = canvasSize.width / 2;
    const canvasCenterY = canvasSize.height / 2;

    // Calculate offset from canvas center to mouse position
    const offsetX = mouseX - canvasCenterX;
    const offsetY = mouseY - canvasCenterY;

    // Calculate new pan offset to keep the point under mouse fixed
    const newPanOffset = {
      x: panOffset.x + offsetX * (1 - scaleFactor),
      y: panOffset.y + offsetY * (1 - scaleFactor)
    };

    // Apply boundary constraints
    const clampedPanOffset = clampPanOffset(newPanOffset, image, canvasSize, initialScale, newZoomLevel);

    // Update states
    setZoomLevel(newZoomLevel);
    setPanOffset(clampedPanOffset);
    panOffsetRef.current = { ...clampedPanOffset };

    // Force redraw
    if (redrawCallback) {
      setTimeout(() => {
        redrawCallback();
      }, 0);
    }
  }, [image, zoomLevel, panOffset, canvasSize, initialScale, clampPanOffset]);

  // Smooth zoom function
  const handleSmoothZoom = useCallback((newZoomLevel, centerPoint = null, redrawCallback) => {
    if (!image) return;

    const oldZoomLevel = zoomLevel;
    const zoomFactor = newZoomLevel / oldZoomLevel;
    
    // Use provided center point or current zoom center or canvas center
    let targetCenter = centerPoint;
    if (!targetCenter) {
      if (zoomCenter) {
        targetCenter = { ...zoomCenter };
      } else {
        targetCenter = { x: 0.5, y: 0.5 }; // Center of image
      }
    }

    // Calculate the current view center in canvas coordinates
    const canvasCenterX = canvasSize.width / 2;
    const canvasCenterY = canvasSize.height / 2;

    // Convert canvas center to image coordinates at current zoom
    const scale = initialScale;
    const currentScaledWidth = image.width * scale * oldZoomLevel;
    const currentScaledHeight = image.height * scale * oldZoomLevel;

    // Calculate current image center position on canvas
    let currentCenterX = (canvasSize.width - currentScaledWidth) / 2;
    let currentCenterY = (canvasSize.height - currentScaledHeight) / 2;

    // Apply current zoom center offset
    if (zoomCenter && oldZoomLevel > 1) {
      const currentZoomCenterOffsetX = (zoomCenter.x - 0.5) * currentScaledWidth;
      const currentZoomCenterOffsetY = (zoomCenter.y - 0.5) * currentScaledHeight;
      currentCenterX -= currentZoomCenterOffsetX;
      currentCenterY -= currentZoomCenterOffsetY;
    }

    // Add current pan offset
    currentCenterX += panOffset.x;
    currentCenterY += panOffset.y;

    // Calculate what the new scaled dimensions will be
    const newScaledWidth = image.width * scale * newZoomLevel;
    const newScaledHeight = image.height * scale * newZoomLevel;

    // Calculate new center position
    let newCenterX = (canvasSize.width - newScaledWidth) / 2;
    let newCenterY = (canvasSize.height - newScaledHeight) / 2;

    // Apply new zoom center offset
    if (targetCenter && newZoomLevel > 1) {
      const newZoomCenterOffsetX = (targetCenter.x - 0.5) * newScaledWidth;
      const newZoomCenterOffsetY = (targetCenter.y - 0.5) * newScaledHeight;
      newCenterX -= newZoomCenterOffsetX;
      newCenterY -= newZoomCenterOffsetY;
    }

    // Calculate the pan offset needed to maintain the visual center
    const centerOffsetX = canvasCenterX - currentCenterX;
    const centerOffsetY = canvasCenterY - currentCenterY;

    // Scale the offset by the zoom factor
    const scaledOffsetX = centerOffsetX * zoomFactor;
    const scaledOffsetY = centerOffsetY * zoomFactor;

    // Calculate new pan offset
    const newPanOffsetX = canvasCenterX - newCenterX - scaledOffsetX;
    const newPanOffsetY = canvasCenterY - newCenterY - scaledOffsetY;

    // Apply boundary constraints
    let newPanOffset = { x: newPanOffsetX, y: newPanOffsetY };
    newPanOffset = clampPanOffset(newPanOffset, image, canvasSize, scale, newZoomLevel);

    // Update states
    setZoomLevel(newZoomLevel);
    setZoomCenter(targetCenter);
    setPanOffset(newPanOffset);
    panOffsetRef.current = { ...newPanOffset };

    // Force redraw
    if (redrawCallback) {
      setTimeout(() => {
        redrawCallback();
      }, 0);
    }
  }, [image, zoomLevel, zoomCenter, panOffset, canvasSize, initialScale, clampPanOffset]);

  // Canvas control functions
  const zoomIn = useCallback((redrawCallback) => {
    const newZoomLevel = Math.min(zoomLevel * 1.2, 5);
    handleSmoothZoom(newZoomLevel, { x: 0.5, y: 0.5 }, redrawCallback);
  }, [zoomLevel, handleSmoothZoom]);

  const zoomOut = useCallback((redrawCallback) => {
    const newZoomLevel = Math.max(zoomLevel / 1.2, 0.5);
    handleSmoothZoom(newZoomLevel, { x: 0.5, y: 0.5 }, redrawCallback);
  }, [zoomLevel, handleSmoothZoom]);

  const resetView = useCallback((redrawCallback) => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setZoomCenter(null);
    panOffsetRef.current = { x: 0, y: 0 };
    
    // Force redraw
    if (redrawCallback) {
      setTimeout(() => {
        redrawCallback();
      }, 0);
    }
  }, []);

  // Set zoom parameters (for external control)
  const setZoomParameters = useCallback((level, center, redrawCallback) => {
    if (typeof level === 'number' && level > 0) {
      setZoomLevel(level);
    }
    
    if (center && typeof center.x === 'number' && typeof center.y === 'number') {
      setZoomCenter({...center});
    }
    
    // Force multiple redraws to ensure updates are applied
    if (redrawCallback) {
      const redrawDelays = [20, 100, 200];
      redrawDelays.forEach(delay => {
        setTimeout(() => {
          redrawCallback();
        }, delay);
      });
    }
    
    return {
      appliedLevel: level,
      appliedCenter: center
    };
  }, []);

  return {
    // State
    zoomLevel,
    panOffset,
    zoomCenter,
    isPanning,
    panStart,
    
    // Setters
    setZoomLevel,
    setPanOffset,
    setZoomCenter,
    
    // Functions
    canvasToImageCoords,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleWheel,
    handleSmoothZoom,
    zoomIn,
    zoomOut,
    resetView,
    setZoomParameters,
    
    // Refs (for external access if needed)
    isDraggingRef,
    panOffsetRef
  };
}; 