import React from "react";
import PhaseProgressBar from "./PhaseProgressBar";
import { OVERALL_STATES, PHASES, emptyStateCounts } from "../../utils/imageStatus";

/**
 * A dataset's progress through the three workflow phases, all three bars together.
 *
 * This is the at-a-glance form, for the dataset tiles on the overview page where
 * there is no room to give each phase its own card. Inside a dataset the same bars
 * live on the Calibrate / Annotate / Review cards instead, each next to the button
 * that acts on it — see ManagementCardsView.
 *
 * It replaced a single pie of the old five-state lifecycle, which could only ever
 * show one dimension of progress: a dataset fully annotated but never calibrated
 * looked complete in it. Three bars also answer the question the pie was actually
 * read for — "where is the work?" — because the phases share a scale and the
 * bottleneck is whichever bar is least filled.
 */
const DatasetAnnotationProgress = ({ stats }) => {
  // `total` is the image count, which is the denominator every bar shares. Falling
  // back to the overall row keeps this right for a payload that omits it.
  const overall = stats?.overall || emptyStateCounts();
  const total =
    stats?.total ||
    OVERALL_STATES.reduce((acc, state) => acc + (overall[state.key] || 0), 0);

  if (total === 0) {
    return <p className="text-sm text-t3 mb-4">No images yet</p>;
  }

  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold text-t2 mb-3">Workflow progress:</h4>

      <div className="space-y-3">
        {PHASES.map((phase) => (
          <PhaseProgressBar
            key={phase.key}
            phase={phase}
            counts={stats?.[phase.key]}
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
