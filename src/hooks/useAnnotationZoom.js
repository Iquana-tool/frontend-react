import { useState, useCallback, useRef } from 'react';

export const useAnnotationZoom = () => {
  // Separate zoom state for annotation drawing area (prompting canvas)
  const [annotationZoomLevel, setAnnotationZoomLevel] = useState(1);
  const [annotationZoomCenter, setAnnotationZoomCenter] = useState({ x: 0.5, y: 0.5 });
  
  // Ref to the MainCanvas component for direct control
  const mainCanvasRef = useRef(null);

  // Reset zoom function for both viewers
  const resetZoomStates = useCallback((setZoomLevel, setZoomCenter, setSelectedFinalMaskContour, promptingCanvasRef) => {
    // Reset annotation drawing area zoom
    setAnnotationZoomLevel(1);
    setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
    
    // Reset final mask viewer zoom
    if (setZoomLevel) setZoomLevel(1);
    if (setZoomCenter) setZoomCenter({ x: 0.5, y: 0.5 });
    if (setSelectedFinalMaskContour) setSelectedFinalMaskContour(null);
    
    // Reset prompting canvas view if available
    if (promptingCanvasRef && promptingCanvasRef.current && promptingCanvasRef.current.resetView) {
      promptingCanvasRef.current.resetView();
    }
  }, []);

  // Annotation zoom handlers (for ToolsPanel - only affects prompting canvas)
  const handleAnnotationZoomIn = useCallback((selectedFinalMaskContour, setZoomLevel, promptingCanvasRef) => {
    // Use MainCanvas zoom if available, otherwise fallback to state
    if (mainCanvasRef.current && mainCanvasRef.current.zoomIn) {
      mainCanvasRef.current.zoomIn();
      // Update state to reflect the change
      setAnnotationZoomLevel((prev) => {
        const newLevel = Math.min(prev * 1.2, 5);
        if (newLevel !== 1 && (!prev || prev === 1)) {
          setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
        }
        return newLevel;
      });
    } else {
      // Fallback to state-based zoom
      setAnnotationZoomLevel((prev) => {
        const newLevel = Math.min(prev * 1.2, 5);
        if (newLevel !== 1 && (!prev || prev === 1)) {
          setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
        }
        return newLevel;
      });
    }
    
    // Sync with final mask view if a contour is selected
    if (selectedFinalMaskContour && setZoomLevel) {
      setZoomLevel((prev) => Math.min(prev * 1.2, 5));
    }
    
    // Apply zoom to prompting canvas if available
    if (promptingCanvasRef && promptingCanvasRef.current && promptingCanvasRef.current.zoomIn) {
      promptingCanvasRef.current.zoomIn();
    }
  }, []);

  const handleAnnotationZoomOut = useCallback((selectedFinalMaskContour, setZoomLevel, promptingCanvasRef) => {
    // Use MainCanvas zoom if available, otherwise fallback to state
    if (mainCanvasRef.current && mainCanvasRef.current.zoomOut) {
      mainCanvasRef.current.zoomOut();
      // Update state to reflect the change
      setAnnotationZoomLevel((prev) => Math.max(prev / 1.2, 0.5));
    } else {
      // Fallback to state-based zoom
      setAnnotationZoomLevel((prev) => Math.max(prev / 1.2, 0.5));
    }
    
    // Sync with final mask view if a contour is selected
    if (selectedFinalMaskContour && setZoomLevel) {
      setZoomLevel((prev) => Math.max(prev / 1.2, 0.5));
    }
    
    // Apply zoom to prompting canvas if available
    if (promptingCanvasRef && promptingCanvasRef.current && promptingCanvasRef.current.zoomOut) {
      promptingCanvasRef.current.zoomOut();
    }
  }, []);

  const handleAnnotationResetView = useCallback((setZoomLevel, setZoomCenter, setSelectedFinalMaskContour, promptingCanvasRef) => {
    // Use MainCanvas reset if available, otherwise fallback to state
    if (mainCanvasRef.current && mainCanvasRef.current.resetView) {
      mainCanvasRef.current.resetView();
    }
    
    // Reset state
    setAnnotationZoomLevel(1);
    setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
    
    // Also reset the final mask view zoom to keep them synced
    if (setZoomLevel) setZoomLevel(1);
    if (setZoomCenter) setZoomCenter({ x: 0.5, y: 0.5 });
    if (setSelectedFinalMaskContour) setSelectedFinalMaskContour(null);
    
    // Reset prompting canvas view if available
    if (promptingCanvasRef && promptingCanvasRef.current && promptingCanvasRef.current.resetView) {
      promptingCanvasRef.current.resetView();
    }
  }, []);

  return {
    // State
    annotationZoomLevel,
    setAnnotationZoomLevel,
    annotationZoomCenter,
    setAnnotationZoomCenter,
    
    // Refs
    mainCanvasRef,
    
    // Functions
    resetZoomStates,
    handleAnnotationZoomIn,
    handleAnnotationZoomOut,
    handleAnnotationResetView,
  };
}; 