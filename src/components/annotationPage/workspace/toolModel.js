/**
 * Rail tool model.
 *
 * The design collapses the old three-axis tool state
 * (`currentTool` × `promptMode` × `manualDrawMode`) into a single rail
 * selection plus one AI-assist switch. This module owns that mapping so the
 * rail, the keyboard shortcuts and the status bar all agree on it, and so the
 * underlying store shape — which every canvas overlay still reads — stays
 * exactly as it was.
 *
 * The mapping, and why:
 *
 * - `select`   → currentTool 'selection'
 * - `point`    → 'ai_annotation' + promptMode 'point'. A point is only
 *                meaningful as a model prompt, so picking it arms AI assist.
 * - `box`      → 'ai_annotation' + promptMode 'box'. With assist off the shape
 *                is committed through "Add as object", which already saves a
 *                box as a contour without invoking a model.
 * - `polygon` /
 *   `freehand` → assist on: 'ai_annotation' + that prompt mode.
 *                assist off: 'manual_drawing' + the matching draw mode, which
 *                routes to ManualDrawCanvas and commits via OBJECT_ADD_MANUAL.
 * - `pan`      → 'pan'. Persistent drag-to-pan; the space-bar shortcut still
 *                works in every other tool.
 * - `zoom`     → 'zoom'. Click zooms in, alt/⌥-click zooms out.
 * - `scale`    → 'set_scale' and opens calibration, as before.
 * - `brush`    → no implementation exists in the client or the session
 *                protocol, so it renders disabled rather than silently missing.
 */

export const RAIL_TOOLS = [
  { id: 'select', name: 'Select & edit', key: 'V', icon: 'MousePointer2', gapAfter: true },
  { id: 'point', name: 'Point', key: 'P', icon: 'Crosshair' },
  { id: 'box', name: 'Bounding box', key: 'B', icon: 'Square' },
  { id: 'polygon', name: 'Polygon', key: 'G', icon: 'Hexagon' },
  { id: 'freehand', name: 'Freehand', key: 'F', icon: 'Spline' },
  {
    id: 'brush',
    name: 'Brush / mask',
    key: 'M',
    icon: 'Paintbrush',
    gapAfter: true,
    unavailable: 'Brush / mask painting is not available in this build',
  },
  { id: 'pan', name: 'Pan', key: 'H', icon: 'Hand' },
  { id: 'zoom', name: 'Zoom', key: 'Z', icon: 'ZoomIn' },
  { id: 'scale', name: 'Set scale', key: 'R', icon: 'Ruler' },
];

/**
 * The rail in Calibrate mode.
 *
 * Calibration is measurement, not annotation, so the shape tools are not offered
 * there — a point or a polygon has nothing to contribute to a scale or a colour
 * reference. What is left is the navigation needed to see a reference clearly.
 *
 * Below these, the rail shows one button per calibration kind: pick the
 * calibration on the rail, configure it in the drawer, measure it on the canvas.
 * That is the same shape as the annotation rail it stands in for, and it scales
 * to a sixth calibration kind as a sixth icon rather than a sixth card to scroll
 * past.
 */
export const CALIBRATE_RAIL_TOOL_IDS = ['pan', 'zoom'];

export const railToolsForMode = (mode) => (
  mode === 'calibrate'
    ? RAIL_TOOLS.filter((tool) => CALIBRATE_RAIL_TOOL_IDS.includes(tool.id))
    : RAIL_TOOLS
);

/** Icon per calibration kind, falling back for a kind this build predates. */
export const CALIBRATION_KIND_ICONS = {
  scale: 'Ruler',
  response: 'Palette',
};

/** Prompt-shaped rail tools, i.e. the ones that drive `promptMode`. */
const SHAPE_TOOLS = new Set(['point', 'box', 'polygon', 'freehand']);

/** Shapes the manual drawing canvas can produce without a model. */
const MANUAL_DRAW_SHAPES = new Set(['polygon', 'freehand']);

/**
 * Derives the rail selection from the underlying store state, so the rail
 * highlights correctly even when a tool is changed from elsewhere (the context
 * menu's "Reshape by line" switches to 'selection', for example).
 */
export const railToolFromStore = ({ currentTool, promptMode, manualDrawMode }) => {
  switch (currentTool) {
    case 'selection':
      return 'select';
    case 'set_scale':
      return 'scale';
    case 'pan':
      return 'pan';
    case 'zoom':
      return 'zoom';
    case 'manual_drawing':
      return MANUAL_DRAW_SHAPES.has(manualDrawMode) ? manualDrawMode : 'polygon';
    case 'ai_annotation':
      return SHAPE_TOOLS.has(promptMode) ? promptMode : 'point';
    default:
      return 'select';
  }
};

/**
 * Translates a rail selection into the store writes it implies.
 *
 * @returns {{currentTool: string, promptMode?: string, manualDrawMode?: string, aiAssist?: boolean}}
 */
export const storeStateForRailTool = (railTool, aiAssist) => {
  if (railTool === 'select') return { currentTool: 'selection' };
  if (railTool === 'scale') return { currentTool: 'set_scale' };
  if (railTool === 'pan') return { currentTool: 'pan' };
  if (railTool === 'zoom') return { currentTool: 'zoom' };

  // A point has no meaning as a manual shape — arming it turns assist back on.
  if (railTool === 'point') {
    return { currentTool: 'ai_annotation', promptMode: 'point', aiAssist: true };
  }

  if (!aiAssist && MANUAL_DRAW_SHAPES.has(railTool)) {
    return { currentTool: 'manual_drawing', manualDrawMode: railTool };
  }

  return { currentTool: 'ai_annotation', promptMode: railTool };
};

/**
 * Toggling AI assist keeps the current shape but may move it between the
 * prompt canvas and the manual drawing canvas.
 */
export const storeStateForAssistChange = (railTool, nextAssist) =>
  SHAPE_TOOLS.has(railTool) ? storeStateForRailTool(railTool, nextAssist) : null;

/** True when the rail tool draws something the canvas must accept input for. */
export const isDrawingTool = (railTool) => SHAPE_TOOLS.has(railTool);

export const RAIL_TOOL_BY_KEY = RAIL_TOOLS.reduce((acc, tool) => {
  acc[tool.key] = tool.id;
  return acc;
}, {});

export const getRailTool = (id) => RAIL_TOOLS.find((tool) => tool.id === id) || RAIL_TOOLS[0];
