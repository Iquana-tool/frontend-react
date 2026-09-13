import React, { useRef, useEffect, useState } from 'react';
import ModeBanner from '../workspace/ModeBanner';
import {
  useFocusModeActive,
  useFocusModeObjectId,
  useFocusModeObjectMask,
  useExitFocusMode,
  useObjectsList,
  useImageObject,
  useSetPanOffset,
  useRefinementModeActive,
  useSetZoomLevel,
} from '../../../stores/selectors/annotationSelectors';
import annotationSession from '../../../services/annotationSession';

const FocusOverlay = ({ canvasRef, zoomLevel = 1, panOffset = { x: 0, y: 0 } }) => {
  const focusModeActive = useFocusModeActive();
  const focusedObjectId = useFocusModeObjectId();
  const focusedObjectMask = useFocusModeObjectMask();
  const exitFocusMode = useExitFocusMode();
  const objectsList = useObjectsList();
  const imageObject = useImageObject();
  const setPanOffset = useSetPanOffset();
  const setZoomLevel = useSetZoomLevel();
  const refinementModeActive = useRefinementModeActive();
  // Geometry is measured from the image element, exactly as SegmentationOverlay
  // does. The dim layer gets its own ref — binding it to `canvasRef` made React
  // overwrite the image reference with the overlay div.
  const containerRef = canvasRef;
  const dimRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const handleExitFocusMode = async () => {
    try {
      // Send unfocus message to backend via WebSocket
      if (annotationSession.isReady()) {
        await annotationSession.unfocusImage();
      }
    } catch (error) {
      console.error('Failed to send unfocus message:', error);
    }
    
    // Reset zoom and pan before exiting
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    // Exit focus mode
    exitFocusMode();
  };


  // Calculate the actual rendered dimensions of the image
  useEffect(() => {
    if (!containerRef.current || !imageObject) return;

    const updateDimensions = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      if (containerWidth === 0 || containerHeight === 0) {
        return;
      }
      
      if (!imageObject.width || !imageObject.height) {
        return;
      }

      const imageAspect = imageObject.width / imageObject.height;
      const containerAspect = containerWidth / containerHeight;

      let renderedWidth, renderedHeight, x, y;

      if (imageAspect > containerAspect) {
        renderedWidth = containerWidth;
        renderedHeight = containerWidth / imageAspect;
        x = 0;
        y = (containerHeight - renderedHeight) / 2;
      } else {
        renderedWidth = containerHeight * imageAspect;
        renderedHeight = containerHeight;
        x = (containerWidth - renderedWidth) / 2;
        y = 0;
      }


      setImageDimensions({
        width: renderedWidth,
        height: renderedHeight,
        x,
        y
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    const currentContainer = containerRef.current;
    resizeObserver.observe(currentContainer);

    return () => {
      if (currentContainer) {
        resizeObserver.unobserve(currentContainer);
      }
      resizeObserver.disconnect();
    };
  }, [imageObject]);


  // Note: Pan calculation is now handled by the improved calculateFocusTransformSimple function
  // No additional pan adjustment needed here

  // Hide focus overlay when refinement mode is active
  if (refinementModeActive) {
    return null;
  }

  if (!focusModeActive || !focusedObjectId || !focusedObjectMask) {
    return null;
  }

  // Find the focused object
  const focusedObject = objectsList.find(obj => obj.id === focusedObjectId);
  if (!focusedObject) {
    // Cleanup: send unfocus if session is ready
    if (annotationSession.isReady()) {
      annotationSession.unfocusImage().catch(err => 
        console.error('Failed to send unfocus message:', err)
      );
    }
    exitFocusMode();
    return null;
  }

  // Generate path from points if path doesn't exist
  let maskPath = focusedObjectMask.path;
  if (!maskPath && focusedObjectMask.points && imageObject) {
    // Convert points array to SVG path
    if (focusedObjectMask.points.length > 0) {
      const firstPoint = focusedObjectMask.points[0];
      const startX = Array.isArray(firstPoint) ? firstPoint[0] : firstPoint.x;
      const startY = Array.isArray(firstPoint) ? firstPoint[1] : firstPoint.y;
      maskPath = `M ${startX} ${startY}`;
      
      for (let i = 1; i < focusedObjectMask.points.length; i++) {
        const point = focusedObjectMask.points[i];
        const x = Array.isArray(point) ? point[0] : point.x;
        const y = Array.isArray(point) ? point[1] : point.y;
        maskPath += ` L ${x} ${y}`;
      }
      maskPath += ' Z';
    }
  }

  // Validate mask data
  if (!maskPath) {
    // Cleanup: send unfocus if session is ready
    if (annotationSession.isReady()) {
      annotationSession.unfocusImage().catch(err => 
        console.error('Failed to send unfocus message:', err)
      );
    }
    exitFocusMode();
    return null;
  }

  const viewBox = imageObject 
    ? `0 0 ${imageObject.width} ${imageObject.height}`
    : '0 0 800 600';

  return (
    <>
      {/* Dimmed overlay with cutout for focused object - inside transform */}
      <div 
        ref={dimRef}
        className="absolute inset-0 pointer-events-none"
        style={{ 
          zIndex: 40,
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: 'center center'
        }}
      >
        {imageDimensions.width > 0 && (
          <svg 
            className="absolute"
            viewBox={viewBox}
            preserveAspectRatio="none"
            style={{
              left: `${imageDimensions.x}px`,
              top: `${imageDimensions.y}px`,
              width: `${imageDimensions.width}px`,
              height: `${imageDimensions.height}px`,
            }}
          >
            <defs>
              <mask id="focus-mask">
                <rect width="100%" height="100%" fill="white" />
                <path
                  d={maskPath}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.7)"
              mask="url(#focus-mask)"
            />
          </svg>
        )}
      </div>

      <ModeBanner
        title="Focus Mode"
        subject={focusedObject.label || `Object #${focusedObject.id}`}
        hint="Annotations you draw are nested inside this object"
        dotClass="bg-ok"
        exitLabel="Exit focus"
        onExit={handleExitFocusMode}
      />
    </>
  );
};

export default FocusOverlay;

