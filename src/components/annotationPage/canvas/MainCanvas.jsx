import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { useCurrentImage, useZoomLevel, usePanOffset, useSetZoomLevel, useSetPanOffset, useCurrentTool } from '../../../stores/selectors/annotationSelectors';
import { useImageLoader } from '../../../hooks/useImageLoader';
import { useCanvasInteractions } from '../../../hooks/useCanvasInteractions';
import CanvasContainer from './CanvasContainer';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';

const MainCanvas = forwardRef((props, ref) => {
  const containerRef = useRef(null);
  
  // Zustand store state
  const currentImage = useCurrentImage();
  const zoomLevel = useZoomLevel();
  const panOffset = usePanOffset();
  const currentTool = useCurrentTool();
  
  // Zustand store actions
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();

  // Custom hooks
  const { imageObject, imageLoading, imageError, loadImage } = useImageLoader(currentImage);
  const { isDragging, isPanMode } = useCanvasInteractions(containerRef);

  // Determine cursor based on tool and state
  const getCursorClass = () => {
    if (isDragging) return 'cursor-grabbing';
    if (isPanMode) return 'cursor-grab';
    
    switch (currentTool) {
      case 'selection':
        return 'cursor-pointer'; // Hand pointer for selection
      case 'manual_drawing':
        return 'cursor-crosshair'; // Crosshair for drawing
      case 'ai_annotation':
        return 'cursor-crosshair'; // Crosshair for AI annotation
      case 'completion':
        return 'cursor-pointer'; // Hand pointer for completion
      default:
        return 'cursor-default';
    }
  };

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      setZoomLevel(prev => Math.min(prev * 1.2, 10));
    },
    zoomOut: () => {
      setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
    },
    resetView: () => {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    },
    setZoom: (level) => {
      setZoomLevel(level);
    },
    getZoomLevel: () => zoomLevel,
    getPanOffset: () => panOffset
  }));



  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 ${getCursorClass()}`}
      onDragStart={(e) => e.preventDefault()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      {/* Pan mode indicator */}
      {isPanMode && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg z-50">
          Pan Mode - Hold Space + Drag
        </div>
      )}
      
      {imageLoading && <LoadingState />}

      {imageError && (
        <ErrorState 
          error={imageError} 
          onRetry={() => currentImage && loadImage(currentImage)} 
        />
      )}

      {!imageLoading && !imageError && imageObject && (
        <CanvasContainer
          imageObject={imageObject}
          currentImage={currentImage}
          zoomLevel={zoomLevel}
          panOffset={panOffset}
          isDragging={isDragging}
        />
      )}

      {!imageLoading && !imageError && !imageObject && currentImage && (
        <EmptyState
          title="No Image Selected"
          message="Select an image from the gallery to start annotating"
        />
      )}

      {!currentImage && (
        <EmptyState
          title="No Image Available"
          message="No images found in this dataset"
        />
      )}
    </div>
  );
});

MainCanvas.displayName = 'MainCanvas';

export default MainCanvas;
