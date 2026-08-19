import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { Hexagon, Spline, X } from 'lucide-react';
import {
  useImageObject,
  useImageLoading,
  useImageError,
  useZoomLevel,
  usePanOffset,
  useSetZoomLevel,
  useSetPanOffset,
  useManualDrawMode,
  useSetManualDrawMode,
  useLineEditActive,
  useLineEditObjectId,
  useLineEditContourId,
  useLineEditOriginal,
  useLineEditMode,
  useStopLineEdit,
  useUpdateObject,
  useObjectsList,
  useCurrentMaskId,
} from '../../../stores/selectors/annotationSelectors';
import annotationSession from '../../../services/annotationSession';
import { pixelArrayToNormalized } from '../../../utils/coordinateUtils';
import { mergeLineIntoContour } from '../../../utils/contourEditing';
import { splitObjectByLine } from '../../../utils/contourOperations';
import { useToast } from '../../../contexts/ToastContext';
import useCanvasViewport from '../../../hooks/useCanvasViewport';
import usePromptDrawing from '../../../hooks/usePromptDrawing';
import DrawingPreview from './prompts/DrawingPreview';

/**
 * Line-edit Canvas
 *
 * Draw an open line across or near a contour — freehand (press-drag) or polygon
 * (click points, double-click / Enter to finish) — and do one of two things with it,
 * chosen by `lineEdit.mode`:
 *
 * - **reshape**: the line's ends snap to the closest points on the contour and the
 *   nearest boundary arc is replaced by the line (`mergeLineIntoContour`) — draw just
 *   outside to add a region, just inside to cut one off. Saved via `modifyObject`.
 * - **split**: both arcs between the snapped ends are kept, cutting the object in two
 *   (`splitObjectByLine`). One half stays on this contour, the other becomes a new
 *   object beside it.
 *
 * The two share every part of the interaction except that last step, which is why they
 * share this canvas. The faint dashed outline is the contour being edited.
 *
 * Rendered at full container resolution with zoom applied to coordinates (via
 * `useCanvasViewport`), so the drawing stays crisp at any zoom. Only mounted while
 * a line-edit session is active (mounting is gated by the parent so the viewport
 * measures its container on first render).
 */
const MODES = [
  { id: 'freehand', label: 'Freehand', icon: Spline, hotkey: 'F' },
  { id: 'polygon', label: 'Polygon', icon: Hexagon, hotkey: 'G' },
];

