import { render } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import CalibratedColorFilter, { useCalibratedColorPreview } from './CalibratedColorFilter';

const state = { lut: null, enabled: true, pick: null };

vi.mock('../../../stores/selectors/annotationSelectors', () => ({
  usePixelLut: () => state.lut,
  useCalibratedColors: () => state.enabled,
  useActivePatchPick: () => state.pick,
}));

/** A table the correction clearly changes: identity would prove nothing. */
const rampLut = () => {
  const channel = (scale) =>
    Array.from({ length: 256 }, (_, level) => Math.min(255, Math.round(level * scale)));
  return [channel(1.5), channel(1.0), channel(0.5)];
};

/** Renders the hook's verdict without needing a component around it. */
const Probe = ({ onResult }) => {
  onResult(useCalibratedColorPreview());
  return null;
};

const preview = () => {
  let result;
  render(<Probe onResult={(value) => { result = value; }} />);
  return result;
};

describe('useCalibratedColorPreview', () => {
  beforeEach(() => {
    state.lut = rampLut();
    state.enabled = true;
    state.pick = null;
  });

  test('is available and on when the image carries a correction', () => {
    expect(preview()).toMatchObject({ available: true, active: true, suppressed: false });
    expect(preview().filter).toMatch(/^url\(#.+\)$/);
  });

  test('is unavailable on an image with nothing to correct', () => {
    state.lut = null;
    expect(preview()).toMatchObject({ available: false, active: false, filter: undefined });
  });

  test('stays available but inactive when switched off', () => {
    state.enabled = false;
    expect(preview()).toMatchObject({ available: true, active: false, filter: undefined });
  });

  test('is suppressed while a reference patch is being picked', () => {
    // Otherwise the user reads a value off corrected pixels and concludes the
    // number the drawer reports for it is wrong.
    state.pick = { kind: 'response', mode: 'role', role: 'white' };
    expect(preview()).toMatchObject({ available: true, active: false, suppressed: true });
  });
});

describe('CalibratedColorFilter', () => {
  beforeEach(() => {
    state.lut = rampLut();
    state.enabled = true;
    state.pick = null;
  });

  test('turns the lookup table into a per-channel transfer curve', () => {
    const { container } = render(<CalibratedColorFilter />);

    const filter = container.querySelector('filter');
    // Without sRGB the browser linearises first and applies the curve in a space
    // it was never measured in.
    expect(filter).toHaveAttribute('color-interpolation-filters', 'sRGB');

    const values = (selector) =>
      container.querySelector(selector).getAttribute('tableValues').split(' ');

    // One entry per 8-bit level, so the lookup is exact rather than interpolated.
    expect(values('feFuncR')).toHaveLength(256);
    expect(values('feFuncG')).toHaveLength(256);
    expect(values('feFuncB')).toHaveLength(256);

    // 0-255 in, 0-1 out, and each channel keeps its own curve.
    expect(Number(values('feFuncR')[128])).toBeCloseTo(192 / 255, 3);
    expect(Number(values('feFuncG')[128])).toBeCloseTo(128 / 255, 3);
    expect(Number(values('feFuncB')[128])).toBeCloseTo(64 / 255, 3);
  });

  test('renders nothing when there is no correction to apply', () => {
    state.lut = null;
    const { container } = render(<CalibratedColorFilter />);
    expect(container.querySelector('filter')).toBeNull();
  });

  test('renders nothing while the preview is switched off', () => {
    state.enabled = false;
    const { container } = render(<CalibratedColorFilter />);
    expect(container.querySelector('filter')).toBeNull();
  });
});
