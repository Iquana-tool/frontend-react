/**
 * Presentation helpers for captured study events.
 *
 * The one rule that matters here: stored timestamps are **naive UTC**. The
 * backend serialises them with `.isoformat()` on a tz-naive value, so the string
 * carries no offset ("2026-08-10T08:00:24.549012"). Per the ECMAScript spec a
 * date-time string without an offset is parsed as *local* time, so
 * `new Date(row.ts)` silently shifts every value by the viewer's UTC offset.
 * Nothing here goes through `Date` for that reason: the strings are sliced.
 */
import { Compass, Pencil, Server, Sparkles } from 'lucide-react';

/** Capture components, in the order they are shown. Mirrors TelemetryComponent. */
export const COMPONENTS = ['annotation', 'ai', 'navigation', 'api'];

/**
 * Per-component label and icon.
 *
 * Icons rather than colours: four saturated badges in a dense table is noise,
 * and colour is reserved for capture state, where it carries meaning.
 */
export const COMPONENT_META = {
  annotation: { label: 'Annotation', Icon: Pencil, hint: 'Tools, prompts, contours, labels' },
  ai: { label: 'AI', Icon: Sparkles, hint: 'Model invocations, latency, accept/reject' },
  navigation: { label: 'Navigation', Icon: Compass, hint: 'Routes, dwell time, login, visibility' },
  api: { label: 'API', Icon: Server, hint: 'HTTP and WebSocket timings and errors' },
};

/**
 * Render a stored timestamp as `YYYY-MM-DD HH:MM:SS`, still in UTC.
 * @param {string|null} iso
 * @returns {string}
 */
export const formatUtc = (iso) => {
  if (!iso) return '—';
  const [date, time = ''] = String(iso).split('T');
  return `${date} ${time.split('.')[0]}`.trim();
};

/** Just the clock portion, for rows already grouped under a date. */
export const formatUtcTime = (iso) => {
  if (!iso) return '—';
  const [, time = ''] = String(iso).split('T');
  return time.split('.')[0] || '—';
};

/**
 * Human-readable span. Sub-second values keep their precision because AI latency
 * is the number a study cares most about.
 * @param {number|null} ms
 */
export const formatDuration = (ms) => {
  if (ms === null || ms === undefined) return '';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  const minutes = Math.floor(ms / 60000);
  return `${minutes}m ${Math.round((ms % 60000) / 1000)}s`;
};

/**
 * Elapsed time between two stored timestamps, as a coarse label.
 * Both are naive UTC, so appending "Z" makes the subtraction well-defined.
 */
export const formatSpan = (startIso, endIso) => {
  if (!startIso || !endIso) return '—';
  const start = Date.parse(`${startIso}Z`);
  const end = Date.parse(`${endIso}Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return '—';
  return formatDuration(Math.max(0, end - start));
};

/** Pretty-print the JSON payload column, tolerating a non-JSON marker. */
export const formatPayload = (payload) => {
  if (!payload) return '';
  try {
    return JSON.stringify(JSON.parse(payload));
  } catch {
    return payload;
  }
};
