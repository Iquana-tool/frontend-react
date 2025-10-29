import React, { useState, useEffect, useRef } from 'react';
import { 
  useCurrentMask, 
  useObjectsList, 
  useImageObject,
  useShowContextMenu,
  useEnterFocusMode,
} from '../../../stores/selectors/annotationSelectors';
import annotationSession from '../../../services/annotationSession';
import { findObjectAtPoint } from '../../../utils/geometryUtils';

const SegmentationOverlay = ({ canvasRef, zoomLevel = 1, panOffset = { x: 0, y: 0 } }) => {
  const currentMask = useCurrentMask();
  const objectsList = useObjectsList();
  const imageObject = useImageObject();
  const showContextMenu = useShowContextMenu();
  const enterFocusMode = useEnterFocusMode();
  const containerRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [hoveredObjectId, setHoveredObjectId] = useState(null);

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
    const currentContainer = containerRef.current;
    resizeObserver.observe(currentContainer);

    return () => {
      if (currentContainer) {
        resizeObserver.unobserve(currentContainer);
      }
      resizeObserver.disconnect();
    };
  }, [imageObject]);

  // Helper function to convert hex color to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Convert screen coordinates to image pixel coordinates
  const screenToImageCoords = (screenX, screenY, svgElement) => {
    if (!imageObject || !imageDimensions.width || !svgElement) return null;

    const svgRect = svgElement.getBoundingClientRect();
    const svgX = screenX - svgRect.left;
    const svgY = screenY - svgRect.top;
    
    const scaleX = imageObject.width / imageDimensions.width;
    const scaleY = imageObject.height / imageDimensions.height;
    
    return { 
      x: svgX * scaleX, 
      y: svgY * scaleY 
    };
  };

  // Handle left-click on objects (enter focus mode)
  const handleObjectLeftClick = (e, object) => {
    e.stopPropagation();
    
    // Convert click coordinates to image pixel coordinates
    const imageCoords = screenToImageCoords(e.clientX, e.clientY, e.currentTarget);
    if (!imageCoords) return;
    
    // Check if click is actually inside the object boundary
    const clickedObject = findObjectAtPoint(imageCoords.x, imageCoords.y, [object]);
    if (!clickedObject) return;
    
    // Enter focus mode for this object
    enterFocusMode(object.id, object.mask);
  };

  // Handle right-click on objects (show context menu)
  const handleObjectRightClick = (e, object) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Convert click coordinates to image pixel coordinates
    const imageCoords = screenToImageCoords(e.clientX, e.clientY, e.currentTarget);
    if (!imageCoords) return;
    
    // Check if click is actually inside the object boundary
    const clickedObject = findObjectAtPoint(imageCoords.x, imageCoords.y, [object]);
    if (!clickedObject) return;
    
    // Get the canvas container to calculate relative coordinates
    // The containerRef points to the outer div with position: relative
    const canvasContainer = containerRef.current;
    if (!canvasContainer) return;
    
    const containerRect = canvasContainer.getBoundingClientRect();
    
    // Convert viewport coordinates to container-relative coordinates
    const containerX = e.clientX - containerRect.left;
    const containerY = e.clientY - containerRect.top;
    
    console.log('[SegmentationOverlay] Context menu positioning:', {
      viewport: { x: e.clientX, y: e.clientY },
      container: { x: containerX, y: containerY },
      containerRect: { left: containerRect.left, top: containerRect.top }
    });
    
    // Show context menu at the container-relative position
    showContextMenu(containerX, containerY, object.id);
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
        transition: 'transform 0.2s ease-out',
        zIndex: 30 // Higher than AIPromptCanvas (z-10) to ensure clicks work
      }}
    >
      {/* Current Segmentation Mask - Visual preview only (auto-converted to object) */}
      {currentMask && imageDimensions.width > 0 && (
        <svg 
          className="absolute pointer-events-none"
          viewBox={viewBox}
          preserveAspectRatio="none"
          style={{ 
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
                  animation: dash 1.5s linear infinite, pulse 1.5s ease-in-out infinite;
                }
                @keyframes dash {
                  to {
                    stroke-dashoffset: -20;
                  }
                }
                @keyframes pulse {
                  0%, 100% {
                    opacity: 1;
                  }
                  50% {
                    opacity: 0.7;
                  }
                }
              `}
            </style>
            {/* Glow filter for the preview mask */}
            <filter id="preview-glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            d={currentMask.path}
            fill="rgba(59, 130, 246, 0.25)"
            stroke="#3B82F6"
            strokeWidth="3.5"
            strokeDasharray="10,5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="segmentation-path"
            filter="url(#preview-glow)"
            style={{ pointerEvents: 'none' }}
          />
        </svg>
      )}

      {/* Final Objects Masks */}
      {imageDimensions.width > 0 && objectsList.map((object) => {
        const isHovered = hoveredObjectId === object.id;
        const fillOpacity = isHovered ? 0.3 : 0.2;
        const strokeWidth = isHovered ? 3 : 2.5;
        const glowIntensity = isHovered ? 8 : 4;
        
        return (
          <svg 
            key={object.id} 
            className="absolute pointer-events-auto transition-all duration-200"
            viewBox={viewBox}
            preserveAspectRatio="none"
            onClick={(e) => handleObjectLeftClick(e, object)}
            onContextMenu={(e) => handleObjectRightClick(e, object)}
            onMouseEnter={() => setHoveredObjectId(object.id)}
            onMouseLeave={() => setHoveredObjectId(null)}
            style={{
              left: `${imageDimensions.x}px`,
              top: `${imageDimensions.y}px`,
              width: `${imageDimensions.width}px`,
              height: `${imageDimensions.height}px`,
              cursor: 'pointer'
            }}
          >
            <defs>
              {/* Drop shadow filter for depth */}
              <filter id={`shadow-${object.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                <feOffset dx="0" dy="2" result="offsetblur"/>
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3"/>
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Glow filter for better visibility */}
              <filter id={`glow-${object.id}`}>
                <feGaussianBlur stdDeviation={glowIntensity} result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <path
              d={object.mask?.path}
              fill={hexToRgba(object.color, fillOpacity)}
              stroke={object.color}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              filter={isHovered ? `url(#glow-${object.id})` : `url(#shadow-${object.id})`}
              style={{ 
                pointerEvents: 'none', 
                transition: 'all 0.2s ease-in-out'
              }}
            />
          </svg>
        );
      })}
    </div>
  );
};

export default SegmentationOverlay;
