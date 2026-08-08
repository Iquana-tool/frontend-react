import { Ban, Check, Circle, CheckCircle2, Clock, Eye, PenTool, Ruler, X } from 'lucide-react';

/**
 * An image moves through three phases — Calibrate, Annotate, Review — and each one
 * is tracked separately with the same three states.
 *
 * This replaces a single five-value lifecycle (not started / in progress /
 * reviewable / sent back / finished) that folded the phases together. It could only
 * describe one dimension of progress at a time, so a reviewed image nobody had
 * calibrated read as "finished" and a calibrated image nobody had annotated read as
 * "not started". Three independent axes say both, and the overall status is derived
 * from them rather than being a fourth thing that can drift.
 *
 * Single source of truth for the gallery badges and filters, the filmstrip tiles,
 * the workspace pill and the dataset progress bars. Mirrors
 * `app/services/image_status.py` on the backend.
 */

/**
 * The three states, in order.
 *
 * The colours here are the *phase-agnostic* ones, for surfaces that show progress
 * without saying which step it belongs to: the combined status pill, the filmstrip
 * tiles, the gallery's "Overall" filter row. Anywhere the phase is known, the
 * phase's own hue wins — see `PHASES` below.
 *
 * `icon` / `tone` are for surfaces too small to carry a label — the filmstrip tiles,
 * at 6-10px. Shape does the work there rather than colour: three shades of the same
 * dot are not distinguishable at that size, whereas a cross, a ring and a tick are,
 * and they still read for anyone who cannot separate the hues.
 */
export const PHASE_STATES = [
  {
    // A phase with a prerequisite that has produced nothing yet. Only Review has
    // one, so this state never occurs on Calibrate or Annotate — see `states` on
    // each phase below.
    //
    // Neutral grey in every phase rather than a fourth tone of the hue: it is not
    // a step of that phase's progress, it is work that does not exist yet, and
    // colouring it in-hue would make an untouched dataset's Review bar look as
    // though reviewing had begun.
    key: 'blocked',
    label: 'Not ready',
    icon: Ban,
    smallIcon: Ban,
    dot: 'bg-ln2',
    badge: 'bg-well text-t3',
    ring: 'ring-ln2',
    tone: 'text-t3',
  },
  {
    key: 'not_started',
    label: 'Not started',
    icon: Circle,
    smallIcon: X,
    dot: 'bg-t3',
    badge: 'bg-well text-t2',
    ring: 'ring-ln2',
    tone: 'text-t3',
  },
  {
    key: 'in_progress',
    label: 'In progress',
    icon: Clock,
    smallIcon: Circle,
    dot: 'bg-warn',
    badge: 'bg-warnBg text-warn',
    ring: 'ring-warn',
    tone: 'text-warn',
  },
  {
    key: 'finished',
    label: 'Finished',
    icon: CheckCircle2,
    smallIcon: Check,
    dot: 'bg-ok',
    badge: 'bg-okBg text-ok',
    ring: 'ring-ok',
    tone: 'text-ok',
  },
];

export const PHASE_STATE_MAP = Object.fromEntries(PHASE_STATES.map((s) => [s.key, s]));

/** The three states a phase without a prerequisite — and the overall status — use. */
export const OVERALL_STATES = PHASE_STATES.filter((s) => s.key !== 'blocked');

/** Neutral fill for `blocked`, shared by all phases. See the state's note above. */
const BLOCKED_FILL = 'bg-ln2';

