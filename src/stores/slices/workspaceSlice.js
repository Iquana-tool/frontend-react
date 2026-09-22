import {
  DEFAULT_OUTLINE,
  OUTLINE_PRESETS,
  OUTLINE_PRESET_KEYS,
  matchOutlinePreset,
  nextOutlinePreset,
  sanitizeOutline,
} from '../../utils/outlineSettings';

/**
 * Workspace slice — layout, mode and view state for the annotation workspace.
 *
 * Everything here is presentation state. Nothing in this slice is persisted to
 * the backend except through the actions that already own that concern
 * (label assignment, visibility filters, object mutation), which live in
 * `objectsSlice`. The exceptions are `theme`, `mode` and the outline settings,
 * mirrored to localStorage so the choices survive a reload.
 */

const THEME_STORAGE_KEY = 'iquana.workspace.theme';

/** @see readStoredMode */
export const MODE_STORAGE_KEY = 'iquana.workspace.mode';

/** The workspace tabs, and the only values `mode` is ever allowed to take. */
const WORKSPACE_MODES = ['calibrate', 'annotate', 'review'];

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

/**
 * Reads the persisted workspace tab, falling back to Annotate (the default).
 *
 * The mode is persisted for the same reason as the theme, but it carries more weight: it is
 * where the user stands in the workflow rather than a cosmetic preference. Losing it on
 * reload also changes what the canvas shows, since Review hides approved objects.
 *
 * `?mode=` is not the mechanism here. That parameter is a one-shot instruction from a
 * caller (the dataset page's Calibrate card), stripped from the URL once applied so a later
 * switch is not undone, and so cannot survive a reload by design — see the effect that
 * consumes it in `WorkspaceShell`.
 */
export const readStoredMode = () => {
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    return WORKSPACE_MODES.includes(stored) ? stored : 'annotate';
  } catch {
    // Private browsing / disabled storage — the default is good enough.
    return 'annotate';
  }
};

const persistMode = (mode) => {
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // Non-fatal: the mode simply won't survive a reload.
  }
};

/**
 * @see readStoredOutline
 *
 * Suffixed, and bumped when the defaults move: a blob written under the old
 * defaults still sanitizes cleanly, so it would be restored verbatim and quietly
 * pin the canvas to a default nobody chose — indistinguishable, from the user's
 * side, from the new default not having been applied at all.
 */
export const OUTLINE_STORAGE_KEY = 'iquana.workspace.outline.v2';

/**
 * Reads the persisted outline settings.
 *
 * Persisted for a different reason than the theme: how heavy an overlay reads
 * depends on the monitor, the eyes in front of it and the kind of imagery in
 * the dataset, so someone who has dialled the fill down once should not have to
 * do it again on every reload. `peek` is deliberately dropped — it is a held
 * key, and restoring it would open the workspace with every object hidden.
 */
export const readStoredOutline = () => {
  try {
    return sanitizeOutline(JSON.parse(window.localStorage.getItem(OUTLINE_STORAGE_KEY)));
  } catch {
    // Private browsing, disabled storage or a corrupt blob — the default is fine.
    return { ...DEFAULT_OUTLINE };
  }
};

const persistOutline = (outline) => {
  try {
    const { peek, ...persistable } = outline;
    window.localStorage.setItem(OUTLINE_STORAGE_KEY, JSON.stringify(persistable));
  } catch {
    // Non-fatal: the settings simply won't survive a reload.
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
    persistMode(mode);

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

  setPromptAction: (action) => set((state) => {
    state.workspace.promptAction = action;
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

  /**
   * Show the image as calibrated, or as it came off the camera.
   *
   * Purely what the canvas draws. Nothing measured moves with it — the metrics
   * are computed from corrected pixels either way — so this switch answers
   * "what did the calibration do?", never "what is measured?".
   */
  toggleCalibratedColors: () => set((state) => {
    state.workspace.calibratedColors = !state.workspace.calibratedColors;
  }),

  // Cycled rather than toggled: on a dense image the useful middle setting is
  // "only what I am pointing at", and a two-state switch would skip it.
  cycleChipMode: () => set((state) => {
    const order = ['all', 'minimal', 'off'];
    const next = order[(order.indexOf(state.workspace.chipMode) + 1) % order.length];
    state.workspace.chipMode = next;
  }),

  /**
   * Apply one of the named outline presets.
   *
   * A preset is only ever a shortcut for a pair of slider values: the values
   * are the real state, which is what lets the panel's sliders and this button
   * describe the same thing without one of them lying about the other.
   */
  setOutlinePreset: (preset) => set((state) => {
    const values = OUTLINE_PRESETS[preset];
    if (!values) return;
    Object.assign(state.workspace.outline, values, { preset });
    persistOutline(state.workspace.outline);
  }),

  // Cycled rather than toggled, for the same reason as the chips: the useful
  // middle setting — outline only, fill on hover — is one a two-state switch
  // would skip.
  cycleOutlinePreset: () => set((state) => {
    const preset = nextOutlinePreset(state.workspace.outline.preset);
    Object.assign(state.workspace.outline, OUTLINE_PRESETS[preset], { preset });
    persistOutline(state.workspace.outline);
  }),

  /**
   * Move one of the settings a preset covers — either slider, or the
   * fill-on-hover switch.
   *
   * The preset is recomputed rather than cleared, so dragging back onto a
   * preset's values re-lights its button instead of leaving the control stuck
   * on "custom" with nothing to show for it.
   */
  setOutlineValue: (key, value) => set((state) => {
    if (!OUTLINE_PRESET_KEYS.includes(key)) return;
    state.workspace.outline[key] = value;
    state.workspace.outline.preset = matchOutlinePreset(state.workspace.outline);
    persistOutline(state.workspace.outline);
  }),

  // Orthogonal to the presets: it changes what a width *means* (screen pixels
  // rather than image pixels), not how heavy the overlay is, so it deliberately
  // does not knock the preset over to "custom".
  setOutlineConstantWidth: (on) => set((state) => {
    state.workspace.outline.constantWidth = !!on;
    persistOutline(state.workspace.outline);
  }),

  /**
   * Hide every object overlay while the peek key is held.
   *
   * Not persisted and not a preset: the question it answers — "what is actually
   * under all this?" — is asked for a second at a time, and a sticky mode for it
   * would leave the canvas unclickable with no visible reason why.
   */
  setOutlinePeek: (on) => set((state) => {
    state.workspace.outline.peek = !!on;
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
