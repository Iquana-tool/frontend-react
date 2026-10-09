import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DrawerFrame from './DrawerFrame';
import TagsEditor from './TagsEditor';
import useStackNav from './useStackNav';
import { useMergedStackObjects } from './useStackData';
import {
  footprintSegments,
  frameLine,
  nearestFrame,
  panToCentre,
  pointOnLine,
  visibleImageRect,
} from './overviewGeometry';
import Switch from '../primitives/Switch';
import { resolveLabelColor } from '../labelColorUtils';
import { fetchStackOverviewUrl, updateStackMetadata } from '../../../../api/stacks';
import {
  deleteImageMetadataKey,
  fetchImageMetadata,
  setImageMetadata,
} from '../../../../api/image_metadata';
import { clampPan } from '../../../../utils/canvasViewport';
import { stackKindLabel } from '../../../../utils/stackItems';
import { usePermissions } from '../../../../hooks/usePermissions';
import { Permission } from '../../../../utils/permissions';
import { useDataset } from '../../../../contexts/DatasetContext';
import useAnnotationStore from '../../../../stores/useAnnotationStore';
import {
  useCurrentImage,
  useCursorPosition,
  useDatasetLabels,
  useImageObject,
  useImageScale,
  useLabelColorOverrides,
  usePanOffset,
  useSetPanOffset,
  useStackDetails,
  useZoomLevel,
} from '../../../../stores/selectors/annotationSelectors';

/** Side of the overview picture; the drawer is 272px with 10px padding. */
const BOX = 252;

const FORMAT_NAMES = { heidelberg_vol: 'Heidelberg VOL', heidelberg_e2e: 'Heidelberg E2E' };

const Details = ({ rows }) => (
  <div className="flex flex-col gap-[6px]">
    <span className="text-sect font-bold tracking-[.08em] uppercase text-t3">From the file</span>
    <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-y-[4px] font-mono text-ctl">
      {rows.filter(([, value]) => value != null && value !== '').map(([key, value]) => (
        <React.Fragment key={key}>
          <span className="text-t3">{key}</span>
          <span className="text-t1 truncate" title={String(value)}>{value}</span>
        </React.Fragment>
      ))}
    </div>
  </div>
);

/**
 * The IR-SLO of an OCT volume with every slice's line on it.
 *
 * Click a line to open that slice, or press and drag across the lines to scrub.
 * The current slice is the bright line; the white ring is where the cursor is on
 * the B-scan, carried along that line. "Show how far objects reach" draws each
 * object's width on its slice's line in its label colour, which together trace
 * the lesion's footprint on the fundus.
 */
