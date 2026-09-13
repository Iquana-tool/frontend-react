import React from "react";

// Displays the total number of child objects of a given child label under a parent label.
// The aggregated summary's child_counts_per_label_id maps
//   parent_label_id -> { child_label_id: total_count } (a scalar total), so `count` here
// is that scalar total (not a per-parent array).
const ChildCountCard = ({ childLabelName, count }) => {
  if (!count) return null;

  return (
    <div className="bg-acS rounded-lg border border-acLn p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-ac">Child: {childLabelName}</h4>
      </div>
      <div>
        <p className="text-xs text-ac mb-1">Total child objects</p>
        <p className="text-2xl font-bold text-ac">{count.toLocaleString()}</p>
      </div>
    </div>
  );
};

export default ChildCountCard;
