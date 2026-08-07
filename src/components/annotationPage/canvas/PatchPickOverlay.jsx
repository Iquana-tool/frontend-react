import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sampleCalibrationPatch } from '../../../api/calibration';
import { useToast } from '../../../contexts/ToastContext';
import {
  useActiveCalibrationKind,
  useActivePatchPick,
  useAddWedgeEnd,
  useCalibrationEntries,
  useCancelPatchPick,
  useCurrentImageId,
  useImageObject,
  useSampleRadius,
  useSetPendingSample,
  useSetWedgePoint,
  useWedgeState,
  useWorkspaceMode,
} from '../../../stores/selectors/annotationSelectors';

/**
 * Canvas half of the calibration measurements.
 *
 * The drawer arms a pick; this captures the clicks and converts them to image
 * pixels. It handles three shapes of measurement:
 *
 *   role        one named reference (the two-patch strategy's black/white/neutral)
 *   wedge_ends  the two ends of a reference card, from which every patch centre
 *               between them is derived
 *   wedge_patch one card patch, to correct a disc that landed badly
 *
 * Whatever the mode, the *averaging* happens server-side on the original file, not
 * here on the rendered `<img>`: the canvas shows a scaled and possibly re-encoded
 * copy, and a reference read off that would calibrate the display rather than the
 * data. The only thing this component contributes is *where*.
 *
 * It also draws a placed card's discs whenever Calibrate mode is open, armed or
 * not, because seeing where the twenty samples actually land is the only way to
 * catch a card that is rotated, foreshortened, or one patch out.
 *
 * Sits at z-85, above the scale calibration overlay (z-80), so the two can never
 * both be capturing clicks — arming one is what cancels the other.
 */