const StackOverview = ({ details }) => {
  const { frameIndex, goToFrame } = useStackNav();
  const objects = useMergedStackObjects();
  const labels = useDatasetLabels();
  const colorOverrides = useLabelColorOverrides();
  const cursor = useCursorPosition();
  const imageObject = useImageObject();
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState(null);
  const [showFootprints, setShowFootprints] = useState(true);
  const scrubbing = useRef(false);
  const svgRef = useRef(null);

  useEffect(() => {
    let revoked = false;
    let objectUrl = null;
    setUrl(null);
    setFailed(false);
    fetchStackOverviewUrl(details.stack_id)
      .then((created) => {
        objectUrl = created;
        if (revoked) URL.revokeObjectURL(created);
        else setUrl(created);
      })
      .catch(() => setFailed(true));
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [details.stack_id]);

  const frames = details.frames || [];
  const width = details.overview_width || 1;
  const height = details.overview_height || 1;
  const boxHeight = Math.round(BOX * (height / width));

  const segments = useMemo(
    () => (showFootprints ? footprintSegments(objects, frames) : []),
    [showFootprints, objects, frames]
  );
  const colorOf = useCallback((labelId) => {
    const label = labels.find((candidate) => String(candidate.id) === String(labelId));
    return label ? resolveLabelColor(label, colorOverrides) : 'var(--t2)';
  }, [labels, colorOverrides]);

  const currentLine = frameLine(frames[frameIndex]);
  const frameWidth = imageObject?.naturalWidth || imageObject?.width || frames[frameIndex]?.width;
  const ring = currentLine && cursor && frameWidth
    ? pointOnLine(currentLine, Math.min(1, Math.max(0, cursor.x / frameWidth)))
    : null;

  const frameAt = (event) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect?.width) return null;
    const point = [
      ((event.clientX - rect.left) / rect.width) * width,
      ((event.clientY - rect.top) / rect.height) * height,
    ];
    return nearestFrame(frames, point);
  };

  // Stroke widths are in overview pixels; this keeps them a fixed size on screen.
  const px = width / BOX;
  const eye = details.metadata?.Eye || details.metadata?.eye || details.metadata?.Laterality;

  return (
    <div className="flex flex-col gap-[7px]">
      <div className="relative overflow-hidden rounded-6 bg-black" style={{ width: BOX, height: boxHeight }}>
        {failed && (
          <span className="absolute inset-0 flex items-center justify-center text-sect text-t3">
            The overview image could not be loaded.
          </span>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width={BOX}
          height={boxHeight}
          className="absolute inset-0 block cursor-pointer select-none"
          role="img"
          aria-label="Overview with slice positions"
          onPointerDown={(event) => {
            const index = frameAt(event);
            if (index == null) return;
            scrubbing.current = true;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            goToFrame(index);
          }}
          onPointerMove={(event) => {
            const index = frameAt(event);
            setHover(index);
            if (scrubbing.current && index != null) goToFrame(index);
          }}
          onPointerUp={() => { scrubbing.current = false; }}
          onPointerLeave={() => { setHover(null); }}
        >
          {url && <image href={url} x={0} y={0} width={width} height={height} />}
          <g strokeLinecap="round">
            {frames.map((frame, index) => {
              const line = frameLine(frame);
              if (!line || index === frameIndex) return null;
              return (
                <line
                  key={frame.image_id}
                  x1={line.start[0]} y1={line.start[1]} x2={line.end[0]} y2={line.end[1]}
                  stroke={index === hover ? 'rgba(255,255,255,.85)' : 'rgba(61,219,199,.32)'}
                  strokeWidth={(index === hover ? 1.6 : 1) * px}
                />
              );
            })}
            {segments.map((segment) => (
              <line
                key={segment.key}
                x1={segment.from[0]} y1={segment.from[1]} x2={segment.to[0]} y2={segment.to[1]}
                stroke={colorOf(segment.labelId)}
                strokeWidth={3 * px}
                opacity={0.9}
              />
            ))}
            {currentLine && (
              <line
                x1={currentLine.start[0]} y1={currentLine.start[1]}
                x2={currentLine.end[0]} y2={currentLine.end[1]}
                stroke="var(--accent)"
                strokeWidth={2.2 * px}
                style={{ filter: 'drop-shadow(0 0 3px rgba(61,219,199,.7))' }}
              />
            )}
            {ring && (
              <circle
                cx={ring[0]} cy={ring[1]} r={6 * px}
                fill="none" stroke="#fff" strokeWidth={2 * px}
                style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,.7))' }}
              />
            )}
          </g>
        </svg>
        {eye && (
          <span className="absolute left-[7px] top-[5px] font-mono text-sect font-bold text-white/80 pointer-events-none">
            {eye}
          </span>
        )}
        {hover != null && (
          <span className="absolute right-[5px] bottom-[5px] px-[7px] py-[3px] rounded-6 bg-tip text-onTip text-ctl pointer-events-none shadow-tip">
            Slice {hover + 1}
          </span>
        )}
      </div>
      <span className="text-sect leading-[1.45] text-t3">
        Click a line to open that slice, or drag across the lines to scrub. The white ring
        follows your cursor on the scan.
      </span>
      <label className="h-6 flex items-center gap-[8px] px-[4px] rounded-5 text-ctl text-t2 hover:bg-hv cursor-pointer">
        <Switch checked={showFootprints} onChange={setShowFootprints} label="Show how far objects reach" />
        Show how far objects reach
      </label>
    </div>
  );
};

/**
 * A plain image as its own overview, with the part the canvas shows boxed.
 * Click or drag on it to move the canvas there.
 */
const ImageOverview = () => {
  const imageObject = useImageObject();
  const zoom = useZoomLevel();
  const pan = usePanOffset();
  const setPanOffset = useSetPanOffset();
  const [containerSize, setContainerSize] = useState(null);
  const dragging = useRef(false);
  const boxRef = useRef(null);

  // The canvas area, measured the way the canvas itself is laid out.
  useEffect(() => {
    const element = document.querySelector('[data-guide="canvas"]');
    if (!element) return undefined;
    const measure = () => setContainerSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!imageObject) return null;
  const imageSize = { width: imageObject.naturalWidth || imageObject.width, height: imageObject.naturalHeight || imageObject.height };
  const boxHeight = Math.round(BOX * (imageSize.height / imageSize.width));
  const visible = containerSize && visibleImageRect({ containerSize, imageSize, zoom, pan });

  const moveTo = (event) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect?.width || !containerSize) return;
    const u = (event.clientX - rect.left) / rect.width;
    const v = (event.clientY - rect.top) / rect.height;
    const next = panToCentre({ containerSize, imageSize, u, v });
    setPanOffset(clampPan({ pan: next, zoom, containerSize, imageSize }));
  };

  return (
    <div className="flex flex-col gap-[7px]">
      <div
        ref={boxRef}
        className="relative overflow-hidden rounded-6 bg-black cursor-move select-none"
        style={{ width: BOX, height: boxHeight }}
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          moveTo(event);
        }}
        onPointerMove={(event) => dragging.current && moveTo(event)}
        onPointerUp={() => { dragging.current = false; }}
      >
        <img src={imageObject.src} alt="" draggable={false} className="w-full h-full object-fill block" />
        {visible && (
          <div
            className="absolute border-2 border-accent bg-acS pointer-events-none"
            style={{
              left: `${visible.x * 100}%`,
              top: `${visible.y * 100}%`,
              width: `${visible.width * 100}%`,
              height: `${visible.height * 100}%`,
              boxShadow: zoom > 1 ? '0 0 0 9999px rgba(0,0,0,.45)' : undefined,
            }}
          />
        )}
      </div>
      <span className="text-sect leading-[1.45] text-t3">
        The box is what the canvas shows. Zoom in to see it shrink; drag it to move around.
      </span>
    </div>
  );
};

