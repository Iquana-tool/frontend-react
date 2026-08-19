/**
 * Placement and decluttering for the canvas label chips.
 *
 * The problem this solves: a chip per object is unreadable as soon as objects
 * are small, side by side, or nested — the chips cover exactly the shapes they
 * describe. Two rules fix that, and both need the chip's *screen* size, which is
 * why this module works in screen pixels rather than image percentages.
 *
 * 1. Chips are a constant screen size (the overlay counter-scales them against
 *    the zoom), so zooming in genuinely separates them. Before that, a chip
 *    covered the same fraction of its object at every zoom level and zooming was
 *    no escape at all.
 * 2. Chips that would overlap an already-placed chip are dropped, highest
 *    priority first. A dropped chip costs nothing: the object keeps its coloured
 *    outline, and pointing at it brings its chip back — hover and selection are
 *    pinned, so they are placed before anything can crowd them out.
 *
 * Kept free of React and of the store so the packing can be tested directly.
 */

/** Chip label detail: 'all' every object, 'minimal' only hover/selection, 'off' none. */
export const CHIP_MODES = ['all', 'minimal', 'off'];

export const CHIP_MODE_LABELS = {
  all: 'Labels: all',
  minimal: 'Labels: selected only',
  off: 'Labels: off',
};

/** Rendered chip height in CSS px: 10px text + padding + border. */
export const CHIP_HEIGHT_PX = 22;

/** Gap between a shape and a chip anchored above it. */
export const CHIP_GAP_PX = 6;

/**
 * Chip width without measuring the DOM.
 *
 * A layout pass per object per frame is not worth the accuracy here: the packing
 * only needs to know roughly how much room a chip claims, and 10px semibold text
 * averages a shade under 6px per character. Deliberately generous, because
 * underestimating produces the overlap this module exists to prevent.
 */
export const estimateChipWidth = (text) => Math.round((text || '').length * 6) + 30;

/** The screen-space box a chip would occupy if it were placed. */
export const chipRect = (candidate) => {
  const width = estimateChipWidth(candidate.text);
  const left = candidate.x - width / 2;
  const top = candidate.above
    ? candidate.y - CHIP_HEIGHT_PX - CHIP_GAP_PX
    : candidate.y - CHIP_HEIGHT_PX / 2;
  return { left, top, right: left + width, bottom: top + CHIP_HEIGHT_PX };
};

const overlaps = (a, b, padding) =>
  a.left < b.right + padding &&
  a.right > b.left - padding &&
  a.top < b.bottom + padding &&
  a.bottom > b.top - padding;

/**
 * Decides which chips to draw.
 *
 * @param {Array<{id, text, x, y, above, pinned, area}>} candidates
 *   `x`/`y` are the chip's anchor in screen pixels; `pinned` marks the selected
 *   and hovered objects, which are always drawn.
 * @param {{padding?: number}} options
 *   `padding` is the breathing room demanded between two chips.
 * @returns {Set<string|number>} the ids whose chip should render.
 */
export const planChipLayout = (candidates, { padding = 3 } = {}) => {
  // Pinned first so a selection is never the chip that loses, then largest
  // first: a big object has room to spare for its label, and losing the chip of
  // the thing you can barely see costs the least.
  const ordered = [...candidates].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.area || 0) - (a.area || 0);
  });

  const placed = [];
  const visible = new Set();

  for (const candidate of ordered) {
    const rect = chipRect(candidate);
    // A pinned chip is drawn regardless, but still occupies space, so an
    // ordinary chip cannot be tucked underneath it.
    if (candidate.pinned || !placed.some((other) => overlaps(rect, other, padding))) {
      placed.push(rect);
      visible.add(candidate.id);
    }
  }

  return visible;
};
