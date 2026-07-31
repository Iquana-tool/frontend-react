import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Download, AlertTriangle, Info } from "lucide-react";
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

// Warning shown when a dataset's images do not share one scale, so quantifications fall
// back to pixel units. Nothing is rendered when the scale is consistent (all images use the
// same unit - whether pixels or a single real-world unit), which is the normal case.
const ScaleWarningBanner = ({ scaleStatus }) => {
  if (!scaleStatus || scaleStatus.consistent) return null;

  const { images_scaled = 0, images_unscaled = 0, distinct_units = [] } = scaleStatus;
  const hasUnscaled = images_unscaled > 0 && images_scaled > 0;
  const message = hasUnscaled
    ? "Not all images have a scale, showing pixel units. To see quantifications in real-world units, add a scale to all images."
    : `Images use different scale units (${distinct_units.join(", ")}), showing pixel units. Use a single unit across all images to see real-world quantifications.`;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-warnLn bg-warnBg px-4 py-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warn" />
      <p className="text-sm text-warn">{message}</p>
    </div>
  );
};

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
  // Inclusion toggles. Off by default => finalized-only (fully-annotated masks + reviewed
  // contours), matching the endpoint defaults. Turning one on stops sending the matching
  // exclude_* filter, so in-progress annotation work shows up in the quantifications.
  const [includeInProgress, setIncludeInProgress] = useState(false);
  const [includeUnreviewed, setIncludeUnreviewed] = useState(false);

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
          excludeNotFullyAnnotated: !includeInProgress,
          excludeUnreviewed: !includeUnreviewed,
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
  }, [datasetId, activeProfileId, plotType, includeInProgress, includeUnreviewed]);

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
        excludeNotFullyAnnotated: !includeInProgress,
        excludeUnreviewed: !includeUnreviewed,
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acLn mx-auto mb-4"></div>
            <p className="text-t2">Loading quantifications...</p>
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
            <p className="text-err mb-4">Error: {error}</p>
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
            <p className="text-t2 mb-4">No data available</p>
          </div>
        </div>
      </DatasetManagementLayout>
    );
  }

  const labelIdToName = createLabelIdToNameMap(data.labels);
  const comparisonData = prepareComparisonDataFromSummary(data.metrics, labelIdToName, catalogMap);
  const scalarMetricKeys = collectScalarMetricKeys(data.metrics, catalogMap);
  const unlabeledMetrics = data.metrics?.null;

  // The metric aggregation drops not-fully-annotated / unreviewed work by default, but the
  // object census below is unfiltered. When the census has objects yet no metrics survive
  // the filters, the page would otherwise look empty for no obvious reason - so surface why
  // and point at the toggles rather than leaving a bare "0 objects".
  const hasMetrics = data.metrics && Object.keys(data.metrics).length > 0;
  const totalCensus = Object.values(data.object_counts_per_label_id || {}).reduce(
    (sum, counts) => sum + (counts?.total || 0),
    0
  );
  const allFilteredOut = !hasMetrics && totalCensus > 0;

  return (
    <DatasetManagementLayout>
      <div className="h-full flex flex-col bg-p1 overflow-y-auto">
        {/* Page Header */}
        <div className="bg-p1 border-b border-ln sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-t1">Dataset Quantifications</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-2 px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Quantification</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile selector + expand controls */}
        <div className="bg-p1 border-b border-ln">
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
              <div className="flex items-center gap-4">
                {/* Inclusion toggles: by default only finalized work (fully-annotated masks
                    + reviewed objects) is quantified; these surface in-progress work. */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm text-t2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeInProgress}
                      onChange={(e) => setIncludeInProgress(e.target.checked)}
                      className="rounded border-ln2 text-ac focus:ring-ac"
                    />
                    <span>Include in-progress masks</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-t2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeUnreviewed}
                      onChange={(e) => setIncludeUnreviewed(e.target.checked)}
                      className="rounded border-ln2 text-ac focus:ring-ac"
                    />
                    <span>Include unreviewed objects</span>
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExpandAll}
                    className="px-3 py-1.5 text-sm font-medium text-t2 bg-well rounded-lg hover:bg-hv2 transition-colors"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={handleCollapseAll}
                    className="px-3 py-1.5 text-sm font-medium text-t2 bg-well rounded-lg hover:bg-hv2 transition-colors"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <ScaleWarningBanner scaleStatus={data.scale_status} />

          {allFilteredOut && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-acLn bg-acS px-4 py-3">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-ac" />
              <p className="text-sm text-ac">
                This dataset has {totalCensus.toLocaleString()} annotated{" "}
                {totalCensus === 1 ? "object" : "objects"}, but they are hidden because their
                masks are not marked fully-annotated and/or the objects are unreviewed. Enable{" "}
                <span className="font-medium">Include in-progress masks</span> or{" "}
                <span className="font-medium">Include unreviewed objects</span> above to
                include them.
              </p>
            </div>
          )}

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
          <div className="bg-p1 rounded-lg shadow-sm border border-ln p-6 mb-6">
            <h2 className="text-lg font-semibold text-t1 mb-4">Label Hierarchy & Metrics</h2>
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
              <div className="text-center py-8 text-t3">No labels found in this dataset.</div>
            )}
          </div>

          {/* Unlabeled Objects Metrics */}
          {unlabeledMetrics && Object.keys(unlabeledMetrics).length > 0 && (
            <div className="bg-p1 rounded-lg shadow-sm border border-ln p-6 mb-6">
              <h2 className="text-lg font-semibold text-t1 mb-4">Unlabeled Objects</h2>
              <p className="text-sm text-t2 mb-4">
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
