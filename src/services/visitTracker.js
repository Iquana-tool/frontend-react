/**
 * Per-image visit summary for the activity log.
 *
 * A *visit* runs from an image being opened until it is left: another image,
 * a route outside the annotation page, the tab going hidden, page unload, or
 * the image being marked finished. On leaving, one `image.visit` event carries
 * the numbers a study needs without replaying the whole event stream:
 *
 *   open_ms      wall-clock time the image was open
 *   idle_ms      time inside idle periods (no pointer/key/wheel input for at
 *                least `idle_threshold_ms`; the whole gap counts)
 *   ai_wait_ms   time spent waiting on AI requests
 *   active_ms    open_ms minus the union of idle and AI-wait time, so a wait
 *                that is also idle is subtracted once
 *   interactions counts of clicks, prompts, edits, creates, deletes, relabels, undos
 *
 * `idle.start` / `idle.end` are emitted as they happen, so a visit that never
 * ends cleanly (a crash) can still be reconstructed from the fine events.
 *
 * Nothing runs until the activity log is enabled: `attach()` is a no-op while
 * capture is off, and no DOM listener is bound before the first visit opens.
 */
import activityLog, { ActivityComponent } from './activityLog';

export const DEFAULT_IDLE_THRESHOLD_MS = 60000;

/** Which tracked annotation events count toward which interaction counter. */
const INTERACTION_FOR_EVENT = {
  'prompt.add': 'prompts',
  'contour.create': 'creates',
  'contour.delete': 'deletes',
  'contour.edit_end': 'edits',
  'contour.line_edit_start': 'edits',
  'contour.relabel': 'relabels',
  'history.undo': 'undos',
  'prompt.undo': 'undos',
};

const emptyInteractions = () => ({
  clicks: 0, prompts: 0, edits: 0, creates: 0, deletes: 0, relabels: 0, undos: 0,
});

/** Total length covered by a set of [start, end] intervals, overlaps counted once. */
export const unionLength = (intervals) => {
  const sorted = intervals
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curStart = null;
  let curEnd = null;
  for (const [start, end] of sorted) {
    if (curEnd === null || start > curEnd) {
      if (curEnd !== null) total += curEnd - curStart;
      curStart = start;
      curEnd = end;
    } else if (end > curEnd) {
      curEnd = end;
    }
  }
  if (curEnd !== null) total += curEnd - curStart;
  return total;
};

/**
 * Turn a finished visit's raw intervals into the `image.visit` numbers.
 *
 * @param {{start: number, end: number, idle: number[][], ai: number[][]}} visit
 */
export const summarizeVisit = ({ start, end, idle, ai }) => {
  const clip = (intervals) => intervals.map(([s, e]) => [Math.max(s, start), Math.min(e, end)]);
  const idleClipped = clip(idle);
  const aiClipped = clip(ai);
  const openMs = Math.max(0, end - start);
  const excluded = unionLength([...idleClipped, ...aiClipped]);
  return {
    open_ms: Math.round(openMs),
    idle_ms: Math.round(unionLength(idleClipped)),
    ai_wait_ms: Math.round(unionLength(aiClipped)),
    active_ms: Math.round(Math.max(0, openMs - excluded)),
    idle_periods: idleClipped.filter(([s, e]) => e > s).length,
  };
};

const DATASET_IN_PATH = /\/dataset\/(\d+)\//;
const isAnnotationPath = (path) => /\/dataset\/\d+\/annotate(\/|$)/.test(path ?? '');

export class VisitTracker {
  /**
   * @param {Object} [deps]
   * @param {Object} [deps.log]  activity log client (injected for tests)
   * @param {Function} [deps.now] monotonic clock in ms
   * @param {Object} [deps.target] event target for input listeners (window)
   * @param {Function} [deps.path] current location pathname
   */
  constructor({
    log = activityLog,
    now = () => performance.now(),
    target,
    path = () => (typeof window !== 'undefined' ? window.location.pathname : ''),
  } = {}) {
    this.log = log;
    this.now = now;
    this.path = path;
    this.target = target ?? (typeof window !== 'undefined' ? window : null);
    this.visit = null;
    this.datasetId = null;
    this.attached = false;
    this.listenersBound = false;
    this.idleTimer = null;
    this.aiOpen = new Map();
    this.onInput = this.onInput.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onVisibility = this.onVisibility.bind(this);
    this.onUnload = this.onUnload.bind(this);
  }

  /** Subscribe to the activity log. Call after `activityLog.init()` resolved. */
  attach() {
    if (this.attached || !this.log.isEnabled()) return;
    this.attached = true;
    this.log.subscribe((type, data) => this.handle(type, data));
  }

  idleThreshold() {
    return this.log.config?.idle_threshold_ms ?? DEFAULT_IDLE_THRESHOLD_MS;
  }

  // -- activity log notifications ------------------------------------------

  handle(type, data) {
    if (type === 'ai.start') { this.aiStart(data.token); return; }
    if (type === 'ai.end') { this.aiEnd(data.token); return; }
    if (type !== 'track') return;

    const { eventType, detail } = data;
    if (eventType === 'image.open') {
      const imageId = detail?.imageId ?? null;
      if (imageId == null) this.close('navigate');
      else this.open(imageId);
      return;
    }
    if (eventType === 'route.change') {
      const to = detail?.payload?.to;
      const match = DATASET_IN_PATH.exec(`${to ?? ''}/`);
      if (match) this.datasetId = Number(match[1]);
      if (!isAnnotationPath(to)) this.close('route');
      return;
    }
    if (eventType === 'mask.finished') {
      this.restart('finished');
      return;
    }
    const counter = INTERACTION_FOR_EVENT[eventType];
    if (counter && this.visit) this.visit.interactions[counter] += 1;
  }

