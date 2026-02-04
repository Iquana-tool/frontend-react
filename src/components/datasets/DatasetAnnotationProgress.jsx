import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#DC2626", "#F59E0B", "#3B82F6", "#059669"]; // Red (Not started), Orange (In progress), Blue (Reviewable), Green (Finished)

const DatasetAnnotationProgress = ({ stats }) => {
  // Ensure we have valid numbers, default to 0 if undefined/null
  const notStarted = stats?.not_started || 0;
  const inProgress = stats?.in_progress || 0;
  const reviewable = stats?.reviewable || 0;
  const finished = stats?.finished || 0;
  const total = stats?.total || (notStarted + inProgress + reviewable + finished);

  if (total === 0) {
    return (
      <p className="text-sm text-gray-500 mb-4">
        No annotations yet
      </p>
    );
  }

  const data = [
    { name: "Not started", value: notStarted },
    { name: "In progress", value: inProgress },
    { name: "Reviewable", value: reviewable },
    { name: "Finished", value: finished }
  ].filter(item => item.value > 0); // Only show statuses with counts > 0

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
              <span>Not started:</span>
            </div>
            <span className="font-medium">{notStarted} ({Math.round((notStarted / total) * 100)}%)</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[1] }}></div>
              <span>In progress:</span>
            </div>
            <span className="font-medium">{inProgress} ({Math.round((inProgress / total) * 100)}%)</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[2] }}></div>
              <span>Reviewable:</span>
            </div>
            <span className="font-medium">{reviewable} ({Math.round((reviewable / total) * 100)}%)</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[3] }}></div>
              <span>Finished:</span>
            </div>
            <span className="font-medium">{finished} ({Math.round((finished / total) * 100)}%)</span>
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
                {data.map((entry, index) => {
                  // Map data entry back to color index
                  const colorIndex = entry.name === "Not started" ? 0 :
                                   entry.name === "In progress" ? 1 :
                                   entry.name === "Reviewable" ? 2 : 3;
                  return <Cell key={`cell-${index}`} fill={COLORS[colorIndex]} />;
                })}
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

