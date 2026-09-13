import { MousePointerClick, Square, Circle, Hexagon, Spline, HelpCircle } from 'lucide-react';

/**
 * Registry of prompt types a prompted-segmentation model can support, with the
 * label, icon and usage hint shown in the UI.
 *
 * To support a new prompt type, add an entry here (and optionally an alias
 * below). Everything that renders available prompts reads from this registry,
 * so no other code needs to change.
 */
export const PROMPT_TYPE_INFO = {
  point: {
    label: 'Points',
    icon: MousePointerClick,
    howTo: 'Left click for positive prompts, right click for negative prompts.',
  },
  box: {
    label: 'Bounding box',
    icon: Square,
    howTo: 'Click and drag a box around the object you want to annotate.',
  },
  // Defined in the toolbox prompt schema but not wired into a model yet — kept
  // here so they render correctly the moment a model advertises them.
  circle: {
    label: 'Circle',
    icon: Circle,
    howTo: 'Click the center, then drag outward to set the radius.',
  },
  polygon: {
    label: 'Polygon',
    icon: Hexagon,
    howTo: 'Click to place vertices around the object, then close the shape (double-click or press Enter).',
  },
  freehand: {
    label: 'Freehand',
    icon: Spline,
    howTo: 'Press and drag to trace a freehand outline around the object, then release to close it.',
  },
};

// Map common spellings/plurals onto canonical keys.
const PROMPT_TYPE_ALIASES = {
  points: 'point',
  boxes: 'box',
  bbox: 'box',
  bounding_box: 'box',
  circles: 'circle',
  polygons: 'polygon',
  poly: 'polygon',
  free_hand: 'freehand',
  sketch: 'freehand',
  scribble: 'freehand',
};

const normalize = (type) =>
  String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const prettify = (type) =>
  normalize(type)
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Prompt';

/**
 * Resolve a prompt type string (e.g. "point", "boxes") to its display info,
 * falling back to a generic descriptor for unknown types so newer prompts still
 * render gracefully.
 */
export const getPromptTypeInfo = (type) => {
  const key = normalize(type);
  const canonical = PROMPT_TYPE_ALIASES[key] || key;
  if (PROMPT_TYPE_INFO[canonical]) {
    return PROMPT_TYPE_INFO[canonical];
  }
  return {
    label: prettify(type),
    icon: HelpCircle,
    howTo: 'Use this prompt type to guide the model.',
  };
};