/**
 * The three phases, in workflow order — which is also their display order.
 *
 * Each owns a hue from the phase palette in `styles/theme.js`: Calibrate blue,
 * Annotate teal, Review purple. Everything that shows a phase — the progress
 * bars, the gallery chips, the per-image strip, the workspace mode and the ring
 * around its canvas — draws from the same family, so the colour rather than the
 * label is what says which step you are looking at.
 *
 * `fill` maps the states onto that hue's tones. The class names are spelled out
 * rather than composed (`bg-${token}${n}`) because Tailwind finds classes by
 * scanning source text; a constructed name is purged from the build and renders
 * as no colour at all.
 *
 * `states` is what the phase can actually report, and is what bars, legends and
 * filter chips iterate. Calibrate and Annotate are independent of everything, so
 * they have three; Review depends on Annotate and adds `blocked` for images with
 * nothing drawn to review. Iterating the full catalogue instead would put a
 * permanently-empty "Not ready" segment on two of the three bars.
 */
export const PHASES = [
  {
    key: 'calibrate',
    label: 'Calibrate',
    barLabel: 'Calibrated',
    icon: Ruler,
    text: 'text-cal',
    bg: 'bg-calBg',
    bg2: 'bg-calBg2',
    border: 'border-calLn',
    ring: 'ring-calLn',
    cssVar: '--cal',
    states: OVERALL_STATES,
    fill: {
      not_started: 'bg-cal3',
      in_progress: 'bg-cal2',
      finished: 'bg-cal1',
    },
  },
  {
    key: 'annotate',
    label: 'Annotate',
    barLabel: 'Annotated',
    icon: PenTool,
    text: 'text-ann',
    bg: 'bg-annBg',
    bg2: 'bg-annBg2',
    border: 'border-annLn',
    ring: 'ring-annLn',
    cssVar: '--ann',
    states: OVERALL_STATES,
    fill: {
      not_started: 'bg-ann3',
      in_progress: 'bg-ann2',
      finished: 'bg-ann1',
    },
  },
  {
    key: 'review',
    label: 'Review',
    barLabel: 'Reviewed',
    icon: Eye,
    text: 'text-rev',
    bg: 'bg-revBg',
    bg2: 'bg-revBg2',
    border: 'border-revLn',
    ring: 'ring-revLn',
    cssVar: '--rev',
    states: PHASE_STATES,
    // "Not reviewable yet" rather than the generic "Not ready": the reviewer's
    // question is whether this image is theirs to open, and the specific wording
    // answers it without them having to work out what is missing.
    stateLabels: { blocked: 'Not reviewable yet' },
    fill: {
      blocked: BLOCKED_FILL,
      not_started: 'bg-rev3',
      in_progress: 'bg-rev2',
      finished: 'bg-rev1',
    },
  },
];

export const PHASE_MAP = Object.fromEntries(PHASES.map((p) => [p.key, p]));

export const PHASE_KEYS = PHASES.map((p) => p.key);

/**
 * The phase descriptor for a key, or null.
 *
 * Null rather than a default, because callers that show a phase-agnostic view —
 * the gallery's "Overall" filter, the combined status pill — must fall back to
 * the neutral state colours rather than borrow one phase's hue.
 */
export const getPhase = (phase) => PHASE_MAP[phase] || null;

/**
 * What a state is called within a phase.
 *
 * Phases may override a label where the generic one is vague: Review calls
 * `blocked` "Not reviewable yet" rather than "Not ready".
 */
export const stateLabel = (phase, state) => {
  const descriptor = getStateDescriptor(state);
  return getPhase(phase)?.stateLabels?.[descriptor.key] || descriptor.label;
};

/** The states a phase can report, as descriptors, in order. */
export const statesOfPhase = (phase) => getPhase(phase)?.states || OVERALL_STATES;

/**
 * The Tailwind fill class for one phase in one state.
 *
 * Without a phase (the combined view) this returns the neutral state colour, so
 * one call site can serve both the per-phase bars and the overall row.
 */
export const phaseFill = (phase, state) => {
  const descriptor = getPhase(phase);
  const stateKey = getStateDescriptor(state).key;
  if (!descriptor) return PHASE_STATE_MAP[stateKey].dot;
  // A phase that cannot be blocked has no fill for it; fall back to the neutral
  // rather than rendering an element with no background class at all.
  return descriptor.fill[stateKey] || BLOCKED_FILL;
};

