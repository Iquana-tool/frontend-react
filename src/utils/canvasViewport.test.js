import { describe, expect, test } from 'vitest';

import {
  clampPan,
  fitImageToContainer,
  imageRectOnScreen,
  panForDrag,
  panForFocalZoom,
} from './canvasViewport';

/**
 * Pins the invariant the canvas viewport depends on: the transform the renderer applies and
 * the pan values the interaction handlers compute must agree on what `panOffset` means.
 *
 * The transform is `scale(z) translate(pan)` about the container centre, so the translate is
 * in unscaled content space and its on-screen effect is multiplied by the zoom. `panOffset`
 * is in content units; a handler that writes a screen-space delta into it is wrong by a
 * factor of z.
 */

// A deliberately non-square case so a width/height mix-up cannot pass by accident.
const containerSize = { width: 1000, height: 600 };
const imageSize = { width: 2000, height: 1000 };

/** Where an image pixel lands on screen — modelled straight from the CSS transform. */
const screenXOf = (ix, zoom, pan) => {
  const { baseScale, width } = fitImageToContainer(imageSize, containerSize);
  return containerSize.width / 2 + zoom * (pan.x - width / 2 + ix * baseScale);
};

describe('fitImageToContainer', () => {
  test('fits a wide image by width and centres it vertically', () => {
    const fit = fitImageToContainer(imageSize, containerSize);
    expect(fit.baseScale).toBe(0.5);
    expect(fit.width).toBe(1000);
    expect(fit.height).toBe(500);
    expect(fit.x).toBe(0);
    expect(fit.y).toBe(50);
  });

  test('fits a tall image by height and centres it horizontally', () => {
    const fit = fitImageToContainer({ width: 500, height: 1200 }, containerSize);
    expect(fit.baseScale).toBe(0.5);
    expect(fit.width).toBe(250);
    expect(fit.height).toBe(600);
    expect(fit.x).toBe(375);
    expect(fit.y).toBe(0);
  });
});

describe('panForFocalZoom', () => {
  test('keeps the image pixel under the pointer exactly where it was', () => {
    const pan = { x: 0, y: 0 };
    // The pixel currently under a pointer 300px right of the container centre.
    expect(screenXOf(1600, 1, pan)).toBe(800);

    const next = panForFocalZoom({
      pointer: { x: 800, y: 300 },
      containerSize,
      panOffset: pan,
      oldZoom: 1,
      newZoom: 2,
    });

    // A screen-space pan would be -300 here, which the transform scales again and lands
    // the pixel at 500.
    expect(next.x).toBeCloseTo(-150, 10);
    expect(screenXOf(1600, 2, next)).toBeCloseTo(800, 6);
  });

  test('holds the focal point across a chain of zoom steps', () => {
    const pointer = { x: 730, y: 410 };
    let zoom = 1;
    let pan = { x: 0, y: 0 };

    const { baseScale, width } = fitImageToContainer(imageSize, containerSize);
    // The image pixel under the pointer before any zooming.
    const ix = ((pointer.x - containerSize.width / 2) / zoom - pan.x + width / 2) / baseScale;

    for (let step = 0; step < 8; step += 1) {
      const newZoom = zoom * 1.1;
      pan = panForFocalZoom({ pointer, containerSize, panOffset: pan, oldZoom: zoom, newZoom });
      zoom = newZoom;
      // Must not drift at any step: per-step drift compounds across a wheel gesture.
      expect(screenXOf(ix, zoom, pan)).toBeCloseTo(pointer.x, 6);
    }
  });

  test('holds the focal point at deep zoom, where drift would be most visible', () => {
    const pointer = { x: 910, y: 120 };
    const { baseScale, width } = fitImageToContainer(imageSize, containerSize);
    let zoom = 8;
    let pan = { x: -30, y: 14 };
    const ix = ((pointer.x - containerSize.width / 2) / zoom - pan.x + width / 2) / baseScale;

    pan = panForFocalZoom({ pointer, containerSize, panOffset: pan, oldZoom: zoom, newZoom: 16 });
    zoom = 16;

    expect(screenXOf(ix, zoom, pan)).toBeCloseTo(pointer.x, 6);
  });

  test('zooming with the pointer at the centre leaves the pan alone', () => {
    const next = panForFocalZoom({
      pointer: { x: 500, y: 300 },
      containerSize,
      panOffset: { x: 12, y: -7 },
      oldZoom: 1,
      newZoom: 2.5,
    });
    expect(next.x).toBeCloseTo(12, 10);
    expect(next.y).toBeCloseTo(-7, 10);
  });
});

describe('panForDrag', () => {
  test('moves the image exactly with the cursor at zoom 1', () => {
    const next = panForDrag({ panOffset: { x: 0, y: 0 }, delta: { x: 100, y: -40 }, zoom: 1 });
    expect(screenXOf(0, 1, next) - screenXOf(0, 1, { x: 0, y: 0 })).toBeCloseTo(100, 10);
  });

  test('moves the image exactly with the cursor when zoomed in', () => {
    const zoom = 4;
    const before = { x: 0, y: 0 };
    // Adding the raw screen delta instead would move the image four times the cursor
    // distance at this zoom.
    const next = panForDrag({ panOffset: before, delta: { x: 100, y: -40 }, zoom });
    expect(next.x).toBeCloseTo(25, 10);
    expect(screenXOf(0, zoom, next) - screenXOf(0, zoom, before)).toBeCloseTo(100, 10);
  });
});

describe('clampPan', () => {
  const keepVisible = 48;

  test('leaves a modest pan untouched', () => {
    const pan = { x: 10, y: -10 };
    expect(clampPan({ pan, zoom: 2, containerSize, imageSize, keepVisible })).toEqual(pan);
  });

  test('stops the image before it can leave the viewport to the right', () => {
    const clamped = clampPan({
      pan: { x: 100000, y: 0 },
      zoom: 1,
      containerSize,
      imageSize,
      keepVisible,
    });
    const rect = imageRectOnScreen({ zoom: 1, pan: clamped, containerSize, imageSize });
    expect(rect.x).toBeCloseTo(containerSize.width - keepVisible, 6);
  });

  test('stops the image before it can leave the viewport to the left', () => {
    const clamped = clampPan({
      pan: { x: -100000, y: 0 },
      zoom: 3,
      containerSize,
      imageSize,
      keepVisible,
    });
    const rect = imageRectOnScreen({ zoom: 3, pan: clamped, containerSize, imageSize });
    expect(rect.x + rect.width).toBeCloseTo(keepVisible, 6);
  });

  test('always leaves some of the image on screen, whatever is thrown at it', () => {
    for (const zoom of [0.25, 0.5, 1, 2, 4, 8, 16]) {
      for (const x of [-5000, -500, 0, 500, 5000]) {
        for (const y of [-5000, 0, 5000]) {
          const clamped = clampPan({ pan: { x, y }, zoom, containerSize, imageSize, keepVisible });
          const rect = imageRectOnScreen({ zoom, pan: clamped, containerSize, imageSize });
          expect(rect.x).toBeLessThanOrEqual(containerSize.width);
          expect(rect.x + rect.width).toBeGreaterThanOrEqual(0);
          expect(rect.y).toBeLessThanOrEqual(containerSize.height);
          expect(rect.y + rect.height).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
