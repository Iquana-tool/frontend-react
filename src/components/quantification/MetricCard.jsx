import React from "react";
import { calculateStats } from "../../utils/quantificationUtils";

// Component to display a metric card
const MetricCard = ({ label, values, unit = "" }) => {
  const stats = calculateStats(values);

  if (stats.count === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{label}</h4>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {stats.count} {stats.count === 1 ? "measurement" : "measurements"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Mean</p>
          <p className="text-lg font-bold text-teal-600">
            {stats.mean.toFixed(4)} {unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Min</p>
          <p className="text-sm font-medium text-gray-700">
            {stats.min.toFixed(4)} {unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Max</p>
          <p className="text-sm font-medium text-gray-700">
            {stats.max.toFixed(4)} {unit}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;