/**
 * Values from the retired five-state lifecycle, folded onto the three that remain.
 *
 * `reviewable` and `rejected` were both really "annotation exists, nobody has signed
 * it off" — one axis' worth of the two the phases now separate. Kept so a persisted
 * filter choice or an in-flight response from an older client still resolves.
 */
const STATE_ALIASES = {
  completed: 'finished',
  done: 'finished',
  reviewed: 'finished',
  reviewable: 'in_progress',
  rejected: 'in_progress',
};

/** Resolve any state string to its descriptor, defaulting to `not_started`. */
export const getStateDescriptor = (state) => {
  const canonical = STATE_ALIASES[state] || state;
  return PHASE_STATE_MAP[canonical] || PHASE_STATE_MAP.not_started;
};

/**
 * The three phase states of an image, tolerating shapes that carry none.
 *
 * An image from a legacy payload has a bare `status` and no `phases`; it is spread
 * across all three so the UI still shows something honest rather than blanks.
 */
export const getPhaseStatuses = (image) => {
  const phases = image?.phases;
  if (phases && PHASE_KEYS.every((key) => phases[key])) {
    return Object.fromEntries(
      PHASE_KEYS.map((key) => [key, getStateDescriptor(phases[key]).key])
    );
  }
  const fallback = getImageStatus(image).key;
  return Object.fromEntries(PHASE_KEYS.map((key) => [key, fallback]));
};

/** Descriptor for one phase of an image. */
export const getPhaseStatus = (image, phase) =>
  getStateDescriptor(getPhaseStatuses(image)[phase]);

/**
 * Combine three phase states into the overall one.
 *
 * Strict at both ends, matching `image_status.combine` on the backend: finished
 * only once every phase is, not started only while none has been touched.
 * `blocked` counts as untouched — a fresh image has a blocked review, and that
 * must not stop it reading as not started.
 */
export const combineStatuses = (phases) => {
  const states = PHASE_KEYS.map((key) => getStateDescriptor(phases?.[key]).key);
  if (states.every((s) => s === 'finished')) return 'finished';
  if (states.every((s) => s === 'not_started' || s === 'blocked')) return 'not_started';
  return 'in_progress';
};

/**
 * Resolve an image to its overall status descriptor, tolerating legacy shapes
 * (a bare `finished` flag, a "completed" status string, or phases without a
 * precomputed overall).
 */
export const getImageStatus = (image) => {
  const raw = image?.status;
  if (raw && (PHASE_STATE_MAP[raw] || STATE_ALIASES[raw])) return getStateDescriptor(raw);
  if (image?.phases) return getStateDescriptor(combineStatuses(image.phases));
  if (image?.finished) return PHASE_STATE_MAP.finished;
  return PHASE_STATE_MAP.not_started;
};

/** An all-zero `{state: 0}` object for one phase, or for the overall row. */
export const emptyStateCounts = (phase = null) =>
  Object.fromEntries(statesOfPhase(phase).map((s) => [s.key, 0]));

/** An all-zero `{phase: {state: 0}}` table, including the `overall` row. */
export const emptyPhaseCounts = () => ({
  ...Object.fromEntries(PHASE_KEYS.map((key) => [key, emptyStateCounts(key)])),
  overall: emptyStateCounts(),
});

/**
 * Tally images into `{phase: {state: count}}`, with an `overall` row alongside.
 *
 * The gallery filter chips read one row of this at a time — whichever phase the
 * user is currently filtering on.
 */
export const getImageStatusCounts = (images = []) => {
  const counts = emptyPhaseCounts();
  for (const image of images) {
    const phases = getPhaseStatuses(image);
    for (const key of PHASE_KEYS) {
      counts[key][phases[key]] = (counts[key][phases[key]] || 0) + 1;
    }
    const overall = getImageStatus(image).key;
    counts.overall[overall] = (counts.overall[overall] || 0) + 1;
  }
  return counts;
};