  // -- visit lifecycle -------------------------------------------------------

  open(imageId) {
    if (this.visit?.imageId === imageId) return;
    this.close('navigate');
    // The first route.change of a page load fires before the tracker subscribes,
    // so the dataset is read from the URL the image is opened on.
    const match = DATASET_IN_PATH.exec(`${this.path() ?? ''}/`);
    if (match) this.datasetId = Number(match[1]);
    const now = this.now();
    this.visit = {
      imageId,
      datasetId: this.datasetId,
      start: now,
      lastInput: now,
      idleStart: null,
      idle: [],
      ai: [],
      interactions: emptyInteractions(),
    };
    this.bindListeners();
    this.scheduleIdleCheck();
  }

  /** End the current visit and immediately start a fresh one on the same image. */
  restart(reason) {
    const imageId = this.visit?.imageId;
    this.close(reason);
    if (imageId != null) this.open(imageId);
  }

  close(reason) {
    const visit = this.visit;
    if (!visit) return;
    this.visit = null;
    this.clearIdleTimer();

    const end = this.now();
    this.closeIdle(visit, end);
    // AI requests still in flight count up to the end of the visit.
    for (const started of this.aiOpen.values()) visit.ai.push([started, end]);

    const summary = summarizeVisit({ start: visit.start, end, idle: visit.idle, ai: visit.ai });
    this.log.track(ActivityComponent.ANNOTATION, 'image.visit', {
      imageId: visit.imageId,
      datasetId: visit.datasetId,
      durationMs: summary.open_ms,
      payload: { ...summary, interactions: visit.interactions, end_reason: reason },
    });
  }

  // -- idle ----------------------------------------------------------------

  onInput() {
    const visit = this.visit;
    if (!visit) return;
    const now = this.now();
    // Hot path (fires on every pointer move): only touch timers when leaving idle.
    // A pending check reschedules itself from `lastInput` when it fires.
    const wasIdle = visit.idleStart !== null || now - visit.lastInput >= this.idleThreshold();
    if (wasIdle) this.closeIdle(visit, now);
    visit.lastInput = now;
    if (wasIdle || !this.idleTimer) this.scheduleIdleCheck();
  }

  onPointerDown() {
    if (this.visit) this.visit.interactions.clicks += 1;
    this.onInput();
  }

  /** Close an open idle period (or one that elapsed without a check firing). */
  closeIdle(visit, now) {
    const threshold = this.idleThreshold();
    if (visit.idleStart === null && now - visit.lastInput >= threshold) {
      visit.idleStart = visit.lastInput;
      this.log.track(ActivityComponent.ANNOTATION, 'idle.start', {
        imageId: visit.imageId, datasetId: visit.datasetId,
      });
    }
    if (visit.idleStart !== null) {
      const idleMs = Math.round(now - visit.idleStart);
      visit.idle.push([visit.idleStart, now]);
      visit.idleStart = null;
      this.log.track(ActivityComponent.ANNOTATION, 'idle.end', {
        imageId: visit.imageId,
        datasetId: visit.datasetId,
        durationMs: idleMs,
        payload: { idle_ms: idleMs },
      });
    }
  }

  checkIdle() {
    this.idleTimer = null;
    const visit = this.visit;
    if (!visit || visit.idleStart !== null) return;
    if (this.now() - visit.lastInput >= this.idleThreshold()) {
      visit.idleStart = visit.lastInput;
      this.log.track(ActivityComponent.ANNOTATION, 'idle.start', {
        imageId: visit.imageId, datasetId: visit.datasetId,
      });
    } else {
      this.scheduleIdleCheck();
    }
  }

  scheduleIdleCheck() {
    this.clearIdleTimer();
    const visit = this.visit;
    if (!visit || visit.idleStart !== null) return;
    const wait = Math.max(0, visit.lastInput + this.idleThreshold() - this.now());
    this.idleTimer = setTimeout(() => this.checkIdle(), wait);
  }

  clearIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  // -- AI wait -------------------------------------------------------------

  aiStart(token) {
    this.aiOpen.set(token, this.now());
  }

  aiEnd(token) {
    const started = this.aiOpen.get(token);
    this.aiOpen.delete(token);
    if (started !== undefined && this.visit) this.visit.ai.push([started, this.now()]);
  }

  // -- DOM -----------------------------------------------------------------

  onVisibility() {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') {
      // Hidden is often the last moment a tab is reliably alive, so the visit is
      // written now and resumed on return; analysis sums the segments per image.
      this.hiddenImageId = this.visit?.imageId ?? null;
      this.close('hidden');
      // The client's own hidden-handler may already have flushed; send this too.
      this.log.flushOnUnload();
    } else if (this.hiddenImageId != null) {
      const imageId = this.hiddenImageId;
      this.hiddenImageId = null;
      this.open(imageId);
    }
  }

  onUnload() {
    this.close('unload');
    this.log.flushOnUnload();
  }

  bindListeners() {
    if (this.listenersBound || !this.target) return;
    this.listenersBound = true;
    const passive = { passive: true, capture: true };
    this.target.addEventListener('pointerdown', this.onPointerDown, passive);
    this.target.addEventListener('pointermove', this.onInput, passive);
    this.target.addEventListener('keydown', this.onInput, passive);
    this.target.addEventListener('wheel', this.onInput, passive);
    this.target.addEventListener('pagehide', this.onUnload);
    this.target.addEventListener('beforeunload', this.onUnload);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibility);
    }
  }
}

export const visitTracker = new VisitTracker();

export default visitTracker;
