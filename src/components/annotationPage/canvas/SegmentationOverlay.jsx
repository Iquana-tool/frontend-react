import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  useCurrentMask, 
  useObjectsList, 
  useImageObject,
  useShowContextMenu,
  useEnterFocusMode,
  useCurrentTool,
  useSelectedObjects,
  useSelectObject,
  useDeselectObject,
  useFocusModeActive,
  useFocusModeObjectId,
  useRefinementModeActive,
  useRefinementModeObjectId,
  useEnterRefinementMode,
  useSetCurrentTool,
  useExitFocusMode,
  useObjectsVisibility,
} from '../../../stores/selectors/annotationSelectors';
import { useZoomToObject } from '../../../hooks/useZoomToObject';
import annotationSession from '../../../services/annotationSession';

/**
 * Helper function to generate SVG path from x, y coordinate arrays
 * Coordinates should be normalized (0-1) and will be scaled to image dimensions
 */
const generatePathFromCoordinates = (xArray, yArray, imageWidth, imageHeight) => {
  if (!xArray || !yArray || xArray.length === 0 || yArray.length === 0 || !imageWidth || !imageHeight) {
    return null;
  }
  
  // Scale first point to pixel coordinates
  const x0 = xArray[0] * imageWidth;
  const y0 = yArray[0] * imageHeight;
  let path = `M ${x0} ${y0}`;
  
  // Add line segments for remaining points (scaled to pixel coordinates)
  for (let i = 1; i < Math.min(xArray.length, yArray.length); i++) {
    const x = xArray[i] * imageWidth;
    const y = yArray[i] * imageHeight;
    path += ` L ${x} ${y}`;
  }
  
  // Close path
  path += ' Z';
  
  return path;
};

