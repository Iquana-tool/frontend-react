import { useCallback, useEffect, useState } from 'react';
import { 
  useZoomLevel, 
  usePanOffset,
  useSetZoomLevel,
  useSetPanOffset
} from '../stores/selectors/annotationSelectors';

export const useCanvasInteractions = (containerRef) => {
  const zoomLevel = useZoomLevel();
  const panOffset = usePanOffset();
  
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();

  // Mouse wheel zoom handler
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or in
    const newZoomLevel = Math.max(0.1, Math.min(10, zoomLevel * delta));
    setZoomLevel(newZoomLevel);
  }, [zoomLevel, setZoomLevel]);

  // Mouse drag panning handlers
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      e.preventDefault();
    }
  }, [panOffset]);

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

  // Touch support for mobile
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) { // Single finger
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
      e.preventDefault();
    }
  }, [panOffset]);

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
    zoomLevel,
    panOffset
  };
};
