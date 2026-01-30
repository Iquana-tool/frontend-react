import React from 'react';
import { Rect } from 'react-konva';

/**
 * Box Prompt Marker Component
 * Displays a dashed rectangle with semi-transparent fill
 */
const BoxPromptMarker = ({ prompt }) => {
  const { x1, y1, x2, y2 } = prompt.coords;
  const width = x2 - x1;
  const height = y2 - y1;

  return (
    <Rect
      x={x1}
      y={y1}
      width={width}
      height={height}
      stroke="#14B8A6" // teal
      strokeWidth={2}
      dash={[5, 3]}
      fill="rgba(20, 184, 166, 0.1)"
      shadowColor="rgba(0, 0, 0, 0.2)"
      shadowBlur={3}
      shadowOffset={{ x: 0, y: 1 }}
    />
  );
};

export default BoxPromptMarker;

