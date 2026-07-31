import React from "react";
import ColorMetricCard from "./ColorMetricCard";

// Generic, catalog-driven card for ONE metric from the pre-aggregated /summary shape.
// `metric` = { unit, components: [{count, mean, std, min, max}, ...] }.
// `catalog` = registry entry { key, name, unit_kind, value_dim, components }.
//
// Rendering by unit_kind / value_dim:
//   - COLOR (value_dim 3)                -> ColorMetricCard (swatch + channel means)
//   - LENGTH/AREA/RATIO/INTENSITY (dim 1)-> mean ± std, min–max, unit
//   - CONTEXTUAL metrics get a footnote that count may exclude isolated objects.
const SummaryMetricCard = ({ metricKey, metric, catalog }) => {
  const components = metric?.components || [];
  if (components.length === 0) return null;

  const unitKind = catalog?.unit_kind;
  const valueDim = catalog?.value_dim ?? components.length;

  if (unitKind === "color" && valueDim === 3) {
    return <ColorMetricCard metric={metric} catalog={catalog} />;
  }

  // Scalar metric: use the first component's pre-aggregated stats.
  const stats = components[0];
  if (!stats) return null;

  const name = catalog?.name || metricKey;
  // Resolve the display unit. LENGTH -> the row unit (mm/px), AREA -> unit², others unitless.
  let unit = "";
  if (unitKind === "length") unit = metric.unit || "";
  else if (unitKind === "area") unit = metric.unit || "";

  const isContextual = catalog?.tier === "contextual";

  return (
    <div className="bg-p1 rounded-lg border border-ln p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-t2 uppercase tracking-wide">{name}</h4>
        <span
          className="text-xs text-t3 bg-well px-2 py-1 rounded"
          title={isContextual ? "Excludes isolated objects with no neighbour." : undefined}
        >
          {stats.count} {stats.count === 1 ? "measurement" : "measurements"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-t3 mb-1">Mean ± SD</p>
          <p className="text-lg font-bold text-ac">
            {stats.mean.toFixed(4)}
            {typeof stats.std === "number" && (
              <span className="text-sm font-normal text-t3"> ± {stats.std.toFixed(4)}</span>
            )}{" "}
            {unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-t3 mb-1">Min</p>
          <p className="text-sm font-medium text-t2">
            {stats.min.toFixed(4)} {unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-t3 mb-1">Max</p>
          <p className="text-sm font-medium text-t2">
            {stats.max.toFixed(4)} {unit}
          </p>
        </div>
      </div>
      {isContextual && (
        <p className="text-[11px] text-t3 mt-2">
          Excludes isolated objects with no neighbour, so this count may be lower than the
          object count.
        </p>
      )}
    </div>
  );
};

export default SummaryMetricCard;
