/**
 * Which stack a press of Ctrl+Z (or Ctrl+Shift+Z) should act on.
 *
 * The workspace has two independent undo stacks and one key:
 *
 *  - PROMPT: the prompt dots placed on the AI canvas but not yet submitted. They
 *    never reached the server, so only the client can undo them.
 *  - SERVER: the annotator's recorded action history. The only stack that can
 *    bring a deleted object back with its own id, children and approvals.
 *
 * Routing on "are there prompts on the canvas right now" is wrong, and was the
 * original bug: undo the last prompt and the canvas is empty, so redo would ask
 * the server — which has nothing, because what is waiting is the prompt redo
 * stack. Route on the STACKS, never on the canvas.
 *
 * Redo additionally mirrors undo. Someone who undoes four prompts and then one
 * object action expects the next redo to restore that object action, not a
 * prompt: redo retraces the path undo took. `lastUndoSource` is that memory. It
 * is only ever a preference — a source that reports nothing available is never
 * chosen, so a stale or missing memory degrades to plain availability rather
 * than to an error.
 *
 * Kept as pure functions, separate from the hook, because this is the part with
 * the edge cases worth testing directly.
 */

export const PROMPT = 'prompt';
export const SERVER = 'server';

/**
 * @param {Object} state
 * @param {string} state.tool - The active tool; prompts only exist under 'ai_annotation'.
 * @param {number} state.promptUndoDepth - Entries on the prompt undo stack.
 * @param {number} state.promptRedoDepth - Entries on the prompt redo stack.
 * @param {boolean} state.serverCanUndo - Whether the server reports an undoable action.
 * @param {boolean} state.serverCanRedo - Whether the server reports a redoable action.
 * @param {string|null} state.lastUndoSource - Which stack the previous undo used.
 */
export function routeUndo({ tool, promptUndoDepth, serverCanUndo }) {
  // Prompts are the more local, more recent thing on screen, so they go first
  // while any remain. Once that stack is spent, undo continues into the history.
  if (tool === 'ai_annotation' && promptUndoDepth > 0) return PROMPT;
  if (serverCanUndo) return SERVER;
  return null;
}

export function routeRedo({ tool, promptRedoDepth, serverCanRedo, lastUndoSource }) {
  const promptAvailable = tool === 'ai_annotation' && promptRedoDepth > 0;

  // Retrace the last undo, but only where that stack actually has something.
  if (lastUndoSource === PROMPT && promptAvailable) return PROMPT;
  if (lastUndoSource === SERVER && serverCanRedo) return SERVER;

  // No usable memory: fall back to whichever stack can answer.
  if (promptAvailable) return PROMPT;
  if (serverCanRedo) return SERVER;
  return null;
}
