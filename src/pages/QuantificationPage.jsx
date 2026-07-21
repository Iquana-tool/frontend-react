import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Download } from "lucide-react";
import {
  getQuantificationSummary,
  getMetricsCatalog,
  getQuantificationProfiles,
  buildQuantificationDownloadUrl,
} from "../api/quantifications";
import { getAuthHeaders } from "../api/util";
import LabelTree from "../components/quantification/LabelTree";
import ComparisonCharts from "../components/quantification/ComparisonCharts";
import SummaryCards from "../components/quantification/SummaryCards";
import SummaryMetricCard from "../components/quantification/SummaryMetricCard";
import ProfileSelector from "../components/quantification/ProfileSelector";
import DatasetManagementLayout from "../components/datasets/gallery/DatasetManagementLayout";
import {
  createLabelIdToNameMap,
  collectAllLabelIds,
  getLabelsToAutoExpandFromSummary,
  prepareComparisonDataFromSummary,
  collectScalarMetricKeys,
  buildMetricCatalogMap,
} from "../utils/quantificationUtils";

const QuantificationPage = () => {
  const { datasetId } = useParams();
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLabels, setExpandedLabels] = useState(new Set());
  // Comparison plot type: Box (default) | Violin | Bar. Box/Violin need the server-side
  // distribution stats (fetched only when active); Bar uses the cheap mean-only summary.
  const [plotType, setPlotType] = useState("box");
  const [distributionLoading, setDistributionLoading] = useState(false);

  const catalogMap = buildMetricCatalogMap(catalog);

  // Load the catalog + profiles once per dataset. The default profile is auto-created
  // server-side (geometry on all labels), so an existing dataset renders unchanged.
  useEffect(() => {
    if (!datasetId) return;
    const loadMeta = async () => {
      try {
        const [catalogRes, profilesRes] = await Promise.all([
          getMetricsCatalog(),
          getQuantificationProfiles(parseInt(datasetId)),
        ]);
        setCatalog(catalogRes.metrics || []);
        const loadedProfiles = profilesRes.profiles || [];
        setProfiles(loadedProfiles);
        const def = loadedProfiles.find((p) => p.is_default) || loadedProfiles[0];
        setActiveProfileId(def ? def.id : null);
      } catch (err) {
        console.error("Error loading quantification metadata:", err);
        setError(err.message || "Failed to load quantification metadata");
        setLoading(false);
      }
    };
    loadMeta();
  }, [datasetId]);

  // Load the aggregated summary whenever the dataset, active profile or plot type changes.
  // Box/violin request the (heavier) server-side distribution stats; bar does not, so a
  // plot-type change only re-fetches to add/drop the distribution payload.
  useEffect(() => {
    if (!datasetId || activeProfileId === null) return;
    const needsDistribution = plotType !== "bar";
    const loadData = async () => {
      try {
        setLoading(true);
        if (needsDistribution) setDistributionLoading(true);
        setError(null);
        const response = await getQuantificationSummary(parseInt(datasetId), {
          profileId: activeProfileId,
          includeDistribution: needsDistribution,
        });
        setData(response);
        const labelsToExpand = getLabelsToAutoExpandFromSummary(
          response.metrics,
          response.child_counts_per_label_id
        );
        if (labelsToExpand.size > 0) setExpandedLabels(labelsToExpand);
      } catch (err) {
        console.error("Error loading quantifications:", err);
        setError(err.message || "Failed to load quantifications");
      } finally {
        setLoading(false);
        setDistributionLoading(false);
      }
    };
    loadData();
  }, [datasetId, activeProfileId, plotType]);

  const reloadProfiles = useCallback(
    async (selectId = null) => {
      const res = await getQuantificationProfiles(parseInt(datasetId));
      const loaded = res.profiles || [];
      setProfiles(loaded);
      if (selectId !== null) {
        setActiveProfileId(selectId);
      } else if (!loaded.find((p) => p.id === activeProfileId)) {
        const def = loaded.find((p) => p.is_default) || loaded[0];
        setActiveProfileId(def ? def.id : null);
      }
    },
    [datasetId, activeProfileId]
  );

  const handleToggleLabel = (labelId) => {
    const newExpanded = new Set(expandedLabels);
    if (newExpanded.has(labelId)) newExpanded.delete(labelId);
    else newExpanded.add(labelId);
    setExpandedLabels(newExpanded);
  };

  const handleExpandAll = () => {
    if (!data || !data.labels) return;
    setExpandedLabels(collectAllLabelIds(data.labels.root_level_labels));
  };

  const handleCollapseAll = () => setExpandedLabels(new Set());

  // Download the profile-scoped CSV export straight from the backend (server emits one
  // column per profile metric/component), preserving auth headers.
  const handleExport = async () => {
    try {
      const url = buildQuantificationDownloadUrl(parseInt(datasetId), {
        profileId: activeProfileId,
        fileFormat: "csv",
      });
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `quantifications_dataset_${datasetId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  if (loading) {
    return (
      <DatasetManagementLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quantifications...</p>
          </div>
        </div>
      </DatasetManagementLayout>
    );
  }

  if (error) {
    return (
      <DatasetManagementLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
          </div>
        </div>
      </DatasetManagementLayout>
    );
  }

  if (!data) {
    return (
      <DatasetManagementLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No data available</p>
          </div>
        </div>
      </DatasetManagementLayout>
    );
  }

  const labelIdToName = createLabelIdToNameMap(data.labels);
  const comparisonData = prepareComparisonDataFromSummary(data.metrics, labelIdToName, catalogMap);
  const scalarMetricKeys = collectScalarMetricKeys(data.metrics, catalogMap);
  const unlabeledMetrics = data.metrics?.null;

  return (
    <DatasetManagementLayout>
      <div className="h-full flex flex-col bg-white overflow-y-auto">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dataset Quantifications</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Quantification</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile selector + expand controls */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <ProfileSelector
                datasetId={parseInt(datasetId)}
                profiles={profiles}
                activeProfileId={activeProfileId}
                catalog={catalog}
                labels={data.labels}
                onSelect={setActiveProfileId}
                onProfilesChanged={reloadProfiles}
              />
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
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <SummaryCards data={data} labelIdToName={labelIdToName} />

          <ComparisonCharts
            comparisonData={comparisonData}
            metricKeys={scalarMetricKeys}
            catalogMap={catalogMap}
            plotType={plotType}
            onPlotTypeChange={setPlotType}
            distributionData={data.distribution || null}
            distributionLoading={distributionLoading}
          />

          {/* Label Hierarchy and Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Label Hierarchy & Metrics</h2>
            {data.labels?.root_level_labels && data.labels.root_level_labels.length > 0 ? (
              <LabelTree
                labels={data.labels.root_level_labels}
                metricsByLabelId={data.metrics || {}}
                childCountsPerLabelId={data.child_counts_per_label_id || {}}
                objectCountsPerLabelId={data.object_counts_per_label_id || {}}
                labelIdToName={labelIdToName}
                catalogMap={catalogMap}
                expandedLabels={expandedLabels}
                onToggleLabel={handleToggleLabel}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">No labels found in this dataset.</div>
            )}
          </div>

          {/* Unlabeled Objects Metrics */}
          {unlabeledMetrics && Object.keys(unlabeledMetrics).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Unlabeled Objects</h2>
              <p className="text-sm text-gray-600 mb-4">
                Metrics for objects that do not have an assigned label.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(unlabeledMetrics).map(([metricKey, metric]) => (
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
        </div>
      </div>
    </DatasetManagementLayout>
  );
};

export default QuantificationPage;
