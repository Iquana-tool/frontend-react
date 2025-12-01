import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { getDatasetObjectQuantifications } from "../api/quantifications";
import { getDataset } from "../api/datasets";
import MetricCard from "../components/quantification/MetricCard";
import LabelTree from "../components/quantification/LabelTree";
import ComparisonCharts from "../components/quantification/ComparisonCharts";
import SummaryCards from "../components/quantification/SummaryCards";
import {
  createLabelIdToNameMap,
  prepareComparisonData,
  getLabelsWithMetrics,
  collectAllLabelIds,
  getLabelsToAutoExpand,
} from "../utils/quantificationUtils";

const QuantificationPage = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [includeManual, setIncludeManual] = useState(true);
  const [includeAuto, setIncludeAuto] = useState(true);
  const [expandedLabels, setExpandedLabels] = useState(new Set());
 
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load dataset info
        if (datasetId) {
          const datasetData = await getDataset(parseInt(datasetId));
          setDataset(datasetData);
        }

        // Load quantifications
        const response = await getDatasetObjectQuantifications(
          parseInt(datasetId),
          includeManual,
          includeAuto
        );
        setData(response);

        // Auto-expand labels that have metrics or child counts
        const labelsToExpand = getLabelsToAutoExpand(
          response.metrics_per_label_id,
          response.child_counts_per_label_id
        );
        if (labelsToExpand.size > 0) {
          setExpandedLabels(labelsToExpand);
        }
      } catch (err) {
        console.error("Error loading quantifications:", err);
        setError(err.message || "Failed to load quantifications");
      } finally {
        setLoading(false);
      }
    };

    if (datasetId) {
    loadData();
    }
  }, [datasetId, includeManual, includeAuto]);

  const handleToggleLabel = (labelId) => {
    const newExpanded = new Set(expandedLabels);
    if (newExpanded.has(labelId)) {
      newExpanded.delete(labelId);
    } else {
      newExpanded.add(labelId);
    }
    setExpandedLabels(newExpanded);
  };

  const handleExpandAll = () => {
    if (!data || !data.labels) return;
    const allLabelIds = collectAllLabelIds(data.labels.root_level_labels);
    setExpandedLabels(allLabelIds);
  };

  const handleCollapseAll = () => {
    setExpandedLabels(new Set());
  };

  const handleExport = () => {
    if (!data) return;
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quantifications_dataset_${datasetId}_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quantifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No data available</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const labelsWithMetrics = getLabelsWithMetrics(data.metrics_per_label_id);
  const labelIdToName = createLabelIdToNameMap(data.labels);
  const comparisonData = prepareComparisonData(data.metrics_per_label_id, labelIdToName);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Dataset Quantifications
                </h1>
                {dataset && (
                  <p className="text-sm text-gray-600 mt-1">{dataset.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
            <button
              // onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              <Download className="w-4 h-4" />
                <span>Export Quantification</span>
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExpandAll}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Cards */}
        <SummaryCards data={data} labelsWithMetrics={labelsWithMetrics} />

        {/* Comparison Charts */}
        <ComparisonCharts comparisonData={comparisonData} />

        {/* Label Hierarchy and Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Label Hierarchy & Metrics</h2>
          {data.labels?.root_level_labels && data.labels.root_level_labels.length > 0 ? (
            <LabelTree
              labels={data.labels.root_level_labels}
              metricsPerLabelId={data.metrics_per_label_id || {}}
              childCountsPerLabelId={data.child_counts_per_label_id || {}}
              labelIdToName={labelIdToName}
              expandedLabels={expandedLabels}
              onToggleLabel={handleToggleLabel}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              No labels found in this dataset.
            </div>
          )}
        </div>

        {/* Unlabeled Objects Metrics */}
        {data.metrics_per_label_id?.null && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Unlabeled Objects</h2>
            <p className="text-sm text-gray-600 mb-4">
              Metrics for objects that do not have an assigned label.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.metrics_per_label_id.null.area && (
                <MetricCard label="Area" values={data.metrics_per_label_id.null.area} unit="units²" />
              )}
              {data.metrics_per_label_id.null.perimeter && (
                <MetricCard label="Perimeter" values={data.metrics_per_label_id.null.perimeter} unit="units" />
              )}
              {data.metrics_per_label_id.null.circularity && (
                <MetricCard label="Circularity" values={data.metrics_per_label_id.null.circularity} />
              )}
              {data.metrics_per_label_id.null.max_diameter && (
                <MetricCard label="Max Diameter" values={data.metrics_per_label_id.null.max_diameter} unit="units" />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default QuantificationPage;
