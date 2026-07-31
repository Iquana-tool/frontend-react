import { LABEL_COLORS, getLabelColor } from '../../../utils/labelColors';

/**
 * Resolves the colour to show for a label.
 *
 * Precedence: an explicit client-side override, then the label's own colour if
 * the backend supplies one, then the deterministic palette colour derived from
 * the label id — the same rule `labelColors.js` has always used, so colours
 * stay stable between the canvas, the rows and the taxonomy tree.
 *
 * Overrides are client-side only: the label API exposes no colour field.
 */
export const resolveLabelColor = (label, overrides = {}) => {
  if (!label) return null;
  const override = overrides[label.id] ?? overrides[String(label.id)];
  if (override) return override;
  if (label.color) return label.color;
  return getLabelColor(label.id);
};

/** The swatch options offered by the Labels tab colour picker. */
export const SWATCHES = LABEL_COLORS;

/** Hex → rgba, for the tinted row backgrounds and polygon fills. */
export const withAlpha = (hex, alpha) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
  const value = parseInt(hex.slice(1), 16);
  if (Number.isNaN(value)) return hex;
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};
