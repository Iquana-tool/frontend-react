import { describe, expect, test } from 'vitest';
import { spotlightRects } from './anchorRects';

const rect = (left) => ({ left, top: 0, width: 10, height: 10 });

describe('spotlightRects', () => {
  test('lights the step targets and any open menu or picker', () => {
    expect(
      spotlightRects({ anchorRects: [rect(1)], fallbackRects: [rect(2)], floatRects: [rect(3)] })
    ).toEqual([rect(1), rect(3)]);
  });

  test('falls back where the card falls back when the target is off screen', () => {
    expect(
      spotlightRects({ anchorRects: [], fallbackRects: [rect(2)], floatRects: [] })
    ).toEqual([rect(2)]);
  });

  test('with nothing to light, nothing is dimmed', () => {
    // An open tooltip alone is no reason to darken the whole screen.
    expect(spotlightRects({ anchorRects: [], fallbackRects: [], floatRects: [rect(3)] })).toEqual([]);
  });
});
