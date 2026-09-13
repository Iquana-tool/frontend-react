import React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import SummaryMetricCard from "./SummaryMetricCard";
import ChildCountCard from "./ChildCountCard";

// Component to render label hierarchy. Reads the pre-aggregated /summary shape:
//   metricsByLabelId[labelId][metricKey] = { unit, components: [{count,mean,std,min,max}] }
// and renders each metric generically via SummaryMetricCard using the catalog metadata.
const LabelTree = ({ labels, metricsByLabelId, childCountsPerLabelId, objectCountsPerLabelId = {}, labelIdToName, catalogMap = {}, expandedLabels, onToggleLabel }) => {
  const renderLabel = (label, depth = 0) => {
    const hasChildren = label.children && label.children.length > 0;
    const isExpanded = expandedLabels.has(label.id);
    const labelId = label.id;
    const labelMetrics = metricsByLabelId[labelId] || metricsByLabelId[String(labelId)] || null;
    const hasMetrics = labelMetrics && Object.keys(labelMetrics).length > 0;
    const childCounts = childCountsPerLabelId[labelId] || childCountsPerLabelId[String(labelId)] || null;
    const hasChildCounts = childCounts && Object.keys(childCounts).length > 0;
    const objectCounts = objectCountsPerLabelId[labelId] || objectCountsPerLabelId[String(labelId)] || null;

    return (
      <div key={label.id} className="mb-2">
        <div
          className={`flex items-center p-3 rounded-lg border ${
            hasMetrics || hasChildCounts
              ? "bg-acS border-acLn hover:bg-acS"
              : "bg-well border-ln hover:bg-hv"
          } transition-colors`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => onToggleLabel(label.id)}
              className="mr-2 p-1 hover:bg-p2 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-t2" />
              ) : (
                <ChevronRight className="w-4 h-4 text-t2" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-t1">{label.name}</span>
              <span className="text-xs text-t3">(ID: {label.id}, Value: {label.value})</span>
              {hasMetrics && (
                <span className="text-xs bg-accent text-onAccent px-2 py-0.5 rounded-full">
                  Has Metrics
                </span>
              )}
              {hasChildCounts && (
                <span className="text-xs bg-accent text-onAccent px-2 py-0.5 rounded-full">
                  Has Children
                </span>
              )}
            </div>
            {/* Annotated-object census for this class: total / reviewed / unreviewed.
                Always visible (even when collapsed) so class sizes are scannable at a glance. */}
            {objectCounts && (
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-t2">
                  <span className="font-semibold">{objectCounts.total}</span> object{objectCounts.total === 1 ? "" : "s"}
                </span>
                <span className="text-ok bg-okBg border border-okLn px-1.5 py-0.5 rounded">
                  {objectCounts.reviewed} reviewed
                </span>
                <span className="text-warn bg-warnBg border border-warnLn px-1.5 py-0.5 rounded">
                  {objectCounts.unreviewed} unreviewed
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Metrics and Child Counts for this label */}
        {(hasMetrics || hasChildCounts) && isExpanded && (
          <div className="mt-3 mb-4" style={{ marginLeft: `${(depth + 1) * 24}px` }}>
            {/* Metrics */}
            {hasMetrics && (
              <div className="mb-4">
                <h5 className="text-sm font-semibold text-t2 mb-3">Object Metrics</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(labelMetrics).map(([metricKey, metric]) => (
                    <SummaryMetricCard
                      key={metricKey}
                      metricKey={metricKey}
                      metric={metric}
                      catalog={catalogMap[metricKey]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Child Counts */}
            {hasChildCounts && (
              <div>
                <h5 className="text-sm font-semibold text-t2 mb-3">Child Object Counts</h5>
                <p className="text-xs text-t2 mb-3">
                  Total number of child objects of each child label
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(childCounts).map(([childLabelId, count]) => {
                    const childLabelName = labelIdToName[childLabelId] || labelIdToName[String(childLabelId)] || `Label ${childLabelId}`;
                    return (
                      <ChildCountCard
                        key={childLabelId}
                        childLabelName={childLabelName}
                        count={count}
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

