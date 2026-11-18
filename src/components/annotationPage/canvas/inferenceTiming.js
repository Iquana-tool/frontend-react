/**
 * Timing and geometry shared by the inference animation, the outline pop-in and
 * the run tracker.
 *
 * Everything here is pure so the three agree on one clock: the overlay draws the
 * fade front with `frontRadius`, the tracker hands each new outline the moment
 * that front reaches it (`revealDelay`), and SegmentationOverlay pops it in then.
 * Distances are in image pixels; the overlay scales them to the screen.
 */

/** After the acknowledgement: how long without a new outline before the run counts as done. */
export const SETTLE_QUIET_MS = 600;
/** After the acknowledgement: the longest we wait for the outlines it announced. */
export const SETTLE_CAP_MS = 8000;

/** The fade front starts this long after the result is in… */
export const FRONT_DELAY_S = 0.05;
/** …and takes this long to clear the farthest dot. */
export const FRONT_S = 1.1;
/** One outline's pop. */
export const POP_S = 0.45;
/** "Nothing found" and failure endings. */
export const EMPTY_END_S = 2.3;
export const FAIL_END_S = 1.35;

const clamp = (x, lo = 0, hi = 1) => (x < lo ? lo : x > hi ? hi : x);

/**
 * Estimated progress, 0–1: 90 % at the estimate, after which it creeps on but
 * never reaches 100 % on its own. Only a result takes it to 100 %.
 */
export const estimatedProgress = (elapsedS, etaS) => {
  const E = Math.max(0.5, etaS || 0);
  const x = Math.max(0, elapsedS);
  return x <= E ? 0.9 * (x / E) : 0.9 + 0.1 * (1 - Math.exp(-(x - E) / (0.6 * E)));
};

/** The percentage the action bar shows while the run is open: never 100 before the result. */
export const progressPercent = (elapsedS, etaS) => Math.min(99, Math.round(estimatedProgress(elapsedS, etaS) * 100));

/** Wave period: a slow model breathes slowly. */
export const wavePeriodS = (etaS) => clamp((etaS || 0) * 0.3, 0.6, 3.5);

/** Wavelength: two to three large rings across what the model looks at. */
export const waveLength = (maxD) => Math.max(1, maxD / 2.5);

/** Radius of the fade front `t` seconds into the ending. */
export const frontRadius = (t, maxD) => {
  const k = clamp((t - FRONT_DELAY_S) / FRONT_S);
  return frontMax(maxD) * (1 - (1 - k) ** 3);
};

/** The front runs a little past the farthest dot, so its bright rim leaves the frame. */
export const frontMax = (maxD) => maxD * 1.08;

/** Seconds into the ending at which the front reaches `distance` (the inverse of frontRadius). */
export const revealDelay = (distance, maxD) => {
  const y = clamp(distance / frontMax(maxD), 0, 0.999);
  return FRONT_DELAY_S + FRONT_S * (1 - Math.cbrt(1 - y));
};

/** How long the ending plays before the overlay goes away. */
export const endingDuration = (outcome, reveal = {}) => {
  if (outcome === 'fail') return FAIL_END_S;
  if (outcome === 'empty') return EMPTY_END_S;
  const last = Object.values(reveal).reduce((m, v) => Math.max(m, v), 0);
  return Math.max(FRONT_DELAY_S + FRONT_S, last + POP_S) + 0.2;
};

// ---------------------------------------------------------------- geometry

const centroidOf = (object, w, h) => {
  const xs = object?.x || [];
  const ys = object?.y || [];
  const n = Math.min(xs.length, ys.length);
  if (!n) return null;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  return { x: (sx / n) * w, y: (sy / n) * h };
};

const polygonOf = (object, w, h) => {
  const xs = object?.x || [];
  const ys = object?.y || [];
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = [xs[i] * w, ys[i] * h];
  return out;
};

export const pointInPolygon = (x, y, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export const nearestDistance = (x, y, origins) => {
  let m = Infinity;
  for (const o of origins) m = Math.min(m, Math.hypot(x - o.x, y - o.y));
  return m;
};

export { centroidOf };

/**
 * Where a run looks and where its pulses start, in image pixels.
 *
 * Prompts are prompts, not limits: points and a box only move the origin. The
 * one thing that limits the region is focus mode, where the model works inside
 * the focused object.
 *
 * @returns {{ origins, negatives, polygon, maxD }} `polygon` is null for the
 *   whole image; `maxD` is the farthest any part of the region is from an origin.
 */
export const runGeometry = (run, imageW, imageH, objects = []) => {
  const w = imageW || 1;
  const h = imageH || 1;
  const scopeObject = run?.scopeContourId != null
    ? objects.find((o) => o.contour_id === run.scopeContourId)
    : null;
  const polygon = scopeObject ? polygonOf(scopeObject, w, h) : null;

  let origins = (run?.positives || []).map((p) => ({ x: p.x * w, y: p.y * h }));
  if (!origins.length && run?.seedContourIds?.length) {
    origins = run.seedContourIds
      .map((id) => centroidOf(objects.find((o) => o.contour_id === id), w, h))
      .filter(Boolean);
  }
  if (!origins.length && scopeObject) {
    const c = centroidOf(scopeObject, w, h);
    if (c) origins = [c];
  }
  if (!origins.length) origins = [{ x: w / 2, y: h / 2 }];
  const negatives = (run?.negatives || []).map((p) => ({ x: p.x * w, y: p.y * h }));

  // Farthest point of the region from the nearest origin, sampled on a grid.
  let x0 = 0;
  let y0 = 0;
  let x1 = w;
  let y1 = h;
  if (polygon) {
    x0 = Infinity; y0 = Infinity; x1 = -Infinity; y1 = -Infinity;
    for (const [px, py] of polygon) {
      x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
    }
  }
  const N = 24;
  let maxD = 0;
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const x = x0 + ((x1 - x0) * i) / N;
      const y = y0 + ((y1 - y0) * j) / N;
      if (polygon && !pointInPolygon(x, y, polygon)) continue;
      maxD = Math.max(maxD, nearestDistance(x, y, origins));
    }
  }
  if (!maxD) maxD = Math.hypot(x1 - x0, y1 - y0) / 2 || 1;

  return { origins, negatives, polygon, maxD };
};

/**
 * Seconds into the ending at which each new outline pops in: when the front
 * reaches it, a little before its centre so it is whole as the rim passes.
 */
export const revealSchedule = (geometry, newObjects, imageW, imageH) => {
  const out = {};
  for (const object of newObjects) {
    if (object.contour_id == null) continue;
    const c = centroidOf(object, imageW, imageH);
    const d = c ? nearestDistance(c.x, c.y, geometry.origins) : 0;
    out[object.contour_id] = revealDelay(Math.max(0, d * 0.9), geometry.maxD);
  }
  return out;
};
