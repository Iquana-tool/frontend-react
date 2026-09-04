import React from 'react';
import { Boxes, Ruler, Sigma } from 'lucide-react';
import {
  aggregateMetric,
  formatMeasurement,
  frameCoverage,
} from '../../../utils/perImageQuantification';

const Card = ({ icon: Icon, label, value, unit, hint }) => (
  <div className="bg-p1 rounded-lg border border-ln p-4">
    <div className="flex items-center gap-2 mb-2">
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-acS text-ac">
        <Icon className="w-4 h-4" />
      </span>
      <h3 className="text-sm font-medium text-t2">{label}</h3>
    </div>
    <p className="text-2xl font-bold text-t1 leading-tight">
      {value}
      {unit && <span className="ml-1 text-base font-normal text-t2">{unit}</span>}
    </p>
    {hint && <p className="text-xs text-t3 mt-1">{hint}</p>}
  </div>
);

/**
 * The facts about the image itself, as opposed to about its measurements.
 *
 * Deliberately only three, and deliberately not any metric's mean: every metric in the
 * profile gets its own card with its own mean, spread and dataset comparison in
 * `ImageMetricGrid` below. What is left here is what that grid cannot say — how many
 * objects there are, how much of the frame they take up, and whether any of the numbers
 * are in real units at all.
 *
 * The total is the one aggregate worth a headline: it is the only number on the page that
 * is a property of the image rather than of its objects, and it is what "31 % of frame"
 * is computed from.
 *
 * @param {Object} props
 * @param {Object} props.imageMetrics - `metrics` from the image-scoped summary.
 * @param {string|null} props.metricKey - The featured metric (area, normally).
 * @param {Object} props.catalog - Catalog entry for that metric.
 * @param {Object} props.objectCounts - `object_counts_per_label_id` for this image.
 * @param {Object} props.image - The image row (`width`, `height`, `scale_x`, `unit`, ...).
 * @param {Object} props.scaleStatus - `scale_status` from the image-scoped summary.
 */
const ImageStatCards = ({
  imageMetrics,
  metricKey,
  catalog,
  objectCounts,
  image,
  scaleStatus,
}) => {
  const metricName = catalog?.name || metricKey || 'metric';
  const isArea = catalog?.unit_kind === 'area' || metricKey === 'area';

  const here = metricKey ? aggregateMetric(imageMetrics, metricKey) : null;
  const unit = here?.unit || '';

  // The census counts every object on the image, including ones the inclusion toggles
  // exclude from the measurements — so the two numbers can legitimately disagree, and the
  // card says by how much rather than letting the reader discover it in the table.
  const census = Object.values(objectCounts || {}).reduce(
    (sum, counts) => sum + (counts?.total || 0),
    0
  );
  const measured = here?.count || 0;
  const excluded = Math.max(0, census - measured);
  const coverage = isArea ? frameCoverage(here?.total, image, scaleStatus) : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card
        icon={Boxes}
        label="Objects"
        value={census.toLocaleString()}
        hint={
          excluded > 0
            ? `${measured.toLocaleString()} measured · ${excluded.toLocaleString()} excluded`
            : `${measured.toLocaleString()} measured`
        }
      />
      <Card
        icon={Sigma}
        label={`Total ${metricName.toLowerCase()}`}
        value={formatMeasurement(here?.total)}
        unit={unit}
        hint={
          coverage != null
            ? `${(coverage * 100).toFixed(1)} % of frame`
            : `summed over ${measured.toLocaleString()} object${measured === 1 ? '' : 's'}`
        }
      />
      <Card
        icon={Ruler}
        label="Scale"
        value={
          scaleStatus?.display_physical
            ? `1 px = ${formatMeasurement(image?.scale_x)}`
            : 'Not calibrated'
        }
        unit={scaleStatus?.display_physical ? scaleStatus.display_unit : ''}
        hint={
          scaleStatus?.display_physical
            ? 'measurements are in real-world units'
            : 'measurements are in pixels'
        }
      />
    </div>
  );
};

export default ImageStatCards;
