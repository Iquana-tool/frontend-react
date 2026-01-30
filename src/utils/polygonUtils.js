/**
 * Utility functions for polygon calculations
 * Based on reference ZoomPanImage implementation for accurate polygon handling
 */

/**
 * Calculate bounding box of polygon points
 * @param {Array} points - Array of {x, y} points in image pixel coordinates
 * @returns {Object} {minX, minY, maxX, maxY, w, h, centerX, centerY}
 */
export const bboxOf = (points) => {
  if (!points || points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const p of points) {
    const x = Array.isArray(p) ? p[0] : p.x;
    const y = Array.isArray(p) ? p[1] : p.y;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const w = Math.max(0, maxX - minX);
  const h = Math.max(0, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return { minX, minY, maxX, maxY, w, h, centerX, centerY };
};

/**
 * Calculate polygon centroid (center of mass)
 * More accurate than bounding box center for irregular shapes
 * Falls back to bbox center if polygon is degenerate
 * @param {Array} points - Array of {x, y} or [x, y] points
 * @returns {Object} {x, y} centroid coordinates
 */
export const centroidOf = (points) => {
  if (!points || points.length === 0) {
    return { x: 0, y: 0 };
  }

  // If only one point, return it
  if (points.length === 1) {
    const p = points[0];
    return Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y };
  }

  // Calculate signed area and centroid using shoelace formula
  let a = 0, cx = 0, cy = 0;

  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];

    const x0 = Array.isArray(p0) ? p0[0] : p0.x;
    const y0 = Array.isArray(p0) ? p0[1] : p0.y;
    const x1 = Array.isArray(p1) ? p1[0] : p1.x;
    const y1 = Array.isArray(p1) ? p1[1] : p1.y;

    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  // If area is too small, fall back to bounding box center
  if (Math.abs(a) < 1e-6) {
    const b = bboxOf(points);
    return { x: b.centerX, y: b.centerY };
  }

  a *= 0.5;
  return { x: cx / (6 * a), y: cy / (6 * a) };
};

/**
 * Convert object coordinates to polygon points
 * Handles both normalized (0-1) and pixel coordinates
 * @param {Object} object - Object with x and y arrays
 * @param {Object} imageDimensions - {width, height} of image
 * @returns {Array} Array of {x, y} points in pixel coordinates
 */
export const objectToPolygonPoints = (object, imageDimensions) => {
  if (!object || !object.x || !object.y || !imageDimensions) {
    return [];
  }

  const points = [];
  const { width, height } = imageDimensions;

  for (let i = 0; i < object.x.length && i < object.y.length; i++) {
    let x = object.x[i];
    let y = object.y[i];

    // If coordinates are normalized (0-1), convert to pixels
    if (x <= 1 && y <= 1 && x >= 0 && y >= 0) {
      x = x * width;
      y = y * height;
    }

    points.push({ x, y });
  }

  return points;
};

