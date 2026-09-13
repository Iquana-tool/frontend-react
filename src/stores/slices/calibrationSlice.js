/**
 * Calibration slice — the Calibrate mode's state for the current image.
 *
 * Presentation and in-flight state only. The stored calibrations themselves live
 * on the server; `entries` is a cache of the last response and is refreshed by
 * `useCalibrationState`, which owns every call to api/calibration.js.
 *
 * Three things are worth knowing about the shape:
 *
 * - `activeKind` is what the rail selects in Calibrate mode. The rail picks the
 *   calibration, the drawer configures it, the canvas measures it.
 * - `activePick` is what makes a control in the drawer and an overlay on the
 *   canvas one interaction. Whoever finishes (or cancels) clears it.
 * - `wedge` holds a reference card's placement and readings before they are
 *   saved, so a bad patch can be corrected without redoing the whole card.
 */

const emptyWedge = () => ({ ends: [], points: [], samples: [], sampling: false });

/**
 * Patch centres evenly spaced from the first to the last, inclusive.
 *
 * The patches on a step wedge are equally spaced along a rigid strip, so the two
 * end centres determine all of them. This is an approximation under perspective —
 * a card tilted steeply away from the sensor will drift — which is why the derived
 * discs are drawn on the canvas and any single one can be re-placed.
 */
const interpolatePoints = (start, end, count) => {
  if (!start || !end || count < 2) return [];
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
  });
};

export const createCalibrationSlice = (set) => ({
  /** Registry metadata — kinds, their strategies, cards and affected metrics. */
  setCalibrationKinds: (kinds) => set((state) => {
    state.calibration.kinds = Array.isArray(kinds) ? kinds : [];
    state.calibration.kindsLoaded = true;
  }),

  /** Replace the per-kind state after a fetch or a successful mutation. */
  setCalibrationEntries: (entries) => set((state) => {
    state.calibration.entries = Array.isArray(entries) ? entries : [];
    state.calibration.error = null;
  }),

  setCalibrationLoading: (loading) => set((state) => {
    state.calibration.loading = !!loading;
  }),

  setCalibrationError: (error) => set((state) => {
    state.calibration.error = error || null;
    state.calibration.loading = false;
  }),

  /**
   * Select which calibration the drawer configures. Re-picking closes it, so the
   * rail behaves like the annotation rail it sits in place of.
   */
  setActiveCalibrationKind: (kind) => set((state) => {
    const next = state.calibration.activeKind === kind ? null : kind;
    state.calibration.activeKind = next;
    // Leaving a kind must not leave its overlay above the canvas eating clicks.
    if (state.calibration.activePick?.kind !== next) state.calibration.activePick = null;
  }),

  /**
   * Arm the canvas to capture clicks. Re-arming the same thing disarms it — the
   * overlay is above the canvas while a pick is live, so there has to be a way out
   * that is not the Escape key.
   */
  startPatchPick: (pick) => set((state) => {
    const current = state.calibration.activePick;
    const same = current
      && current.kind === pick.kind
      && current.mode === pick.mode
      && current.role === pick.role
      && current.index === pick.index;
    state.calibration.activePick = same ? null : pick;
    if (!same && pick.mode === 'wedge_ends') {
      // Re-placing starts from nothing: half-old, half-new ends would silently
      // interpolate a card that was never on the image.
      state.calibration.wedge.ends = [];
    }
  }),

  cancelPatchPick: () => set((state) => {
    state.calibration.activePick = null;
  }),

  setSampleRadius: (radius) => set((state) => {
    const parsed = Number(radius);
    if (Number.isFinite(parsed) && parsed >= 1) {
      state.calibration.sampleRadius = Math.min(Math.round(parsed), 256);
    }
  }),

  /** Record a named reference (two-patch) and disarm the canvas. */
  setPendingSample: (kind, role, sample) => set((state) => {
    if (!state.calibration.pending[kind]) state.calibration.pending[kind] = {};
    state.calibration.pending[kind][role] = sample;
    state.calibration.activePick = null;
  }),

  /** Drop a kind's unsaved references — after saving them, or on an explicit reset. */
  clearPendingSamples: (kind) => set((state) => {
    if (kind) delete state.calibration.pending[kind];
    else state.calibration.pending = {};
  }),

  // -- Reference card placement ------------------------------------------

  /**
   * Record one end of the card. On the second, derive every patch centre between
   * them and disarm, so the caller can go straight to reading them.
   */
  addWedgeEnd: (point, patchCount) => set((state) => {
    const wedge = state.calibration.wedge;
    wedge.ends = [...wedge.ends, point].slice(-2);
    if (wedge.ends.length === 2) {
      wedge.points = interpolatePoints(wedge.ends[0], wedge.ends[1], patchCount);
      wedge.samples = [];
      state.calibration.activePick = null;
    }
  }),

  /**
   * Move one patch's disc, leaving the rest of the placement alone.
   *
   * Drops that patch's reading, which is what makes the sampler pick it up: a
   * moved disc's old value describes a place the disc no longer is.
   */
  setWedgePoint: (index, point) => set((state) => {
    const wedge = state.calibration.wedge;
    if (index < 0 || index >= wedge.points.length) return;
    wedge.points[index] = point;
    wedge.samples[index] = null;
    state.calibration.activePick = null;
  }),

  setWedgeSampling: (sampling) => set((state) => {
    state.calibration.wedge.sampling = !!sampling;
  }),

  /** Store the readings for the whole card. */
  setWedgeSamples: (samples) => set((state) => {
    state.calibration.wedge.samples = Array.isArray(samples) ? samples : [];
    state.calibration.wedge.sampling = false;
  }),

  /** Replace one patch's reading after it was re-placed and re-read. */
  setWedgeSample: (index, sample) => set((state) => {
    const wedge = state.calibration.wedge;
    if (index < 0 || index >= wedge.points.length) return;
    wedge.samples[index] = sample;
    wedge.sampling = false;
  }),

  clearWedge: () => set((state) => {
    state.calibration.wedge = emptyWedge();
    if (state.calibration.activePick?.mode?.startsWith('wedge')) {
      state.calibration.activePick = null;
    }
  }),

  /**
   * Called when the image changes. Entries, references, placement and any armed
   * pick all belong to the image that was open; the registry metadata does not,
   * so it survives and is not re-fetched.
   */
  resetCalibrationForImage: () => set((state) => {
    state.calibration.entries = [];
    state.calibration.pending = {};
    state.calibration.wedge = emptyWedge();
    state.calibration.activePick = null;
    state.calibration.error = null;
    state.calibration.loading = false;
  }),
});
