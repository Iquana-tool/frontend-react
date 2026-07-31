import { getObjectState } from './objectViewModel';
import { withAlpha } from './labelColorUtils';

/** Amber used for objects that have been drawn but not classified yet. */
export const UNLABELLED_COLOR = '#f59e0b';

export const HATCH_PATTERN_ID = 'iq-unlabelled-hatch';

/**
 * Stroke and fill for one annotation polygon, per the design's state table.
 *
 * | state              | stroke            | dash        | fill |
 * | approved           | class colour 2.5  | —           | 16 % |
 * | pending review     | class colour 3    | 30 8        | 10 % |
 * | unlabelled         | amber 2.5         | 18 10 ants  | hatch |
 * | hover              | +1.5 width        | —           | 24 % |
 * | selected           | 5                 | —           | 34 % |
 * | approved in review | 1.5               | —           |  4 % |
 *
 * Hover and selection are modifiers on top of the base state, not states of
 * their own, so a selected pending object keeps its dashes.
 */
export const getPolygonStyle = (object, { hovered, selected, reviewMode, color }) => {
  const state = getObjectState(object);
  const base = state === 'unlabelled' ? UNLABELLED_COLOR : color || UNLABELLED_COLOR;

  // Approved objects recede to a hairline while reviewing, so the work that
  // still needs attention is what stands out.
  if (reviewMode && state === 'approved' && !selected && !hovered) {
    return {
      stroke: base,
      strokeWidth: 1.5,
      strokeDasharray: 'none',
      fill: withAlpha(base, 0.04),
      marchingAnts: false,
    };
  }

  let strokeWidth = state === 'pending' ? 3 : 2.5;
  let fillOpacity = state === 'approved' ? 0.16 : state === 'pending' ? 0.1 : 0.18;
  let strokeDasharray =
    state === 'pending' ? '30 8' : state === 'unlabelled' ? '18 10' : 'none';

  if (hovered) {
    strokeWidth += 1.5;
    fillOpacity = 0.24;
  }
  if (selected) {
    strokeWidth = 5;
    fillOpacity = 0.34;
    strokeDasharray = 'none';
  }

  return {
    stroke: base,
    strokeWidth,
    strokeDasharray,
    // Unlabelled objects get a hatch rather than a flat tint, so they read as
    // unfinished even at a glance.
    fill:
      state === 'unlabelled' && !selected && !hovered
        ? `url(#${HATCH_PATTERN_ID})`
        : withAlpha(base, fillOpacity),
    marchingAnts: state === 'unlabelled' && !selected,
  };
};

/** Chip caption under an object's centroid. */
export const getChipLabel = (object) => {
  const state = getObjectState(object);
  if (state === 'unlabelled') return 'unlabelled';
  if (state === 'pending') return `${object.label} #${object.id} · pending`;
  return `${object.label} #${object.id}`;
};

/** Chip border encodes the same state the polygon stroke does. */
export const getChipBorder = (object, color) => {
  const state = getObjectState(object);
  if (state === 'unlabelled') return `1px dashed ${withAlpha(UNLABELLED_COLOR, 0.85)}`;
  if (state === 'pending') return `1px dashed ${withAlpha(color, 0.75)}`;
  return `1px solid ${withAlpha(color, 0.6)}`;
};

/** Centroid of a normalized contour, as a percentage of the image box. */
export const getCentroid = (object) => {
  if (!object?.x?.length) return null;
  const n = object.x.length;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += object.x[i];
    sumY += object.y[i];
  }
  return { x: (sumX / n) * 100, y: (sumY / n) * 100 };
};
