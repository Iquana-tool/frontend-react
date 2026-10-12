/**
 * Geometry of the overview: where slices lie on it, which one the pointer is
 * on, and which part of a plain image the canvas shows.
 *
 * Each frame of an OCT volume knows its line on the IR-SLO
 * (`overview_geometry: {type: 'line', start: [x, y], end: [x, y]}`, overview
 * pixels). A B-scan's columns run along that line, so a point at a fraction `t`
 * of the B-scan's width sits at `start + t * (end - start)` on the overview.
 */
import { fitImageToContainer } from '../../../../utils/canvasViewport';

/** A frame's line on the overview, or null when it has none. */
export const frameLine = (frame) => {
  const geometry = frame?.overview_geometry;
  if (geometry?.type !== 'line' || !geometry.start || !geometry.end) return null;
  return { start: geometry.start, end: geometry.end };
};

/** The point a fraction `t` (0..1) along a line. */
export const pointOnLine = (line, t) => [
  line.start[0] + t * (line.end[0] - line.start[0]),
  line.start[1] + t * (line.end[1] - line.start[1]),
];

const distanceToSegment = ([px, py], { start: [ax, ay], end: [bx, by] }) => {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

/**
 * The frame whose line is closest to a point on the overview, as an index into
 * `frames`, or null when no frame has a line.
 */
export const nearestFrame = (frames, point) => {
  let best = null;
  let bestDistance = Infinity;
  frames.forEach((frame, index) => {
    const line = frameLine(frame);
    if (!line) return;
    const distance = distanceToSegment(point, line);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
};

/**
 * How far each object reaches across its slice, drawn on the overview: the
 * object's horizontal extent on the B-scan carried onto the slice's line.
 *
 * @param {Array<Object>} objects - Stack objects (`frame_index`, `label_id`, normalised `x`).
 * @param {Array<Object>} frames - Stack frames in index order, with `overview_geometry`.
 * @returns {Array<{key: string, frameIndex: number, labelId: *, from: number[], to: number[]}>}
 */
export const footprintSegments = (objects, frames) => {
  const segments = [];
  for (const object of objects) {
    const line = frameLine(frames[object.frame_index]);
    if (!line || !object.x?.length) continue;
    const from = Math.max(0, Math.min(...object.x));
    const to = Math.min(1, Math.max(...object.x));
    segments.push({
      key: `${object.frame_index}-${object.contour_id}`,
      frameIndex: object.frame_index,
      labelId: object.label_id,
      from: pointOnLine(line, from),
      to: pointOnLine(line, to),
    });
  }
  return segments;
};

/**
 * The part of the image the canvas shows, as fractions of the image (0..1 on
 * both axes), for the viewport box on a plain image's overview.
 *
 * The canvas draws the image letterboxed (`object-contain`) and then applies
 * `scale(zoom) translate(pan)` about the container's centre, so an image point
 * `p` (container pixels before the transform) lands on screen at
 * `c + zoom * (p - c + pan)`.
 */
export const visibleImageRect = ({ containerSize, imageSize, zoom, pan }) => {
  const fitted = fitImageToContainer(imageSize, containerSize);
  if (!fitted.width || !fitted.height || !zoom) return null;
  const left = (containerSize.width - fitted.width) / 2;
  const top = (containerSize.height - fitted.height) / 2;
  const cx = containerSize.width / 2;
  const cy = containerSize.height / 2;
  const toU = (screenX) => ((screenX - cx) / zoom + cx - pan.x - left) / fitted.width;
  const toV = (screenY) => ((screenY - cy) / zoom + cy - pan.y - top) / fitted.height;
  const clamp = (value) => Math.min(1, Math.max(0, value));
  const x0 = clamp(toU(0));
  const x1 = clamp(toU(containerSize.width));
  const y0 = clamp(toV(0));
  const y1 = clamp(toV(containerSize.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};

/** The pan that centres the canvas on a point given as fractions of the image. */
export const panToCentre = ({ containerSize, imageSize, u, v }) => {
  const fitted = fitImageToContainer(imageSize, containerSize);
  const left = (containerSize.width - fitted.width) / 2;
  const top = (containerSize.height - fitted.height) / 2;
  return {
    x: containerSize.width / 2 - (left + u * fitted.width),
    y: containerSize.height / 2 - (top + v * fitted.height),
  };
};
