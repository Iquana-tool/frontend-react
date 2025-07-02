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
  // Ensure we have valid numbers, default to 0 if undefined/null
  const manuallyAnnotated = stats?.manuallyAnnotated || 0;
  const autoAnnotated = stats?.autoAnnotated || 0;
  const missing = stats?.missing || 0;
  const total = manuallyAnnotated + autoAnnotated + missing;

  if (total === 0) {
    return (
      <p className="text-sm text-gray-500 mb-4">
        No annotations yet
      </p>
    );
  }

  const data = [
    { name: "Manual", value: manuallyAnnotated },
    { name: "Auto", value: autoAnnotated },
    { name: "Missing", value: missing }
  ];

  return (
    <div className="mb-4">
      {/* Text Summary */}
      <div className="space-y-2 text-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Annotation status:
        </h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Manually annotated:</span>
          </div>
          <span className="font-medium">{manuallyAnnotated} ({Math.round((manuallyAnnotated / total) * 100)}%)</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Auto annotated:</span>
          </div>
          <span className="font-medium">{autoAnnotated} ({Math.round((autoAnnotated / total) * 100)}%)</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>Missing:</span>
          </div>
          <span className="font-medium">{missing} ({Math.round((missing / total) * 100)}%)</span>
        </div>
      </div>

      {/* Compact Pie Chart */}
      <div className="w-16 h-16 mx-auto mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={25}
              fill="#8884d8"
              dataKey="value"
              stroke="white"
              strokeWidth={1}
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

