import React from "react";
import { emptyStateCounts, stateLabel } from "../../utils/imageStatus";

/**
 * One phase's stacked progress bar, with a legend naming each colour.
 *
 * Shared by the dataset overview card and the three workflow cards on the dataset
 * page, so a phase's progress looks the same wherever it is shown. `compact`
 * tightens it for a card — no phase icon, thinner bar, smaller legend — but keeps
 * the legend: three or four tones of one hue are not self-explanatory, and a bar
 * whose colours nobody can name is decoration.
 *
 * The states come from the phase, not from a global list: Review has a `blocked`
 * ("Not reviewable yet") bucket for images with nothing drawn, and Calibrate and
 * Annotate would otherwise carry a segment and legend entry that are always zero.
 *
 * `total` is the image count and is passed in rather than summed from `counts`,
 * because every phase shares one denominator: three bars only compare if they are
 * on the same scale.
 */
const PhaseProgressBar = ({ phase, counts, total, compact = false }) => {
  const Icon = phase.icon;
  const resolved = counts || emptyStateCounts(phase.key);
  const segments = phase.states.map((state) => ({
    ...state,
    label: stateLabel(phase.key, state.key),
    value: resolved[state.key] || 0,
    fill: phase.fill[state.key],
  }));
  const finished = resolved.finished || 0;
  const percent = (value) => (total > 0 ? Math.round((value / total) * 100) : 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        {/* The past participle ("Calibrated", not "Calibrate") in both forms: on a
            card it would otherwise just repeat the heading above it, whereas
            "Calibrated 3/55" reads as a statement about the images. */}
        <div className={`flex items-center gap-1.5 text-xs font-medium ${phase.text}`}>
          {!compact && <Icon className="w-3.5 h-3.5" />}
          <span>{phase.barLabel}</span>
        </div>
        <span className="text-xs font-semibold text-t1 tabular-nums">
          {finished}/{total} ({percent(finished)}%)
        </span>
      </div>

      <div className={`flex w-full rounded-full overflow-hidden bg-well ${compact ? 'h-1.5' : 'h-2'}`}>
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

      <div
        className={`flex flex-wrap items-center gap-y-0.5 text-t3 ${
          compact ? 'gap-x-2 mt-1.5 text-[10px]' : 'gap-x-3 mt-1 text-[11px]'
        }`}
      >
        {segments.map((segment) => (
          <span key={segment.key} className="inline-flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full flex-none ${segment.fill}`} />
            {segment.label} {segment.value}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PhaseProgressBar;
