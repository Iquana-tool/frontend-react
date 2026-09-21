import { describe, it, expect } from 'vitest';
import { getPolygonStyle, HATCH_PATTERN_ID, UNLABELLED_COLOR } from './annotationStyles';
import { OUTLINE_PRESETS, TABLE_STROKE_WIDTH } from '../../../utils/outlineSettings';

const COLOR = '#3b82f6';
// State is derived from the label and the reviewers, not a status field —
// see getObjectState.
const approved = { id: 1, label: 'grain', labelId: 7, reviewed_by: ['ada'] };
const pending = { id: 2, label: 'grain', labelId: 7, reviewed_by: [] };
const unlabelled = { id: 3, reviewed_by: [] };

const alphaOf = (fill) => {
  const match = /rgba\([^)]*,\s*([\d.]+)\)/.exec(fill || '');
  return match ? parseFloat(match[1]) : null;
};

describe('getPolygonStyle outline settings', () => {
  it('keeps the existing fill when no settings are passed, at the default width', () => {
    const style = getPolygonStyle(approved, { color: COLOR });
    expect(style.strokeWidth).toBe(0.5);
    expect(alphaOf(style.fill)).toBeCloseTo(0.16);
  });

  // The regression the TABLE_STROKE_WIDTH split exists to prevent: the scale is
  // measured against the width the table is authored at, so asking for exactly
  // that width reproduces the table verbatim however the default moves.
  it('reproduces the raw state table at the table width', () => {
    const outline = { ...OUTLINE_PRESETS.fill, strokeWidth: TABLE_STROKE_WIDTH };
    expect(getPolygonStyle(approved, { color: COLOR, outline }).strokeWidth).toBe(2.5);
    expect(getPolygonStyle(pending, { color: COLOR, outline }).strokeWidth).toBe(3);
    expect(getPolygonStyle(approved, { color: COLOR, outline, selected: true }).strokeWidth).toBe(5);
  });

  it('keeps selection heavier than hover, and hover heavier than rest', () => {
    const outline = OUTLINE_PRESETS.fill;
    const rest = getPolygonStyle(approved, { color: COLOR, outline }).strokeWidth;
    const hovered = getPolygonStyle(approved, { color: COLOR, outline, hovered: true }).strokeWidth;
    const selected = getPolygonStyle(approved, { color: COLOR, outline, selected: true }).strokeWidth;
    expect(hovered).toBeGreaterThan(rest);
    expect(selected).toBeGreaterThan(hovered);
  });

  // The state table is what makes approved / pending / unlabelled legible at a
  // glance; the setting has to scale it, not flatten it.
  it('scales the state table rather than replacing it', () => {
    const outline = { ...OUTLINE_PRESETS.fill, fillScale: 0.5 };
    expect(alphaOf(getPolygonStyle(approved, { color: COLOR, outline }).fill)).toBeCloseTo(0.08);
    expect(alphaOf(getPolygonStyle(pending, { color: COLOR, outline }).fill)).toBeCloseTo(0.05);
  });

  it('scales stroke widths while keeping pending heavier than approved', () => {
    const outline = { ...OUTLINE_PRESETS.fill, strokeWidth: 5 };
    const a = getPolygonStyle(approved, { color: COLOR, outline }).strokeWidth;
    const p = getPolygonStyle(pending, { color: COLOR, outline }).strokeWidth;
    expect(a).toBe(5);
    expect(p).toBeGreaterThan(a);
  });

  describe('the outline preset', () => {
    const outline = OUTLINE_PRESETS.outline;

    it('drops the fill to nothing at rest', () => {
      expect(alphaOf(getPolygonStyle(approved, { color: COLOR, outline }).fill)).toBe(0);
    });

    // Without this, an outline-only canvas is a canvas you cannot aim at.
    it('fills the object under the cursor and the selection back in', () => {
      const hovered = getPolygonStyle(approved, { color: COLOR, outline, hovered: true });
      const selected = getPolygonStyle(approved, { color: COLOR, outline, selected: true });
      expect(alphaOf(hovered.fill)).toBeCloseTo(0.24);
      expect(alphaOf(selected.fill)).toBeCloseTo(0.34);
    });

    it('still hatches unlabelled objects, which must stay unmissable', () => {
      expect(getPolygonStyle(unlabelled, { outline }).fill).toBe(`url(#${HATCH_PATTERN_ID})`);
      expect(getPolygonStyle(unlabelled, { outline }).stroke).toBe(UNLABELLED_COLOR);
    });
  });

  describe('the hairline preset', () => {
    const outline = OUTLINE_PRESETS.hairline;

    it('paints no fill at all, not even on hover or selection', () => {
      expect(alphaOf(getPolygonStyle(approved, { color: COLOR, outline, hovered: true }).fill)).toBe(0);
      expect(alphaOf(getPolygonStyle(approved, { color: COLOR, outline, selected: true }).fill)).toBe(0);
    });

    it('drops the hatch too, leaving the amber dashes to mark unlabelled work', () => {
      const style = getPolygonStyle(unlabelled, { outline });
      expect(style.fill).not.toContain(HATCH_PATTERN_ID);
      expect(style.strokeDasharray).toBe('18 10');
      expect(style.marchingAnts).toBe(true);
    });
  });

  // Review mode already recedes approved work to a hairline; the user setting
  // composes with that instead of overriding it.
  it('scales the review-mode treatment as well', () => {
    const outline = { ...OUTLINE_PRESETS.fill, fillScale: 0.5, strokeWidth: 5 };
    const style = getPolygonStyle(approved, { color: COLOR, outline, reviewMode: true });
    expect(alphaOf(style.fill)).toBeCloseTo(0.02);
    expect(style.strokeWidth).toBe(3);
  });

  it('reports the vector effect the constant-width setting asks for', () => {
    expect(getPolygonStyle(approved, { color: COLOR }).vectorEffect).toBe('non-scaling-stroke');
    const outline = { ...OUTLINE_PRESETS.fill, constantWidth: false };
    expect(getPolygonStyle(approved, { color: COLOR, outline }).vectorEffect).toBe('none');
  });
});
