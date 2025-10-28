import React, { useState, useEffect, useRef } from 'react';
import { useCurrentMask, useObjectsList, useAddObject, useImageObject } from '../../../stores/selectors/annotationSelectors';

const SegmentationOverlay = ({ canvasRef, zoomLevel = 1, panOffset = { x: 0, y: 0 } }) => {
  const currentMask = useCurrentMask();
  const objectsList = useObjectsList();
  const addObject = useAddObject();
  const imageObject = useImageObject();
  const containerRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, x: 0, y: 0 });

  // Calculate the actual rendered dimensions of the image after object-contain is applied
  useEffect(() => {
    if (!containerRef.current || !imageObject) return;

    const updateDimensions = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const imageAspect = imageObject.width / imageObject.height;
      const containerAspect = containerWidth / containerHeight;

      let renderedWidth, renderedHeight, x, y;

      if (imageAspect > containerAspect) {
        // Image is wider - fit to width
        renderedWidth = containerWidth;
        renderedHeight = containerWidth / imageAspect;
        x = 0;
        y = (containerHeight - renderedHeight) / 2;
      } else {
        // Image is taller - fit to height
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

    // Handle container resize
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [imageObject]);

  const handleMaskClick = (e) => {
    if (currentMask) {
      // Add the current mask to final objects
      addObject({
        mask: currentMask,
        pixelCount: currentMask.pixelCount || 0,
        label: `Object #${objectsList.length + 1}`
      });
    }
  };

  // Get viewBox dimensions from loaded image
  const viewBox = imageObject 
    ? `0 0 ${imageObject.width} ${imageObject.height}`
    : '0 0 800 600'; // Fallback dimensions

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
        transformOrigin: 'center center',
        transition: 'transform 0.2s ease-out'
      }}
    >
      {/* Current Segmentation Mask */}
      {currentMask && imageDimensions.width > 0 && (
        <svg 
          className="absolute pointer-events-auto"
          viewBox={viewBox}
          preserveAspectRatio="none"
          onClick={handleMaskClick}
          style={{ 
            cursor: 'pointer',
            left: `${imageDimensions.x}px`,
            top: `${imageDimensions.y}px`,
            width: `${imageDimensions.width}px`,
            height: `${imageDimensions.height}px`
          }}
        >
          <defs>
            <style>
              {`
                .segmentation-path {
                  animation: dash 2s linear infinite;
                }
                @keyframes dash {
                  to {
                    stroke-dashoffset: -20;
                  }
                }
              `}
            </style>
          </defs>
          <path
            d={currentMask.path}
            fill="rgba(59, 130, 246, 0.3)"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeDasharray="8,4"
            className="segmentation-path"
          />
        </svg>
      )}

      {/* Final Objects Masks */}
      {imageDimensions.width > 0 && objectsList.map((object) => (
        <svg 
          key={object.id} 
          className="absolute"
          viewBox={viewBox}
          preserveAspectRatio="none"
          style={{
            left: `${imageDimensions.x}px`,
            top: `${imageDimensions.y}px`,
            width: `${imageDimensions.width}px`,
            height: `${imageDimensions.height}px`
          }}
        >
          <path
            d={object.mask?.path}
            fill="rgba(59, 130, 246, 0.1)"
            stroke={object.color}
            strokeWidth="2"
            strokeDasharray="8,4"
          />
        </svg>
      ))}
    </div>
  );
};

export default SegmentationOverlay;
