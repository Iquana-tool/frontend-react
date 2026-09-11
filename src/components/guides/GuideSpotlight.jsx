import React, { useId } from 'react';
import { useSpotlightRects } from './anchorRects';

const HOLE_PADDING = 6;
const HOLE_RADIUS = 9;

/**
 * Dims the screen around what the current step is about.
 *
 * Purely visual: the overlay takes no pointer events, so everything under the
 * dim stays usable — several steps are done on the canvas or in a panel, and
 * the guide never locks the user out of their own workspace. Open menus and
 * pickers (`data-guide-float`) are cut out too, so a picker the step opens is
 * not dimmed under its own instruction.
 *
 * One SVG mask rather than a box-shadow cut-out, because a step can light more
 * than one thing (the canvas and the Objects panel, say).
 *
 * @param {{ anchors: string[], fallback?: string }} props
 */
const GuideSpotlight = ({ anchors, fallback = 'canvas' }) => {
  const maskId = `guide-spotlight-${useId().replace(/[^a-zA-Z0-9-_]/g, '')}`;
  const holes = useSpotlightRects(anchors, fallback);

  // Nothing to point at: dimming the whole screen would only hide things.
  if (!holes.length) return null;

  return (
    <svg
      aria-hidden
      data-guide-spotlight=""
      className="fixed inset-0 z-[198] pointer-events-none animate-dcFade"
      width="100%"
      height="100%"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          {holes.map((rect, index) => (
            <rect
              key={`${index}:${rect.left}:${rect.top}`}
              x={rect.left - HOLE_PADDING}
              y={rect.top - HOLE_PADDING}
              width={rect.width + HOLE_PADDING * 2}
              height={rect.height + HOLE_PADDING * 2}
              rx={HOLE_RADIUS}
              fill="black"
            />
          ))}
        </mask>
      </defs>
      <rect width="100%" height="100%" style={{ fill: 'var(--gdDim)' }} mask={`url(#${maskId})`} />
    </svg>
  );
};

export default GuideSpotlight;
