import { estimateSeconds } from '../../utils/inferenceEta';

/**
 * Inference run slice - the one model run in flight, for the canvas animation
 * and the action bar's percentage.
 *
 * A run moves through three phases:
 *
 *  - `running`  — the request is out.
 *  - `settling` — the server has acknowledged it, but its outlines may still be
 *    on their way. A suggestion run acknowledges *before* it streams its objects
 *    one by one, and the ack carries how many will follow (`expected`). The run
 *    tracker (useInferenceRunTracker) ends this phase once that many arrived, or
 *    after a quiet spell when the ack gave no count.
 *  - `ending`   — the result is in; the animation plays its ending and the new
 *    outlines pop in on `reveal`'s schedule. Then the run is cleared.
 *
 * Outlines that arrive while a run is open are hidden until its ending reveals
 * them, so nothing appears before the animation can introduce it. They are told
 * apart from the image's existing outlines by `knownContourIds`.
 */

let nextRunId = 1;

const toNormalized = (x, y, w, h) => ({ x: w ? x / w : 0.5, y: h ? y / h : 0.5 });

/** The prompts as pulse sources: positives (and a box centre) pulse, negatives stay quiet. */
const promptSources = (prompts, w, h) => {
  const positives = [];
  const negatives = [];
  for (const prompt of prompts || []) {
    if (prompt.type === 'point') {
      const p = toNormalized(prompt.coords.x, prompt.coords.y, w, h);
      (prompt.label === 'negative' ? negatives : positives).push(p);
    } else if (prompt.type === 'box') {
      const { x1, y1, x2, y2 } = prompt.coords;
      positives.push(toNormalized((x1 + x2) / 2, (y1 + y2) / 2, w, h));
    } else if (prompt.type === 'polygon') {
      const pts = prompt.coords?.points || [];
      if (pts.length) {
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        positives.push(toNormalized(cx, cy, w, h));
      }
    }
  }
  return { positives, negatives };
};

const modelInfo = (state, kind, modelKey) => {
  const list =
    kind === 'suggest'
      ? state.models.availableSuggestionModels
      : kind === 'instance'
        ? state.models.availableInstanceModels
        : state.models.availablePromptedModels;
  return (list || []).find((m) => (m?.id ?? m?.registry_key ?? m?.identifier) === modelKey) || null;
};

export const createInferenceSlice = (set) => ({
  /**
   * Opens a run. Returns its id, which the ack and end calls must pass so a
   * late reply to an older run cannot close a newer one.
   *
   * @param {object} meta
   * @param {'segment'|'refine'|'suggest'|'instance'} meta.kind
   * @param {string} meta.modelKey
   * @param {Array<number|string>} [meta.labelIds] Labels in flight; empty means class-agnostic.
   * @param {boolean} [meta.fromPrompts] Pulse from the prompts on the canvas.
   * @param {Array<number>} [meta.seedContourIds] Pulse from these outlines (suggest similar).
   */
  beginInferenceRun: ({ kind, modelKey, labelIds = [], fromPrompts = false, seedContourIds = [] }) => {
    const id = nextRunId++;
    set((state) => {
      const image = state.images.imageObject;
      const w = image?.width || image?.naturalWidth || 0;
      const h = image?.height || image?.naturalHeight || 0;
      const sources = fromPrompts ? promptSources(state.aiAnnotation.prompts, w, h) : { positives: [], negatives: [] };
      // Focus mode is the one thing that limits where the model looks: the
      // backend nests a prompted result under the focused object.
      const focused = state.focusMode.active
        ? state.objects.list.find((o) => o.id === state.focusMode.objectId)
        : null;
      state.inference.run = {
        id,
        kind,
        modelKey,
        imageId: state.images.currentImage?.id ?? null,
        labelIds: labelIds.filter((v) => v != null),
        positives: sources.positives,
        negatives: sources.negatives,
        seedContourIds,
        scopeContourId: kind === 'segment' || kind === 'refine' ? focused?.contour_id ?? null : null,
        knownContourIds: state.objects.list.map((o) => o.contour_id).filter((v) => v != null),
        etaS: estimateSeconds(kind, modelKey, modelInfo(state, kind, modelKey)),
        startedAt: Date.now(),
        phase: 'running',
        ackAt: null,
        expected: null,
        outcome: null,
        endedAt: null,
        reveal: {},
      };
    });
    return id;
  },

  /**
   * The server answered. `expected` is how many outlines it announced (null when
   * it did not say); `failed` ends the run as a failure straight away.
   */
  ackInferenceRun: (id, { expected = null, failed = false } = {}) => set((state) => {
    const run = state.inference.run;
    if (!run || run.id !== id || run.phase !== 'running') return;
    if (failed) {
      run.phase = 'ending';
      run.outcome = 'fail';
      run.endedAt = Date.now();
      return;
    }
    run.phase = 'settling';
    run.ackAt = Date.now();
    run.expected = Number.isFinite(expected) ? expected : null;
  }),

  /** All outlines are in: play the ending. `reveal` maps contour id → seconds into the ending. */
  endInferenceRun: (id, { outcome, reveal = {} }) => set((state) => {
    const run = state.inference.run;
    if (!run || run.id !== id || run.phase === 'ending') return;
    run.phase = 'ending';
    run.outcome = outcome;
    run.reveal = reveal;
    run.endedAt = Date.now();
  }),

  clearInferenceRun: (id) => set((state) => {
    if (state.inference.run && (id == null || state.inference.run.id === id)) state.inference.run = null;
  }),
});
