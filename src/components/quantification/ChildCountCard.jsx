import React from "react";
import { calculateStats } from "../../utils/quantificationUtils";

// Component to display child counts
const ChildCountCard = ({ childLabelName, counts, labelIdToName }) => {
  const stats = calculateStats(counts);

  if (stats.count === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-blue-700">
          Child: {childLabelName}
        </h4>
        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
          {stats.count} {stats.count === 1 ? "parent" : "parents"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-blue-600 mb-1">Mean Count</p>
          <p className="text-lg font-bold text-blue-700">
            {stats.mean.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-blue-600 mb-1">Total</p>
          <p className="text-lg font-bold text-blue-900">
            {stats.sum?.toFixed(0) || (stats.mean * stats.count).toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-blue-600 mb-1">Min</p>
          <p className="text-sm font-medium text-blue-700">
            {stats.min.toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-blue-600 mb-1">Max</p>
          <p className="text-sm font-medium text-blue-700">
            {stats.max.toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChildCountCard;