const LineEditCanvas = () => {
  const stageRef = useRef(null);
  const active = useLineEditActive();
  const objectId = useLineEditObjectId();
  const contourId = useLineEditContourId();
  const original = useLineEditOriginal();
  const editMode = useLineEditMode();
  const stopLineEdit = useStopLineEdit();
  const updateObject = useUpdateObject();
  const objectsList = useObjectsList();
  const maskId = useCurrentMaskId();
  const { addToast } = useToast();
  const isSplit = editMode === 'split';

  const mode = useManualDrawMode();
  const setMode = useSetManualDrawMode();

  const imageObject = useImageObject();
  const imageLoading = useImageLoading();
  const imageError = useImageError();
  const zoomLevel = useZoomLevel();
  const panOffset = usePanOffset();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();

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

  // The contour being reshaped, in stage pixels, as a faint dashed reference.
  const referencePoints = useMemo(() => {
    if (!original || !imageObject || !imageDimensions.baseScale) return null;
    const pts = [];
    for (let i = 0; i < original.x.length; i++) {
      const [sx, sy] = toStage({
        x: original.x[i] * imageObject.width,
        y: original.y[i] * imageObject.height,
      });
      pts.push(sx, sy);
    }
    return pts;
  }, [original, imageObject, imageDimensions.baseScale, toStage]);

  const handleDrawFinalize = useCallback(async (points, { freehand }) => {
    if (!imageObject || points.length < 2 || contourId == null || !original) return;

    const linePixel = points.map((p) => ({ x: p.x, y: p.y }));

    if (isSplit) {
      const target = objectsList.find((obj) => obj.id === objectId);
      if (!target) {
        addToast({ type: 'error', message: 'That object is no longer on the canvas.' });
        stopLineEdit();
        return;
      }
      const result = await splitObjectByLine({
        object: target,
        objectsList,
        imageObject,
        linePixel,
        maskId,
        updateObject,
      });
      // A refusal changed nothing, so stay in the tool and let them redraw the line.
      if (!result.refused) stopLineEdit();
      addToast({ type: result.success ? 'success' : 'error', message: result.message });
      return;
    }

    // Merge in pixel space (avoids the x/y aspect skew of normalized coordinates).
    const contourPixel = original.x.map((x, i) => ({
      x: x * imageObject.width,
      y: original.y[i] * imageObject.height,
    }));
    const merged = mergeLineIntoContour(contourPixel, linePixel);

    if (merged === contourPixel || merged.length < 3) {
      addToast({ type: 'error', message: 'Draw the line so its two ends sit near different parts of the outline.' });
      return;
    }

    const normalized = pixelArrayToNormalized(
      merged.map((p) => p.x),
      merged.map((p) => p.y),
      imageObject.width,
      imageObject.height
    );

    if (!annotationSession.isReady()) {
      addToast({ type: 'error', message: 'Session is not ready yet. Please wait for the image to load.' });
      return;
    }

    // Optimistic: show the reshaped outline immediately, revert if the save fails.
    updateObject(objectId, { x: normalized.x, y: normalized.y, path: null });
    stopLineEdit();
    try {
      const response = await annotationSession.modifyObject(contourId, { x: normalized.x, y: normalized.y });
      if (response && response.success === false) throw new Error(response.message || 'Save rejected');
      addToast({ type: 'success', message: `Outline reshaped (${freehand ? 'freehand' : 'polygon'}).` });
    } catch (err) {
      updateObject(objectId, { x: original.x, y: original.y, path: null });
      addToast({ type: 'error', message: err.message || 'Could not reshape the outline. Reverted.' });
    }
  }, [imageObject, contourId, objectId, original, updateObject, stopLineEdit, addToast,
      isSplit, objectsList, maskId]);

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
    minPoints: 2, // an open line needs only two points
    closeOnFirst: false, // do not snap-close near the first point; it is not a loop
  });

  const handleMouseDown = useCallback((e) => {
    if (!active) return;
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
      else if (e.code === 'Escape') { e.preventDefault(); stopLineEdit(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, drawKeyDown, setMode, stopLineEdit]);

  if (!active) return null;
  if (imageLoading || imageError || !imageObject) return null;

  const cursor = isPanning ? 'grabbing' : isPanMode ? 'grab' : 'crosshair';

  return (
    <div ref={containerRef} className="absolute inset-0 z-[60]" style={{ cursor }}>
      {/* Mode selector */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-1 bg-p1 backdrop-blur-sm border border-ln rounded-xl shadow-lg p-1">
        {MODES.map(({ id, label, icon: Icon, hotkey }) => {
          const isActive = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              title={`${label} (${hotkey})`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'bg-accent text-onAccent shadow-sm' : 'text-t2 hover:bg-hv'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
        <div className="w-px h-5 bg-hv2 mx-1" />
        <button
          type="button"
          onClick={stopLineEdit}
          title="Cancel (Esc)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-t2 hover:bg-hv transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cancel</span>
        </button>
      </div>

      {/* Instruction */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-scrim text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg z-40 pointer-events-none text-center">
        {isSplit
          ? (mode === 'polygon'
            ? 'Click a line straight across the object · double-click or Enter to finish · it becomes two objects'
            : 'Drag a line straight across the object · release to finish · it becomes two objects')
          : (mode === 'polygon'
            ? 'Click a line across the boundary · double-click or Enter to finish · outside adds, inside cuts'
            : 'Drag a line across the boundary · release to finish · outside adds a region, inside cuts one off')}
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
        <Layer listening={false}>
          {referencePoints && (
            <Line points={referencePoints} closed stroke="#f43f5e" strokeWidth={1.5} dash={[6, 5]} opacity={0.55} />
          )}
        </Layer>
        <Layer>
          <DrawingPreview
            mode={mode}
            polygonPoints={polygonPoints}
            cursorImagePt={cursorImagePt}
            toStage={toStage}
            closed={false}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default LineEditCanvas;
