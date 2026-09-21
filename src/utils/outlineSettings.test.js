import { describe, it, expect } from 'vitest';
import {
  DEFAULT_OUTLINE,
  OUTLINE_PRESETS,
  matchOutlinePreset,
  nextOutlinePreset,
  sanitizeOutline,
} from './outlineSettings';

describe('outline presets', () => {
  it('recognises each preset from its values alone', () => {
    for (const [id, values] of Object.entries(OUTLINE_PRESETS)) {
      expect(matchOutlinePreset(values)).toBe(id);
    }
  });

  it('reports values that match no preset as custom', () => {
    expect(matchOutlinePreset({ fillScale: 0.5, strokeWidth: 2.5, hoverFill: true })).toBe('custom');
  });

  // The whole point of recomputing rather than clearing the preset: dragging a
  // slider back onto a preset's value must re-light its button.
  it('returns to a named preset when the values land back on it', () => {
    const dragged = { ...OUTLINE_PRESETS.outline, fillScale: 0.4 };
    expect(matchOutlinePreset(dragged)).toBe('custom');
    expect(matchOutlinePreset({ ...dragged, fillScale: 0 })).toBe('outline');
  });

  it('cycles filled → no fill → hairline → filled', () => {
    expect(nextOutlinePreset('fill')).toBe('outline');
    expect(nextOutlinePreset('outline')).toBe('hairline');
    expect(nextOutlinePreset('hairline')).toBe('fill');
  });

  it('sends anything custom back to the default', () => {
    expect(nextOutlinePreset('custom')).toBe('fill');
  });
});

describe('sanitizeOutline', () => {
  it('falls back to the default for junk', () => {
    expect(sanitizeOutline(null)).toEqual(DEFAULT_OUTLINE);
    expect(sanitizeOutline('nonsense')).toEqual(DEFAULT_OUTLINE);
    expect(sanitizeOutline({ fillScale: 'wide' }).fillScale).toBe(DEFAULT_OUTLINE.fillScale);
  });

  it('clamps out-of-range values rather than dropping them', () => {
    expect(sanitizeOutline({ fillScale: 99 }).fillScale).toBe(1.5);
    expect(sanitizeOutline({ strokeWidth: 40 }).strokeWidth).toBe(4);
    expect(sanitizeOutline({ strokeWidth: -4 }).strokeWidth).toBe(0.25);
  });

  it('restores the preset the stored values describe', () => {
    expect(sanitizeOutline(OUTLINE_PRESETS.hairline).preset).toBe('hairline');
  });

  // A held key restored from storage would open the workspace with every object
  // hidden and no key held to explain it.
  it('never restores peek', () => {
    expect(sanitizeOutline({ ...OUTLINE_PRESETS.fill, peek: true }).peek).toBe(false);
  });
});
