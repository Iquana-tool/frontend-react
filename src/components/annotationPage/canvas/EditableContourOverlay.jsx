import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Stage, Layer, Circle, Line } from 'react-konva';
import {
  useEditModeActive,
  useEditModeDraftCoordinates,
  useImageObject,
  useRefinementModeActive,
} from '../../../stores/selectors/annotationSelectors';
import { useContourEditing } from '../../../hooks/useContourEditing';

/**
 * EditableContourOverlay Component
 * Renders interactive control points on top of the contour being edited
 * Uses Konva for smooth dragging and rendering
 */
const EditableContourOverlay = ({ canvasRef, zoomLevel = 1, panOffset = { x: 0, y: 0 } }) => {
  const editModeActive = useEditModeActive();
  const draftCoordinates = useEditModeDraftCoordinates();
  const imageObject = useImageObject();
  const refinementModeActive = useRefinementModeActive();
  
  const { updatePoint, saveEditing, cancelEditing, resetChanges, isDirty, scheduleAutoSave, cancelAutoSave } = useContourEditing();
  
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const containerRef = useRef(null);
  const pointsWrapperRef = useRef(null);
  
  // Reduce control points to a manageable number (max ~30 handles)
  const decimationFactor = Math.max(1, Math.floor((draftCoordinates?.x?.length || 0) / 30));

  // Calculate rendered image dimensions
  useEffect(() => {
    if (!canvasRef?.current || !imageObject) return;

    const updateDimensions = () => {
      const container = canvasRef.current;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      if (containerWidth === 0 || containerHeight === 0 || !imageObject.width || !imageObject.height) {
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

      setImageDimensions({ width: renderedWidth, height: renderedHeight, x, y });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    const currentContainer = canvasRef.current;
    resizeObserver.observe(currentContainer);

    return () => {
      if (currentContainer) {
        resizeObserver.unobserve(currentContainer);
      }
      resizeObserver.disconnect();
    };
  }, [canvasRef, imageObject]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!editModeActive) return;

    const handleKeyDown = (e) => {
      // Escape: discard changes and exit — but only when NOT in refinement mode.
      // In refinement mode, RefinementOverlay owns the Escape key (it saves + exits both modes).
      if (e.key === 'Escape' && !refinementModeActive) {
        e.preventDefault();
        cancelAutoSave();
        cancelEditing();
      }
      // Reset: Ctrl/Cmd+Z
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        cancelAutoSave();
        resetChanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editModeActive, refinementModeActive, cancelEditing, resetChanges, cancelAutoSave]);

  // --- Event forwarding for refinement mode ---
  // In refinement mode the control-points Stage sits at z-65, above the AIPromptCanvas at z-62.
  // A full-screen Konva canvas captures ALL pointer events, blocking prompt placement.
  // Fix: when a mousedown lands on the Stage background (not a control point), temporarily
  // disable pointer-events on this canvas and re-dispatch the native event to whatever element
  // is actually below — i.e. the AIPromptCanvas Stage. Subsequent move/up events are forwarded
  // as long as that mousedown was forwarded, so box-drawing preview continues to work.
  const forwardedMouseDownRef = useRef(false);

  const forwardNativeEvent = useCallback((nativeEvent) => {
    const wrapper = pointsWrapperRef.current;
    if (!wrapper) return;

    // Temporarily hide the entire z-65 wrapper so elementFromPoint
    // skips it and all its children (Konva Stage container, canvas, etc.)
    wrapper.style.visibility = 'hidden';
    const elementBelow = document.elementFromPoint(nativeEvent.clientX, nativeEvent.clientY);
    wrapper.style.visibility = '';

    if (!elementBelow) return;

    elementBelow.dispatchEvent(new MouseEvent(nativeEvent.type, {
      bubbles: true,
      cancelable: true,
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      clientX: nativeEvent.clientX,
      clientY: nativeEvent.clientY,
      screenX: nativeEvent.screenX,
      screenY: nativeEvent.screenY,
      movementX: nativeEvent.movementX ?? 0,
      movementY: nativeEvent.movementY ?? 0,
      shiftKey: nativeEvent.shiftKey,
      ctrlKey: nativeEvent.ctrlKey,
      metaKey: nativeEvent.metaKey,
      altKey: nativeEvent.altKey,
    }));
  }, []);

  const handlePointsStageMouseDown = useCallback((e) => {
    if (e.target === e.target.getStage()) {
      // Background click — forward to AIPromptCanvas and track that we forwarded
      forwardedMouseDownRef.current = true;
      forwardNativeEvent(e.evt);
    } else {
      // Landed on a control point circle — normal drag, do not forward
      forwardedMouseDownRef.current = false;
    }
  }, [forwardNativeEvent]);

  const handlePointsStageMouseMove = useCallback((e) => {
    if (forwardedMouseDownRef.current) {
      forwardNativeEvent(e.evt);
    }
  }, [forwardNativeEvent]);

  const handlePointsStageMouseUp = useCallback((e) => {
    if (forwardedMouseDownRef.current) {
      forwardNativeEvent(e.evt);
      forwardedMouseDownRef.current = false;
    }
  }, [forwardNativeEvent]);

  // Prevent browser context menu; forward right-click events so the AIPromptCanvas
  // can synthesise its own Konva click (button=2) and add a negative prompt.
  const handlePointsStageContextMenu = useCallback((e) => {
    e.evt.preventDefault();
    if (e.target === e.target.getStage()) {
      forwardNativeEvent(e.evt);
    }
  }, [forwardNativeEvent]);

  if (!editModeActive || !draftCoordinates || !imageObject || imageDimensions.width === 0) {
    return null;
  }

  // Convert ALL coordinates to screen coordinates (for accurate line)
  const allPointsInPixels = draftCoordinates.x.map((x, i) => ({
    x: x * imageDimensions.width + imageDimensions.x,
    y: draftCoordinates.y[i] * imageDimensions.height + imageDimensions.y,
    index: i,
  }));
  
  // Show fewer CONTROL HANDLES for cleaner UI (every Nth point)
  const controlHandles = allPointsInPixels.filter((_, i) => i % decimationFactor === 0);

  // Draw line with ALL points for accuracy (flat array: [x1, y1, x2, y2, ...])
  const linePoints = allPointsInPixels.flatMap(p => [p.x, p.y]);

  // Scale point sizes so they stay visually consistent regardless of zoom level.
  // The outer div has CSS transform scale(zoomLevel), so dividing by zoomLevel
  // keeps the on-screen pixel size constant at the base values.
  const safeZoom = zoomLevel > 0 ? zoomLevel : 1;
  const visiblePointRadius = Math.max(2, 5 / safeZoom);
  const hoveredPointRadius = Math.max(2.5, 6 / safeZoom);
  const hitboxRadius = Math.max(8, 20 / safeZoom);

  // Handle point drag with smooth interpolation and auto-save scheduling
  const handlePointDragMove = (index, e) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    
    // Convert screen coordinates back to normalized (0-1)
    const normalizedX = (pointerPos.x - imageDimensions.x) / imageDimensions.width;
    const normalizedY = (pointerPos.y - imageDimensions.y) / imageDimensions.height;
    
    // Clamp to [0, 1]
    const clampedX = Math.max(0, Math.min(1, normalizedX));
    const clampedY = Math.max(0, Math.min(1, normalizedY));
    
    // Pass decimation factor for smooth interpolation between control points
    updatePoint(index, clampedX, clampedY, decimationFactor);

    // Schedule auto-save: resets the idle timer on every drag event.
    // Editing is now fully auto-saved; there is no manual Save/Reset/Discard panel.
    scheduleAutoSave();
  };

  const transformStyle = {
    transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
    transformOrigin: 'center center',
  };

  const stageProps = {
    width: imageDimensions.width + imageDimensions.x * 2,
    height: imageDimensions.height + imageDimensions.y * 2,
  };

  const lineLayer = (
    <Layer listening={false}>
      <Line
        points={linePoints}
        stroke="#3b82f6"
        strokeWidth={2}
        closed={true}
        tension={0.4}
      />
    </Layer>
  );

  const pointsLayer = (
    <Layer>
      {controlHandles.map((point) => {
        const isHovered = hoveredPoint === point.index;
        return (
          <React.Fragment key={point.index}>
            <Circle
              x={point.x}
              y={point.y}
              radius={hitboxRadius}
              fill="transparent"
              draggable
              onDragMove={(e) => handlePointDragMove(point.index, e)}
              onMouseEnter={(e) => {
                const container = e.target.getStage().container();
                container.style.cursor = 'grab';
                setHoveredPoint(point.index);
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage().container();
                container.style.cursor = 'default';
                setHoveredPoint(null);
              }}
              onDragStart={(e) => {
                const container = e.target.getStage().container();
                container.style.cursor = 'grabbing';
              }}
              onDragEnd={(e) => {
                const container = e.target.getStage().container();
                container.style.cursor = 'grab';
              }}
            />
            <Circle
              x={point.x}
              y={point.y}
              radius={isHovered ? hoveredPointRadius : visiblePointRadius}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={Math.max(1, 2 / safeZoom)}
              listening={false}
            />
          </React.Fragment>
        );
      })}
    </Layer>
  );

  // In refinement mode: line below (z-55, non-interactive) so prompt canvas (z-62) can receive clicks; points above (z-65) so they remain draggable
  if (refinementModeActive) {
    return (
      <>
        <div
          ref={containerRef}
          className="absolute inset-0 pointer-events-none"
          style={{ ...transformStyle, zIndex: 55 }}
        >
          <Stage {...stageProps} listening={false}>
            {lineLayer}
          </Stage>
        </div>
        <div
          ref={pointsWrapperRef}
          className="absolute inset-0 pointer-events-none"
          style={{ ...transformStyle, zIndex: 65 }}
        >
          <Stage
            {...stageProps}
            className="pointer-events-auto"
            onMouseDown={handlePointsStageMouseDown}
            onMouseMove={handlePointsStageMouseMove}
            onMouseUp={handlePointsStageMouseUp}
            onMouseLeave={handlePointsStageMouseUp}
            onContextMenu={handlePointsStageContextMenu}
          >
            {pointsLayer}
          </Stage>
        </div>
      </>
    );
  }

  return (
    // Single overlay when not in refinement mode
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ ...transformStyle, zIndex: 60 }}
    >
      <Stage {...stageProps} className="pointer-events-auto">
        {lineLayer}
        {pointsLayer}
      </Stage>
    </div>
  );
};

export default EditableContourOverlay;
