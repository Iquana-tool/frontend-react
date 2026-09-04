import React from 'react';
import { getLabelColor } from '../../../utils/labelColors';
import {
  formatMeasurement,
  perLabelMetric,
} from '../../../utils/perImageQuantification';

/**
 * Per-label means for one image, drawn against the dataset's means as a reference tick.
 *
 * A bar chart of one image's labels answers "which label dominates this image?", which the
 * table below answers too. The tick is what this view adds and the cards cannot: it puts
 * the same label's dataset-wide mean on the same axis, so an image whose objects are all
 * slightly small reads as such at a glance, rather than requiring two pages to be compared
 * from memory.
 *
 * Both series share one scale (the largest value in either), because two independently
 * scaled rows would place a bar and its tick at the same position for different values.
 *
 * @param {Object} props
 * @param {Object} props.imageMetrics - `metrics` from the image-scoped summary.
 * @param {Object} props.datasetMetrics - `metrics` from the dataset-wide summary.
 * @param {string} props.metricKey - The featured metric.
 * @param {Object} props.catalog - Catalog entry for that metric.
 * @param {Object} props.labelIdToName - label id -> display name.
 */
const LabelComparisonBars = ({
  imageMetrics,
  datasetMetrics,
  metricKey,
  catalog,
  labelIdToName = {},
}) => {
  const here = perLabelMetric(imageMetrics, metricKey);
  if (here.length === 0) return null;

  const baselineByLabel = Object.fromEntries(
    perLabelMetric(datasetMetrics, metricKey).map((entry) => [entry.labelId, entry.mean])
  );

  const scaleMax = Math.max(
    ...here.map((entry) => entry.mean),
    ...here.map((entry) => baselineByLabel[entry.labelId] || 0)
  );
  const asPercent = (value) => (scaleMax > 0 ? Math.min(100, (value / scaleMax) * 100) : 0);

  const metricName = catalog?.name || metricKey;
  const unit = here[0]?.unit || '';

  return (
    <div className="bg-p1 rounded-lg border border-ln p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-1 w-8 bg-accent rounded-full flex-shrink-0" />
        <h3 className="text-sm font-semibold text-t2 uppercase tracking-wide">
          Mean {metricName.toLowerCase()} by label · this image vs dataset
        </h3>
      </div>

      <div className="space-y-3">
        {here.map((entry) => {
          const baseline = baselineByLabel[entry.labelId];
          const name = labelIdToName[entry.labelId] || `Label ${entry.labelId}`;
          const color = getLabelColor(Number(entry.labelId));
          return (
            <div key={entry.labelId}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-sm text-t2 truncate">
                  {name} <span className="text-t3">n {entry.count}</span>
                </span>
                <span className="text-sm font-medium text-t1 tabular-nums flex-shrink-0">
                  {formatMeasurement(entry.mean)} {unit}
                </span>
              </div>
              <div className="relative h-2.5 w-full rounded-full bg-well overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${asPercent(entry.mean)}%`, backgroundColor: color }}
                />
                {baseline != null && (
                  // Drawn over the bar rather than beside it, so "this image is above the
                  // dataset" is the tick being behind the bar's end — readable without a
                  // second number to subtract.
                  <div
                    className="absolute inset-y-0 w-0.5 bg-t2"
                    style={{ left: `calc(${asPercent(baseline)}% - 1px)` }}
                    title={`Dataset mean: ${formatMeasurement(baseline)} ${unit}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-t3 mt-3">
        Bar = this image · tick = dataset mean for the same label
      </p>
    </div>
  );
};

export default LabelComparisonBars;
