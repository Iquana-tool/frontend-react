import { vi } from 'vitest';
import { VisitTracker, summarizeVisit, unionLength } from './visitTracker';

/** A stand-in for the activity log client that records what the tracker emits. */
const fakeLog = ({ enabled = true, idle = 60000 } = {}) => {
  const listeners = new Set();
  return {
    config: { idle_threshold_ms: idle },
    events: [],
    isEnabled: () => enabled,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    emit(type, data) { listeners.forEach((fn) => fn(type, data)); },
    track(component, eventType, detail) {
      this.events.push({ component, eventType, detail });
      this.emit('track', { component, eventType, detail });
    },
    flushOnUnload: vi.fn(),
    visits() { return this.events.filter((e) => e.eventType === 'image.visit'); },
  };
};

const setup = (opts) => {
  let clock = 0;
  const log = fakeLog(opts);
  const target = new EventTarget();
  const tracker = new VisitTracker({ log, now: () => clock, target });
  tracker.attach();
  const advance = (ms) => { clock += ms; vi.advanceTimersByTime(ms); };
  const openImage = (imageId) => log.track('navigation', 'image.open', { imageId });
  const input = (type = 'pointermove') => target.dispatchEvent(new Event(type));
  return { log, tracker, advance, openImage, input };
};

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('unionLength / summarizeVisit', () => {
  test('overlapping intervals are counted once', () => {
    expect(unionLength([[0, 10], [5, 15], [20, 25]])).toBe(20);
    expect(unionLength([])).toBe(0);
  });

  test('time that is both idle and AI wait is subtracted once', () => {
    const summary = summarizeVisit({ start: 0, end: 100, idle: [[10, 40]], ai: [[30, 50]] });
    expect(summary).toMatchObject({
      open_ms: 100, idle_ms: 30, ai_wait_ms: 20, active_ms: 60, idle_periods: 1,
    });
  });

  test('intervals are clipped to the visit', () => {
    const summary = summarizeVisit({ start: 50, end: 100, idle: [], ai: [[0, 60]] });
    expect(summary.ai_wait_ms).toBe(10);
    expect(summary.active_ms).toBe(40);
  });
});

describe('VisitTracker', () => {
  test('does nothing when the activity log is off', () => {
    const log = fakeLog({ enabled: false });
    const tracker = new VisitTracker({ log, now: () => 0, target: new EventTarget() });
    tracker.attach();
    log.track('navigation', 'image.open', { imageId: 1 });
    expect(tracker.visit).toBeNull();
  });

  test('opening another image ends the visit with its numbers', () => {
    const { log, advance, openImage, input } = setup();
    openImage(1);
    advance(5000);
    input('pointerdown');
    log.track('annotation', 'prompt.add', {});
    log.track('annotation', 'contour.create', {});
    advance(5000);
    openImage(2);

    const [visit] = log.visits();
    expect(visit.detail.imageId).toBe(1);
    expect(visit.detail.payload).toMatchObject({
      open_ms: 10000, idle_ms: 0, active_ms: 10000, end_reason: 'navigate',
    });
    expect(visit.detail.payload.interactions).toMatchObject({ clicks: 1, prompts: 1, creates: 1 });
  });

  test('a gap over the threshold is idle, and emits idle.start/idle.end', () => {
    const { log, advance, openImage, input } = setup({ idle: 60000 });
    openImage(1);
    advance(59000);
    input();
    advance(90000); // idle after 60 s without input
    expect(log.events.some((e) => e.eventType === 'idle.start')).toBe(true);
    input();
    advance(1000);
    openImage(2);

    const idleEnd = log.events.find((e) => e.eventType === 'idle.end');
    expect(idleEnd.detail.payload.idle_ms).toBe(90000);
    const { payload } = log.visits()[0].detail;
    expect(payload).toMatchObject({ open_ms: 150000, idle_ms: 90000, active_ms: 60000, idle_periods: 1 });
  });

  test('a gap just under the threshold is not idle', () => {
    const { log, advance, openImage, input } = setup({ idle: 60000 });
    openImage(1);
    advance(59999);
    input();
    openImage(2);
    expect(log.visits()[0].detail.payload.idle_ms).toBe(0);
  });

  test('an idle period still open when the visit ends is counted', () => {
    const { log, advance, openImage } = setup({ idle: 60000 });
    openImage(1);
    advance(100000);
    log.track('navigation', 'route.change', { payload: { to: '/datasets' } });
    const { payload } = log.visits()[0].detail;
    expect(payload).toMatchObject({ idle_ms: 100000, active_ms: 0, end_reason: 'route' });
  });

  test('AI wait is measured and subtracted', () => {
    const { log, advance, openImage, input } = setup();
    openImage(1);
    input();
    log.emit('ai.start', { token: 1 });
    advance(3000);
    log.emit('ai.end', { token: 1 });
    advance(2000);
    openImage(2);
    expect(log.visits()[0].detail.payload).toMatchObject({ ai_wait_ms: 3000, active_ms: 2000 });
  });

  test('staying on an annotation route keeps the visit open', () => {
    const { log, openImage } = setup();
    openImage(1);
    log.track('navigation', 'route.change', { payload: { to: '/dataset/7/annotate/1' } });
    expect(log.visits()).toHaveLength(0);
  });

  test('marking finished ends the visit and starts a fresh one on the same image', () => {
    const { log, tracker, advance, openImage } = setup();
    openImage(1);
    advance(1000);
    log.track('annotation', 'mask.finished', {});
    expect(log.visits()[0].detail.payload.end_reason).toBe('finished');
    expect(tracker.visit.imageId).toBe(1);
  });

  test('counters reset for each image', () => {
    const { log, openImage } = setup();
    openImage(1);
    log.track('annotation', 'contour.delete', {});
    openImage(2);
    openImage(3);
    expect(log.visits()[1].detail.payload.interactions.deletes).toBe(0);
  });

  test('unload writes the visit and flushes it', () => {
    const { log, tracker, openImage } = setup();
    openImage(1);
    tracker.onUnload();
    expect(log.visits()[0].detail.payload.end_reason).toBe('unload');
    expect(log.flushOnUnload).toHaveBeenCalled();
  });

  test('the dataset id is read from the URL when no route change was seen', () => {
    const log = fakeLog();
    const tracker = new VisitTracker({
      log, now: () => 0, target: new EventTarget(), path: () => '/dataset/9/annotate/3',
    });
    tracker.attach();
    log.track('navigation', 'image.open', { imageId: 3 });
    log.track('navigation', 'image.open', { imageId: 4 });
    expect(log.visits()[0].detail.datasetId).toBe(9);
  });

  test('the dataset id is taken from the route', () => {
    const { log, openImage } = setup();
    log.track('navigation', 'route.change', { payload: { to: '/dataset/42/annotate/1' } });
    openImage(1);
    openImage(2);
    expect(log.visits()[0].detail.datasetId).toBe(42);
  });
});
