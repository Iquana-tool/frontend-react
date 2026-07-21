import React from "react";

// Displays the total number of child objects of a given child label under a parent label.
// The aggregated summary's child_counts_per_label_id maps
//   parent_label_id -> { child_label_id: total_count } (a scalar total), so `count` here
// is that scalar total (not a per-parent array).
const ChildCountCard = ({ childLabelName, count }) => {
  if (!count) return null;

  return (
    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-blue-700">Child: {childLabelName}</h4>
      </div>
      <div>
        <p className="text-xs text-blue-600 mb-1">Total child objects</p>
        <p className="text-2xl font-bold text-blue-900">{count.toLocaleString()}</p>
      </div>
    </div>
  );
};

export default ChildCountCard;
