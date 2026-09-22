import { describe, it, expect } from 'vitest';
import {
  colorSpaceOf,
  deltaE2000,
  describeDeltaE,
  labToCss,
  opencvLabToLab,
  srgbToLab,
  toLab,
} from './colorDifference';

const lab = (L, a, b) => ({ L, a, b });

/**
 * The published verification set from Sharma, Wu & Dalal (2005), "The CIEDE2000
 * Color-Difference Formula". These pairs exist precisely because they break
 * naive implementations — most of them straddle a discontinuity in the mean-hue
 * or hue-difference terms, which is where a plausible-looking version goes
 * wrong while still returning sensible numbers everywhere else.
 */
const REFERENCE = [
  // [L1, a1, b1, L2, a2, b2, expected dE00]
  [50.0, 2.6772, -79.7751, 50.0, 0.0, -82.7485, 2.0425],
  [50.0, 3.1571, -77.2803, 50.0, 0.0, -82.7485, 2.8615],
  [50.0, 2.8361, -74.02, 50.0, 0.0, -82.7485, 3.4412],
  [50.0, -1.3802, -84.2814, 50.0, 0.0, -82.7485, 1.0],
  [50.0, -1.1848, -84.8006, 50.0, 0.0, -82.7485, 1.0],
  [50.0, -0.9009, -85.5211, 50.0, 0.0, -82.7485, 1.0],
  [50.0, 0.0, 0.0, 50.0, -1.0, 2.0, 2.3669],
  [50.0, -1.0, 2.0, 50.0, 0.0, 0.0, 2.3669],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.0009, 7.1792],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.001, 7.1792],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.0011, 7.2195],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.0012, 7.2195],
  [50.0, -0.001, 2.49, 50.0, 0.0009, -2.49, 4.8045],
  [50.0, -0.001, 2.49, 50.0, 0.0011, -2.49, 4.7461],
  [50.0, 2.5, 0.0, 50.0, 0.0, -2.5, 4.3065],
  [50.0, 2.5, 0.0, 73.0, 25.0, -18.0, 27.1492],
  [50.0, 2.5, 0.0, 61.0, -5.0, 29.0, 22.8977],
  [50.0, 2.5, 0.0, 56.0, -27.0, -3.0, 31.903],
  [50.0, 2.5, 0.0, 58.0, 24.0, 15.0, 19.4535],
  [50.0, 2.5, 0.0, 50.0, 3.1736, 0.5854, 1.0],
  [50.0, 2.5, 0.0, 50.0, 3.2972, 0.0, 1.0],
  [50.0, 2.5, 0.0, 50.0, 1.8634, 0.5757, 1.0],
  [50.0, 2.5, 0.0, 50.0, 3.2592, 0.335, 1.0],
  [60.2574, -34.0099, 36.2677, 60.4626, -34.1751, 39.4387, 1.2644],
  [63.0109, -31.0961, -5.8663, 62.8187, -29.7946, -4.0864, 1.263],
  [61.2901, 3.7196, -5.3901, 61.4292, 2.248, -4.962, 1.8731],
  [35.0831, -44.1164, 3.7933, 35.0232, -40.0716, 1.5901, 1.8645],
  [22.7233, 20.0904, -46.694, 23.0331, 14.973, -42.5619, 2.0373],
  [36.4612, 47.858, 18.3852, 36.2715, 50.5065, 21.2231, 1.4146],
  [90.8027, -2.0831, 1.441, 91.1528, -1.6435, 0.0447, 1.4441],
  [90.9257, -0.5406, -0.9208, 88.6381, -0.8985, -0.7239, 1.5381],
  [6.7747, -0.2908, -2.4247, 5.8714, -0.0985, -2.2286, 0.6377],
  [2.0776, 0.0795, -1.135, 0.9033, -0.0636, -0.5514, 0.9082],
];

describe('deltaE2000', () => {
  it.each(REFERENCE)(
    'matches the published value for (%s, %s, %s) vs (%s, %s, %s)',
    (L1, a1, b1, L2, a2, b2, expected) => {
      expect(deltaE2000(lab(L1, a1, b1), lab(L2, a2, b2))).toBeCloseTo(expected, 4);
    }
  );

  it('is zero for a colour against itself', () => {
    expect(deltaE2000(lab(42, -7, 19), lab(42, -7, 19))).toBe(0);
  });

  it('is symmetric', () => {
    const [x, y] = [lab(50, 2.5, 0), lab(73, 25, -18)];
    expect(deltaE2000(x, y)).toBeCloseTo(deltaE2000(y, x), 10);
  });

  it('returns null rather than NaN when a colour is missing', () => {
    expect(deltaE2000(null, lab(50, 0, 0))).toBeNull();
    expect(deltaE2000(lab(50, 0, 0), undefined)).toBeNull();
  });

  it('handles neutral greys, where hue is undefined', () => {
    expect(deltaE2000(lab(50, 0, 0), lab(60, 0, 0))).toBeGreaterThan(0);
    expect(Number.isFinite(deltaE2000(lab(0, 0, 0), lab(100, 0, 0)))).toBe(true);
  });
});

