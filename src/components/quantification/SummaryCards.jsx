import React from "react";
import { BarChart3, TrendingUp } from "lucide-react";

const SummaryCards = ({ data, labelsWithMetrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-2">
          <BarChart3 className="w-5 h-5 text-teal-500" />
          <h3 className="text-sm font-medium text-gray-700">Total Labels</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {data.labels?.root_level_labels?.length || 0}
        </p>
        <p className="text-xs text-gray-500 mt-1">Root level labels</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-2">
          <TrendingUp className="w-5 h-5 text-teal-500" />
          <h3 className="text-sm font-medium text-gray-700">Labels with Data</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">{labelsWithMetrics.length}</p>
        <p className="text-xs text-gray-500 mt-1">Labels with measurements</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-2">
          <BarChart3 className="w-5 h-5 text-teal-500" />
          <h3 className="text-sm font-medium text-gray-700">Total Measurements</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {data.metrics_per_label_id
            ? Object.values(data.metrics_per_label_id).reduce((total, metrics) => {
                return total + (metrics.area?.length || 0);
              }, 0)
            : 0}
        </p>
        <p className="text-xs text-gray-500 mt-1">Total object measurements</p>
      </div>
    </div>
  );
};

export default SummaryCards;

