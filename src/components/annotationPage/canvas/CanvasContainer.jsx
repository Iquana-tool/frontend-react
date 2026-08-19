import React, { useRef } from 'react';
import PromptOverlay from './PromptOverlay';
import SegmentationOverlay from './SegmentationOverlay';
import AIPromptCanvas from './AIPromptCanvas';
import InferenceScanOverlay from './InferenceScanOverlay';
import ManualDrawCanvas from './ManualDrawCanvas';
import ModelSelectionHint from './ModelSelectionHint';
import ObjectContextMenu from './ObjectContextMenu';
import FocusOverlay from './FocusOverlay';
import RefinementOverlay from './RefinementOverlay';
import EditableContourOverlay from './EditableContourOverlay';
import LineEditCanvas from './LineEditCanvas';
import ScaleCalibrationOverlay from './ScaleCalibrationOverlay';
import PatchPickOverlay from './PatchPickOverlay';
import ScaleBarIndicator from './ScaleBarIndicator';
import useAIAnnotationShortcuts from '../../../hooks/useAIAnnotationShortcuts';
import useFocusModeEscape from '../../../hooks/useFocusModeEscape';
import useMultiSelectShortcuts from '../../../hooks/useMultiSelectShortcuts';
import useInstantSegmentationRunner from '../workspace/useInstantSegmentationRunner';
import { useSetCursorPosition } from '../../../stores/selectors/annotationSelectors';
import {
  useCurrentTool,
  useRefinementModeActive,
  useFocusModeActive,
  useLineEditActive,
  useWorkspaceMode,
} from '../../../stores/selectors/annotationSelectors';

/**
 * The image and every annotation overlay stacked on top of it.
 *
 * The floating action buttons that used to live here (Run AI, Suggest Similar,
 * Add as object) moved to the workspace action bar, which derives the same
 * states from the store — the canvas is now purely the drawing surface.
 */
const CanvasContainer = ({ imageObject, currentImage, zoomLevel, panOffset }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const currentTool = useCurrentTool();
  const refinementModeActive = useRefinementModeActive();
  const focusModeActive = useFocusModeActive();
  const lineEditActive = useLineEditActive();
  const setCursorPosition = useSetCursorPosition();
  const workspaceMode = useWorkspaceMode();

  // Calibrate mode borrows the canvas for measuring, not for annotating. The
  // drawing surfaces are gated on the mode rather than only on the tool because
  // stepping to another image resets the tool to 'ai_annotation', which would
  // otherwise put the prompt canvas back over the calibration overlays.
  const annotating = workspaceMode !== 'calibrate';

  useAIAnnotationShortcuts();
  useFocusModeEscape();
  useMultiSelectShortcuts();
  useInstantSegmentationRunner();

  // Cursor readout for the status bar, in image pixels.
  const handleMouseMove = (event) => {
    const image = canvasRef.current;
    if (!image || !imageObject) return;
    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.round(((event.clientX - rect.left) / rect.width) * imageObject.width);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * imageObject.height);
    if (x < 0 || y < 0 || x > imageObject.width || y > imageObject.height) {
      setCursorPosition(null);
      return;
    }
    setCursorPosition({ x, y });
  };

  const cursorClass =
    currentTool === 'manual_drawing' || currentTool === 'ai_annotation'
      ? 'cursor-crosshair'
      : currentTool === 'zoom'
        ? 'cursor-zoom-in'
        : currentTool === 'selection'
          ? 'cursor-pointer'
          : 'cursor-default';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${cursorClass}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setCursorPosition(null)}
      onDragStart={(e) => e.preventDefault()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <div
        className="relative w-full h-full transition-transform duration-200 ease-out"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: 'center center',
        }}
      >
        <img
          ref={canvasRef}
          src={imageObject.src}
          alt={currentImage?.name || 'Annotation Image'}
          className="object-contain w-full h-full block shadow-stage"
          draggable={false}
        />

        {annotating && currentTool !== 'ai_annotation' && <PromptOverlay canvasRef={canvasRef} />}
      </div>

      {/* Overlays sit outside the transform so their own coordinate maths holds. */}
      <SegmentationOverlay canvasRef={canvasRef} zoomLevel={zoomLevel} panOffset={panOffset} />
      <FocusOverlay canvasRef={canvasRef} zoomLevel={zoomLevel} panOffset={panOffset} />
      <RefinementOverlay />
      <EditableContourOverlay canvasRef={canvasRef} zoomLevel={zoomLevel} panOffset={panOffset} />

      {/* Mounted only while active so its stage measures a sized container on
          the first render; otherwise it stays 0×0 and swallows clicks. */}
      {lineEditActive && <LineEditCanvas />}

      {/* Setting the scale is a calibration, so its overlay only exists in
          Calibrate mode — never over the annotation canvas. */}
      {!annotating && (
        <ScaleCalibrationOverlay canvasRef={canvasRef} zoomLevel={zoomLevel} panOffset={panOffset} />
      )}
      <PatchPickOverlay canvasRef={canvasRef} />
      <ScaleBarIndicator canvasRef={canvasRef} zoomLevel={zoomLevel} />
      <InferenceScanOverlay containerRef={containerRef} />
      <ObjectContextMenu />

      {annotating && currentTool === 'ai_annotation' && (
        <div
          className="absolute inset-0 pointer-events-none"
          /* Focus mode lifts the prompt canvas above the dim (z40) but below the
             overlay's own buttons (z50). Refinement uses z62 so the control
             points (z65) stay on top. */
          style={{ zIndex: refinementModeActive ? 62 : focusModeActive ? 45 : undefined }}
        >
          <div className="absolute inset-0 pointer-events-auto">
            <AIPromptCanvas
              width={containerRef.current?.offsetWidth || 800}
              height={containerRef.current?.offsetHeight || 600}
              renderBackground={false}
            />
            <ModelSelectionHint />
          </div>
        </div>
      )}

      {annotating && currentTool === 'manual_drawing' && (
        <div className="absolute inset-0 pointer-events-auto">
          <ManualDrawCanvas />
        </div>
      )}
    </div>
  );
};

export default CanvasContainer;