const PatchPickOverlay = ({ canvasRef }) => {
  const mode = useWorkspaceMode();
  const activePick = useActivePatchPick();
  const activeKind = useActiveCalibrationKind();
  const cancelPatchPick = useCancelPatchPick();
  const setPendingSample = useSetPendingSample();
  const addWedgeEnd = useAddWedgeEnd();
  const setWedgePoint = useSetWedgePoint();
  const sampleRadius = useSampleRadius();
  const currentImageId = useCurrentImageId();
  const imageObject = useImageObject();
  const wedge = useWedgeState();
  const entries = useCalibrationEntries();
  const { addToast } = useToast();

  const containerRef = useRef(null);
  const [cursor, setCursor] = useState(null);
  const [sampling, setSampling] = useState(false);

  const calibrating = mode === 'calibrate';

  /** How many patches the selected reference card has, for the two-click placement. */
  const patchCount = (() => {
    const entry = entries.find((item) => item.kind === (activePick?.kind || activeKind));
    if (!entry?.cards?.length) return 0;
    const key = entry.params?.card || entry.dataset_defaults?.card || entry.default_card;
    const card = entry.cards.find((item) => item.card === key) || entry.cards[0];
    return card?.neutral_patch_count || 0;
  })();

  /** Container-relative point -> image pixels, via the rendered image rect. */
  const containerToImagePx = useCallback((containerX, containerY) => {
    if (!canvasRef?.current || !containerRef.current) return null;
    const imageRect = canvasRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    if (!imageRect.width || !imageRect.height) return null;

    const relX = containerX + containerRect.left - imageRect.left;
    const relY = containerY + containerRect.top - imageRect.top;
    const imgW = imageObject?.width || imageObject?.naturalWidth || 1;
    const imgH = imageObject?.height || imageObject?.naturalHeight || 1;
    return {
      x: (relX * imgW) / imageRect.width,
      y: (relY * imgH) / imageRect.height,
    };
  }, [canvasRef, imageObject]);

  /** Image pixels -> container-relative, for drawing a placed card back. */
  const imagePxToContainer = useCallback((point) => {
    if (!canvasRef?.current || !containerRef.current) return null;
    const imageRect = canvasRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const imgW = imageObject?.width || imageObject?.naturalWidth || 1;
    const imgH = imageObject?.height || imageObject?.naturalHeight || 1;
    return {
      x: (point.x * imageRect.width) / imgW + imageRect.left - containerRect.left,
      y: (point.y * imageRect.height) / imgH + imageRect.top - containerRect.top,
    };
  }, [canvasRef, imageObject]);

  /** How many screen pixels the sample radius currently covers. */
  const screenRadius = useCallback(() => {
    if (!canvasRef?.current) return sampleRadius;
    const rect = canvasRef.current.getBoundingClientRect();
    const imgW = imageObject?.width || imageObject?.naturalWidth || 1;
    if (!rect.width || !imgW) return sampleRadius;
    return Math.max(2, (sampleRadius * rect.width) / imgW);
  }, [canvasRef, imageObject, sampleRadius]);

  const handleMouseMove = useCallback((event) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, []);

  const handleClick = useCallback(async (event) => {
    if (!activePick || sampling || !currentImageId) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = containerToImagePx(event.clientX - rect.left, event.clientY - rect.top);
    if (!point) return;

    if (activePick.mode === 'wedge_ends') {
      addWedgeEnd(point, patchCount);
      return;
    }
    if (activePick.mode === 'wedge_patch') {
      // The drawer's sampler notices the missing reading and re-reads this one.
      setWedgePoint(activePick.index, point);
      return;
    }

    setSampling(true);
    try {
      const sample = await sampleCalibrationPatch(
        currentImageId, point.x, point.y, sampleRadius, activePick.kind,
      );
      setPendingSample(activePick.kind, activePick.role, sample);
    } catch (error) {
      addToast({ message: error.message || 'Could not sample that point.', type: 'error' });
    } finally {
      setSampling(false);
    }
  }, [activePick, sampling, currentImageId, containerToImagePx, sampleRadius, patchCount,
      addWedgeEnd, setWedgePoint, setPendingSample, addToast]);

  // Escape disarms, matching the scale calibration overlay.
  useEffect(() => {
    if (!activePick) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') cancelPatchPick();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activePick, cancelPatchPick]);

  // Nothing to capture and nothing placed to show.
  if (!activePick && !(calibrating && wedge.points.length)) return null;

  const radius = screenRadius();
  const placed = wedge.points.map(imagePxToContainer);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${activePick ? 'cursor-crosshair' : 'pointer-events-none'}`}
      style={{ zIndex: 85 }}
      onClick={activePick ? handleClick : undefined}
      onMouseMove={activePick ? handleMouseMove : undefined}
      onMouseLeave={() => setCursor(null)}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* A placed reference card: every disc that will be averaged, at true size. */}
        {placed.map((point, index) => point && (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={radius}
            fill="none"
            stroke={activePick?.mode === 'wedge_patch' && activePick.index === index
              ? '#f59e0b' : '#38bdf8'}
            strokeWidth={activePick?.mode === 'wedge_patch' && activePick.index === index
              ? 2.5 : 1.25}
            opacity={0.9}
          />
        ))}

        {/* The first end of a card, while waiting for the second. */}
        {wedge.ends.length === 1 && activePick?.mode === 'wedge_ends' && (() => {
          const first = imagePxToContainer(wedge.ends[0]);
          if (!first) return null;
          return (
            <>
              <circle cx={first.x} cy={first.y} r={radius} fill="rgba(56,189,248,0.16)"
                      stroke="#38bdf8" strokeWidth="1.5" />
              {cursor && (
                <line x1={first.x} y1={first.y} x2={cursor.x} y2={cursor.y}
                      stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6,4" />
              )}
            </>
          );
        })()}

        {cursor && activePick && (
          <>
            <circle cx={cursor.x} cy={cursor.y} r={radius}
                    fill="rgba(56,189,248,0.16)" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx={cursor.x} cy={cursor.y} r="1.5" fill="#38bdf8" />
          </>
        )}
      </svg>

      {activePick && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-onAccent text-sm font-medium shadow-lg">
            <span>{instructionFor(activePick, wedge, patchCount, sampling, sampleRadius)}</span>
            <span className="text-onAccent opacity-70 text-xs ml-2">ESC to cancel</span>
          </div>
        </div>
      )}
    </div>
  );
};

/** What to ask for next, in terms of the card rather than of the interaction. */
const instructionFor = (pick, wedge, patchCount, sampling, radius) => {
  if (sampling) return 'Reading the patch…';
  if (pick.mode === 'wedge_ends') {
    return wedge.ends.length === 0
      ? 'Click the centre of the lightest patch'
      : `Click the centre of the darkest patch (${patchCount} of ${patchCount})`;
  }
  if (pick.mode === 'wedge_patch') {
    return `Click where patch ${pick.index + 1} actually is`;
  }
  return `Click the ${pick.role} patch — averaged over ${radius} px`;
};

export default PatchPickOverlay;
