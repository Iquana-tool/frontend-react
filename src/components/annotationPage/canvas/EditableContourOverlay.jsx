import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Stage, Layer, Circle, Line } from 'react-konva';
import {
  useEditModeActive,
  useEditModeDraftCoordinates,
  useImageObject,
} from '../../../stores/selectors/annotationSelectors';
import { useContourEditing } from '../../../hooks/useContourEditing';
import { Save, X, RotateCcw } from 'lucide-react';

/**
 * EditableContourOverlay Component
 * Renders interactive control points on top of the contour being edited
 * Uses Konva for smooth dragging and rendering
 */
const EditableContourOverlay = ({ canvasRef, zoomLevel = 1, panOffset = { x: 0, y: 0 } }) => {
  const editModeActive = useEditModeActive();
  const draftCoordinates = useEditModeDraftCoordinates();
  const imageObject = useImageObject();
  
  const { updatePoint, saveEditing, cancelEditing, resetChanges, isDirty } = useContourEditing();
  
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const containerRef = useRef(null);
  
  // Intelligently reduce number of control points for cleaner UI (show max 30-35 points)
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

  // Handle save action
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveEditing();
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsSaving(false);
    }
  }, [saveEditing]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!editModeActive) return;

    const handleKeyDown = (e) => {
      // Save: Enter or Ctrl/Cmd+S
      if (e.key === 'Enter' || (e.key === 's' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        handleSave();
      }
      // Cancel: Escape
      else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      }
      // Reset: Ctrl/Cmd+Z
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetChanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editModeActive, handleSave, cancelEditing, resetChanges]);

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

  // Handle point drag with smooth interpolation
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
  };

  return (
    <>
      {/* Konva Stage for interactive editing */}
      <div 
        ref={containerRef}
        className="absolute inset-0 pointer-events-none"
        style={{ 
          zIndex: 60,
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: 'center center'
        }}
      >
        <Stage
          width={imageDimensions.width + imageDimensions.x * 2}
          height={imageDimensions.height + imageDimensions.y * 2}
          className="pointer-events-auto"
        >
          <Layer>
            {/* Simple contour line */}
            <Line
              points={linePoints}
              stroke="#3b82f6"
              strokeWidth={2}
              closed={true}
              tension={0.4}
            />

            {/* Clean, simple control handles (only for selected points) */}
            {controlHandles.map((point) => {
              const isHovered = hoveredPoint === point.index;
              
              return (
                <React.Fragment key={point.index}>
                  {/* Invisible hitbox for easier grabbing */}
                  <Circle
                    x={point.x}
                    y={point.y}
                    radius={20}
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
                  
                  {/* Simple visible point */}
                  <Circle
                    x={point.x}
                    y={point.y}
                    radius={isHovered ? 6 : 5}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={2}
                    listening={false}
                  />
                </React.Fragment>
              );
            })}
          </Layer>
        </Stage>
      </div>

      {/* Editing controls panel */}
      <div className="absolute top-4 right-4 pointer-events-auto" style={{ zIndex: 70 }}>
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/80 overflow-hidden min-w-[200px]">
          {/* Header */}
          <div className="px-3 py-2 bg-gradient-to-br from-blue-50 to-blue-100/50 border-b border-blue-200/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-semibold text-blue-800 text-sm">Editing Contour</span>
              {isDirty && (
                <span className="ml-auto px-2 py-0.5 bg-blue-500/20 text-blue-700 text-xs font-medium rounded-full">
                  Modified
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-3 space-y-2">
            {/* Save button - primary */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-md text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>

            {/* Secondary actions */}
            <div className="flex gap-2">
              <button
                onClick={resetChanges}
                disabled={!isDirty || isSaving}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-700 rounded-md text-xs font-medium transition-all duration-150 active:scale-[0.98]"
                title="Reset changes (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              
              <button
                onClick={cancelEditing}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 rounded-md text-xs font-medium transition-all duration-150 active:scale-[0.98]"
                title="Exit without saving (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </div>

            {/* Hint text */}
            <div className="pt-1 border-t border-gray-200/50">
              <p className="text-xs text-gray-500 text-center leading-tight">
                Drag points to edit contour
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditableContourOverlay;
