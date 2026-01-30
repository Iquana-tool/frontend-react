import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const ComparisonCharts = ({ comparisonData }) => {
  if (!comparisonData || comparisonData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Metric Comparison Across Labels</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Area Comparison */}
        {comparisonData.some(d => d.area !== undefined) && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Area (units²)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value) => [value?.toFixed(4) || 'N/A', 'Mean']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px'
                  }}
                />
                <Bar dataKey="area" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Perimeter Comparison */}
        {comparisonData.some(d => d.perimeter !== undefined) && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Perimeter (units)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value) => [value?.toFixed(4) || 'N/A', 'Mean']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px'
                  }}
                />
                <Bar dataKey="perimeter" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Circularity Comparison */}
        {comparisonData.some(d => d.circularity !== undefined) && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Circularity</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value) => [value?.toFixed(4) || 'N/A', 'Mean']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px'
                  }}
                />
                <Bar dataKey="circularity" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Max Diameter Comparison */}
        {comparisonData.some(d => d.max_diameter !== undefined) && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Max Diameter (units)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value) => [value?.toFixed(4) || 'N/A', 'Mean']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px'
                  }}
                />
                <Bar dataKey="max_diameter" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonCharts;

