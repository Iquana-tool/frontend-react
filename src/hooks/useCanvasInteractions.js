import { useCallback, useEffect, useState } from 'react';
import { MAX_ZOOM, MIN_ZOOM } from '../components/annotationPage/workspace/constants';
import { 
  useZoomLevel, 
  usePanOffset,
  useSetZoomLevel,
  useSetPanOffset,
  useCurrentTool
} from '../stores/selectors/annotationSelectors';

export const useCanvasInteractions = (containerRef) => {
  const zoomLevel = useZoomLevel();
  const panOffset = usePanOffset();
  const currentTool = useCurrentTool();
  
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();

  // Pan mode is either held (spacebar) or latched (the rail's Pan tool).
  const [spacebarPan, setSpacebarPan] = useState(false);
  const isPanMode = spacebarPan || currentTool === 'pan';

  // Mouse wheel zoom handler with cursor-focal zoom math
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or in
    const oldZoomLevel = zoomLevel;
    const newZoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoomLevel * delta));

    if (newZoomLevel === oldZoomLevel) return;

    // Calculate mouse position relative to container center
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - (rect.left + rect.width / 2);
    const my = e.clientY - (rect.top + rect.height / 2);

    // Adjust pan offset so the image pixel under the cursor remains stationary
    const newPanX = panOffset.x + mx * (1 / newZoomLevel - 1 / oldZoomLevel);
    const newPanY = panOffset.y + my * (1 / newZoomLevel - 1 / oldZoomLevel);

    setZoomLevel(newZoomLevel);
    setPanOffset({ x: newPanX, y: newPanY });
  }, [containerRef, zoomLevel, panOffset, setZoomLevel, setPanOffset]);

  // Mouse drag panning handlers
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    // The AI prompt canvas handles its own panning, so this container stays out
    // of the way there. Selecting the Pan tool switches currentTool away from
    // 'ai_annotation', so latched panning is unaffected by this guard.
    if (currentTool === 'ai_annotation') return;
    
    // Only pan with middle mouse button or left mouse + spacebar (pan mode)
    if (e.button === 1 || (e.button === 0 && isPanMode)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      e.preventDefault();
    }
  }, [currentTool, isPanMode, panOffset]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newPanOffset = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      setPanOffset(newPanOffset);
      e.preventDefault();
    }
  }, [isDragging, dragStart, setPanOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch support for mobile (always enabled for touch)
  const handleTouchStart = useCallback((e) => {
    // Don't pan when using AI annotation tool - it has its own pan controls
    if (currentTool === 'ai_annotation') return;
    
    // For touch, allow panning without spacebar (mobile UX)
    if (e.touches.length === 1) { // Single finger
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
      e.preventDefault();
    }
  }, [currentTool, panOffset]);

  const handleTouchMove = useCallback((e) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const newPanOffset = {
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      };
      setPanOffset(newPanOffset);
      e.preventDefault();
    }
  }, [isDragging, dragStart, setPanOffset]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard handler for spacebar pan mode
  useEffect(() => {
    // Skip keyboard pan mode for AI annotation tool (it has its own)
    if (currentTool === 'ai_annotation') return;

    let spacebarPressed = false;

    const handleKeyDown = (e) => {
      // Only handle spacebar if not already pressed
      if (e.code === 'Space' && !spacebarPressed) {
        e.preventDefault();
        e.stopPropagation();
        spacebarPressed = true;
        setSpacebarPan(true);
      }
    };

    const handleKeyUp = (e) => {
      // Only handle spacebar if it was pressed
      if (e.code === 'Space' && spacebarPressed) {
        e.preventDefault();
        e.stopPropagation();
        spacebarPressed = false;
        setSpacebarPan(false);
      }
    };

    // Reset pan mode when focus is lost
    const handleBlur = () => {
      spacebarPressed = false;
      setSpacebarPan(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        spacebarPressed = false;
        setSpacebarPan(false);
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

  // Add event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Mouse events
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);

    // Touch events
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      // Mouse events
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      
      // Touch events
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isDragging,
    isPanMode,
    zoomLevel,
    panOffset
  };
};
