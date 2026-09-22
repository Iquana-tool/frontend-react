/**
 * Refinement tools — the three ways to fix an outline, as one mode.
 *
 * They used to be three separate modes reached three different ways: "Refine
 * Object" (AI prompts), "Edit Contour" (drag the control points) and "Reshape by
 * Line" (redraw a stretch of the border). They all answer the same question —
 * *this outline is wrong, fix it* — so they are now one Refinement mode with a
 * tool switch, in the shape of the workspace's Calibrate / Annotate / Review
 * switch: one object stays selected, one viewport stays framed, and only the
 * gesture changes.
 *
 * The choice is persisted (see `readStoredRefinementTool` in the workspace
 * slice) because it is a working habit rather than a per-object decision: an
 * annotator who fixes outlines by dragging vertices does that on every object,
 * and having to re-pick it each time is the whole complaint this replaces.
 *
 * Splitting an object is deliberately *not* here. It shares the line-drawing
 * interaction with `draw`, but it does not refine this outline — it ends with
 * two objects — so it stays its own action on the object menu.
 */

export const REFINEMENT_TOOLS = [
  {
    id: 'ai',
    label: 'AI',
    name: 'Refine with AI',
    icon: 'Sparkles',
    hint: 'Add prompts on the object, then run the model to redraw its outline',
  },
  {
    id: 'points',
    label: 'Points',
    name: 'Drag the control points',
    icon: 'Pencil',
    hint: 'Drag a point to reshape · click the outline to add one · double-click one to remove it',
  },
  {
    id: 'draw',
    label: 'Draw',
    name: 'Redraw part of the outline',
    icon: 'PenLine',
    hint: 'Draw a line across the boundary — just outside adds a region, just inside cuts one off',
  },
];

export const REFINEMENT_TOOL_IDS = REFINEMENT_TOOLS.map((tool) => tool.id);

/**
 * Where refinement starts before anyone has chosen.
 *
 * The AI tool, because it is the one that needs the mode: the other two work on
 * geometry the client already has, while this one is what "refinement" named
 * before the other two joined it.
 */
export const DEFAULT_REFINEMENT_TOOL = 'ai';

export const isRefinementTool = (id) => REFINEMENT_TOOL_IDS.includes(id);

export const getRefinementTool = (id) =>
  REFINEMENT_TOOLS.find((tool) => tool.id === id) || REFINEMENT_TOOLS[0];

/** The next tool in the cycle, for the `E` shortcut. */
export const nextRefinementTool = (id) =>
  REFINEMENT_TOOL_IDS[
    (Math.max(0, REFINEMENT_TOOL_IDS.indexOf(id)) + 1) % REFINEMENT_TOOL_IDS.length
  ];

/**
 * Tools that cannot run without a contour id, i.e. an object the backend has
 * saved. Both geometry tools send `modifyObject(contourId, …)`; the AI tool
 * addresses the object through the refinement selection instead, which accepts
 * the store id as a fallback.
 */
export const refinementToolNeedsContourId = (id) => id === 'points' || id === 'draw';
