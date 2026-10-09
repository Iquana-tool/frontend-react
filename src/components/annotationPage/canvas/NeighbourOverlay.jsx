import React, { useMemo } from 'react';
import { useMergedStackObjects } from '../workspace/stack/useStackData';
import { neighbourOutlines } from '../workspace/stack/timelineModel';
import { resolveLabelColor } from '../workspace/labelColorUtils';
import {
  useCurrentImage,
  useDatasetLabels,
  useLabelColorOverrides,
  useObjectsList,
  useOutlinePeek,
  useSelectedObjects,
  useShowNeighbours,
} from '../../../stores/selectors/annotationSelectors';

/**
 * The neighbouring slices' outlines, dashed, under the current slice's objects.
 *
 * Answers "does this continue above and below?" without leaving the slice.
 * With one object selected, only its label's outlines from slices n−1 and n+1;
 * with nothing selected, all of them. The slice above is drawn with longer
 * dashes than the one below, so the two can be told apart.
 *
 * Lives inside the canvas's transformed layer next to the `<img>` and uses the
 * same `object-contain` box (`preserveAspectRatio="xMidYMid meet"` on the image's
 * own size), so it needs no coordinate maths of its own.
 */
const NeighbourOverlay = ({ imageObject }) => {
  const currentImage = useCurrentImage();
  const showNeighbours = useShowNeighbours();
  const peek = useOutlinePeek();
  const objects = useMergedStackObjects();
  const liveObjects = useObjectsList();
  const selected = useSelectedObjects();
  const labels = useDatasetLabels();
  const colorOverrides = useLabelColorOverrides();

  const selectedObject = selected.length === 1
    ? liveObjects.find((object) => object.id === selected[0])
    : null;
  const labelId = selectedObject ? (selectedObject.labelId ?? null) : undefined;
  const frameIndex = currentImage?.frameIndex;

  const outlines = useMemo(
    () => (frameIndex == null ? [] : neighbourOutlines(objects, frameIndex, labelId)),
    [objects, frameIndex, labelId]
  );

  if (currentImage?.stackId == null || !showNeighbours || peek || !outlines.length || !imageObject) {
    return null;
  }

  const width = imageObject.naturalWidth || imageObject.width;
  const height = imageObject.naturalHeight || imageObject.height;
  const colorOf = (id) => {
    const label = labels.find((candidate) => String(candidate.id) === String(id));
    return label ? resolveLabelColor(label, colorOverrides) : 'rgba(255,255,255,.8)';
  };

  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ zIndex: 5 }}
    >
      {outlines.map((outline) => {
        if (!outline.x?.length) return null;
        const points = outline.x.map((x, i) => `${x * width},${outline.y[i] * height}`).join(' ');
        return (
          <polygon
            key={`${outline.frame_index}-${outline.contour_id}`}
            points={points}
            fill="none"
            stroke={colorOf(outline.label_id)}
            strokeOpacity={0.75}
            strokeWidth={1.4}
            strokeDasharray={outline.offset < 0 ? '7 4' : '2 3'}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
};

export default NeighbourOverlay;
