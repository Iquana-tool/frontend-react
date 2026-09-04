import { useCallback, useEffect, useState } from 'react';
import { clampZoom } from '../components/annotationPage/workspace/constants';
import { clampPan, panForDrag, panForFocalZoom } from '../utils/canvasViewport';
import { 
  useZoomLevel, 
  usePanOffset,
  useSetZoomLevel,
  useSetPanOffset,
  useCurrentTool
} from '../stores/selectors/annotationSelectors';

/** Zoom multiplier for one wheel notch. */
const WHEEL_STEP = 1.1;

/**
 * Whether a pointer event originated inside a Konva stage.
 *
 * In Annotate mode the AI-prompt and manual-draw canvases are Konva stages laid over this
 * container, driving zoom and pan from the same store values. Konva calls `preventDefault`
 * on the wheel but not `stopPropagation`, so the event still reaches this container, which
 * would then apply a second zoom step from its own closure. Calibrate mode mounts no stage.
 *
 * Checking the DOM rather than the active tool keeps this correct for any stage added later,
 * without each one having to stop the event itself.
 */
const fromKonvaStage = (event) => {
  const target = event.target;
  return target instanceof Element && !!target.closest('.konvajs-content');
};

export const useCanvasInteractions = (containerRef, imageObject = null) => {
  const zoomLevel = useZoomLevel();
  const panOffset = usePanOffset();
  const currentTool = useCurrentTool();
  
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();

  // Pan mode is either held (spacebar) or latched (the rail's Pan tool).
  const [spacebarPan, setSpacebarPan] = useState(false);
  const isPanMode = spacebarPan || currentTool === 'pan';

  /**
   * Keep a pan from putting the image entirely outside the viewport.
   *
   * Needs the image's intrinsic size to derive the fitted size; without one (still loading)
   * the pan passes through unclamped rather than being measured against a guess.
   */
  const clampToImage = useCallback((pan, zoom, containerSize) => {
    if (!imageObject?.width || !imageObject?.height) return pan;
    return clampPan({
      pan,
      zoom,
      containerSize,
      imageSize: { width: imageObject.width, height: imageObject.height },
    });
  }, [imageObject]);

  // Mouse wheel zoom, anchored on the pointer.
  const handleWheel = useCallback((e) => {
    if (fromKonvaStage(e)) return;
    e.preventDefault();
    if (!containerRef.current) return;

    const newZoom = clampZoom(zoomLevel * (e.deltaY > 0 ? 1 / WHEEL_STEP : WHEEL_STEP));
    if (newZoom === zoomLevel) return;

    const rect = containerRef.current.getBoundingClientRect();
    const containerSize = { width: rect.width, height: rect.height };
    const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const focal = panForFocalZoom({
      pointer,
      containerSize,
      panOffset,
      oldZoom: zoomLevel,
      newZoom,
    });

    setZoomLevel(newZoom);
    setPanOffset(clampToImage(focal, newZoom, containerSize));
  }, [containerRef, zoomLevel, panOffset, setZoomLevel, setPanOffset, clampToImage]);

  // Mouse drag panning handlers
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  const handleMouseDown = useCallback((e) => {
    // The AI prompt canvas handles its own panning, so this container stays out
    // of the way there. Selecting the Pan tool switches currentTool away from
    // 'ai_annotation', so latched panning is unaffected by this guard.
    if (currentTool === 'ai_annotation' || fromKonvaStage(e)) return;

    // Only pan with middle mouse button or left mouse + spacebar (pan mode)
    if (e.button === 1 || (e.button === 0 && isPanMode)) {
      setIsDragging(true);
      // Press position and the pan at that moment are stored separately: the screen delta
      // is divided by the zoom to become a pan, so the two cannot be pre-added into a
      // single anchor.
      setDragStart({ x: e.clientX, y: e.clientY, panX: panOffset.x, panY: panOffset.y });
      e.preventDefault();
    }
  }, [currentTool, isPanMode, panOffset]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const next = panForDrag({
      panOffset: { x: dragStart.panX, y: dragStart.panY },
      delta: { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y },
      zoom: zoomLevel,
    });
    setPanOffset(clampToImage(next, zoomLevel, { width: rect.width, height: rect.height }));
    e.preventDefault();
  }, [isDragging, dragStart, setPanOffset, zoomLevel, containerRef, clampToImage]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch support for mobile (always enabled for touch)
  const handleTouchStart = useCallback((e) => {
    // Don't pan when using AI annotation tool - it has its own pan controls
    if (currentTool === 'ai_annotation' || fromKonvaStage(e)) return;

    // For touch, allow panning without spacebar (mobile UX)
    if (e.touches.length === 1) { // Single finger
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY, panX: panOffset.x, panY: panOffset.y });
      e.preventDefault();
    }
  }, [currentTool, panOffset]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length !== 1 || !containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const next = panForDrag({
      panOffset: { x: dragStart.panX, y: dragStart.panY },
      delta: { x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y },
      zoom: zoomLevel,
    });
    setPanOffset(clampToImage(next, zoomLevel, { width: rect.width, height: rect.height }));
    e.preventDefault();
  }, [isDragging, dragStart, setPanOffset, zoomLevel, containerRef, clampToImage]);

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
