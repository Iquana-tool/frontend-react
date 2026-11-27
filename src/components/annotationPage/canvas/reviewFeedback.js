/**
 * Shared rules for the review feedback on the canvas: the comet that marks the
 * object under review, and the short animation each verdict plays.
 *
 * Every mark is drawn outside the outline or on top of it for a moment only, so
 * the edge the reviewer judges is never covered for long.
 */

/** Reject red and send-back purple. No label colour may claim these meanings. */
export const REJECT_COLOR = '#ef4444';
export const SENT_BACK_COLOR = '#a855f7';

/** How long a verdict's badge and outline animation stay on the canvas. */
export const TRANSIENT_MS = 1600;

/**
 * How long a send-back waits when the session moves to another image next,
 * which would otherwise unmount the animation before anyone saw it.
 */
export const SEND_BACK_HOLD_MS = 550;

/** Verdicts whose mark stays until the reviewer leaves the image. */
const LASTING_KINDS = new Set(['rejected', 'sentBack']);

export const isLastingVerdict = (kind) => LASTING_KINDS.has(kind);

/** Comet geometry, in screen pixels. */
export const COMET = {
  /** Clear band between the outline and the comet, so the edge stays visible. */
  gap: 3,
  /** Width of the comet band outside the gap. */
  band: 6,
  /** Speed of the head along the outline. */
  pxPerSecond: 260,
  minLapSeconds: 1.4,
  maxLapSeconds: 3.6,
};

/**
 * Seconds for one comet lap. A fixed speed keeps a large object from whipping
 * the comet round and a small one from crawling, within sane limits.
 *
 * @param {number} perimeterPx - Outline length on screen.
 */
export const cometLapSeconds = (perimeterPx) => {
  if (!Number.isFinite(perimeterPx) || perimeterPx <= 0) return COMET.minLapSeconds;
  return Math.min(Math.max(perimeterPx / COMET.pxPerSecond, COMET.minLapSeconds), COMET.maxLapSeconds);
};

/**
 * Length of a closed outline in image pixels.
 *
 * @param {number[]} xs - Normalised x coordinates (0–1).
 * @param {number[]} ys - Normalised y coordinates (0–1).
 * @param {number} width - Image width in pixels.
 * @param {number} height - Image height in pixels.
 */
export const outlineLength = (xs, ys, width, height) => {
  const n = Math.min(xs?.length ?? 0, ys?.length ?? 0);
  if (n < 2) return 0;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    total += Math.hypot((xs[j] - xs[i]) * width, (ys[j] - ys[i]) * height);
  }
  return total;
};

/** Whether two outlines have the same vertices. */
export const sameOutline = (a, b) => {
  if (!a || !b) return false;
  if (a.x?.length !== b.x?.length || a.y?.length !== b.y?.length) return false;
  for (let i = 0; i < a.x.length; i += 1) {
    if (a.x[i] !== b.x[i] || a.y[i] !== b.y[i]) return false;
  }
  return true;
};

/**
 * Add a verdict mark to the list.
 *
 * Marks belong to one image: a mark for another mask clears the old image's
 * marks, ghosts included. A new verdict on the same object replaces its earlier
 * mark, so an object sent back and then accepted stops being purple.
 *
 * @param {Object[]} marks
 * @param {Object} mark - `{ id, kind, maskId, contourId, ... }`.
 */
export const addVerdictMark = (marks, mark) => [
  ...marks.filter(
    (existing) =>
      existing.maskId === mark.maskId &&
      (mark.contourId == null || String(existing.contourId) !== String(mark.contourId))
  ),
  mark,
];

/** Remove marks of every image except `maskId`. */
export const keepMarksOfMask = (marks, maskId) => {
  const kept = marks.filter((mark) => mark.maskId === maskId);
  return kept.length === marks.length ? marks : kept;
};
