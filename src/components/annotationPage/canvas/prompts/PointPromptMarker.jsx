import React from 'react';
import { Circle, Group, Text } from 'react-konva';

/**
 * Point Prompt Marker Component
 * Displays a colored circle with +/- glyph based on prompt type
 */
const PointPromptMarker = ({ prompt }) => {
  const isPositive = prompt.label === 'positive';
  const color = isPositive ? '#10B981' : '#EF4444'; // green or red
  const glyph = isPositive ? '+' : '−';

  return (
    <Group x={prompt.coords.x} y={prompt.coords.y}>
      {/* Outer circle with border */}
      <Circle
        radius={5}
        fill={color}
        stroke="white"
        strokeWidth={1.5}
        shadowColor="rgba(0, 0, 0, 0.2)"
        shadowBlur={2}
        shadowOffset={{ x: 0, y: 1 }}
      />
      
      {/* Glyph */}
      <Text
        text={glyph}
        fontSize={8}
        fontStyle="bold"
        fill="white"
        align="center"
        verticalAlign="middle"
        offsetX={2.5}
        offsetY={4}
      />
    </Group>
  );
};

export default PointPromptMarker;

