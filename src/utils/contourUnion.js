/**
 * Union of touching or overlapping contours (GitHub #44).
 *
 * The union of two overlapping polygons is a single ring, which is exactly what a
 * contour already is — no data model change. It is computed by rasterise-and-retrace
 * rather than polygon clipping: fill every selected outline into a small binary
 * grid, OR them together, and trace the outer boundary back out. That is the same
 * route `to_binary_mask` + `Contour.from_binary_mask` take on the backend, and it
 * avoids pulling a clipping library in for the sake of one operation.
 *
 * Two consequences are deliberate:
 *
 * - Contours that merely *touch* still merge without a pinch: a morphological
 *   closing bridges the hairline gap before the boundary is traced.
 * - A selection that is genuinely disjoint (occlusion, not over-segmentation) comes
 *   back as more than one connected component and is refused. That guard is what
 *   keeps this operation schema-free — amodal merge is a separate, later feature.
 *
 * Everything here works in image pixel coordinates; the caller normalises.
 */
import { simplifyPolyline } from './contourEditing';

// The grid is sized to the selection's bounding box, not the image: merging two
// small instances in a 4000px image should not allocate 16M pixels. The span is
// clamped so a tiny object is still traced finely and a huge one stays cheap.
const MIN_RASTER_SPAN = 128;
const MAX_RASTER_SPAN = 1024;
const MARGIN = 4; // empty border in raster px, so the closing never touches the edge
const NOISE_AREA = 4; // components this small are rasterisation dust, not objects
const SIMPLIFY_RASTER_PX = 0.75; // enough to drop the staircase, not the shape

/** Even-odd scanline fill of one polygon into the grid. */
function fillPolygon(grid, w, h, ring) {
  for (let py = 0; py < h; py++) {
    const yc = py + 0.5;
    const xs = [];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j];
      const b = ring[i];
      if ((a.y > yc) !== (b.y > yc)) {
        xs.push(a.x + ((yc - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] - 0.5));
      const to = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5));
      for (let px = from; px <= to; px++) grid[py * w + px] = 1;
    }
  }
}

/** Stamp a polygon's edges, so a sliver thinner than one pixel still registers. */
function strokePolygon(grid, w, h, ring) {
  const plot = (x, y) => {
    if (x >= 0 && y >= 0 && x < w && y < h) grid[y * w + x] = 1;
  };
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    let x0 = Math.round(ring[j].x - 0.5);
    let y0 = Math.round(ring[j].y - 0.5);
    const x1 = Math.round(ring[i].x - 0.5);
    const y1 = Math.round(ring[i].y - 0.5);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      plot(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
}

function dilate(src, w, h, r) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!src[y * w + x]) continue;
      for (let dy = -r; dy <= r; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          out[ny * w + nx] = 1;
        }
      }
    }
  }
  return out;
}

function erode(src, w, h, r) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let all = 1;
      for (let dy = -r; dy <= r && all; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !src[ny * w + nx]) { all = 0; break; }
        }
      }
      out[y * w + x] = all;
    }
  }
  return out;
}

/** 8-connected labelling. Returns the label grid and one entry per component. */
function connectedComponents(grid, w, h) {
  const labels = new Int32Array(w * h);
  const components = [];
  const stack = [];
  let next = 0;
  for (let seed = 0; seed < grid.length; seed++) {
    if (!grid[seed] || labels[seed]) continue;
    next += 1;
    let area = 0;
    stack.push(seed);
    labels[seed] = next;
    while (stack.length) {
      const index = stack.pop();
      area += 1;
      const x = index % w;
      const y = (index - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (grid[n] && !labels[n]) {
            labels[n] = next;
            stack.push(n);
          }
        }
      }
    }
    components.push({ label: next, area, start: seed });
  }
  return { labels, components };
}

// Moore neighbourhood, clockwise from west.
const NEIGHBOURS = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];

/**
 * Moore-neighbour trace of one component's outer boundary, starting at its first
 * pixel in raster order (whose western neighbour is therefore background).
 * Stops on returning to the start from the same side (Jacob's criterion).
 */
