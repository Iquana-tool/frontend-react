import { describe, expect, test } from 'vitest';
import { CARD_GAP, VIEWPORT_MARGIN, caretFor, placeCard } from './guidePlacement';

const viewport = { width: 1200, height: 800 };
const card = { width: 288, height: 150 };

describe('placeCard', () => {
  test('sits beside the anchor on the requested side', () => {
    const rail = { left: 7, top: 100, width: 32, height: 32 };
    const { side, left } = placeCard(rail, 'right', card, viewport);
    expect(side).toBe('right');
    expect(left).toBe(7 + 32 + CARD_GAP);
  });

  test('flips to the other side rather than cover the anchor', () => {
    const panelEdge = { left: 1100, top: 300, width: 90, height: 30 };
    expect(placeCard(panelEdge, 'right', card, viewport).side).toBe('left');

    const toolbarButton = { left: 500, top: 10, width: 26, height: 26 };
    expect(placeCard(toolbarButton, 'top', card, viewport).side).toBe('bottom');
  });

  test('never leaves the viewport', () => {
    const corner = { left: 1180, top: 790, width: 10, height: 10 };
    const { left, top } = placeCard(corner, 'bottom', card, viewport);
    expect(left).toBeLessThanOrEqual(viewport.width - card.width - VIEWPORT_MARGIN);
    expect(top).toBeLessThanOrEqual(viewport.height - card.height - VIEWPORT_MARGIN);
  });

  test('the pointer arrow aims at the anchor and stays on the card', () => {
    const rail = { left: 7, top: 100, width: 32, height: 32 };
    const position = placeCard(rail, 'right', card, viewport);
    expect(caretFor(rail, position, card)).toEqual({
      edge: 'left',
      offset: 116 - position.top,
    });

    // An anchor near the top of the screen: the card is clamped down, the
    // arrow is clamped to the card's edge rather than hanging off it.
    const high = { left: 7, top: 0, width: 32, height: 10 };
    expect(caretFor(high, placeCard(high, 'right', card, viewport), card).offset).toBe(16);

    const canvas = { left: 300, top: 80, width: 600, height: 500 };
    expect(caretFor(canvas, placeCard(canvas, 'inside-top', card, viewport), card)).toBeNull();
  });

  test('inside placements stay within the canvas', () => {
    const canvas = { left: 300, top: 80, width: 600, height: 500 };
    const topCard = placeCard(canvas, 'inside-top', card, viewport);
    expect(topCard.top).toBe(96);
    const cornerCard = placeCard(canvas, 'inside-bottom-left', card, viewport);
    expect(cornerCard.left).toBe(316);
    expect(cornerCard.top).toBe(80 + 500 - 150 - 16);
  });
});
