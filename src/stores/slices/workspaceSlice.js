/**
 * Workspace slice — layout, mode and view state for the annotation workspace.
 *
 * Everything here is presentation state. Nothing in this slice is persisted to
 * the backend except through the actions that already own that concern
 * (label assignment, visibility filters, object mutation), which live in
 * `objectsSlice`. The one exception is `theme`, mirrored to localStorage so the
 * choice survives a reload.
 */

const THEME_STORAGE_KEY = 'iquana.workspace.theme';

/** Reads the persisted theme, falling back to dark (the design default). */
export const readStoredTheme = () => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  } catch {
    // Private browsing / disabled storage — the default is good enough.
    return 'dark';
  }
};

const persistTheme = (theme) => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Non-fatal: the theme simply won't survive a reload.
  }
};

const toggleKey = (map, key) => {
  if (map[key]) delete map[key];
  else map[key] = true;
};

export const createWorkspaceSlice = (set) => ({
  setTheme: (theme) => set((state) => {
    state.workspace.theme = theme;
    persistTheme(theme);
  }),

  toggleTheme: () => set((state) => {
    const next = state.workspace.theme === 'dark' ? 'light' : 'dark';
    state.workspace.theme = next;
    persistTheme(next);
  }),

  /**
   * Switch the workspace between Calibrate / Annotate / Review.
   *
   * The three modes share one canvas, one image and one viewport — what changes
   * is the chrome around it: which tools the rail offers and which panel is in
   * front. That is why this is a mode rather than a route: navigating away and
   * back would lose the zoom, the pan and the selection, and calibration is
   * something you do *while looking at* the image.
   *
   * Entering and leaving Calibrate has to tidy up after itself. An armed
   * patch-pick or a live scale calibration keeps an overlay above the canvas
   * swallowing clicks, so both are cancelled on the way out; and the annotation
   * tools are meaningless here, so the tool drops to pan on the way in.
   */
  setWorkspaceMode: (mode) => set((state) => {
    const previous = state.workspace.mode;
    if (previous === mode) return;
    state.workspace.mode = mode;

    // Leaving review mode should not strand the "show approved" escape hatch on.
    if (mode !== 'review') state.workspace.showApproved = false;

    if (mode === 'calibrate') {
      // The calibration controls live in the left drawer, so opening the mode
      // with it collapsed would show a rail with nowhere to configure anything.
      state.workspace.leftDrawerOpen = true;
      state.ui.currentTool = 'pan';
      state.workspace.picker = null;
    } else if (previous === 'calibrate') {
      state.calibration.activePick = null;
      state.calibration.activeKind = null;
      state.images.scale.isCalibrating = false;
      state.images.scale.calibrationPoints = null;
      state.ui.currentTool = 'ai_annotation';
    }
  }),

  setAiAssist: (on) => set((state) => {
    state.workspace.aiAssist = !!on;
  }),

  toggleAiAssist: () => set((state) => {
    state.workspace.aiAssist = !state.workspace.aiAssist;
  }),

  toggleLeftDrawer: () => set((state) => {
    state.workspace.leftDrawerOpen = !state.workspace.leftDrawerOpen;
  }),

  setLeftDrawerOpen: (open) => set((state) => {
    state.workspace.leftDrawerOpen = !!open;
  }),

  toggleRightPanel: () => set((state) => {
    state.workspace.rightPanelOpen = !state.workspace.rightPanelOpen;
  }),

  setRightPanelOpen: (open) => set((state) => {
    state.workspace.rightPanelOpen = !!open;
  }),

  // Clicking a tab icon on the collapsed strip both expands the panel and
  // switches to that tab, so the two always move together.
  setRightTab: (tab) => set((state) => {
    state.workspace.rightTab = tab;
    state.workspace.rightPanelOpen = true;
  }),

  toggleFilmstrip: () => set((state) => {
    state.workspace.filmstripOpen = !state.workspace.filmstripOpen;
  }),

  setFilmstripOpen: (open) => set((state) => {
    state.workspace.filmstripOpen = !!open;
  }),

  toggleShowApproved: () => set((state) => {
    state.workspace.showApproved = !state.workspace.showApproved;
  }),

  setChipMode: (mode) => set((state) => {
    state.workspace.chipMode = mode;
  }),

  // Cycled rather than toggled: on a dense image the useful middle setting is
  // "only what I am pointing at", and a two-state switch would skip it.
  cycleChipMode: () => set((state) => {
    const order = ['all', 'minimal', 'off'];
    const next = order[(order.indexOf(state.workspace.chipMode) + 1) % order.length];
    state.workspace.chipMode = next;
  }),

  setActiveLabelId: (labelId) => set((state) => {
    // Clicking the armed label again disarms it.
    state.workspace.activeLabelId =
      state.workspace.activeLabelId === labelId ? null : labelId;
  }),

  setHoveredObjectId: (id) => set((state) => {
    state.workspace.hoveredObjectId = id;
  }),

  setPicker: (picker) => set((state) => {
    state.workspace.picker = picker;
  }),

  setShortcutSheetOpen: (open) => set((state) => {
    state.workspace.shortcutSheetOpen = !!open;
  }),

  toggleObjectHidden: (id) => set((state) => {
    toggleKey(state.workspace.hiddenObjectIds, id);
  }),

  toggleObjectCollapsed: (id) => set((state) => {
    toggleKey(state.workspace.collapsedObjectIds, id);
  }),

  expandObject: (id) => set((state) => {
    delete state.workspace.collapsedObjectIds[id];
  }),

  setLabelColorOverride: (labelId, color) => set((state) => {
    state.workspace.labelColorOverrides[labelId] = color;
  }),

  /**
   * Reorders a root-level object relative to another. Purely a view concern —
   * the backend has no ordering field, so this is not persisted.
   */
  reorderRootObject: (dragId, targetId, position) => set((state) => {
    const order = state.workspace.rootOrder;
    if (!Array.isArray(order)) return;
    const next = order.filter((id) => id !== dragId);
    let index = next.indexOf(targetId);
    if (index < 0) index = next.length - 1;
    next.splice(position === 'before' ? index : index + 1, 0, dragId);
    state.workspace.rootOrder = next;
  }),

  /** Seeds the root ordering from the current object list on first drag. */
  initRootOrder: (ids) => set((state) => {
    if (!Array.isArray(state.workspace.rootOrder)) {
      state.workspace.rootOrder = ids;
    }
  }),

  setCursorPosition: (cursor) => set((state) => {
    state.workspace.cursor = cursor;
  }),

  /** Called when the image changes — per-image view state must not leak across. */
  resetWorkspaceForImage: () => set((state) => {
    state.workspace.hiddenObjectIds = {};
    state.workspace.collapsedObjectIds = {};
    state.workspace.rootOrder = null;
    state.workspace.hoveredObjectId = null;
    state.workspace.picker = null;
    state.workspace.showApproved = false;
    state.workspace.cursor = null;
  }),
});
