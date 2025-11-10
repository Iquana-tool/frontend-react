import React, { useRef, useEffect, useState } from 'react';
import {
  useFocusModeActive,
  useFocusModeObjectId,
  useFocusModeObjectMask,
  useExitFocusMode,
  useObjectsList,
  useImageObject,
  useEnterFocusModeWithZoom,
  useSetPanOffset,
} from '../../../stores/selectors/annotationSelectors';
import { calculateBoundingBox, calculateFocusTransformSimple } from '../../../utils/geometryUtils';

const FocusOverlay = ({ canvasRef, zoomLevel = 1, panOffset = { x: 0, y: 0 } }) => {
  const focusModeActive = useFocusModeActive();
  const focusedObjectId = useFocusModeObjectId();
  const focusedObjectMask = useFocusModeObjectMask();
  const exitFocusMode = useExitFocusMode();
  const objectsList = useObjectsList();
  const imageObject = useImageObject();
  const enterFocusModeWithZoom = useEnterFocusModeWithZoom();
  const setPanOffset = useSetPanOffset();
  const containerRef = canvasRef; // Use the same container reference as SegmentationOverlay
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [hasAppliedFocusZoom, setHasAppliedFocusZoom] = useState(false);


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

  // Auto-zoom and center when focus mode is activated
  useEffect(() => {
    if (focusModeActive && focusedObjectId && focusedObjectMask && imageDimensions.width > 0 && !hasAppliedFocusZoom) {
      // Find the focused object
      const focusedObject = objectsList.find(obj => obj.id === focusedObjectId);
      if (focusedObject && focusedObject.mask && focusedObject.mask.points) {
        const imageDimensionsForCalc = {
          width: imageObject.width,
          height: imageObject.height
        };
        
        const containerDimensions = {
          width: containerRef.current?.offsetWidth || 800,
          height: containerRef.current?.offsetHeight || 600
        };
        
        // Apply the focus transform with proper dimensions
        enterFocusModeWithZoom(focusedObjectId, focusedObjectMask, imageDimensionsForCalc, containerDimensions, imageDimensions);
        setHasAppliedFocusZoom(true);
      }
    }
  }, [focusModeActive, focusedObjectId, focusedObjectMask, imageDimensions, hasAppliedFocusZoom, objectsList, imageObject, enterFocusModeWithZoom]);

  // Reset focus zoom flag when exiting focus mode
  useEffect(() => {
    if (!focusModeActive) {
      setHasAppliedFocusZoom(false);
    }
  }, [focusModeActive]);

  // Note: Pan calculation is now handled by the improved calculateFocusTransformSimple function
  // No additional pan adjustment needed here

  if (!focusModeActive || !focusedObjectId || !focusedObjectMask) {
    return null;
  }

  // Find the focused object
  const focusedObject = objectsList.find(obj => obj.id === focusedObjectId);
  if (!focusedObject) {
    exitFocusMode();
    return null;
  }

  // Validate mask data
  if (!focusedObjectMask.path) {
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
        ref={containerRef}
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
                  d={focusedObjectMask.path}
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

      {/* Text overlays - outside transform, fixed to viewport */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
        {/* Exit focus mode button - fixed to viewport top-right */}
        <div className="absolute top-4 right-4 pointer-events-auto">
          <button
            onClick={exitFocusMode}
            className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm text-gray-800 rounded-lg shadow-xl hover:bg-white border border-gray-200/50 transition-all duration-200 hover:shadow-2xl"
          >
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span className="text-sm font-semibold">Exit Focus</span>
            <span className="text-xs text-gray-500 font-normal">(ESC)</span>
          </button>
        </div>

        {/* Focus mode indicator - fixed to viewport top-left */}
        <div className="absolute top-4 left-4 px-4 py-2.5 bg-white/95 backdrop-blur-sm text-gray-800 rounded-lg shadow-xl border border-gray-200/50 text-sm font-medium pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-700">Focus Mode</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-600 font-medium">{focusedObject.label || `Object #${focusedObject.id}`}</span>
              </div>
              <span className="text-xs text-gray-500">Press ESC to exit focus mode</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FocusOverlay;

