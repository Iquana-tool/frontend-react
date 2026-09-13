/**
 * Geometry helpers for the manual contour editor.
 *
 * The editor's model is a small set of **control vertices** rather than the dense
 * point list a segmentation model emits (which can be hundreds of points — far too
 * many handles to drag, and every point sat on top of its neighbours). On entering
 * edit mode we simplify the dense outline to a handful of vertices with
 * Ramer–Douglas–Peucker (`simplifyClosedContour`); the handles the user drags are
 * those vertices. The outline actually shown and saved is a smooth closed
 * Catmull-Rom curve resampled through the vertices (`densifyClosedVertices`), so a
 * dozen handles still describe a clean curve, and the user adds a vertex only where
 * they need finer control. Everything works in normalized [0,1] image coordinates.
 */

/** Perpendicular distance from point `p` to the segment `a`–`b`. */
function segmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Classic Ramer–Douglas–Peucker on an open polyline of {x,y} points. */
function rdp(points, epsilon) {
  if (points.length < 3) return points.slice();
  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const dist = segmentDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

/** Turn parallel x/y arrays into {x,y} points, dropping a repeated closing point. */
function toPoints(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  const points = [];
  for (let i = 0; i < n; i++) points.push({ x: xs[i], y: ys[i] });
  if (
    points.length > 1 &&
    points[0].x === points[points.length - 1].x &&
    points[0].y === points[points.length - 1].y
  ) {
    points.pop();
  }
  return points;
}

/** Index of the point farthest from the centroid — a stable, shape-independent seam. */
function farthestFromCentroid(points) {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  let best = 0;
  let bestDist = -1;
  points.forEach((p, i) => {
    const d = (p.x - cx) ** 2 + (p.y - cy) ** 2;
    if (d > bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/**
 * Simplify a dense closed contour to a small set of control vertices.
 *
 * Bisects the RDP tolerance to land the vertex count inside
 * [minVertices, maxVertices] — "as few points as possible" while still tracking the
 * shape. The polyline is rotated to start at an extreme point so the fixed RDP
 * endpoints do not fall in the middle of a curve and leave a flat seam.
 *
 * @returns {{x: number[], y: number[]}} sparse vertices in draw order (open loop).
 */
export function simplifyClosedContour(xs, ys, { maxVertices = 16, minVertices = 5 } = {}) {
  const points = toPoints(xs, ys);
  if (points.length <= minVertices) {
    return { x: points.map((p) => p.x), y: points.map((p) => p.y) };
  }

  // Rotate to start at an extreme point, then close the polyline back onto it so
  // RDP simplifies the whole loop rather than an arbitrary cut of it.
  const start = farthestFromCentroid(points);
  const rotated = points.slice(start).concat(points.slice(0, start));
  const closedLine = rotated.concat([rotated[0]]);

  const diag = Math.hypot(1, 1); // normalized coords: bbox diagonal upper bound.
  let lo = 0;
  let hi = diag;
  let best = closedLine;

  for (let iter = 0; iter < 24; iter++) {
    const mid = (lo + hi) / 2;
    const simplified = rdp(closedLine, mid);
    const count = simplified.length - 1; // last point repeats the first.
    if (count > maxVertices) {
      lo = mid; // too many → simplify harder.
    } else {
      best = simplified;
      if (count <= minVertices) {
        hi = mid; // too few → back off.
      } else {
        hi = mid;
      }
    }
  }

  const vertices = best.slice(0, -1); // drop the repeated closing point.
  return { x: vertices.map((p) => p.x), y: vertices.map((p) => p.y) };
}

/** Uniform Catmull-Rom interpolation of one scalar channel. */
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Resample a smooth closed curve through the control vertices.
 *
 * Produces the dense outline that is displayed and saved, so a few vertices still
 * yield a clean curve downstream (metrics, mask, export all read the dense x/y).
 *
 * @returns {{x: number[], y: number[]}} dense outline (open loop; no repeated point).
 */
export function densifyClosedVertices(vx, vy, { samplesPerSegment = 16 } = {}) {
  const n = Math.min(vx.length, vy.length);
  if (n < 3) return { x: [...vx], y: [...vy] };

  const x = [];
  const y = [];
  for (let i = 0; i < n; i++) {
    const p0x = vx[(i - 1 + n) % n];
    const p0y = vy[(i - 1 + n) % n];
    const p1x = vx[i];
    const p1y = vy[i];
    const p2x = vx[(i + 1) % n];
    const p2y = vy[(i + 1) % n];
    const p3x = vx[(i + 2) % n];
    const p3y = vy[(i + 2) % n];
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      x.push(catmullRom(p0x, p1x, p2x, p3x, t));
      y.push(catmullRom(p0y, p1y, p2y, p3y, t));
    }
  }
  return { x, y };
}

/**
 * Which edge of the vertex loop a click lands nearest, for inserting a vertex.
 *
 * @returns {{index: number, distance: number}} `index` is the vertex the new point
 *   should be inserted *after* (i.e. the start of the nearest edge).
 */
export function nearestEdge(vx, vy, point) {
  const n = Math.min(vx.length, vy.length);
  let bestIndex = 0;
  let bestDist = Infinity;
  for (let i = 0; i < n; i++) {
    const a = { x: vx[i], y: vy[i] };
    const b = { x: vx[(i + 1) % n], y: vy[(i + 1) % n] };
    const dist = segmentDistance(point, a, b);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return { index: bestIndex, distance: bestDist };
}

// -- Line-merge editing -----------------------------------------------------
//
// Reshape a contour by drawing an open line near its boundary: the line's two ends
// snap to the closest points on the contour, and the boundary arc that runs closest
// to the line is replaced by the line. Drawing the line just outside the boundary
// bulges it out (adds a region); drawing it just inside bites in (cuts a region).

function nearestIndex(points, pt) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = (points[i].x - pt.x) ** 2 + (points[i].y - pt.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Minimum distance from a point to an open polyline. */
function pointToPolyline(pt, line) {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    best = Math.min(best, segmentDistance(pt, line[i], line[i + 1]));
  }
  return best;
}

/** Contour vertices from index `from` to `to`, walking forward (wrapping), inclusive. */
function collectArc(contour, from, to) {
  const n = contour.length;
  const out = [];
  let i = from;
  while (true) {
    out.push(contour[i]);
    if (i === to) break;
    i = (i + 1) % n;
  }
  return out;
}

/** Mean distance from the vertices of an arc (from→to forward) to the line. */
function arcMeanDistanceToLine(contour, from, to, line) {
  const arc = collectArc(contour, from, to);
  let sum = 0;
  for (const p of arc) sum += pointToPolyline(p, line);
  return sum / arc.length;
}

/**
 * Merge an open line into a closed contour, replacing the boundary arc nearest the
 * line. All points are {x, y} in the same (e.g. pixel) space.
 *
 * @param {Array<{x:number,y:number}>} contour - closed contour vertices (no repeated point)
 * @param {Array<{x:number,y:number}>} line - the drawn open polyline (>= 2 points)
 * @returns {Array<{x:number,y:number}>} the reshaped closed contour, or the original
 *   contour unchanged when the edit is degenerate (both ends snap to the same vertex).
 */
export function mergeLineIntoContour(contour, line) {
  const n = contour.length;
  if (n < 3 || !line || line.length < 2) return contour;

  const a = nearestIndex(contour, line[0]);
  const b = nearestIndex(contour, line[line.length - 1]);
  if (a === b) return contour; // ends land on the same vertex — nothing to split.

  // Of the two arcs between the snap points, replace the one the line runs closest
  // to (the boundary the user drew over); keep the other.
  const distForward = arcMeanDistanceToLine(contour, a, b, line); // a→…→b
  const distBackward = arcMeanDistanceToLine(contour, b, a, line); // b→…→a

  if (distForward <= distBackward) {
    // Replace a→b; keep b→a. Line runs a-side → b-side, then follow the kept arc.
    return [...line, ...collectArc(contour, b, a)];
  }
  // Replace b→a; keep a→b. Walk the kept arc a→b, then back along the reversed line.
  return [...collectArc(contour, a, b), ...[...line].reverse()];
}

// -- Splitting --------------------------------------------------------------
//
// Cut one contour in two by drawing an open line across it (GitHub #43). The
// snapping and arc bookkeeping are the ones `mergeLineIntoContour` already does:
// it collects *both* arcs between the snapped endpoints and throws one away. A
// split keeps both — each arc, closed with the drawn line, is one half.

/** Shoelace area of a closed polygon; sign carries the winding. */
export function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/** Ramer–Douglas–Peucker on an open polyline; exported for the union tracer. */
export function simplifyPolyline(points, epsilon) {
  return rdp(points, epsilon);
}

/** Ray-casting point-in-polygon on {x,y} points. */
function pointInPolygon(pt, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if ((pi.y > pt.y) !== (pj.y > pt.y) &&
        pt.x < ((pj.x - pi.x) * (pt.y - pi.y)) / (pj.y - pi.y) + pi.x) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Walk the drawn line and count how often it enters or leaves the contour.
 *
 * Sampled rather than solved as segment intersections: a hand-drawn line whose
 * end lands exactly on a boundary vertex has no *proper* crossing there, so an
 * intersection count reads a clean cut across a shape as "never entered it".
 */
function traceLineAgainstContour(contour, line) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of contour) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const step = Math.hypot(maxX - minX, maxY - minY) / 400 || 1;

  let previous = null;
  let transitions = 0;
  let anyInside = false;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    const samples = Math.max(1, Math.min(2000, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step)));
    for (let k = i === 0 ? 0 : 1; k <= samples; k++) {
      const t = k / samples;
      const inside = pointInPolygon({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, contour);
      if (inside) anyInside = true;
      if (previous !== null && inside !== previous) transitions++;
      previous = inside;
    }
  }
  return { transitions, anyInside };
}

/** A half smaller than this fraction of the original is a mis-snap, not a split. */
const MIN_HALF_AREA_FRACTION = 0.001;

/**
 * Split a closed contour into two along an open drawn line.
 *
 * Both ends of the line snap to their nearest contour vertex, exactly as
 * `mergeLineIntoContour` does; the two boundary arcs between those vertices,
 * each closed with the line, are the two halves.
 *
 * This models a line that passes through the interior once. A line that leaves
 * and re-enters a concave shape would need real polygon clipping, so it is
 * refused (`crossings`) rather than silently mis-split.
 *
 * @param {Array<{x:number,y:number}>} contour - closed contour (no repeated point)
 * @param {Array<{x:number,y:number}>} line - the drawn open polyline (>= 2 points)
 * @returns {{halves: Array<Array<{x:number,y:number}>>}|{error: string}} the two
 *   halves, largest first, or a refusal code: `contour` / `line` (unusable input),
 *   `crossings` (line re-enters the shape), `outside` (line misses the object),
 *   `ends` (both ends snap to the same vertex), `degenerate` (a half has no area).
 */
export function splitContourByLine(contour, line) {
  if (!Array.isArray(contour) || contour.length < 3) return { error: 'contour' };
  if (!Array.isArray(line) || line.length < 2) return { error: 'line' };

  const { transitions, anyInside } = traceLineAgainstContour(contour, line);
  // In and out again is one clean cut. More than that means the line re-entered a
  // concave shape, which the two-arc model cannot express.
  if (transitions > 2) return { error: 'crossings' };
  // No transition at all is fine for a line drawn wholly inside the object (its
  // ends snap outward to the boundary) but not for one drawn past it entirely.
  if (!anyInside) return { error: 'outside' };

  const a = nearestIndex(contour, line[0]);
  const b = nearestIndex(contour, line[line.length - 1]);
  if (a === b) return { error: 'ends' };

  const halves = [
    [...line, ...collectArc(contour, b, a)],
    [...collectArc(contour, a, b), ...[...line].reverse()],
  ];

  const whole = Math.abs(polygonArea(contour));
  for (const half of halves) {
    if (half.length < 3) return { error: 'degenerate' };
    if (Math.abs(polygonArea(half)) <= whole * MIN_HALF_AREA_FRACTION) return { error: 'degenerate' };
  }

  // Largest first: the caller keeps the original contour id on halves[0], so the
  // children and the rejection history stay with the part that is still "the" object.
  halves.sort((p, q) => Math.abs(polygonArea(q)) - Math.abs(polygonArea(p)));
  return { halves };
}
