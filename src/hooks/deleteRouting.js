/**
 * What a press of Delete / Backspace should remove.
 *
 * The key has two possible claimants, the same shape of problem Ctrl+Z has:
 *
 *  - PROMPT: the last prompt placed on the AI canvas but not yet submitted.
 *  - SELECTION: the selected objects, which Delete rejects.
 *
 * Prompts go first while any remain, for the reason set out in undoRouting.js: they are the
 * most recent and most local thing on screen. Here it matters more than it does for undo,
 * because the two outcomes are not equally recoverable — replacing an erased prompt is a
 * click, while an object rejected by mistake has to be recovered through the annotation
 * history.
 *
 * Ranking the selection first is what made Backspace delete a finished mask: a segmentation
 * run auto-selects the object it produced (`OBJECT_ADDED` clears the selection and selects
 * the new contour), so the next prompt placed leaves a prompt on the canvas *and* that
 * object still selected. The rule below was previously applied only inside refinement mode,
 * which is the same rule with a narrower reach.
 *
 * Kept as a pure function, separate from the keyboard hook, so the precedence is testable
 * on its own — as undoRouting is.
 */

export const PROMPT = 'prompt';
export const SELECTION = 'selection';

/**
 * @param {Object} state
 * @param {string} state.tool - The active tool; prompts only exist under 'ai_annotation'.
 * @param {number} state.promptCount - Prompts currently on the canvas.
 * @param {number} state.selectionCount - Selected objects.
 */
export function routeDelete({ tool, promptCount, selectionCount }) {
  if (tool === 'ai_annotation' && promptCount > 0) return PROMPT;
  if (selectionCount > 0) return SELECTION;
  return null;
}