describe('encodings', () => {
  // The correction that matters most: read as CIELAB, an OpenCV L of 255 would
  // be a lightness of 255 on a 0-100 scale, and a* would be off by 128.
  it('rescales OpenCV 8-bit LAB onto the real axes', () => {
    expect(opencvLabToLab([255, 128, 128])).toEqual({ L: 100, a: 0, b: 0 });
    expect(opencvLabToLab([0, 128, 128])).toEqual({ L: 0, a: 0, b: 0 });
    expect(opencvLabToLab([128, 200, 50])).toMatchObject({ a: 72, b: -78 });
  });

  it('places the sRGB primaries where CIELAB says they go', () => {
    expect(srgbToLab([0, 0, 0])).toMatchObject({ L: 0 });

    // Not exactly 100: the published D65 white point and the sRGB matrix are
    // each rounded, so white lands a few parts in 10^8 over. Well below any
    // difference the formula is asked to resolve.
    const white = srgbToLab([255, 255, 255]);
    expect(white.L).toBeCloseTo(100, 4);
    expect(white.a).toBeCloseTo(0, 2);
    expect(white.b).toBeCloseTo(0, 2);

    // Mid grey is about L* 53, not 50 — that gamma is the reason a percentage
    // on an sRGB channel does not mean what it appears to.
    expect(srgbToLab([128, 128, 128]).L).toBeCloseTo(53.585, 2);

    const red = srgbToLab([255, 0, 0]);
    expect(red.L).toBeCloseTo(53.24, 1);
    expect(red.a).toBeCloseTo(80.09, 1);
    expect(red.b).toBeCloseTo(67.2, 1);
  });

  it('round-trips CIELAB back to a CSS colour', () => {
    expect(labToCss(srgbToLab([255, 0, 0]))).toBe('rgb(255, 0, 0)');
    expect(labToCss(srgbToLab([18, 52, 86]))).toBe('rgb(18, 52, 86)');
    expect(labToCss({ L: 100, a: 0, b: 0 })).toBe('rgb(255, 255, 255)');
  });

  it('clamps rather than emitting an out-of-gamut CSS colour', () => {
    expect(labToCss({ L: 60, a: 120, b: -120 })).toMatch(/^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/);
  });
});

describe('colorSpaceOf', () => {
  it('names the space each colour metric was measured in', () => {
    expect(colorSpaceOf('mean_color_lab', { unit_kind: 'color' })).toBe('opencv_lab');
    expect(colorSpaceOf('mean_color_rgb', { unit_kind: 'color' })).toBe('srgb');
  });

  it('declines metrics that are not colours', () => {
    expect(colorSpaceOf('area', { unit_kind: 'area' })).toBeNull();
    expect(colorSpaceOf('mean_intensity', { unit_kind: 'intensity' })).toBeNull();
  });

  // A colour metric this build has never heard of gets no space rather than a
  // guessed one: the wrong conversion is worse than no comparison.
  it('declines an unrecognised colour metric', () => {
    expect(colorSpaceOf('mean_color_hsv', { unit_kind: 'color' })).toBeNull();
  });

  it('works without a catalog entry', () => {
    expect(colorSpaceOf('mean_color_lab', null)).toBe('opencv_lab');
  });
});

describe('toLab', () => {
  it('converts per the named space', () => {
    expect(toLab([255, 128, 128], 'opencv_lab')).toEqual({ L: 100, a: 0, b: 0 });
    expect(toLab([255, 255, 255], 'srgb').L).toBeCloseTo(100, 4);
  });

  it('refuses anything that is not three finite numbers', () => {
    expect(toLab([1, 2], 'srgb')).toBeNull();
    expect(toLab(null, 'srgb')).toBeNull();
    expect(toLab([1, 2, NaN], 'srgb')).toBeNull();
    expect(toLab([1, 2, 3], 'something-else')).toBeNull();
  });
});

describe('describeDeltaE', () => {
  it('bands a difference into words', () => {
    expect(describeDeltaE(0.4)).toBe('imperceptible');
    expect(describeDeltaE(1.5)).toBe('barely visible');
    expect(describeDeltaE(3)).toBe('noticeable');
    expect(describeDeltaE(7)).toBe('clearly different');
    expect(describeDeltaE(30)).toBe('very different');
  });

  it('says nothing about a difference it does not have', () => {
    expect(describeDeltaE(null)).toBeNull();
    expect(describeDeltaE(NaN)).toBeNull();
  });
});
