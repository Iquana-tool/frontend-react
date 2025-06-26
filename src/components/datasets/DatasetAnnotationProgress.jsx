import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#EF4444"]; // Blue, Green, Red

const DatasetAnnotationProgress = ({ stats }) => {
  const total = stats.manuallyAnnotated + stats.autoAnnotated + stats.missing;

  if (total === 0) {
    return (
      <p className="text-sm text-gray-500 mb-4">
        No annotations yet
      </p>
    );
  }

  const data = [
    { name: "Manual", value: stats.manuallyAnnotated },
    { name: "Auto", value: stats.autoAnnotated },
    { name: "Missing", value: stats.missing }
  ];

  return (
    <div className="mb-4 flex items-start gap-4">
      {/* Text Summary */}
      <div className="flex-1 space-y-1 text-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Annotation status:
        </h4>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
          <span>
            Manually annotated: {stats.manuallyAnnotated} ({Math.round((stats.manuallyAnnotated / total) * 100)}%)
          </span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          <span>
            Auto annotated: {stats.autoAnnotated} ({Math.round((stats.autoAnnotated / total) * 100)}%)
          </span>
        </div>
        {stats.missing > 0 && (
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>
              Missing: {stats.missing} ({Math.round((stats.missing / total) * 100)}%)
            </span>
          </div>
        )}
      </div>

      {/* Pie Chart */}
      <div className="w-24 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={40}
              fill="#8884d8"
              dataKey="value"
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DatasetAnnotationProgress;

