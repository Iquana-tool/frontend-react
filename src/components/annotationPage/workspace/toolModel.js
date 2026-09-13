/**
 * Rail tool model.
 *
 * Two axes, and only two: the rail picks the *shape* you draw, and the prompt
 * action decides *what happens automatically once it is placed*. Everything the
 * store still keeps on three axes (`currentTool` × `promptMode` ×
 * `manualDrawMode`) is derived here, so the rail, the keyboard shortcuts and the
 * status bar agree and the canvas overlays keep reading the state they always
 * did.
 *
 * What a placed prompt does automatically is a separate question from what you
 * can do with it: the action bar always offers both "Run AI" and "Add this
 * object" — the latter whenever an outline is on the canvas — so there is no
 * mode in which a drawn shape can only go one way. That is why there is no
 * "AI assist" switch any more: with both buttons present it only decided which
 * of the two the bar would hide.
 *
 * The three prompt actions:
 *
 * - `nothing` — prompts accumulate and wait. Draw as many as you like, then
 *               press Run AI or Add this object.
 * - `ai`      — every prompt runs through the model the moment it is placed.
 * - `manual`  — an outline is committed as an object the moment it closes, with
 *               no model and no confirmation. Only shapes that *are* outlines
 *               qualify: polygon and freehand. A point has no area and a box is
 *               a crop rather than a traced object, so neither is offered here.
 *
 * Manual adding is therefore not a tool of its own. "Freedraw" and "freehand"
 * are the same gesture, and putting both on the rail said otherwise; what
 * differs between them is only the action this module names.
 *
 * The shape mapping, given an action:
 *
 * - `select`   → currentTool 'selection'
 * - `point`    → 'ai_annotation' + promptMode 'point'. Not offered in `manual`.
 * - `box`      → 'ai_annotation' + promptMode 'box'. Not offered in `manual`.
 * - `polygon` /
 *   `freehand` → `manual`: 'manual_drawing' + the matching draw mode, which
 *                routes to ManualDrawCanvas and commits via OBJECT_ADD_MANUAL.
 *                `nothing` / `ai`: 'ai_annotation' + that prompt mode.
 * - `pan`      → 'pan'. Persistent drag-to-pan; the space-bar shortcut still
 *                works in every other tool.
 * - `zoom`     → 'zoom'. Click zooms in, alt/⌥-click zooms out.
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
];

/**
 * What happens when a prompt is placed. Ordered as the control renders them:
 * nothing, then the model, then straight to an object.
 *
 * `tab` is the short form the segmented control shows; `name` is what the
 * tooltip, the status line and the action bar's chip say.
 */
export const PROMPT_ACTIONS = [
  {
    id: 'nothing',
    name: 'Nothing',
    tab: 'Nothing',
    icon: 'Ban',
    short: 'prompts wait for Run AI or Add this object',
    hint: 'Prompts stay on the canvas. Run them through the AI or add them yourself, whenever you are ready.',
  },
  {
    id: 'ai',
    name: 'Run AI immediately',
    tab: 'Run AI',
    icon: 'Sparkles',
    short: 'every prompt runs the model at once',
    hint: 'Every prompt runs through the model as soon as it is placed.',
  },
  {
    id: 'manual',
    name: 'Add immediately',
    tab: 'Add',
    icon: 'Pencil',
    short: 'outlines are saved as you close them',
    hint: 'A polygon or freehand outline is added as an object as soon as you close it. Points and boxes are not offered.',
  },
];

export const PROMPT_ACTION_IDS = PROMPT_ACTIONS.map((action) => action.id);

export const getPromptAction = (id) =>
  PROMPT_ACTIONS.find((action) => action.id === id) || PROMPT_ACTIONS[0];

/** The next action in the cycle, for the `A` shortcut. */
export const nextPromptAction = (id) =>
  PROMPT_ACTION_IDS[(Math.max(0, PROMPT_ACTION_IDS.indexOf(id)) + 1) % PROMPT_ACTION_IDS.length];