/**
 * The Overview entry of the left drawer, for every item.
 *
 * An OCT volume shows its IR-SLO with the slice lines; a plain image shows
 * itself with the viewport box. Below either: what the file says (read only)
 * and the item's tags. A stack's tags live on the stack, so every slice
 * inherits them; a slice's own keys from the file are listed read only.
 */
const OverviewDrawer = () => {
  const currentImage = useCurrentImage();
  const details = useStackDetails();
  const imageObject = useImageObject();
  const scale = useImageScale();
  const { isStack, frameIndex, frameCount } = useStackNav();
  const { currentDataset } = useDataset();
  const { can } = usePermissions(currentDataset);
  const canEdit = can(Permission.IMAGE_METADATA_WRITE);
  const [imageTags, setImageTags] = useState({});

  const stackReady = isStack && details && details.stack_id === currentImage?.stackId;
  const imageId = currentImage?.id;

  useEffect(() => {
    if (isStack || imageId == null) return undefined;
    let cancelled = false;
    setImageTags({});
    fetchImageMetadata(imageId)
      .then((response) => { if (!cancelled) setImageTags(response.metadata || {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isStack, imageId]);

  const setStackTag = async (key, value) => {
    const response = await updateStackMetadata(details.stack_id, { [key]: value });
    useAnnotationStore.getState().setStackDetails({ ...details, metadata: response.metadata });
  };
  const removeStackTag = async (key) => {
    const response = await updateStackMetadata(details.stack_id, {}, [key]);
    useAnnotationStore.getState().setStackDetails({ ...details, metadata: response.metadata });
  };
  const setImageTag = async (key, value) => {
    await setImageMetadata(imageId, { [key]: value });
    setImageTags((tags) => ({ ...tags, [key]: value }));
  };
  const removeImageTag = async (key) => {
    await deleteImageMetadataKey(imageId, key);
    setImageTags((tags) => {
      const next = { ...tags };
      delete next[key];
      return next;
    });
  };

  const pixelSize = imageObject
    ? `${imageObject.naturalWidth || imageObject.width} × ${imageObject.naturalHeight || imageObject.height} px`
    : null;
  const scaleText = scale?.unit && scale.unit !== 'px' && scale.scaleX > 0
    ? `${scale.scaleX.toPrecision(3)} ${scale.unit}/px`
    : 'not set';

  if (isStack) {
    const frame = stackReady ? details.frames[frameIndex] : null;
    const spacing = details?.frame_spacing
      ? ` · ${details.frame_spacing.toPrecision(3)} ${details.frame_spacing_unit || ''} apart`
      : '';
    return (
      <DrawerFrame title="Overview">
        {!stackReady && <span className="text-sect text-t3">Loading the scan…</span>}
        {stackReady && details.has_overview && <StackOverview details={details} />}
        {stackReady && !details.has_overview && (
          <>
            <span className="text-sect leading-[1.45] text-t3">
              This scan has no overview image. Slice {frameIndex + 1} is shown below.
            </span>
            <ImageOverview />
          </>
        )}
        {stackReady && (
          <Details
            rows={[
              ['Kind', stackKindLabel(details.kind)],
              ['Slices', `${frameCount}${spacing}`],
              ['Slice', pixelSize],
              ['Scale', scaleText],
              ['Overview', details.has_overview ? `${details.overview_width} × ${details.overview_height} px` : null],
              ['Format', FORMAT_NAMES[details.source_format] || details.source_format],
              ['Position', frame?.frame_position != null
                ? `${frame.frame_position.toPrecision(3)} ${details.frame_spacing_unit || ''}`
                : null],
            ]}
          />
        )}
        {stackReady && (
          <TagsEditor
            entries={details.metadata}
            fixed={frame?.metadata}
            canEdit={canEdit}
            onSet={setStackTag}
            onRemove={removeStackTag}
            note="Tags apply to the whole scan and every slice inherits them. They are the metadata the gallery filters and review queues use."
          />
        )}
      </DrawerFrame>
    );
  }

  return (
    <DrawerFrame title="Overview">
      <ImageOverview />
      <Details rows={[['Name', currentImage?.name], ['Size', pixelSize], ['Scale', scaleText]]} />
      {imageId != null && (
        <TagsEditor
          entries={imageTags}
          canEdit={canEdit}
          onSet={setImageTag}
          onRemove={removeImageTag}
          note="Tags are the image metadata the gallery filters and review queues use."
        />
      )}
    </DrawerFrame>
  );
};

export default OverviewDrawer;
