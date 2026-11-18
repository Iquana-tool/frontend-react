/**
 * How long a model usually takes here, from the runs this browser has seen.
 *
 * A benchmark latency measures the model call on its own; what the annotator
 * waits for also includes the round trip, loading and post-processing, so the
 * best estimate is the wait they actually had last time. Until a model has run
 * once, its benchmark latency (with headroom) or a default per kind stands in.
 *
 * Stored per browser in localStorage; every access is guarded, because a
 * private window or blocked storage must not break a run.
 */

const KEY = 'iquana.inferenceEta.v1';
/** Weight of the newest run in the running average. */
const ALPHA = 0.35;

const DEFAULT_S = { segment: 3, refine: 3, suggest: 8, instance: 12 };

const read = () => {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const write = (table) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(table));
  } catch {
    // Storage is a convenience here; the next run just estimates from defaults.
  }
};

const entryKey = (kind, modelKey) => `${kind}:${modelKey || 'unknown'}`;

/**
 * The estimate, in seconds, for a run of `kind` on `modelKey`.
 * `model` is the ModelInfo (optional), whose `performance.latency_ms` seeds a first run.
 */
export const estimateSeconds = (kind, modelKey, model = null) => {
  const seen = read()[entryKey(kind, modelKey)];
  if (seen && Number.isFinite(seen.s) && seen.s > 0) return seen.s;
  const latencyMs = model?.performance?.latency_ms;
  if (Number.isFinite(latencyMs) && latencyMs > 0) return Math.max(1, (latencyMs / 1000) * 1.5 + 0.8);
  return DEFAULT_S[kind] ?? 5;
};

/** Folds a finished run's real duration into the estimate. */
export const recordDuration = (kind, modelKey, seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const table = read();
  const key = entryKey(kind, modelKey);
  const prev = table[key];
  const s = prev && Number.isFinite(prev.s) ? prev.s + ALPHA * (seconds - prev.s) : seconds;
  table[key] = { s: Math.round(s * 100) / 100, n: (prev?.n || 0) + 1 };
  write(table);
};
