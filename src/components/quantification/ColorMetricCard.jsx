import React from "react";
import { opencvLabToRgbCss } from "../../utils/quantificationUtils";

// Generic card for a value_dim-3 COLOR metric from the aggregated summary.
// `metric` is { unit, components: [{count, mean, std, min, max}, ...] }.
// `catalog` is the registry entry ({ key, name, unit_kind, value_dim, components }).
//
// The swatch is always built from an RGB triple: for `mean_color_rgb` the component means
// are the RGB fill directly; for `mean_color_lab` (opencv 8-bit LAB) we convert to display
// sRGB via opencvLabToRgbCss. Numeric channel means are shown alongside.
const ColorMetricCard = ({ metric, catalog }) => {
  const components = metric?.components || [];
  if (components.length < 3) return null;

  const means = components.map((c) => c.mean);
  const componentNames = catalog?.components || ["0", "1", "2"];
  const isLab = catalog?.key === "mean_color_lab";
  const swatch = isLab
    ? opencvLabToRgbCss(means)
    : `rgb(${Math.round(means[0])}, ${Math.round(means[1])}, ${Math.round(means[2])})`;

  const count = components[0]?.count ?? 0;
  const name = catalog?.name || catalog?.key || "Color";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{name}</h4>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {count} {count === 1 ? "measurement" : "measurements"}
        </span>
      </div>
      <div className="flex items-center space-x-4">
        <div
          className="w-14 h-14 rounded-lg border border-gray-300 flex-shrink-0"
          style={{ backgroundColor: swatch }}
          title={swatch}
        />
        <div className="grid grid-cols-3 gap-3 flex-1">
          {means.map((mean, i) => (
            <div key={i}>
              <p className="text-xs text-gray-500 mb-1">{componentNames[i] ?? i}</p>
              <p className="text-sm font-bold text-teal-600">{mean.toFixed(1)}</p>
            </div>
          ))}
        </div>
      </div>
      {isLab && (
        <p className="text-[11px] text-gray-400 mt-2">
          CIELAB values use opencv 8-bit scaling (L,a,b each 0–255). Swatch is converted to sRGB.
        </p>
      )}
    </div>
  );
};

export default ColorMetricCard;
