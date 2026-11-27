import React from 'react';
import { COMET, cometLapSeconds } from './reviewFeedback';

/**
 * A comet that circles the object under review: a white head with a tail in the
 * label colour. Motion is what the eye finds first on a crowded image.
 *
 * It is drawn only outside the outline, past a clear gap: a mask removes the
 * shape and a band around it. So the edge the reviewer judges is never tinted
 * or covered, which the old glow on top of the outline did.
 *
 * Draw it inside the object's own svg, whose user space is image pixels. Widths
 * arrive in screen pixels and are converted with `unitsPerPx`; the dashes use a
 * `pathLength` of 100, so the tail is a fixed share of the outline.
 *
 * @param {Object} props
 * @param {string|number} props.id - Unique per object, for the mask id.
 * @param {string} props.d - The outline path in image pixels.
 * @param {string} props.color - Label colour for the tail.
 * @param {number} props.unitsPerPx - Image pixels per screen pixel.
 * @param {number} props.perimeterPx - Outline length on screen, sets the lap time.
 * @param {number} props.width - Image width in pixels.
 * @param {number} props.height - Image height in pixels.
 */
const ReviewComet = ({ id, d, color, unitsPerPx, perimeterPx, width, height }) => {
  const maskId = `review-comet-mask-${id}`;
  const gapWidth = 2 * COMET.gap * unitsPerPx;
  const outerWidth = 2 * (COMET.gap + COMET.band) * unitsPerPx;
  const headWidth = outerWidth - 2 * unitsPerPx;

  return (
    <g
      data-testid="review-comet"
      className="review-comet"
      mask={`url(#${maskId})`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ pointerEvents: 'none', '--comet-lap': `${cometLapSeconds(perimeterPx).toFixed(2)}s` }}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <rect x={0} y={0} width={width} height={height} fill="#fff" />
          <path d={d} fill="#000" stroke="#000" strokeWidth={gapWidth} strokeLinejoin="round" />
        </mask>
      </defs>
      {/* Shown instead of the moving comet when the system asks for less motion. */}
      <path className="review-comet-halo" d={d} stroke={color} strokeWidth={outerWidth} />
      <path className="review-comet-tail" d={d} pathLength={100} stroke={color} strokeWidth={outerWidth} />
      <path className="review-comet-mid" d={d} pathLength={100} stroke={color} strokeWidth={outerWidth} />
      <path className="review-comet-head" d={d} pathLength={100} stroke="#fff" strokeWidth={headWidth} />
    </g>
  );
};

export default ReviewComet;
