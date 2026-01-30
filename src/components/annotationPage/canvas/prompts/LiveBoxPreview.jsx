import React from 'react';
import { Rect } from 'react-konva';

/**
 * Live Box Preview Component
 * Shows a rubber-band box while user is dragging
 */
const LiveBoxPreview = ({ preview }) => {
  if (!preview) return null;

  const { x1, y1, x2, y2 } = preview;
  const width = x2 - x1;
  const height = y2 - y1;

  return (
    <Rect
      x={Math.min(x1, x2)}
      y={Math.min(y1, y2)}
      width={Math.abs(width)}
      height={Math.abs(height)}
      stroke="#14B8A6" // teal
      strokeWidth={2}
      dash={[8, 4]}
      fill="rgba(20, 184, 166, 0.05)"
      opacity={0.7}
    />
  );
};

export default LiveBoxPreview;

