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
/**
 * Chip text.
 *
 * The canvas gets the name alone: the id is in the Objects panel, and the state
 * is already carried by the chip border and the polygon stroke, so spelling both
 * out only made every chip wider — and chip width is what buries a dense image.
 * `detailed` restores them for the one object being pointed at or worked on.
 */
export const getChipLabel = (object, { detailed = false } = {}) => {
  const state = getObjectState(object);
  if (state === 'unlabelled') return 'unlabelled';
  if (!detailed) return object.label;
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

/** Bounding box of a normalized contour, as percentages of the image box. */
export const getBoundingBox = (object) => {
  if (!object?.x?.length) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < object.x.length; i += 1) {
    if (object.x[i] < minX) minX = object.x[i];
    if (object.x[i] > maxX) maxX = object.x[i];
    if (object.y[i] < minY) minY = object.y[i];
    if (object.y[i] > maxY) maxY = object.y[i];
  }
  return { minX: minX * 100, maxX: maxX * 100, minY: minY * 100, maxY: maxY * 100 };
};
