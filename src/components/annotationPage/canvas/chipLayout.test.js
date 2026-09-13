import { CHIP_HEIGHT_PX, chipRect, estimateChipWidth, planChipLayout } from './chipLayout';

/** A candidate at a screen position, sized by its text like the real ones. */
const chip = (id, x, y, extra = {}) => ({
  id,
  text: 'Acropora',
  x,
  y,
  above: false,
  pinned: false,
  area: 1,
  ...extra,
});

describe('chipRect', () => {
  test('centres a chip on its anchor', () => {
    const rect = chipRect(chip('a', 100, 50));
    const width = estimateChipWidth('Acropora');
    expect(rect.left).toBe(100 - width / 2);
    expect(rect.top).toBe(50 - CHIP_HEIGHT_PX / 2);
  });

  test('lifts an above-anchored chip clear of the shape', () => {
    const rect = chipRect(chip('a', 100, 50, { above: true }));
    // The whole chip sits above the anchor, which is the small-object case.
    expect(rect.bottom).toBeLessThan(50);
  });
});

describe('planChipLayout', () => {
  test('keeps chips that do not touch', () => {
    const visible = planChipLayout([chip('a', 0, 0), chip('b', 400, 0), chip('c', 0, 200)]);
    expect(visible).toEqual(new Set(['a', 'b', 'c']));
  });

  test('drops the smaller of two chips that would overlap', () => {
    // Two tiny objects side by side — the case that made the canvas unreadable.
    const visible = planChipLayout([
      chip('small', 100, 100, { area: 1 }),
      chip('big', 108, 100, { area: 50 }),
    ]);
    expect(visible).toEqual(new Set(['big']));
  });

  test('a pinned chip is drawn even where it collides, and wins the space', () => {
    const visible = planChipLayout([
      chip('big', 100, 100, { area: 500 }),
      chip('hovered', 104, 100, { area: 1, pinned: true }),
    ]);
    // Pinned is placed first, so the larger object is the one that gives way.
    expect(visible).toEqual(new Set(['hovered']));
  });

  test('two pinned chips both survive, so a selection is never hidden', () => {
    const visible = planChipLayout([
      chip('one', 100, 100, { pinned: true }),
      chip('two', 102, 100, { pinned: true }),
    ]);
    expect(visible).toEqual(new Set(['one', 'two']));
  });

  test('nested objects sharing a centroid collapse to one chip', () => {
    const visible = planChipLayout([
      chip('outer', 200, 150, { area: 900 }),
      chip('inner', 200, 150, { area: 30 }),
      chip('innermost', 201, 152, { area: 4 }),
    ]);
    expect(visible).toEqual(new Set(['outer']));
  });

  test('does not mutate the input order', () => {
    const candidates = [chip('a', 0, 0, { area: 1 }), chip('b', 500, 0, { area: 9 })];
    planChipLayout(candidates);
    expect(candidates.map((c) => c.id)).toEqual(['a', 'b']);
  });
});
