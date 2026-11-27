import { needsFraming, screenBoxOf } from './reviewFraming';

// A 1000×800 stage showing a 1000×800 image edge to edge.
const container = { width: 1000, height: 800 };
const rendered = { x: 0, y: 0, width: 1000, height: 800 };
const square = (u0, v0, u1, v1) => ({ x: [u0, u1, u1, u0], y: [v0, v0, v1, v1] });

describe('screenBoxOf', () => {
  test('maps the outline through zoom and pan around the stage centre', () => {
    const box = screenBoxOf(square(0.5, 0.5, 0.6, 0.6), rendered, container, 2, { x: -100, y: 0 });
    // x = 500 + 2 * (500 - 500 - 100) = 300; right edge 100 px wider, doubled.
    expect(box.left).toBeCloseTo(300);
    expect(box.right).toBeCloseTo(500);
    expect(box.top).toBeCloseTo(400);
  });
});

describe('needsFraming', () => {
  test('leaves a large object in plain sight alone', () => {
    expect(needsFraming(square(0.3, 0.2, 0.6, 0.5), rendered, container)).toBe(false);
  });

  test('zooms to a small object', () => {
    expect(needsFraming(square(0.4, 0.4, 0.43, 0.43), rendered, container)).toBe(true);
  });

  test('zooms to an object partly off screen', () => {
    // Zoomed in on the top-left corner: an object on the right falls outside.
    expect(needsFraming(square(0.7, 0.3, 0.9, 0.5), rendered, container, 2, { x: 250, y: 200 })).toBe(true);
  });

  test('counts an object under the action bar as hidden', () => {
    expect(needsFraming(square(0.3, 0.85, 0.6, 0.95), rendered, container)).toBe(true);
  });

  test('does nothing without an outline', () => {
    expect(needsFraming({ x: [], y: [] }, rendered, container)).toBe(false);
  });
});
