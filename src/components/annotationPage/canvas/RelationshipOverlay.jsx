import React from 'react';
import { getCentroid } from '../workspace/annotationStyles';
import { isSuggested } from '../sceneGraph/sceneGraphModel';

/**
 * Directed edges between objects, drawn only while something is hovered.
 *
 * Lives inside SegmentationOverlay's zoomed box and places itself with the same maths as
 * the chips: centroids are percentages of the rendered image box. Strokes and pills are
 * counter-scaled by the zoom so an edge reads the same at 100% as at 800%.
 *
 * The visual language keeps the two kinds of thing apart: objects keep their dark,
 * colour-swatched chips; a relationship is a light pill riding a light line, with the
 * arrowhead on the object of the sentence. Dashed means a model suggested it. A symmetric
 * name ("touches") has no arrowhead.
 */
const EDGE = '#e8edf3';
const HALO = 'rgba(4,6,9,.7)';
const MARKER_ID = 'sg-edge-arrow';

const RelationshipOverlay = ({ edges, imageDimensions, zoomLevel = 1 }) => {
  if (!edges.length || imageDimensions.width <= 0) return null;

  const scale = 1 / (zoomLevel || 1);
  const toPx = (centroid) => ({
    x: imageDimensions.x + (centroid.x / 100) * imageDimensions.width,
    y: imageDimensions.y + (centroid.y / 100) * imageDimensions.height,
  });

  const drawn = edges.map(({ edge, from, to }) => {
    const a = getCentroid(from);
    const b = getCentroid(to);
    if (!a || !b) return null;
    const start = toPx(a);
    const end = toPx(b);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return null;
    // Stop short of the target's node dot so the arrowhead stays visible.
    const inset = Math.min(length / 2, 10 * scale);
    const tip = { x: end.x - (dx / length) * inset, y: end.y - (dy / length) * inset };
    return {
      edge, from, to, start, end, tip,
      mid: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    };
  }).filter(Boolean);

  return (
    <>
      <svg
        className="absolute inset-0 pointer-events-none"
        width="100%"
        height="100%"
        style={{ overflow: 'visible', zIndex: 36 }}
        aria-hidden="true"
      >
        <defs>
          <marker
            id={MARKER_ID}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            markerUnits="strokeWidth"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill={EDGE} />
          </marker>
        </defs>
        {drawn.map(({ edge, start, tip }) => (
          <g key={`edge-${edge.id}`}>
            <line
              x1={start.x} y1={start.y} x2={tip.x} y2={tip.y}
              stroke={HALO} strokeWidth={4.5 * scale} strokeLinecap="round"
            />
            <line
              x1={start.x} y1={start.y} x2={tip.x} y2={tip.y}
              stroke={EDGE}
              strokeWidth={1.75 * scale}
              strokeDasharray={isSuggested(edge) ? `${5 * scale} ${4 * scale}` : undefined}
              markerEnd={edge.symmetric ? undefined : `url(#${MARKER_ID})`}
            />
          </g>
        ))}
        {drawn.flatMap(({ edge, from, to, start, end }) => [
          { key: `s-${edge.id}`, point: start, color: from.color },
          { key: `o-${edge.id}`, point: end, color: to.color },
        ]).map(({ key, point, color }) => (
          <circle
            key={key}
            cx={point.x}
            cy={point.y}
            r={4 * scale}
            fill={color || '#3b82f6'}
            stroke={EDGE}
            strokeWidth={1.5 * scale}
          />
        ))}
      </svg>

      {drawn.map(({ edge, mid }) => {
        const suggested = isSuggested(edge);
        return (
          <div
            key={`pill-${edge.id}`}
            className="absolute pointer-events-none select-none"
            style={{
              left: `${mid.x}px`,
              top: `${mid.y}px`,
              transformOrigin: 'top left',
              transform: `scale(${scale}) translate(-50%, -50%)`,
              zIndex: 37,
            }}
          >
            <span
              data-testid="relationship-pill"
              className="inline-flex items-center gap-[4px] h-[18px] px-[7px] rounded-9 font-mono text-[10px] font-semibold whitespace-nowrap"
              style={suggested
                ? { background: '#0f1720', color: EDGE, border: `1px dashed ${EDGE}` }
                : { background: EDGE, color: '#0f1720', boxShadow: '0 1px 2px rgba(0,0,0,.4)' }}
            >
              {edge.type}
              {suggested && <span className="font-sans text-[8.5px] font-bold text-warn">?</span>}
            </span>
          </div>
        );
      })}
    </>
  );
};

export default RelationshipOverlay;
