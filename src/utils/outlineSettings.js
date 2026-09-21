/**
 * Canvas outline rendering settings — *how* annotation objects are drawn.
 *
 * Deliberately a separate axis from the visibility filters in the Objects
 * panel: those decide which objects the canvas shows, these decide how the ones
 * it shows are painted. The two are worth keeping apart because they are
 * reached for at different moments — visibility when a label is in the way,
 * outlines when the fill itself is in the way of the pixels underneath.
 *
 * Kept free of React and of the store so the presets can be tested directly and
 * imported from both the slice and the style helpers.
 */

/**
 * The three presets, in the order the toolbar cycles them.
 *
 * `outline` is not a flat "no fill": `hoverFill` keeps the object under the
 * cursor and the selection filled in. A canvas of bare 2px outlines is hard to
 * aim at and hard to read, and the fill returning on hover is the same idea the
 * label chips already use in their `minimal` mode — only what you are pointing
 * at is drawn in full.
 *
 * `hairline` is the one that really means no fill at all, and goes thinner
 * still. It exists for judging a contour against the pixels it is supposed to
 * follow, where even a hover tint is in the way.
 */
export const OUTLINE_PRESETS = {
  fill: { fillScale: 1, strokeWidth: 0.5, hoverFill: true },
  outline: { fillScale: 0, strokeWidth: 0.5, hoverFill: true },
  hairline: { fillScale: 0, strokeWidth: 0.25, hoverFill: false },
};

/**
 * The width the design's state table is written at — the reference the settings
 * scale against, *not* a default.
 *
 * The two were the same number until the default came down to a half pixel, and
 * conflating them meant every change to the default silently rescaled the whole
 * table against itself. See getPolygonStyle.
 */
export const TABLE_STROKE_WIDTH = 2.5;

export const OUTLINE_PRESET_ORDER = ['fill', 'outline', 'hairline'];

/** Toolbar button caption — mirrors CHIP_MODE_LABELS next to it. */
export const OUTLINE_PRESET_LABELS = {
  fill: 'Outlines: filled',
  outline: 'Outlines: no fill',
  hairline: 'Outlines: hairline',
  custom: 'Outlines: custom',
};

/** Segmented-control captions in the Objects panel. */
export const OUTLINE_PRESET_SHORT = {
  fill: 'Fill',
  outline: 'Outline',
  hairline: 'Hairline',
};

export const OUTLINE_PRESET_HINTS = {
  fill: 'Outline plus a tinted fill — the default',
  outline: 'Outline only; whatever you point at still fills in',
  hairline: 'Thin outline, no fill — for judging contours against the pixels',
};

/** Which settings a preset pins down; `constantWidth` is orthogonal to all three. */
export const OUTLINE_PRESET_KEYS = ['fillScale', 'strokeWidth', 'hoverFill'];

/** Slider bounds. Fill runs past 100% because faint data needs a louder tint. */
export const FILL_SCALE_RANGE = { min: 0, max: 1.5, step: 0.05 };
// Centred on the half-pixel default rather than on the state table's 2.5: the
// strokes are measured in screen pixels now, and at that scale 6px is a band,
// not an outline.
export const STROKE_WIDTH_RANGE = { min: 0.25, max: 4, step: 0.25 };

export const DEFAULT_OUTLINE = {
  preset: 'fill',
  ...OUTLINE_PRESETS.fill,
  /**
   * Stroke width in screen pixels rather than image pixels.
   *
   * The overlay's viewBox is the image's natural size, so without this a stroke
   * is measured in image pixels: it fattens as you zoom in and thins to nothing
   * on a large image zoomed out — backwards from what you want, since zooming
   * in is exactly when you are inspecting a boundary. The chips already
   * counter-scale against the zoom for the same reason.
   */
  constantWidth: true,
  /** Transient: overlays hidden while the peek key is held. Never persisted. */
  peek: false,
};

const near = (a, b) => Math.abs(a - b) < 1e-6;

const clamp = (value, { min, max }, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

/** The preset a pair of values corresponds to, or 'custom' if it is neither. */
export const matchOutlinePreset = ({ fillScale, strokeWidth, hoverFill }) =>
  OUTLINE_PRESET_ORDER.find(
    (id) =>
      near(OUTLINE_PRESETS[id].fillScale, fillScale) &&
      near(OUTLINE_PRESETS[id].strokeWidth, strokeWidth) &&
      OUTLINE_PRESETS[id].hoverFill === !!hoverFill
  ) || 'custom';

/** Next preset for the toolbar cycler; anything custom lands back on the default. */
export const nextOutlinePreset = (preset) => {
  const index = OUTLINE_PRESET_ORDER.indexOf(preset);
  return index === -1
    ? OUTLINE_PRESET_ORDER[0]
    : OUTLINE_PRESET_ORDER[(index + 1) % OUTLINE_PRESET_ORDER.length];
};

/**
 * Coerces anything read back from localStorage into usable settings.
 *
 * The stored blob outlives the code that wrote it, so every field is treated as
 * hostile: a stale key, a hand-edited value or a preset that no longer exists
 * must degrade to the default rather than paint an invisible canvas.
 */
export const sanitizeOutline = (raw) => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_OUTLINE };
  const fillScale = clamp(raw.fillScale, FILL_SCALE_RANGE, DEFAULT_OUTLINE.fillScale);
  const strokeWidth = clamp(raw.strokeWidth, STROKE_WIDTH_RANGE, DEFAULT_OUTLINE.strokeWidth);
  const hoverFill = raw.hoverFill !== false;
  return {
    fillScale,
    strokeWidth,
    hoverFill,
    preset: matchOutlinePreset({ fillScale, strokeWidth, hoverFill }),
    constantWidth: raw.constantWidth !== false,
    peek: false,
  };
};
