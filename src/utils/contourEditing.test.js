import { splitContourByLine, polygonArea } from './contourEditing';

/** A dense square outline, like the dense point list a model emits. */
const square = (size = 100, step = 2) => {
  const points = [];
  for (let x = 0; x < size; x += step) points.push({ x, y: 0 });
  for (let y = 0; y < size; y += step) points.push({ x: size, y });
  for (let x = size; x > 0; x -= step) points.push({ x, y: size });
  for (let y = size; y > 0; y -= step) points.push({ x: 0, y });
  return points;
};

const area = (ring) => Math.abs(polygonArea(ring));

describe('splitContourByLine', () => {
  test('cuts a square in two along a line drawn across it', () => {
    const contour = square();
    const { halves, error } = splitContourByLine(contour, [
      { x: 50, y: -10 },
      { x: 50, y: 110 },
    ]);

    expect(error).toBeUndefined();
    expect(halves).toHaveLength(2);
    // Halves come back largest first and together account for the whole square.
    expect(area(halves[0])).toBeGreaterThanOrEqual(area(halves[1]));
    expect(area(halves[0]) + area(halves[1])).toBeCloseTo(area(contour), -1);
    expect(area(halves[0])).toBeCloseTo(5000, -2);
  });

  test('splits off a corner with a diagonal line', () => {
    const contour = square();
    const { halves, error } = splitContourByLine(contour, [
      { x: 60, y: 0 },
      { x: 100, y: 40 },
    ]);

    expect(error).toBeUndefined();
    expect(area(halves[1])).toBeCloseTo(800, -2); // the triangle
    expect(area(halves[0])).toBeCloseTo(9200, -2);
  });

  test('refuses a line that leaves and re-enters the shape', () => {
    const contour = square();
    const zigzag = [
      { x: -10, y: 50 }, { x: 50, y: 50 }, { x: 50, y: -10 },
      { x: 70, y: -10 }, { x: 70, y: 50 }, { x: 110, y: 50 },
    ];
    expect(splitContourByLine(contour, zigzag).error).toBe('crossings');
  });

  test('refuses a line drawn past the object', () => {
    expect(splitContourByLine(square(), [{ x: 200, y: 0 }, { x: 200, y: 100 }]).error)
      .toBe('outside');
  });

  test('refuses a scribble that would carve off nothing', () => {
    const contour = square();
    // Both ends snap to the same corner vertex: there is no arc between them.
    expect(splitContourByLine(contour, [{ x: 1, y: 1 }, { x: 1, y: 0.5 }]).error).toBe('ends');
    // Ends one vertex apart: a half with no area is not a split.
    expect(splitContourByLine(contour, [{ x: 1, y: 1 }, { x: 2, y: 2 }]).error).toBe('degenerate');
  });

  test('refuses unusable input', () => {
    expect(splitContourByLine([{ x: 0, y: 0 }], [{ x: 0, y: 0 }, { x: 1, y: 1 }]).error)
      .toBe('contour');
    expect(splitContourByLine(square(), [{ x: 0, y: 0 }]).error).toBe('line');
  });
});
