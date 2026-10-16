/**
 * Wording and arithmetic for the admin Usage view.
 */

/** Workflows shown as their own series in the timeline; the rest fold into "Other". */
export const MAX_TIMELINE_SERIES = 5;
export const OTHER_WORKFLOW = 'Other';

/**
 * Coarse duration for totals: "3h 12m", "14m", "45s". Sub-minute precision is
 * noise at the scale of a person's working day.
 * @param {number|null|undefined} ms
 */
export const formatHours = (ms) => {
  if (ms === null || ms === undefined) return '—';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

/**
 * IoU as a percentage of the suggested outline that survived editing.
 * @param {number|null|undefined} iou
 */
export const formatIou = (iou) =>
  iou === null || iou === undefined ? '—' : `${Math.round(iou * 100)}%`;

/**
 * Timeline rows for a stacked per-day chart: the busiest workflows over the whole
 * window keep their own series, everything else is summed into "Other" so the
 * colour count stays small and every colour keeps its meaning across days.
 *
 * @param {Array<{date: string, workflows: Object<string, number>}>} timeline
 * @returns {{series: string[], rows: Array<Object>}} rows hold minutes per series
 */
export const timelineSeries = (timeline = []) => {
  const totals = {};
  for (const day of timeline) {
    for (const [name, ms] of Object.entries(day.workflows || {})) {
      totals[name] = (totals[name] || 0) + ms;
    }
  }
  const ranked = Object.keys(totals)
    .filter((name) => totals[name] > 0)
    .sort((a, b) => totals[b] - totals[a] || a.localeCompare(b));
  const own = ranked.length > MAX_TIMELINE_SERIES + 1
    ? ranked.slice(0, MAX_TIMELINE_SERIES)
    : ranked;
  const folded = ranked.length > own.length;
  const series = folded ? [...own, OTHER_WORKFLOW] : own;

  const rows = timeline.map((day) => {
    const row = { date: day.date };
    for (const name of series) row[name] = 0;
    for (const [name, ms] of Object.entries(day.workflows || {})) {
      const key = own.includes(name) ? name : folded ? OTHER_WORKFLOW : null;
      if (key) row[key] += ms / 60000;
    }
    for (const name of series) row[name] = Math.round(row[name] * 10) / 10;
    return row;
  });
  return { series, rows };
};

/** Readable names for the annotation tools recorded by `tool.switch`. */
export const TOOL_LABELS = {
  selection: 'Select',
  ai_annotation: 'AI annotation',
  manual_drawing: 'Manual drawing',
  pan: 'Pan',
  zoom: 'Zoom',
  set_scale: 'Set scale',
};

export const toolLabel = (tool) => TOOL_LABELS[tool] ?? tool;

/** Readable names for the scene graph actions logged as `scene_graph.<action>`. */
export const SCENE_GRAPH_ACTION_LABELS = {
  'relationship.add': 'Relationships added',
  'relationship.delete': 'Relationships deleted',
  'relationship.swap': 'Relationships reversed',
  'relationship.confirm': 'Suggested relationships accepted',
  'attribute.set': 'Attribute values set',
  'attribute.clear': 'Attribute values cleared',
  'attribute.confirm': 'Suggested attribute values accepted',
  'attribute.define': 'Attributes defined',
};

export const sceneGraphActionLabel = (action) => SCENE_GRAPH_ACTION_LABELS[action] ?? action;