const SegmentationOverlay = ({ canvasRef, zoomLevel = 1, panOffset = { x: 0, y: 0 } }) => {
  const currentMask = useCurrentMask();
  const objectsList = useObjectsList();
  const imageObject = useImageObject();
  const showContextMenu = useShowContextMenu();
  const enterFocusMode = useEnterFocusMode();
  const currentTool = useCurrentTool();
  const containerRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [hoveredObjectId, setHoveredObjectId] = useState(null);
  const selectedObjects = useSelectedObjects();
  const selectObject = useSelectObject();
  const deselectObject = useDeselectObject();
  const focusModeActive = useFocusModeActive();
  const focusedObjectId = useFocusModeObjectId();
  const refinementModeActive = useRefinementModeActive();
  const refinementModeObjectId = useRefinementModeObjectId();
  const enterRefinementMode = useEnterRefinementMode();
  const setCurrentTool = useSetCurrentTool();
  const exitFocusMode = useExitFocusMode();
  const visibility = useObjectsVisibility();
  
  const { zoomToObject } = useZoomToObject({
    marginPct: 0.25,
    maxZoom: 4,
    minZoom: 1,
    animationDuration: 300
  });

  // Filter objects based on visibility settings
  const visibleObjects = useMemo(() => {
    if (visibility.showAll) {
      return objectsList;
    }

    return objectsList.filter(obj => {
      const isRootLevel = !obj.parent_id || obj.parent_id === null;

      // Filter by root level only - show only objects with root-level labels
      if (visibility.rootLevelOnly) {
        // Check if object has a root-level label
        if (obj.labelId !== undefined && obj.labelId !== null) {
          const labelIdKey = String(obj.labelId);
          const rootLabelIds = visibility.rootLabelIds || [];
          const isRootLabel = rootLabelIds.includes(obj.labelId) || rootLabelIds.includes(labelIdKey);
          if (!isRootLabel) return false;
        } else {
          // If object has no label, don't show it in root level only mode
          return false;
        }
      }

      // Filter by root level labels visibility
      if (visibility.showRootLabels === false) {
        if (isRootLevel) return false;
      }

      // Filter by label visibility - applies to all modes except showAll
      // In selectedLevelOnly mode, only selected labels are shown
      if (obj.labelId !== undefined && obj.labelId !== null) {
        const labelIdKey = String(obj.labelId);
        const isLabelVisible = visibility.labels[labelIdKey] !== false; // Default to true if not set
        if (!isLabelVisible) return false;
      } else {
        // If object has no labelId, hide it when labels are configured
        // Only show unlabeled objects when no labels are configured yet
        if (Object.keys(visibility.labels).length > 0) {
          return false;
        }
      }

      return true;
    });
  }, [objectsList, visibility, selectedObjects]);

  // Track last click times for double-click detection using ref to avoid closure issues
  const lastClickTimesRef = useRef({});

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

  // Handle double-click on objects (enter refinement mode)
  const handleObjectDoubleClick = async (object) => {
    const contourId = object.contour_id || object.id;
    
    try {
      // Exit focus mode if active (refinement mode replaces focus mode)
      if (focusModeActive) {
        exitFocusMode();
      }
      
      // Send refinement selection to backend
      await annotationSession.selectRefinementObject(contourId);
      
      // Enter refinement mode in the store
      enterRefinementMode(object.id, contourId);
      
      // Switch to AI annotation tool
      setCurrentTool('ai_annotation');
      
      // Zoom and pan to the object
      if (imageObject && object.x && object.y && object.x.length > 0) {
        const container = containerRef.current;
        if (container) {
          const containerWidth = container.offsetWidth;
          const containerHeight = container.offsetHeight;
          
          if (containerWidth && containerHeight) {
            const imageDims = {
              width: imageObject.width,
              height: imageObject.height
            };
            
            const containerDims = {
              width: containerWidth,
              height: containerHeight
            };
            
            const renderedImageDims = {
              width: imageDimensions.width,
              height: imageDimensions.height,
              x: imageDimensions.x,
              y: imageDimensions.y
            };
            
            zoomToObject(
              object,
              imageDims,
              containerDims,
              renderedImageDims,
              { animateMs: 300, immediate: false }
            );
          }
        }
      }
      
      console.log(`Entered refinement mode for object ${object.id} (contour_id: ${contourId})`);
    } catch (error) {
      console.error('Failed to enter refinement mode:', error);
    }
  };

  // Handle left-click on objects (enter focus mode only in selection tool, or detect double-click)
  const handleObjectLeftClick = (e, object) => {
    e.stopPropagation();
    
    // Detect double-click
    const currentTime = Date.now();
    const lastClickTime = lastClickTimesRef.current[object.id] || 0;
    const timeDiff = currentTime - lastClickTime;
    
    if (timeDiff < 300 && lastClickTime > 0) {
      // Double-click detected - enter refinement mode
      lastClickTimesRef.current[object.id] = 0; // Reset to prevent triple-clicks
      handleObjectDoubleClick(object);
      return;
    }
    
    // Update last click time
    lastClickTimesRef.current[object.id] = currentTime;
    
    // Capture the click time for the closure to avoid ref mutation issues
    const clickTime = currentTime;
    
    // Single-click behavior (delayed to allow double-click detection)
    setTimeout(() => {
      const storedTime = lastClickTimesRef.current[object.id] || 0;
      
      // Only proceed if no second click came (this click time matches stored time)
      // If a double-click occurred, storedTime would be 0 (reset) or a different time
      if (storedTime === clickTime) {
        handleSingleClick(object);
      }
    }, 250);
  };

  // Handle single-click on objects (enter focus mode in both selection and AI annotation tools)
  const handleSingleClick = (object) => {
    // Disable focus mode when in refinement mode
    if (refinementModeActive) {
      return;
    }
    
    // Enter focus mode for both selection and AI annotation tools
    if (currentTool === 'selection' || currentTool === 'ai_annotation') {
      if (!imageObject || !object.x || !object.y || object.x.length === 0) {
        return;
      }

      const mask = object.mask || (object.path ? { path: object.path } : null);
      enterFocusMode(object.id, mask);

      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;

      if (!containerWidth || !containerHeight) return;

      const imageDims = {
        width: imageObject.width,
        height: imageObject.height
      };

      const containerDims = {
        width: containerWidth,
        height: containerHeight
      };

      const renderedImageDims = {
        width: imageDimensions.width,
        height: imageDimensions.height,
        x: imageDimensions.x,
        y: imageDimensions.y
      };

      zoomToObject(
        object,
        imageDims,
        containerDims,
        renderedImageDims,
        { animateMs: 300, immediate: false }
      );
    }
  };

  // Handle right-click on objects (show context menu)
  const handleObjectRightClick = (e, object) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Click is already on the SVG path element, so it's inside the object
    // (browser SVG hit-testing handles this)
    
    // Get the parent canvas container (not the transformed overlay container)
    // The containerRef points to the transformed overlay, we need its parent
    const transformedContainer = containerRef.current;
    if (!transformedContainer) return;
    
    const parentContainer = transformedContainer.parentElement;
    if (!parentContainer) return;
    
    const parentRect = parentContainer.getBoundingClientRect();
    
    // Convert viewport coordinates to parent container-relative coordinates
    // This ensures the context menu appears at the correct position regardless of zoom/pan
    const containerX = e.clientX - parentRect.left;
    const containerY = e.clientY - parentRect.top;
    
    // Show context menu at the container-relative position
    showContextMenu(containerX, containerY, object.id);
  };

  // Get viewBox dimensions from loaded image
  const viewBox = imageObject 
    ? `0 0 ${imageObject.width} ${imageObject.height}`
    : '0 0 800 600'; // Fallback dimensions

  // use high z-index to ensure object interactions work
  // Object paths will only capture events on painted areas, allowing empty areas to pass through
  const overlayZIndex = 30;
  
  return (
    <div 
      ref={containerRef}
      className="absolute inset-0"
      style={{
        transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
        transformOrigin: 'center center',
        zIndex: overlayZIndex,
        pointerEvents: 'none' // Container doesn't block - let children control their events
      }}
    >
      {/* Current Segmentation Mask - Visual preview only (auto-converted to object) */}
      {currentMask && imageDimensions.width > 0 && (
        <svg 
          className="absolute"
          viewBox={viewBox}
          preserveAspectRatio="none"
          style={{ 
            left: `${imageDimensions.x}px`,
            top: `${imageDimensions.y}px`,
            width: `${imageDimensions.width}px`,
            height: `${imageDimensions.height}px`,
            pointerEvents: 'none' // Preview mask is not interactive
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
      {imageDimensions.width > 0 && visibleObjects.map((object) => {
        // Disable hover effects when in refinement mode
        const isHovered = refinementModeActive ? false : (hoveredObjectId === object.id);
        const isSelected = selectedObjects.includes(object.id);
        const isFocused = focusModeActive && focusedObjectId === object.id;
        const isRefinementObject = refinementModeActive && refinementModeObjectId === object.id;
        
        // Debug logging for refinement object
        if (isRefinementObject) {
          console.log('Rendering refinement object:', {
            id: object.id,
            hasPath: !!object.path,
            hasMaskPath: !!object.mask?.path,
            hasXY: !!(object.x && object.y),
            xLength: object.x?.length,
            yLength: object.y?.length,
          });
        }
        
        // In focus mode, completely skip rendering the focused object's overlay
        // This ensures no color overlay appears on the focused object
        if (isFocused) {
          return null;
        }
        
        // In refinement mode, highlight the refinement object prominently
        // Keep other objects visible but less prominent for context
        let fillOpacity, strokeWidth, glowIntensity, strokeColor;
        
        if (refinementModeActive) {
          if (isRefinementObject) {
            // Highlight refinement object with high visibility
            fillOpacity = 0.45;
            strokeWidth = 5;
            glowIntensity = 12;
            strokeColor = object.color; // Use object's color but make it more prominent
          } else {
            // Other objects: keep visible for context but less prominent
            fillOpacity = 0.15;
            strokeWidth = 2;
            glowIntensity = 2;
            strokeColor = object.color;
          }
        } else {
          // Normal mode styling
          fillOpacity = isHovered ? 0.3 : (isSelected ? 0.35 : 0.2);
          strokeWidth = isHovered ? 3 : (isSelected ? 4 : 2.5);
          glowIntensity = isHovered ? 8 : (isSelected ? 6 : 4);
          strokeColor = object.color;
        }
        
        // Get mask path from backend (precomputed) or fallback to mask.path
        let maskPath = object.path || object.mask?.path;
        
        // If no path available, try to generate from x, y coordinates
        if (!maskPath && object.x && object.y && object.x.length > 0 && imageObject) {
          maskPath = generatePathFromCoordinates(object.x, object.y, imageObject.width, imageObject.height);
          console.log(`Generated path from coordinates for object ${object.id}:`, {
            numPoints: object.x.length,
            imageSize: { width: imageObject.width, height: imageObject.height },
            firstPoint: { x: object.x[0], y: object.y[0] }
          });
        }
        
        // Skip if still no path available
        if (!maskPath) {
          console.warn(`No path or coordinates available for object ${object.id}`);
          return null;
        }
        
        return (
          <svg 
            key={object.id} 
            className="absolute transition-all duration-200"
            viewBox={viewBox}
            preserveAspectRatio="none"
            style={{
              left: `${imageDimensions.x}px`,
              top: `${imageDimensions.y}px`,
              width: `${imageDimensions.width}px`,
              height: `${imageDimensions.height}px`,
              // SVG container has no pointer events - let it pass through
              pointerEvents: 'none'
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
              
              {/* Selected object glow */}
              <filter id={`selected-glow-${object.id}`}>
                <feGaussianBlur stdDeviation={glowIntensity} result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <path
              d={maskPath}
              fill={hexToRgba(object.color, fillOpacity)}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              filter={
                isRefinementObject
                  ? `url(#selected-glow-${object.id})` // Use selected glow for refinement object
                  : isHovered 
                    ? `url(#glow-${object.id})` 
                    : isSelected 
                      ? `url(#selected-glow-${object.id})` 
                      : `url(#shadow-${object.id})`
              }
              style={{ 
                transition: 'all 0.2s ease-in-out',
                cursor: refinementModeActive ? 'default' : 'pointer',
                // In refinement mode, disable pointer events so clicks pass through to canvas
                pointerEvents: refinementModeActive ? 'none' : 'auto'
              }}
              onClick={(e) => handleObjectLeftClick(e, object)}
              onContextMenu={(e) => handleObjectRightClick(e, object)}
              onMouseEnter={() => {
                // Disable hover highlighting in refinement mode
                if (!refinementModeActive) {
                  setHoveredObjectId(object.id);
                }
              }}
              onMouseLeave={() => {
                if (!refinementModeActive) {
                  setHoveredObjectId(null);
                }
              }}
            />
          </svg>
        );
      })}
    </div>
  );
};

export default SegmentationOverlay;
