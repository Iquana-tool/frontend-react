import { describe, expect, it } from 'vitest';
import {
  footprintSegments,
  nearestFrame,
  panToCentre,
  pointOnLine,
  visibleImageRect,
} from './overviewGeometry';

const frames = [0, 1, 2].map((index) => ({
  image_id: 100 + index,
  overview_geometry: { type: 'line', start: [10, 10 + index * 10], end: [110, 10 + index * 10] },
}));

describe('slice lines', () => {
  it('finds the line nearest a point', () => {
    expect(nearestFrame(frames, [50, 22])).toBe(1);
    expect(nearestFrame(frames, [500, 31])).toBe(2);
    expect(nearestFrame([{ overview_geometry: null }], [0, 0])).toBeNull();
  });

  it('carries a B-scan column onto its line', () => {
    expect(pointOnLine({ start: [10, 20], end: [110, 20] }, 0.25)).toEqual([35, 20]);
  });

  it('draws an object as its horizontal extent on its slice', () => {
    const [segment] = footprintSegments(
      [{ contour_id: 5, frame_index: 1, label_id: 3, x: [0.2, 0.6, 0.4], y: [0, 0, 1] }],
      frames,
    );
    expect(segment.from).toEqual([30, 20]);
    expect(segment.to).toEqual([70, 20]);
  });
});

describe('viewport box', () => {
  const containerSize = { width: 400, height: 200 };
  const imageSize = { width: 200, height: 200 };

  it('covers the whole image at fit', () => {
    expect(visibleImageRect({ containerSize, imageSize, zoom: 1, pan: { x: 0, y: 0 } }))
      .toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it('shrinks around the centre when zoomed', () => {
    const rect = visibleImageRect({ containerSize, imageSize, zoom: 2, pan: { x: 0, y: 0 } });
    expect(rect.y).toBeCloseTo(0.25);
    expect(rect.height).toBeCloseTo(0.5);
  });

  it('pans so a point of the image is in the middle', () => {
    const pan = panToCentre({ containerSize, imageSize, u: 0.75, v: 0.5 });
    const rect = visibleImageRect({ containerSize, imageSize, zoom: 4, pan });
    expect(rect.x + rect.width / 2).toBeCloseTo(0.75);
    expect(rect.y + rect.height / 2).toBeCloseTo(0.5);
  });
});
