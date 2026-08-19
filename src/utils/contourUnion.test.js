import { unionContours } from './contourUnion';
import { polygonArea } from './contourEditing';

/** A dense axis-aligned rectangle outline, like a real contour. */
const rect = (x0, y0, x1, y1, step = 4) => {
  const points = [];
  for (let x = x0; x < x1; x += step) points.push({ x, y: y0 });
  for (let y = y0; y < y1; y += step) points.push({ x: x1, y });
  for (let x = x1; x > x0; x -= step) points.push({ x, y: y1 });
  for (let y = y1; y > y0; y -= step) points.push({ x: x0, y });
  return points;
};

const area = (ring) => Math.abs(polygonArea(ring));

describe('unionContours', () => {
  test('merges two overlapping rectangles into one ring', () => {
    const result = unionContours([rect(0, 0, 100, 100), rect(60, 0, 160, 100)]);
    expect(result.error).toBeUndefined();
    // 100x100 + 100x100 minus the 40x100 overlap.
    expect(area(result.ring)).toBeGreaterThan(16000 * 0.95);
    expect(area(result.ring)).toBeLessThan(16000 * 1.05);
  });

  test('merges rectangles that only touch, without pinching them apart', () => {
    const result = unionContours([rect(0, 0, 100, 100), rect(100, 0, 200, 100)]);
    expect(result.error).toBeUndefined();
    expect(area(result.ring)).toBeGreaterThan(20000 * 0.95);
    expect(area(result.ring)).toBeLessThan(20000 * 1.05);
  });

  test('refuses a disjoint selection', () => {
    const result = unionContours([rect(0, 0, 100, 100), rect(300, 0, 400, 100)]);
    expect(result.error).toBe('disjoint');
    expect(result.components).toBe(2);
  });

  test('keeps a concave outline concave', () => {
    // An L, merged with the block that fills its notch, is a plain rectangle.
    const ell = [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 40 },
      { x: 40, y: 40 }, { x: 40, y: 100 }, { x: 0, y: 100 },
    ];
    const alone = unionContours([ell]);
    expect(area(alone.ring)).toBeGreaterThan(6400 * 0.95);
    expect(area(alone.ring)).toBeLessThan(6400 * 1.06);

    const filled = unionContours([ell, rect(40, 40, 100, 100)]);
    expect(filled.error).toBeUndefined();
    expect(area(filled.ring)).toBeGreaterThan(10000 * 0.95);
    expect(area(filled.ring)).toBeLessThan(10000 * 1.05);
  });

  test('refuses an empty or unusable selection', () => {
    expect(unionContours([]).error).toBe('empty');
    expect(unionContours([[{ x: 1, y: 1 }, { x: 2, y: 2 }]]).error).toBe('empty');
  });
});
