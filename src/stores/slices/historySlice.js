/**
 * History slice — the state of the server-side undo/redo stack for the current image.
 *
 * The stack itself lives in the backend (undoing a delete has to bring back the
 * contour the user actually deleted, with its id, children and approvals, which
 * only the server can do). This slice holds nothing but the client's picture of
 * it: whether each button should be enabled, and what the next step is called.
 *
 * Distinct from `aiAnnotation.undoStack`, which is the prompt-dot stack on the
 * AI canvas — that one is genuinely client-side, because unsubmitted prompts have
 * never reached the server. See useAnnotationHistory for how Ctrl+Z chooses.
 */
export const createHistorySlice = (set) => ({
  /** Replace the whole picture from a server response. */
  setHistoryStatus: (status) => set((state) => {
    state.history.canUndo = !!status?.can_undo;
    state.history.canRedo = !!status?.can_redo;
    state.history.undoLabel = status?.undo_label ?? null;
    state.history.redoLabel = status?.redo_label ?? null;
  }),

  setHistoryBusy: (busy) => set((state) => {
    state.history.busy = !!busy;
  }),

  /**
   * Forget the current image's history.
   *
   * Called on image switch so the buttons do not briefly offer an undo belonging
   * to the image the user just left. The server-side history is untouched — it is
   * per image, and switching back re-reads it.
   */
  clearHistoryStatus: () => set((state) => {
    state.history.canUndo = false;
    state.history.canRedo = false;
    state.history.undoLabel = null;
    state.history.redoLabel = null;
    state.history.busy = false;
  }),
});
