import React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import MetricCard from "./MetricCard";
import ChildCountCard from "./ChildCountCard";

// Component to render label hierarchy
const LabelTree = ({ labels, metricsPerLabelId, childCountsPerLabelId, labelIdToName, expandedLabels, onToggleLabel }) => {
  const renderLabel = (label, depth = 0) => {
    const hasChildren = label.children && label.children.length > 0;
    const isExpanded = expandedLabels.has(label.id);
    const labelId = label.id;
    const labelMetrics = metricsPerLabelId[labelId] || metricsPerLabelId[String(labelId)] || null;
    const hasMetrics = labelMetrics && Object.keys(labelMetrics).length > 0;
    const childCounts = childCountsPerLabelId[labelId] || childCountsPerLabelId[String(labelId)] || null;
    const hasChildCounts = childCounts && Object.keys(childCounts).length > 0;

    return (
      <div key={label.id} className="mb-2">
        <div
          className={`flex items-center p-3 rounded-lg border ${
            hasMetrics || hasChildCounts
              ? "bg-teal-50 border-teal-200 hover:bg-teal-100"
              : "bg-gray-50 border-gray-200 hover:bg-gray-100"
          } transition-colors`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => onToggleLabel(label.id)}
              className="mr-2 p-1 hover:bg-white rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900">{label.name}</span>
              <span className="text-xs text-gray-500">(ID: {label.id}, Value: {label.value})</span>
              {hasMetrics && (
                <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full">
                  Has Metrics
                </span>
              )}
              {hasChildCounts && (
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                  Has Children
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metrics and Child Counts for this label */}
        {(hasMetrics || hasChildCounts) && isExpanded && (
          <div className="mt-3 mb-4" style={{ marginLeft: `${(depth + 1) * 24}px` }}>
            {/* Metrics */}
            {hasMetrics && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Object Metrics</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {labelMetrics.area && (
                    <MetricCard label="Area" values={labelMetrics.area} unit="units²" />
                  )}
                  {labelMetrics.perimeter && (
                    <MetricCard label="Perimeter" values={labelMetrics.perimeter} unit="units" />
                  )}
                  {labelMetrics.circularity && (
                    <MetricCard label="Circularity" values={labelMetrics.circularity} />
                  )}
                  {labelMetrics.max_diameter && (
                    <MetricCard label="Max Diameter" values={labelMetrics.max_diameter} unit="units" />
                  )}
                </div>
              </div>
            )}

            {/* Child Counts */}
            {hasChildCounts && (
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Child Object Counts</h5>
                <p className="text-xs text-gray-600 mb-3">
                  Number of child objects per parent object
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(childCounts).map(([childLabelId, counts]) => {
                    const childLabelName = labelIdToName[childLabelId] || labelIdToName[String(childLabelId)] || `Label ${childLabelId}`;
                    return (
                      <ChildCountCard
                        key={childLabelId}
                        childLabelName={childLabelName}
                        counts={counts}
                        labelIdToName={labelIdToName}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {label.children.map((child) => renderLabel(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {labels.map((label) => renderLabel(label))}
    </div>
  );
};

export default LabelTree;

