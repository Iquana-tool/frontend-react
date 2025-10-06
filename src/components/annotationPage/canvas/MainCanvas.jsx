import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { useCurrentImage, useZoomLevel, usePanOffset, useSetZoomLevel, useSetPanOffset } from '../../../stores/selectors/annotationSelectors';
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
  
  // Zustand store actions
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();

  // Custom hooks
  const { imageObject, imageLoading, imageError, loadImage } = useImageLoader(currentImage);
  const { isDragging } = useCanvasInteractions(containerRef);

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
      className={`absolute inset-0 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
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
