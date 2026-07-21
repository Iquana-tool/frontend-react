import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import { Hexagon, Spline } from 'lucide-react';
import {
  useCurrentTool,
  useImageObject,
  useImageLoading,
  useImageError,
  useZoomLevel,
  usePanOffset,
  useSetZoomLevel,
  useSetPanOffset,
  useManualDrawMode,
  useSetManualDrawMode,
  useFocusedParentContourId,
} from '../../../stores/selectors/annotationSelectors';
import annotationSession from '../../../services/annotationSession';
import { pixelArrayToNormalized } from '../../../utils/coordinateUtils';
import useCanvasViewport from '../../../hooks/useCanvasViewport';
import usePromptDrawing from '../../../hooks/usePromptDrawing';
import DrawingPreview from './prompts/DrawingPreview';

/**
 * Manual Drawing Canvas
 *
 * Lets the user draw object outlines by hand — as a clicked polygon or a
 * freehand sketch — and commits each finished outline as a real annotation
 * object via the OBJECT_ADD_MANUAL WebSocket message (no model involved). The
 * resulting object comes back over OBJECT_ADDED and is rendered by
 * SegmentationOverlay like any other object. Only active when currentTool is
 * 'manual_drawing'.
 */
const MODES = [
  { id: 'polygon', label: 'Polygon', icon: Hexagon, hotkey: 'G' },
  { id: 'freehand', label: 'Freehand', icon: Spline, hotkey: 'F' },
];

const ManualDrawCanvas = () => {
  const stageRef = useRef(null);
  const mode = useManualDrawMode();
  const setMode = useSetManualDrawMode();
  const [statusMessage, setStatusMessage] = useState(null); // { text, error }
  const statusTimerRef = useRef(null);

  const currentTool = useCurrentTool();
  const imageObject = useImageObject();
  const imageLoading = useImageLoading();
  const imageError = useImageError();
  const zoomLevel = useZoomLevel();
  const panOffset = usePanOffset();
  const parentContourId = useFocusedParentContourId();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();

  const active = currentTool === 'manual_drawing';

  const {
    containerRef,
    containerSize,
    imageDimensions,
    isPanning,
    isPanMode,
    stageToImageCoords,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleWheel,
  } = useCanvasViewport({ imageObject, zoomLevel, panOffset, setZoomLevel, setPanOffset, active });

  const showStatus = useCallback((text, error = false) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatusMessage({ text, error });
    statusTimerRef.current = setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, []);

  const getScale = useCallback(
    () => imageDimensions.baseScale * zoomLevel,
    [imageDimensions.baseScale, zoomLevel]
  );
  const toStage = useCallback(
    (pt) => {
      const finalScale = imageDimensions.baseScale * zoomLevel;
      return [
        pt.x * finalScale + imageDimensions.displayX,
        pt.y * finalScale + imageDimensions.displayY,
      ];
    },
    [imageDimensions, zoomLevel]
  );

  // Commit a finished outline as a manual object
  const handleDrawFinalize = useCallback(async (points, { freehand }) => {
    if (!imageObject || points.length < 3) return;

    const xArray = points.map((p) => p.x);
    const yArray = points.map((p) => p.y);
    const normalized = pixelArrayToNormalized(xArray, yArray, imageObject.width, imageObject.height);

    try {
      if (!annotationSession.isReady()) {
        throw new Error('Session is not ready yet. Please wait for the image to load.');
      }
      // When a contour is focused, nest the new object under it (nested labelling)
      await annotationSession.addObject(normalized.x, normalized.y, null, parentContourId);
      showStatus(`${freehand ? 'Freehand' : 'Polygon'} annotation added`);
    } catch (err) {
      console.error('Failed to add manual object:', err);
      showStatus(err.message || 'Failed to add annotation', true);
    }
  }, [imageObject, parentContourId, showStatus]);

  const {
    polygonPoints,
    cursorImagePt,
    handleMouseDown: drawMouseDown,
    handleMouseMove: drawMouseMove,
    handleMouseUp: drawMouseUp,
    handleDblClick: drawDblClick,
    handleKeyDown: drawKeyDown,
  } = usePromptDrawing({
    mode,
    stageToImageCoords,
    getScale,
    onFinalize: handleDrawFinalize,
  });

  const handleMouseDown = useCallback((e) => {
    if (!active) return;
    // Panning takes priority (middle mouse, or Space-held left drag)
    if (e.evt.button === 1 || (e.evt.button === 0 && isPanMode)) {
      handlePanStart(e);
      return;
    }
    drawMouseDown(e);
  }, [active, isPanMode, handlePanStart, drawMouseDown]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      handlePanMove(e);
      return;
    }
    drawMouseMove(e);
  }, [isPanning, handlePanMove, drawMouseMove]);

  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      handlePanEnd();
      return;
    }
    drawMouseUp(e);
  }, [isPanning, handlePanEnd, drawMouseUp]);

  const handleContextMenu = useCallback((e) => {
    e.evt.preventDefault();
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (e) => {
      if (drawKeyDown(e)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const typing = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'g') { e.preventDefault(); setMode('polygon'); }
      else if (key === 'f') { e.preventDefault(); setMode('freehand'); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, drawKeyDown, setMode]);

  if (!active) return null;

  if (imageLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading image...</p>
        </div>
      </div>
    );
  }

  if (!imageObject) return null;

  if (imageError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load image</p>
          <p className="text-sm text-gray-600">{imageError}</p>
        </div>
      </div>
    );
  }

  const cursor = isPanning ? 'grabbing' : isPanMode ? 'grab' : 'crosshair';

  return (
    <div ref={containerRef} className="absolute inset-0 z-10" style={{ cursor }}>
      {/* Pan mode indicator */}
      {isPanMode && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg z-50">
          Pan Mode - Hold Space + Drag
        </div>
      )}

      {/* Drawing-mode selector (polygon / freehand) */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-1">
        {MODES.map(({ id, label, icon: Icon, hotkey }) => {
          const isActive = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              title={`${label} drawing (${hotkey})`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'bg-teal-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
              <kbd
                className={`hidden md:inline text-[10px] font-semibold leading-none px-1 py-0.5 rounded border ${
                  isActive ? 'border-white/40 text-white/90' : 'border-gray-300 text-gray-400'
                }`}
              >
                {hotkey}
              </kbd>
            </button>
          );
        })}
      </div>

      {/* Drawing instructions */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg z-40 pointer-events-none">
        {mode === 'polygon'
          ? 'Click to add points · double-click or Enter to close · right-click undoes a point · Esc cancels'
          : 'Press and drag to trace an outline · release to close'}
      </div>

      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        onDblClick={drawDblClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        <Layer>
          <DrawingPreview
            mode={mode}
            polygonPoints={polygonPoints}
            cursorImagePt={cursorImagePt}
            toStage={toStage}
          />
        </Layer>
      </Stage>

      {statusMessage && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div
            className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-white ${
              statusMessage.error ? 'bg-red-500' : 'bg-teal-600'
            }`}
          >
            {statusMessage.text}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualDrawCanvas;
