import React from 'react';
import { Line, Circle } from 'react-konva';

/**
 * Polygon Prompt Marker Component
 * Displays a finalized polygon/freehand prompt as a closed, dashed outline with
 * a semi-transparent fill. Vertices are only drawn for clicked polygons (not for
 * dense freehand traces, where they would clutter the outline).
 *
 * @param {Object} prompt - Prompt with coords.stagePoints: flat [x1, y1, x2, y2, ...]
 *                          in stage coordinates, and `freehand` flag.
 */
const PolygonPromptMarker = ({ prompt }) => {
  const points = prompt.coords.stagePoints || [];
  if (points.length < 6) return null; // need at least 3 vertices

  return (
    <>
      <Line
        points={points}
        closed
        stroke="#14B8A6" // teal
        strokeWidth={2}
        dash={[5, 3]}
        fill="rgba(20, 184, 166, 0.12)"
        lineJoin="round"
        shadowColor="rgba(0, 0, 0, 0.2)"
        shadowBlur={3}
        shadowOffset={{ x: 0, y: 1 }}
      />
      {!prompt.freehand &&
        points.length / 2 <= 64 &&
        Array.from({ length: points.length / 2 }, (_, i) => (
          <Circle
            key={i}
            x={points[i * 2]}
            y={points[i * 2 + 1]}
            radius={3}
            fill="#14B8A6"
            stroke="white"
            strokeWidth={1}
          />
        ))}
    </>
  );
};

export default PolygonPromptMarker;