/**
 * Scale measurement is not a rail tool.
 *
 * Setting the physical scale is a calibration, so it belongs to Calibrate mode
 * and is started from that calibration's drawer button — not from the annotation
 * rail, where it invited an annotator to recalibrate the image mid-annotation.
 * It still needs a name, because the store's `set_scale` tool is live while a
 * measurement is being drawn and the status bar reports whatever tool is active.
 */
export const MEASURE_SCALE_TOOL = { id: 'scale', name: 'Measure scale', icon: 'Ruler' };

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
 * Prompt types the action bar can commit as an object exactly as drawn.
 *
 * Freehand outlines are stored as polygon prompts, so this covers both. A box is
 * deliberately absent: it is a crop, and "Add this object" would turn it into a
 * rectangle nobody traced.
 */
export const ADDABLE_PROMPT_TYPES = new Set(['polygon']);

/**
 * Why a shape is not offered under the current prompt action, or null when it is.
 *
 * Only "Add immediately" restricts anything, and only to what can actually be
 * added: an outline. Nothing here consults the model — `useSupportedPromptTypes`
 * answers "the armed model does not take lasso prompts", and that belongs to the
 * Run AI button, not to the rail. Keeping the two apart is what stops a
 * point/box-only model from greying out every route to a hand-drawn contour,
 * which is how manual adding came to look as though it had been removed.
 */
export const shapeUnavailableForAction = (railTool, promptAction) => {
  if (promptAction !== 'manual') return null;
  if (railTool === 'point') {
    return 'A point cannot be added as an object — it is only a model prompt';
  }
  if (railTool === 'box') {
    return 'A box cannot be added as an object — trace the outline instead';
  }
  return null;
};

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
      return MANUAL_DRAW_SHAPES.has(manualDrawMode) ? manualDrawMode : 'freehand';
    case 'ai_annotation':
      return SHAPE_TOOLS.has(promptMode) ? promptMode : 'point';
    default:
      return 'select';
  }
};

/**
 * Translates a rail selection into the store writes it implies.
 *
 * @returns {{currentTool: string, promptMode?: string, manualDrawMode?: string}}
 */
export const storeStateForRailTool = (railTool, promptAction) => {
  if (railTool === 'select') return { currentTool: 'selection' };
  if (railTool === 'pan') return { currentTool: 'pan' };
  if (railTool === 'zoom') return { currentTool: 'zoom' };

  if (promptAction === 'manual' && MANUAL_DRAW_SHAPES.has(railTool)) {
    return { currentTool: 'manual_drawing', manualDrawMode: railTool };
  }

  return { currentTool: 'ai_annotation', promptMode: railTool };
};

/**
 * Changing the action keeps the shape but may move it between the prompt canvas
 * and the manual drawing canvas. A shape the new action does not offer falls
 * back to the nearest one it does, so switching to "Add immediately" with the
 * point tool armed lands on freehand rather than on a dead rail.
 */
export const storeStateForActionChange = (railTool, nextAction) => {
  if (!SHAPE_TOOLS.has(railTool)) return null;
  const shape = shapeUnavailableForAction(railTool, nextAction) ? 'freehand' : railTool;
  return storeStateForRailTool(shape, nextAction);
};

/** True when the rail tool draws something the canvas must accept input for. */
export const isDrawingTool = (railTool) => SHAPE_TOOLS.has(railTool);

export const RAIL_TOOL_BY_KEY = RAIL_TOOLS.reduce((acc, tool) => {
  acc[tool.key] = tool.id;
  return acc;
}, {});

export const getRailTool = (id) => (
  RAIL_TOOLS.find((tool) => tool.id === id)
  || (id === MEASURE_SCALE_TOOL.id ? MEASURE_SCALE_TOOL : RAIL_TOOLS[0])
);
