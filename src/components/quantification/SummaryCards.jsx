import React from "react";
import {
  Tags,
  Network,
  ListTree,
  Tag,
  Boxes,
  Target,
  Sigma,
  Scale,
} from "lucide-react";
import {
  computeLabelSpaceInsights,
  computeAnnotationInsightsFromSummary,
} from "../../utils/quantificationUtils";

const ACCENTS = {
  teal: "bg-teal-50 text-teal-600",
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
};

const StatCard = ({ icon: Icon, label, value, hint, accent = "teal" }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <div className="flex items-center space-x-2 mb-2">
      <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${ACCENTS[accent]}`}>
        <Icon className="w-4 h-4" />
      </span>
      <h3 className="text-sm font-medium text-gray-700">{label}</h3>
    </div>
    <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

const SectionHeader = ({ children }) => (
  <div className="flex items-center gap-3 mb-3">
    <div className="h-1 w-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" />
    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{children}</h3>
  </div>
);

const formatNum = (value, decimals = 1) => {
  if (value == null || Number.isNaN(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(decimals);
};

const SummaryCards = ({ data, labelIdToName = {} }) => {
  const structure = computeLabelSpaceInsights(data.labels);
  const annotation = computeAnnotationInsightsFromSummary(
    data.metrics,
    labelIdToName,
    structure.totalLabels
  );

  return (
    <div className="mb-6 space-y-6">
      {/* Label space structure */}
      <div>
        <SectionHeader>Label space</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Tags}
            label="Total labels"
            value={structure.totalLabels}
            hint={`${structure.rootLabels} root · ${structure.totalLabels - structure.rootLabels} nested`}
          />
          <StatCard
            icon={Network}
            accent="blue"
            label="Avg. sublabels per label"
            value={formatNum(structure.avgSublabelsPerParent)}
            hint={
              structure.parentLabels > 0
                ? `across ${structure.parentLabels} parent label${structure.parentLabels !== 1 ? "s" : ""}`
                : "no nested labels yet"
            }
          />
          <StatCard
            icon={ListTree}
            accent="violet"
            label="Hierarchy depth"
            value={structure.maxDepth}
            hint={`${structure.maxDepth === 1 ? "single level" : `${structure.maxDepth} levels deep`}`}
          />
          <StatCard
            icon={Tag}
            label="Leaf categories"
            value={structure.leafLabels}
            hint="most-specific labels"
          />
        </div>
      </div>

      {/* Annotation coverage & balance */}
      <div>
        <SectionHeader>Annotation insights</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Boxes}
            label="Annotated objects"
            value={annotation.totalObjects.toLocaleString()}
            hint={
              annotation.unlabeledObjects > 0
                ? `+ ${annotation.unlabeledObjects.toLocaleString()} unlabeled`
                : "across all labels"
            }
          />
          <StatCard
            icon={Target}
            accent="blue"
            label="Label coverage"
            value={`${Math.round(annotation.coverage * 100)}%`}
            hint={`${annotation.annotatedLabels} of ${structure.totalLabels} labels have data`}
          />
          <StatCard
            icon={Sigma}
            accent="violet"
            label="Avg. objects per label"
            value={formatNum(annotation.avgObjectsPerLabel)}
            hint="among labels with data"
          />
          <StatCard
            icon={Scale}
            accent="amber"
            label="Class balance"
            value={annotation.imbalanceRatio != null ? `${formatNum(annotation.imbalanceRatio)}×` : "—"}
            hint={
              annotation.mostCommon && annotation.leastCommon && annotation.imbalanceRatio != null
                ? `${annotation.mostCommon.name} vs ${annotation.leastCommon.name}`
                : "most vs least common label"
            }
          />
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
