import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
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
  useClearSelection,
  useFocusModeActive,
  useFocusModeObjectId,
  useRefinementModeActive,
  useRefinementModeObjectId,
  useEnterRefinementMode,
  useSetCurrentTool,
  useExitFocusMode,
  useObjectsVisibility,
  useEnterEditMode,
  useExitEditMode,
  useUpdateObject,
} from '../../../stores/selectors/annotationSelectors';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { useZoomToObject } from '../../../hooks/useZoomToObject';
import annotationSession from '../../../services/annotationSession';
import { getContourId } from '../../../utils/objectUtils';
import { hasValidLabel } from '../../../stores/utils/labelValidation';

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
  const clearSelection = useClearSelection();
  const focusModeActive = useFocusModeActive();
  const focusedObjectId = useFocusModeObjectId();
  const refinementModeActive = useRefinementModeActive();
  const refinementModeObjectId = useRefinementModeObjectId();
  const enterRefinementMode = useEnterRefinementMode();
  const setCurrentTool = useSetCurrentTool();
  const exitFocusMode = useExitFocusMode();
  const visibility = useObjectsVisibility();
  
  const enterEditMode = useEnterEditMode();
  const exitEditMode = useExitEditMode();
  const updateObject = useUpdateObject();

  // State for the "label required" prompt when clicking an unlabelled object
  const [unlabelledPromptObject, setUnlabelledPromptObject] = useState(null);

  const { zoomToObject } = useZoomToObject({
    marginPct: 0.25,
    maxZoom: 4,
    minZoom: 1,
    animationDuration: 300
  });

  // Filter objects based on visibility settings and focus/refinement mode
  const visibleObjects = useMemo(() => {
    let filtered = objectsList;

    // In focus or refinement mode, only show descendants of the active object
    // This hides ancestors, siblings, and unrelated objects that would otherwise
    // cover the focused area and block annotation placement
    const activeObjectId = focusModeActive ? focusedObjectId
      : (refinementModeActive ? refinementModeObjectId : null);

    if (activeObjectId != null) {
      const descendantIds = new Set();
      const queue = [activeObjectId];
      while (queue.length > 0) {
        const currentId = queue.shift();
        for (const obj of objectsList) {
          if (obj.parent_id === currentId && !descendantIds.has(obj.id)) {
            descendantIds.add(obj.id);
            queue.push(obj.id);
          }
        }
      }
      filtered = filtered.filter(obj =>
        obj.id === activeObjectId || descendantIds.has(obj.id)
      );
    }

    if (!visibility.showAll || activeObjectId != null) {
      filtered = filtered.filter(obj => {
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
          // If object has no labelId, ALWAYS show it 
        }

        return true;
      });
    }

    return filtered;
  }, [objectsList, visibility, selectedObjects, focusModeActive, focusedObjectId, refinementModeActive, refinementModeObjectId]);

  /**
   * Save the current edit-mode draft to backend and exit edit mode.
   * Uses getState() so it always reads the freshest Zustand state,
   * avoiding stale-closure issues inside async event handlers.
   */
  const saveAndExitEditMode = () => {
    const { editMode, objects } = useAnnotationStore.getState();
    if (!editMode.active) return;

    if (editMode.isDirty && editMode.draftCoordinates && editMode.objectId) {
      const editObj = objects.list.find(o => o.id === editMode.objectId);
      if (editObj) {
        // Optimistic local update
        updateObject(editMode.objectId, {
          x: [...editMode.draftCoordinates.x],
          y: [...editMode.draftCoordinates.y],
          path: null,
        });
        // Fire-and-forget backend save
        annotationSession
          .modifyObject(editMode.contourId, { x: editMode.draftCoordinates.x, y: editMode.draftCoordinates.y })
          .catch(err => console.error('Auto-save on switch failed:', err));
      }
    }
    exitEditMode();
  };

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
      // Use naturalWidth/naturalHeight as fallback for detached Image objects (width may be 0)
      const imgW = imageObject.width || imageObject.naturalWidth || 0;
      const imgH = imageObject.height || imageObject.naturalHeight || 0;
      const imageAspect = imgW / imgH;
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

  // Handle double-click: enter refinement mode + edit mode + zoom
  const handleObjectDoubleClick = async (object) => {
    const contourId = object.contour_id || object.id;
    
    try {
      // If already editing a (possibly different) object, save first
      saveAndExitEditMode();

      // Exit focus mode if active (refinement mode replaces focus mode)
      if (focusModeActive) {
        if (annotationSession.isReady()) {
          await annotationSession.unfocusImage();
        }
        exitFocusMode();
      }
      
      // Send refinement selection to backend
      await annotationSession.selectRefinementObject(contourId);
      
      // Enter refinement mode in the store
      enterRefinementMode(object.id, contourId);

      // Also enter edit mode so the user can drag control points immediately
      if (object.x && object.y && object.x.length > 0 && object.contour_id != null) {
        enterEditMode(object.id, object.contour_id, object.x, object.y);
      }
      
      // Switch to AI annotation tool
      setCurrentTool('ai_annotation');
      
      // Zoom and pan to the object
      if (imageObject && object.x && object.y && object.x.length > 0) {
        const container = containerRef.current;
        if (container) {
          const containerWidth = container.offsetWidth;
          const containerHeight = container.offsetHeight;
          
          if (containerWidth && containerHeight) {
            zoomToObject(
              object,
              { width: imageObject.width, height: imageObject.height },
              { width: containerWidth, height: containerHeight },
              { width: imageDimensions.width, height: imageDimensions.height, x: imageDimensions.x, y: imageDimensions.y },
              { animateMs: 300, immediate: false }
            );
          }
        }
      }
    } catch (error) {
      console.error('Failed to enter refinement mode:', error);
    }
  };

  // Handle left-click on objects (enter focus mode only in selection tool, or detect double-click)
  const handleObjectLeftClick = (e, object) => {
    e.stopPropagation();
    
    // Check if Shift key is held for multi-select
    const isShiftHeld = e.shiftKey;
    
    // If Shift is held, toggle selection and skip single-object edit mode
    if (isShiftHeld) {
      const isAlreadySelected = selectedObjects.includes(object.id);
      if (isAlreadySelected) {
        deselectObject(object.id);
      } else {
        selectObject(object.id);
      }
      // Multi-select: save and exit edit mode (edit mode only for single selection)
      saveAndExitEditMode();
      return;
    }
    
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

  // Handle single-click: select object + enter focus mode + zoom (original behaviour)
  const handleSingleClick = async (object) => {
    // Disable focus mode when in refinement mode
    if (refinementModeActive) {
      return;
    }

    // Clear previous selection and select only this object
    clearSelection();
    selectObject(object.id);

    // Enter focus mode for selection and AI annotation tools
    if (currentTool === 'selection' || currentTool === 'ai_annotation') {
      if (!imageObject || !object.x || !object.y || object.x.length === 0) {
        return;
      }

      // Block focus mode for unlabelled objects — prompt user to label first
      if (!hasValidLabel(object.label)) {
        setUnlabelledPromptObject(object);
        return;
      }

      // Build mask from coordinate arrays if needed
      let mask = object.mask;
      if (!mask || !mask.points) {
        const points = object.x.map((x, i) => [x * imageObject.width, object.y[i] * imageObject.height]);
        mask = { points };
      }

      if (mask && mask.points && mask.points.length > 0) {
        const contourId = getContourId(object);
        try {
          await annotationSession.focusImage(contourId);
          enterFocusMode(object.id, mask);
        } catch (error) {
          console.error('Failed to enter focus mode:', error);
          return;
        }
      }

      const container = containerRef.current;
      if (!container) return;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      if (!containerWidth || !containerHeight) return;

      zoomToObject(
        object,
        { width: imageObject.width, height: imageObject.height },
        { width: containerWidth, height: containerHeight },
        { width: imageDimensions.width, height: imageDimensions.height, x: imageDimensions.x, y: imageDimensions.y },
        { animateMs: 300, immediate: false }
      );
    }
  };

  // Handle right-click on objects (show context menu)
  const handleObjectRightClick = (e, object) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If the object is not already selected, select it (and add to multi-select if Shift is held)
    const isAlreadySelected = selectedObjects.includes(object.id);
    if (!isAlreadySelected) {
      if (e.shiftKey) {
        // Add to selection
        selectObject(object.id);
      } else {
        // Replace selection
        clearSelection();
        selectObject(object.id);
      }
    }
    
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
  // Use naturalWidth/naturalHeight for detached Image objects (width/height may be 0)
  const imgNatW = imageObject ? (imageObject.width || imageObject.naturalWidth || 800) : 800;
  const imgNatH = imageObject ? (imageObject.height || imageObject.naturalHeight || 600) : 600;
  const viewBox = `0 0 ${imgNatW} ${imgNatH}`;

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
        
        // ALWAYS generate path from x,y coordinates if available )
        // Backend path is pre-generated at a different resolution, causing coordinate mismatch
        let maskPath = null;
        
        if (object.x && object.y && object.x.length > 0 && imageObject) {
          const iw = imageObject.width || imageObject.naturalWidth || 0;
          const ih = imageObject.height || imageObject.naturalHeight || 0;
          maskPath = generatePathFromCoordinates(object.x, object.y, iw, ih);
        }
        
        // Fallback to backend path only if coordinate generation failed
        if (!maskPath) {
          maskPath = object.path || object.mask?.path;
        }
        
        // Skip if still no path available
        if (!maskPath) {
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
              
              {/* Animation styles for selected objects */}
              {isSelected && (
                <style>
                  {`
                    @keyframes dash-${object.id} {
                      to {
                        stroke-dashoffset: -30;
                      }
                    }
                    @keyframes pulse-${object.id} {
                      0%, 100% {
                        stroke-width: ${strokeWidth};
                      }
                      50% {
                        stroke-width: ${strokeWidth + 1};
                      }
                    }
                  `}
                </style>
              )}
            </defs>
            
            <path
              d={maskPath}
              fill={hexToRgba(object.color, fillOpacity)}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={isSelected ? "15,10" : "none"}
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
                pointerEvents: refinementModeActive ? 'none' : 'auto',
                animation: isSelected ? `dash-${object.id} 2s linear infinite, pulse-${object.id} 2s ease-in-out infinite` : 'none'
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

      {/* Unlabelled-object focus-mode prompt — portalled to document.body to escape the CSS transform */}
      {unlabelledPromptObject && ReactDOM.createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50"
          style={{ zIndex: 9999 }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setUnlabelledPromptObject(null); }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-amber-200 p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">Label required for Focus Mode</h3>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Object #{unlabelledPromptObject.id}</strong> does not have a label yet.
                  Please assign a label before entering Focus Mode.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setUnlabelledPromptObject(null); }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SegmentationOverlay;
