import React, { useMemo } from 'react';
import {
  useActivePatchPick,
  useCalibratedColors,
  usePixelLut,
} from '../../../stores/selectors/annotationSelectors';

/** One filter for one canvas; only ever one image is on screen at a time. */
const FILTER_ID = 'iquana-calibrated-colors';

/** 0-255 outputs into the 0-1 fractions `feComponentTransfer` takes. */
const toTableValues = (channel) =>
  channel.map((value) => (value / 255).toFixed(4)).join(' ');

/**
 * Whether, and how, the canvas should paint the image as calibrated.
 *
 * Three things have to line up: the server sent a table (there is a correction
 * to show), the user has the preview on, and nothing is mid-measurement.
 *
 * The last one is not a detail. While a reference patch is being picked, the
 * user is reading values off the image, and clicking a patch on already-corrected
 * pixels invites the conclusion that the number the drawer reports is wrong. The
 * sample is taken server-side from the raw image either way — this only removes
 * the contradiction on screen.
 */
export const useCalibratedColorPreview = () => {
  const lut = usePixelLut();
  const enabled = useCalibratedColors();
  const activePick = useActivePatchPick();

  const available = Array.isArray(lut) && lut.length === 3;
  const suppressed = !!activePick;
  const active = available && enabled && !suppressed;

  return {
    available,
    enabled,
    suppressed,
    active,
    filter: active ? `url(#${FILTER_ID})` : undefined,
  };
};

/**
 * The colour calibration as a live filter over the canvas image.
 *
 * A per-channel lookup table rather than a corrected copy of the image: the
 * correction is a transfer curve, a curve is exactly what `feComponentTransfer`
 * applies, and doing it here means the toggle costs no round trip and no second
 * decode of a full-resolution image. The table itself is the server's — derived
 * by running a ramp through the real pipeline — so nothing about the maths is
 * reimplemented here, only applied.
 *
 * Rendered as a sibling of the image it filters; an SVG with no size paints
 * nothing itself.
 */
const CalibratedColorFilter = () => {
  const lut = usePixelLut();
  const { active } = useCalibratedColorPreview();

  const tables = useMemo(
    () => (Array.isArray(lut) && lut.length === 3 ? lut.map(toTableValues) : null),
    [lut],
  );

  if (!active || !tables) return null;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0 }}
    >
      <defs>
        {/* sRGB, not the linearRGB an SVG filter defaults to. The table is the
            backend's transfer curve, measured on stored pixel values; letting the
            browser linearise first would apply it in a space it was never measured
            in, and the canvas would stop matching the metrics. */}
        <filter id={FILTER_ID} colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="table" tableValues={tables[0]} />
            <feFuncG type="table" tableValues={tables[1]} />
            <feFuncB type="table" tableValues={tables[2]} />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
};

export default CalibratedColorFilter;
