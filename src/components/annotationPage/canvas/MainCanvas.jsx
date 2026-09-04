import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import {
  useCurrentImage,
  useZoomLevel,
  usePanOffset,
  useSetZoomLevel,
  useSetPanOffset,
  useClearSelection,
  useCurrentTool,
} from '../../../stores/selectors/annotationSelectors';
import { useImageLoader } from '../../../hooks/useImageLoader';
import { useCanvasInteractions } from '../../../hooks/useCanvasInteractions';
import useContourLoading from '../../../hooks/useContourLoading';
import { clampZoom, ZOOM_STEP } from '../workspace/constants';
import CanvasContainer from './CanvasContainer';
import LoadingState from './LoadingState';
import ContourLoadingState from './ContourLoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';

const MainCanvas = forwardRef((props, ref) => {
  const containerRef = useRef(null);

  const currentImage = useCurrentImage();
  const zoomLevel = useZoomLevel();
  const panOffset = usePanOffset();
  const currentTool = useCurrentTool();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();
  const clearSelection = useClearSelection();

  const { imageObject, imageLoading, imageError, loadImage } = useImageLoader(currentImage);
  // The image is passed in so panning can be clamped against the fitted image's real
  // size — without it the canvas cannot tell when the image has left the viewport.
  const { isDragging, isPanMode } = useCanvasInteractions(containerRef, imageObject);
  const {
    loading: contoursLoading,
    error: contoursError,
    retry: retryContours,
  } = useContourLoading();

  const getCursorClass = () => {
    if (isDragging) return 'cursor-grabbing';
    if (isPanMode || currentTool === 'pan') return 'cursor-grab';
    if (currentTool === 'zoom') return 'cursor-zoom-in';
    if (currentTool === 'selection') return 'cursor-pointer';
    if (currentTool === 'manual_drawing' || currentTool === 'ai_annotation') {
      return 'cursor-crosshair';
    }
    return 'cursor-default';
  };

  useImperativeHandle(ref, () => ({
    zoomIn: () => setZoomLevel(clampZoom(zoomLevel * ZOOM_STEP)),
    zoomOut: () => setZoomLevel(clampZoom(zoomLevel / ZOOM_STEP)),
    resetView: () => {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    },
    setZoom: (level) => setZoomLevel(clampZoom(level)),
    getZoomLevel: () => zoomLevel,
    getPanOffset: () => panOffset,
  }));

  // The zoom tool zooms on click (alt-click zooms out); clicking empty canvas
  // with any other tool clears the selection, as the design specifies.
  const handleBackgroundClick = (event) => {
    if (currentTool === 'zoom') {
      setZoomLevel(clampZoom(zoomLevel * (event.altKey ? 1 / ZOOM_STEP : ZOOM_STEP)));
      return;
    }
    if (event.target === event.currentTarget) clearSelection();
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 flex items-center justify-center bg-canvasbg ${getCursorClass()}`}
      onClick={handleBackgroundClick}
      onDragStart={(e) => e.preventDefault()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      {imageLoading && <LoadingState />}

      {imageError && (
        <ErrorState error={imageError} onRetry={() => currentImage && loadImage(currentImage)} />
      )}

      {!imageLoading && !imageError && imageObject && (
        <>
          <CanvasContainer
            imageObject={imageObject}
            currentImage={currentImage}
            zoomLevel={zoomLevel}
            panOffset={panOffset}
          />
          {/* Sits over the loaded image, not over the image loader: the two are separate
              waits, and the contours regularly outlast the picture they belong to. */}
          {(contoursLoading || contoursError) && (
            <ContourLoadingState error={contoursError} onRetry={retryContours} />
          )}
        </>
      )}

      {!imageLoading && !imageError && !imageObject && currentImage && (
        <EmptyState
          title="No Image Selected"
          message="Select an image from the navigator to start annotating"
        />
      )}

      {!currentImage && (
        <EmptyState title="No Image Available" message="No images found in this dataset" />
      )}
    </div>
  );
});

MainCanvas.displayName = 'MainCanvas';

export default MainCanvas;
