/**
 * Perceptual colour difference, for comparing measured colours to each other.
 *
 * A percentage has no meaning on a colour. The channels are not a ratio scale —
 * CIELAB's a* and b* are signed and cross zero, so "20 % more a*" is arithmetic
 * on a number that has no zero to be a proportion of — and even on a channel
 * that does behave, a per-channel percentage says nothing about whether two
 * colours look alike. CIEDE2000 is the standard answer: one number, in units
 * where roughly 1 is the threshold of a visible difference.
 *
 * Everything here works in true CIELAB (L* runs 0–100, a* and b* roughly ±128). The
 * measured values arrive in two other encodings, so both get converted first:
 *
 *  - `mean_color_lab` is OpenCV's 8-bit LAB, where all three channels are packed
 *    into 0–255. Reading those numbers as CIELAB would put every colour in the
 *    wrong place by a factor of 2.55 on L and a 128 offset on a* and b*.
 *  - `mean_color_rgb` is sRGB, which is gamma-encoded and not perceptually
 *    uniform at all.
 */

/** OpenCV's 8-bit LAB packing → true CIELAB. */
export const opencvLabToLab = ([L8, a8, b8]) => ({
  L: (L8 / 255) * 100,
  a: a8 - 128,
  b: b8 - 128,
});

const linearize = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const DELTA = 6 / 29;
const f = (t) => (t > DELTA ** 3 ? Math.cbrt(t) : t / (3 * DELTA * DELTA) + 4 / 29);

/** sRGB 0–255 → true CIELAB, D65. */
export const srgbToLab = ([r, g, b]) => {
  const R = linearize(r);
  const G = linearize(g);
  const B = linearize(b);

  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;

  const fx = f(X / 0.95047);
  const fy = f(Y / 1.0);
  const fz = f(Z / 1.08883);

  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
};

/** True CIELAB → a CSS colour, for a swatch. */
export const labToCss = ({ L, a, b }) => {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const finv = (t) => (t > DELTA ? t * t * t : 3 * DELTA * DELTA * (t - 4 / 29));

  const X = 0.95047 * finv(fx);
  const Y = 1.0 * finv(fy);
  const Z = 1.08883 * finv(fz);

  const channels = [
    X * 3.2404542 - Y * 1.5371385 - Z * 0.4985314,
    X * -0.9692660 + Y * 1.8760108 + Z * 0.0415560,
    X * 0.0556434 - Y * 0.2040259 + Z * 1.0572252,
  ].map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(v * 255)));
  });

  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
};

/**
 * Which encoding a metric's component means are in, or null if it is not a colour.
 *
 * Keyed on the metric rather than on `unit_kind` alone, because "this is a
 * colour" does not say which space it was measured in, and the two the registry
 * produces need opposite corrections.
 */
export const colorSpaceOf = (metricKey, catalogEntry) => {
  if (catalogEntry && catalogEntry.unit_kind !== 'color') return null;
  if (metricKey === 'mean_color_lab') return 'opencv_lab';
  if (metricKey === 'mean_color_rgb') return 'srgb';
  return null;
};

/** A metric's component means → true CIELAB, given its space. */
export const toLab = (means, space) => {
  if (!Array.isArray(means) || means.length < 3) return null;
  if (means.some((value) => !Number.isFinite(value))) return null;
  if (space === 'opencv_lab') return opencvLabToLab(means);
  if (space === 'srgb') return srgbToLab(means);
  return null;
};

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (r) => {
  const d = (r * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
};

/**
 * CIEDE2000 colour difference between two CIELAB colours.
 *
 * The 2000 revision rather than the 1976 Euclidean distance because that one
 * badly overstates differences in the blues and in saturated colours — the very
 * regions a lit scientific image tends to sit in.
 *
 * Implements the formulation of Sharma, Wu & Dalal (2005), whose published test
 * set the tests check this against, including the discontinuity cases around the
 * hue-mean quadrants that naive implementations get wrong.
 *
 * @returns {number} 0 for identical; ~1 is a just-noticeable difference.
 */
export const deltaE2000 = (lab1, lab2, { kL = 1, kC = 1, kH = 1 } = {}) => {
  if (!lab1 || !lab2) return null;
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;

  const Cbar7 = Cbar ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  const h1p = C1p === 0 ? 0 : deg(Math.atan2(b1, a1p));
  const h2p = C2p === 0 ? 0 : deg(Math.atan2(b2, a2p));

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp;
  if (C1p * C2p === 0) hbarp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2;
  else hbarp = (h1p + h2p - 360) / 2;

  const T =
    1
    - 0.17 * Math.cos(rad(hbarp - 30))
    + 0.24 * Math.cos(rad(2 * hbarp))
    + 0.32 * Math.cos(rad(3 * hbarp + 6))
    - 0.20 * Math.cos(rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Cbarp7 = Cbarp ** 7;
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + 25 ** 7));

  const SL = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(rad(2 * dTheta)) * RC;

  const dL = dLp / (kL * SL);
  const dC = dCp / (kC * SC);
  const dH = dHp / (kH * SH);

  return Math.sqrt(dL * dL + dC * dC + dH * dH + RT * dC * dH);
};

/**
 * How a difference of this size reads, in words.
 *
 * The bands are the ones conventionally quoted for CIEDE2000 under controlled
 * viewing. They are a guide for reading a number, not a threshold to act on:
 * these colours are means over whole contours photographed under whatever light
 * the bench had, so the encoding error is comfortably a unit or two.
 */
export const describeDeltaE = (value) => {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 1) return 'imperceptible';
  if (value < 2) return 'barely visible';
  if (value < 5) return 'noticeable';
  if (value < 10) return 'clearly different';
  return 'very different';
};
