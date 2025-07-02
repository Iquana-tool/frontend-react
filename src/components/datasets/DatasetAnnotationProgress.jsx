import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#2563EB", "#059669", "#DC2626"]; // Improved Blue, Green, Red

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
      <h4 className="text-sm font-semibold text-gray-700 mb-4">
        Annotation status:
      </h4>
      
      <div className="flex items-center gap-6">
        {/* Text Summary */}
        <div className="flex-1 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[0] }}></div>
              <span>Manually annotated:</span>
            </div>
            <span className="font-medium">{manuallyAnnotated} ({Math.round((manuallyAnnotated / total) * 100)}%)</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[1] }}></div>
              <span>Auto annotated:</span>
            </div>
            <span className="font-medium">{autoAnnotated} ({Math.round((autoAnnotated / total) * 100)}%)</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[2] }}></div>
              <span>Missing:</span>
            </div>
            <span className="font-medium">{missing} ({Math.round((missing / total) * 100)}%)</span>
          </div>
        </div>

        {/* Enhanced Pie Chart */}
        <div className="w-24 h-24 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={20}
                outerRadius={40}
                fill="#8884d8"
                dataKey="value"
                stroke="white"
                strokeWidth={2}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [`${value} (${Math.round((value / total) * 100)}%)`, name]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Total Images - Separate row */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 text-sm">
        <span className="font-medium text-gray-700">Total images:</span>
        <span className="font-semibold text-gray-900">{total}</span>
      </div>
    </div>
  );
};

export default DatasetAnnotationProgress;