function traceBoundary(labels, w, h, label, start) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && labels[y * w + x] === label;
  const sx = start % w;
  const sy = (start - sx) / w;
  const points = [[sx, sy]];

  let cx = sx;
  let cy = sy;
  let bx = sx - 1; // backtrack: the background pixel we "came from"
  let by = sy;
  const backtrackX = bx;
  const backtrackY = by;
  const limit = 4 * w * h + 16;

  for (let step = 0; step < limit; step++) {
    let from = NEIGHBOURS.findIndex(([dx, dy]) => bx - cx === dx && by - cy === dy);
    if (from < 0) from = 0;
    let moved = false;
    for (let k = 1; k <= 8; k++) {
      const index = (from + k) % 8;
      const nx = cx + NEIGHBOURS[index][0];
      const ny = cy + NEIGHBOURS[index][1];
      if (!inside(nx, ny)) continue;
      const previous = (index + 7) % 8; // the last background cell we passed
      bx = cx + NEIGHBOURS[previous][0];
      by = cy + NEIGHBOURS[previous][1];
      cx = nx;
      cy = ny;
      moved = true;
      break;
    }
    if (!moved) break; // isolated pixel
    if (cx === sx && cy === sy && bx === backtrackX && by === backtrackY) break;
    points.push([cx, cy]);
  }
  return points;
}

/** RDP over a closed loop: close it, simplify, drop the repeated point. */
function simplifyLoop(points, epsilon) {
  const simplified = simplifyPolyline([...points, points[0]], epsilon);
  simplified.pop();
  return simplified;
}

/**
 * Merge several outlines into the single ring that is their union.
 *
 * @param {Array<Array<{x:number,y:number}>>} polygons - outlines in image pixels
 * @param {Object} [options]
 * @param {number} [options.bridge=1] - closing radius in raster px; bridges the gap
 *   between outlines that touch rather than overlap. 0 disables it.
 * @returns {{ring: Array<{x:number,y:number}>}|{error: string, components?: number}}
 *   the union outline, or a refusal code: `empty` (nothing usable to merge),
 *   `disjoint` (the selection is not one connected object), `degenerate` (the
 *   traced boundary has no area).
 */
export function unionContours(polygons, { bridge = 1 } = {}) {
  const rings = (polygons || []).filter((p) => Array.isArray(p) && p.length >= 3);
  if (rings.length === 0) return { error: 'empty' };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const p of ring) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  const span = Math.max(maxX - minX, maxY - minY);
  if (!(span > 0)) return { error: 'empty' };

  let scale = 1;
  if (span < MIN_RASTER_SPAN) scale = MIN_RASTER_SPAN / span;
  else if (span > MAX_RASTER_SPAN) scale = MAX_RASTER_SPAN / span;

  const w = Math.ceil((maxX - minX) * scale) + 2 * MARGIN + 1;
  const h = Math.ceil((maxY - minY) * scale) + 2 * MARGIN + 1;

  let grid = new Uint8Array(w * h);
  for (const ring of rings) {
    const raster = ring.map((p) => ({
      x: (p.x - minX) * scale + MARGIN,
      y: (p.y - minY) * scale + MARGIN,
    }));
    fillPolygon(grid, w, h, raster);
    strokePolygon(grid, w, h, raster);
  }
  if (bridge > 0) grid = erode(dilate(grid, w, h, bridge), w, h, bridge);

  const { labels, components } = connectedComponents(grid, w, h);
  const solid = components.filter((c) => c.area > NOISE_AREA);
  if (solid.length === 0) return { error: 'empty' };
  if (solid.length > 1) return { error: 'disjoint', components: solid.length };

  const traced = traceBoundary(labels, w, h, solid[0].label, solid[0].start);
  if (traced.length < 3) return { error: 'degenerate' };

  const ring = simplifyLoop(
    traced.map(([px, py]) => ({
      x: minX + (px + 0.5 - MARGIN) / scale,
      y: minY + (py + 0.5 - MARGIN) / scale,
    })),
    SIMPLIFY_RASTER_PX / scale
  );
  if (ring.length < 3) return { error: 'degenerate' };
  return { ring };
}
