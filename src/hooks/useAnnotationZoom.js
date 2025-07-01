import { useState, useCallback } from 'react';

export const useAnnotationZoom = () => {
  // Separate zoom state for annotation drawing area (prompting canvas)
  const [annotationZoomLevel, setAnnotationZoomLevel] = useState(1);
  const [annotationZoomCenter, setAnnotationZoomCenter] = useState({ x: 0.5, y: 0.5 });

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
    setAnnotationZoomLevel((prev) => {
      const newLevel = Math.min(prev * 1.2, 5);
      // Ensure we have a center when zooming from 1 → something
      if (newLevel !== 1 && (!prev || prev === 1)) {
        setAnnotationZoomCenter({ x: 0.5, y: 0.5 });
      }
      
      // Sync with final mask view if a contour is selected
      if (selectedFinalMaskContour && setZoomLevel) {
        setZoomLevel(newLevel);
      }
      
      return newLevel;
    });
    // Apply zoom to prompting canvas if available
    if (promptingCanvasRef && promptingCanvasRef.current && promptingCanvasRef.current.zoomIn) {
      promptingCanvasRef.current.zoomIn();
    }
  }, []);

  const handleAnnotationZoomOut = useCallback((selectedFinalMaskContour, setZoomLevel, promptingCanvasRef) => {
    setAnnotationZoomLevel((prev) => {
      const newLevel = Math.max(prev / 1.2, 0.5);
      
      // Sync with final mask view if a contour is selected
      if (selectedFinalMaskContour && setZoomLevel) {
        setZoomLevel(newLevel);
      }
      
      return newLevel;
    });
    // Apply zoom to prompting canvas if available
    if (promptingCanvasRef && promptingCanvasRef.current && promptingCanvasRef.current.zoomOut) {
      promptingCanvasRef.current.zoomOut();
    }
  }, []);

  const handleAnnotationResetView = useCallback((setZoomLevel, setZoomCenter, setSelectedFinalMaskContour, promptingCanvasRef) => {
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
    
    // Functions
    resetZoomStates,
    handleAnnotationZoomIn,
    handleAnnotationZoomOut,
    handleAnnotationResetView,
  };
}; 