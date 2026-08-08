import React from "react";
import { PHASES, PHASE_STATES, emptyStateCounts } from "../../utils/imageStatus";

/**
 * A dataset's progress through the three workflow phases.
 *
 * One stacked bar per phase — Calibrate, Annotate, Review — each split into not
 * started / in progress / finished. This replaced a single pie of the old
 * five-state lifecycle, which could only ever show one dimension of progress: a
 * dataset that was fully annotated but never calibrated looked complete in it.
 *
 * Three bars also answer the question the pie was actually being read for — "where
 * is the work?" — at a glance, because the phases sit above each other on a shared
 * scale and the bottleneck is whichever bar is least filled.
 *
 * Each bar wears its phase's hue (blue / teal / purple) rather than a shared
 * red-amber-green ramp, and the three states are three tones of it. That costs
 * nothing in readability — within one bar the tones still run dim to bright — and
 * buys the thing a shared ramp cannot: the Review bar is the same purple as Review
 * mode in the workspace, so the colour alone locates you in the workflow.
 *
 * Driven off PHASES x PHASE_STATES, so adding either shows up here without a
 * second list to keep in sync.
 */

/** One phase's stacked bar plus its per-state counts. */
const PhaseBar = ({ phase, counts, total }) => {
  const Icon = phase.icon;
  const segments = PHASE_STATES.map((state) => ({
    ...state,
    value: counts[state.key] || 0,
    fill: phase.fill[state.key],
  }));
  const finished = counts.finished || 0;
  const percent = (value) => (total > 0 ? Math.round((value / total) * 100) : 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${phase.text}`}>
          <Icon className="w-3.5 h-3.5" />
          <span>{phase.barLabel}</span>
        </div>
        <span className="text-xs font-semibold text-t1 tabular-nums">
          {finished}/{total} ({percent(finished)}%)
        </span>
      </div>

      <div className="flex h-2 w-full rounded-full overflow-hidden bg-well">
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <div
              key={segment.key}
              className={`h-full ${segment.fill}`}
              style={{ width: `${(segment.value / total) * 100}%` }}
              title={`${segment.label}: ${segment.value} (${percent(segment.value)}%)`}
            />
          ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
        {segments.map((segment) => (
          <span
            key={segment.key}
            className="inline-flex items-center gap-1 text-[11px] text-t3"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${segment.fill}`} />
            {segment.label} {segment.value}
          </span>
        ))}
      </div>
    </div>
  );
};

const DatasetAnnotationProgress = ({ stats }) => {
  // `total` is the image count, which is the denominator every bar shares. Falling
  // back to the overall row keeps this right for a payload that omits it.
  const overall = stats?.overall || emptyStateCounts();
  const total =
    stats?.total ||
    PHASE_STATES.reduce((acc, state) => acc + (overall[state.key] || 0), 0);

  if (total === 0) {
    return <p className="text-sm text-t3 mb-4">No images yet</p>;
  }

  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-t2 mb-3">Workflow progress:</h4>

      <div className="space-y-3">
        {PHASES.map((phase) => (
          <PhaseBar
            key={phase.key}
            phase={phase}
            counts={stats?.[phase.key] || emptyStateCounts()}
            total={total}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-ln text-sm">
        <span className="font-medium text-t2">Fully finished:</span>
        <span className="font-semibold text-t1 tabular-nums">
          {overall.finished || 0} / {total} images
        </span>
      </div>
    </div>
  );
};

export default DatasetAnnotationProgress;
