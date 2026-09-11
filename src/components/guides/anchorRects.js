import { useEffect, useState } from 'react';

/**
 * Finding and tracking the on-screen rectangles guide cards point at.
 *
 * Anchors are marked `data-guide="name"`. Floating UI that a step may open —
 * menus, the label picker, the context menu, tooltips — is marked
 * `data-guide-float`, so the spotlight can leave it lit wherever it appears.
 *
 * Polled rather than observed: the controls a guide points at mount and unmount
 * with store state (the action bar's buttons change with the selection), move
 * with the panels, and live in many components — a short interval catches all
 * of it without every one of them having to report in.
 */

const MEASURE_INTERVAL_MS = 200;

const toPlainRect = (rect) => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
});

const visibleRects = (selector) => {
  const rects = [];
  for (const node of document.querySelectorAll(selector)) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) rects.push(toPlainRect(rect));
  }
  return rects;
};

const anchorSelector = (id) => `[data-guide="${id}"]`;

/** The first visible element named `id`, as a viewport rect, or null. */
export const findAnchorRect = (id) => (id ? visibleRects(anchorSelector(id))[0] || null : null);

/**
 * What the spotlight leaves lit: the step's anchors — or, when none of them is
 * on screen, the fallback the card itself falls back to — plus any open
 * floating UI, so a picker the step opens is not dimmed under its own guide.
 */
export const spotlightRects = ({ anchorRects, fallbackRects, floatRects }) => {
  const targets = anchorRects.length > 0 ? anchorRects : fallbackRects;
  return targets.length > 0 ? [...targets, ...floatRects] : [];
};

const rectsKey = (rects) =>
  rects.map((rect) => `${rect.left}|${rect.top}|${rect.width}|${rect.height}`).join(';');

/** Re-runs `measure` on an interval and on resize; state changes only when the result does. */
const usePolledRects = (measure, deps) => {
  const [rects, setRects] = useState(measure);

  useEffect(() => {
    let last;
    const update = () => {
      const next = measure();
      const key = next ? rectsKey([].concat(next)) : '';
      if (key !== last) {
        last = key;
        setRects(next);
      }
    };
    update();
    const timer = window.setInterval(update, MEASURE_INTERVAL_MS);
    window.addEventListener('resize', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', update);
    };
    // `measure` is rebuilt each render from the same inputs as `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rects;
};

/** Tracks one anchor's rectangle (null while it is not on screen). */
export const useAnchorRect = (anchorId) =>
  usePolledRects(() => findAnchorRect(anchorId), [anchorId]);

/** Tracks every rectangle the spotlight should leave lit. */
export const useSpotlightRects = (anchorIds, fallbackId) => {
  const key = anchorIds.join(',');
  return usePolledRects(
    () =>
      spotlightRects({
        anchorRects: anchorIds.flatMap((id) => visibleRects(anchorSelector(id))),
        fallbackRects: fallbackId ? visibleRects(anchorSelector(fallbackId)) : [],
        floatRects: visibleRects('[data-guide-float]'),
      }),
    [key, fallbackId]
  );
};
