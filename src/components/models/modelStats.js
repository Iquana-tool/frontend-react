// Formatting + sorting helpers for model performance stats, shared by the
// model chip (compact) and the detail panel (full spec). All formatters return
// a display string or null when the underlying value is missing, so callers can
// skip rendering a stat that a model didn't report.

const perf = (model) => model?.performance || {};

/** e.g. 1_240_000 -> "1.2M", 340_000 -> "340K", 512 -> "512" */
export const formatParams = (n) => {
  if (n == null || Number.isNaN(n)) return null;
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return `${n}`;
};

export const formatGflops = (n) =>
  n == null || Number.isNaN(n) ? null : `${n >= 100 ? Math.round(n) : n.toFixed(1)} GFLOPs`;

export const formatLatency = (ms) => {
  if (ms == null || Number.isNaN(ms)) return null;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${ms >= 10 ? Math.round(ms) : ms.toFixed(1)} ms`;
};

export const formatThroughput = (v) =>
  v == null || Number.isNaN(v) ? null : `${v >= 100 ? Math.round(v) : v.toFixed(1)} img/s`;

export const formatVram = (mb) => {
  if (mb == null || Number.isNaN(mb)) return null;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

export const formatResolution = (size) =>
  Array.isArray(size) && size.length >= 2 ? `${size[0]}×${size[1]}` : null;

// Sort strategies for the zoo. Each has a comparator; numeric strategies sort
// ascending for latency (faster first) and descending for params/gflops
// (bigger/heavier first is what people scan for). Models missing the value
// always sort last regardless of direction.
const numericSort = (getValue, { descending = false } = {}) => (a, b) => {
  const av = getValue(a);
  const bv = getValue(b);
  const aMissing = av == null || Number.isNaN(av);
  const bMissing = bv == null || Number.isNaN(bv);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return descending ? bv - av : av - bv;
};

export const SORT_STRATEGIES = {
  name: {
    label: "Name",
    compare: (a, b) => (a.name || "").localeCompare(b.name || ""),
  },
  latency: {
    label: "Inference time",
    compare: numericSort((m) => perf(m).latency_ms),
  },
  params: {
    label: "Parameters",
    compare: numericSort((m) => perf(m).num_parameters, { descending: true }),
  },
  gflops: {
    label: "GFLOPs",
    compare: numericSort((m) => perf(m).gflops, { descending: true }),
  },
};

export const DEFAULT_SORT = "name";

/** True if any model in the list reports at least one perf number worth sorting on. */
export const hasAnyPerfStats = (models) =>
  (models || []).some((m) => {
    const p = m?.performance;
    return p && (p.num_parameters != null || p.gflops != null || p.latency_ms != null);
  });
