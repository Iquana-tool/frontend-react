/**
 * Where a guide card goes, given the rectangle of what it points at.
 *
 * Pure so it can be tested without layout: the card component measures, this
 * decides. The card never covers its anchor — if the preferred side has no
 * room it flips to the opposite side, and the result is always clamped inside
 * the viewport.
 */

export const CARD_GAP = 12;
export const VIEWPORT_MARGIN = 8;

const OPPOSITE = { right: 'left', left: 'right', top: 'bottom', bottom: 'top' };

const fits = (side, rect, card, viewport) => {
  switch (side) {
    case 'right':
      return rect.left + rect.width + CARD_GAP + card.width <= viewport.width - VIEWPORT_MARGIN;
    case 'left':
      return rect.left - CARD_GAP - card.width >= VIEWPORT_MARGIN;
    case 'top':
      return rect.top - CARD_GAP - card.height >= VIEWPORT_MARGIN;
    case 'bottom':
      return rect.top + rect.height + CARD_GAP + card.height <= viewport.height - VIEWPORT_MARGIN;
    default:
      return true;
  }
};

const positionFor = (side, rect, card) => {
  const centerX = rect.left + rect.width / 2 - card.width / 2;
  const centerY = rect.top + rect.height / 2 - card.height / 2;
  switch (side) {
    case 'right':
      return { left: rect.left + rect.width + CARD_GAP, top: centerY };
    case 'left':
      return { left: rect.left - CARD_GAP - card.width, top: centerY };
    case 'top':
      return { left: centerX, top: rect.top - CARD_GAP - card.height };
    case 'bottom':
      return { left: centerX, top: rect.top + rect.height + CARD_GAP };
    case 'inside-bottom-left':
      return { left: rect.left + 16, top: rect.top + rect.height - card.height - 16 };
    case 'inside-top':
    default:
      return { left: centerX, top: rect.top + 16 };
  }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

const CARET_INSET = 16;

/**
 * Where along the card's edge the pointer arrow sits so it aims at the anchor's
 * centre, or null for the placements that have no arrow (inside the canvas).
 *
 * @returns {{edge: 'left'|'right'|'top'|'bottom', offset: number}|null}
 *   `edge` is the card edge the arrow is on; `offset` runs along that edge.
 */
export const caretFor = (rect, position, card) => {
  const along = (value, length) => clamp(value, CARET_INSET, length - CARET_INSET);
  switch (position.side) {
    case 'right':
      return { edge: 'left', offset: along(rect.top + rect.height / 2 - position.top, card.height) };
    case 'left':
      return { edge: 'right', offset: along(rect.top + rect.height / 2 - position.top, card.height) };
    case 'bottom':
      return { edge: 'top', offset: along(rect.left + rect.width / 2 - position.left, card.width) };
    case 'top':
      return { edge: 'bottom', offset: along(rect.left + rect.width / 2 - position.left, card.width) };
    default:
      return null;
  }
};

/**
 * @param {{left:number, top:number, width:number, height:number}} rect - anchor, viewport coordinates
 * @param {string} placement - 'right' | 'left' | 'top' | 'bottom' | 'inside-top' | 'inside-bottom-left'
 * @param {{width:number, height:number}} card
 * @param {{width:number, height:number}} viewport
 * @returns {{left:number, top:number, side:string}}
 */
export const placeCard = (rect, placement, card, viewport) => {
  let side = placement;
  if (OPPOSITE[side] && !fits(side, rect, card, viewport) && fits(OPPOSITE[side], rect, card, viewport)) {
    side = OPPOSITE[side];
  }
  const { left, top } = positionFor(side, rect, card);
  return {
    side,
    left: clamp(left, VIEWPORT_MARGIN, viewport.width - card.width - VIEWPORT_MARGIN),
    top: clamp(top, VIEWPORT_MARGIN, viewport.height - card.height - VIEWPORT_MARGIN),
  };
};
