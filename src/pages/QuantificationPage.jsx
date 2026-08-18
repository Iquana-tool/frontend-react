import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useParams } from "react-router-dom";
import { Download, AlertTriangle, Info, LayoutGrid, Table2 } from "lucide-react";
import {
  getQuantificationSummary,
  getMetricsCatalog,
  getQuantificationProfiles,
  buildQuantificationDownloadUrl,
  fetchQuantificationRows,
} from "../api/quantifications";
import { getAuthHeaders } from "../api/util";
import LabelTree from "../components/quantification/LabelTree";
import SummaryCards from "../components/quantification/SummaryCards";
import SummaryMetricCard from "../components/quantification/SummaryMetricCard";
import ProfileSelector from "../components/quantification/ProfileSelector";
import DatasetManagementLayout from "../components/datasets/gallery/DatasetManagementLayout";
import useAppStore from "../stores/useAppStore";
import { usePermissions } from "../hooks/usePermissions";
import { useWorkspaceTheme } from "../stores/selectors/annotationSelectors";
import { Permission } from "../utils/permissions";
import {
  createLabelIdToNameMap,
  collectAllLabelIds,
  getLabelsToAutoExpandFromSummary,
  buildMetricCatalogMap,
} from "../utils/quantificationUtils";

// The explorer carries the Perspective engine — a modest amount of JavaScript, but ~4.5 MB
// of WebAssembly behind it. Splitting it out is what keeps that weight off every other
// route in the app, login included. It is still fetched eagerly *on this page* (see the
// warm-up effect below), because here it is what the visitor came for.
const QuantificationExplorer = React.lazy(() =>
  import("../components/quantification/QuantificationExplorer")
);

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
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-warnLn bg-warnBg px-4 py-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warn" />
      <p className="text-sm text-warn">{message}</p>
    </div>
  );
};

const TabButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-accent text-ac"
        : "border-transparent text-t2 hover:text-t1 hover:border-ln2"
    }`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

const QuantificationPage = () => {
  const { datasetId } = useParams();
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLabels, setExpandedLabels] = useState(new Set());
  // Inclusion toggles. Off by default => finalized-only (fully-annotated masks + reviewed
  // contours), matching the endpoint defaults. Turning one on stops sending the matching
  // exclude_* filter, so in-progress annotation work shows up in the quantifications.
  const [includeInProgress, setIncludeInProgress] = useState(false);
  const [includeUnreviewed, setIncludeUnreviewed] = useState(false);
  // overview (aggregated, cheap) | data (the per-contour rows, in Perspective)
  const [activeTab, setActiveTab] = useState("overview");
  // The per-contour rows behind the Objects tab. Kept separate from `data` because they
  // come from a different, materially more expensive endpoint.
  const [rows, setRows] = useState(null);
  const [rowsState, setRowsState] = useState({ loading: false, error: null, message: null });
  // Which `dataKey` the rows in state belong to, so a tab switch does not refetch them.
  const loadedRowsKeyRef = useRef(null);

  const theme = useWorkspaceTheme();
  const clearViewerConfigsForDataset = useAppStore(
    (state) => state.quantificationActions.clearViewerConfigsForDataset
  );

  // The Objects tab reads the *export* endpoint, which the backend guards with
  // `export.quantification`. The aggregated summary is not guarded that way — any member
  // who can see the dataset can see it — so gating the whole page on the export permission
  // would take the overview away from people who are entitled to it. The gate belongs on
  // the one tab that actually needs it, matching what the server enforces.
  const { can } = usePermissions(datasetId);
  const canExport = can(Permission.EXPORT_QUANTIFICATION);

  const catalogMap = buildMetricCatalogMap(catalog);

  // Identifies the row set: everything that changes which contours are exported and which
  // columns they carry. The viewer reuses its loaded table while this holds steady.
  const dataKey = `${datasetId}:${activeProfileId}:${includeInProgress}:${includeUnreviewed}`;

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

  // The aggregated summary drives the overview and the two banners, so it is loaded for
  // every visit. Distribution stats are no longer requested: they existed to feed the
  // hand-rolled box/violin plots, and Perspective derives distributions from the raw rows.
  useEffect(() => {
    if (!datasetId || activeProfileId === null) return;
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getQuantificationSummary(parseInt(datasetId), {
          profileId: activeProfileId,
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
      }
    };
    loadData();
  }, [datasetId, activeProfileId, includeInProgress, includeUnreviewed]);

  // The per-contour rows.
  //
  // Fetched as soon as the page knows what to ask for, rather than waiting for the Data
  // tab to be clicked. Everything expensive here — the request, the engine chunk, building
  // the table — used to happen *after* the click, so the entire cost landed as dead time
  // in front of someone who had already decided what they wanted. Starting it while they
  // read the overview moves that cost off the interaction.
  //
  // Fetched once per `dataKey` and then kept: an earlier version re-ran this on every tab
  // switch, which repeatedly paid for an endpoint that recomputes stale metrics server-side
  // before it answers.
  useEffect(() => {
    if (!datasetId || activeProfileId === null || !canExport) return;
    // Already have (or are fetching) the rows for exactly this data.
    if (loadedRowsKeyRef.current === dataKey) return;
    loadedRowsKeyRef.current = dataKey;

    let cancelled = false;
    const loadRows = async () => {
      try {
        setRowsState({ loading: true, error: null, message: null });
        const result = await fetchQuantificationRows(parseInt(datasetId), {
          profileId: activeProfileId,
          excludeNotFullyAnnotated: !includeInProgress,
          excludeUnreviewed: !includeUnreviewed,
        });
        if (cancelled) return;
        setRows(result.rows);
        setRowsState({ loading: false, error: null, message: result.message });
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading per-contour quantifications:", err);
        // Clear the guard so switching back retries rather than showing a stale error.
        loadedRowsKeyRef.current = null;
        setRows(null);
        setRowsState({ loading: false, error: err.message || "Failed to load rows", message: null });
      }
    };
    loadRows();
    return () => {
      cancelled = true;
    };
  }, [dataKey, canExport, datasetId, activeProfileId, includeInProgress, includeUnreviewed]);

  // Start fetching the Perspective chunk immediately too, for the same reason. It is
  // several megabytes of engine and it is the other half of the wait; pulling it while the
  // overview is on screen means the Data tab has it in the module cache by the time it is
  // clicked. `React.lazy` dedupes with this, so the tab's own import resolves instantly.
  useEffect(() => {
    if (!canExport) return;
    const warm = () => import("../components/quantification/QuantificationExplorer");
    // Behind idle time so it never competes with the summary render or the rows request.
    const idle = window.requestIdleCallback;
    if (idle) {
      const handle = idle(warm, { timeout: 2000 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = setTimeout(warm, 200);
    return () => clearTimeout(timer);
  }, [canExport]);

  const reloadProfiles = useCallback(
    async (selectId = null) => {
      const res = await getQuantificationProfiles(parseInt(datasetId));
      const loaded = res.profiles || [];
      setProfiles(loaded);
      // Editing a profile changes which metric columns exist, which can leave a saved
      // viewer configuration referring to columns that are gone.
      clearViewerConfigsForDataset(datasetId);
      if (selectId !== null) {
        setActiveProfileId(selectId);
      } else if (!loaded.find((p) => p.id === activeProfileId)) {
        const def = loaded.find((p) => p.is_default) || loaded[0];
        setActiveProfileId(def ? def.id : null);
      }
    },
    [datasetId, activeProfileId, clearViewerConfigsForDataset]
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
  const hasUnlabeled = unlabeledMetrics && Object.keys(unlabeledMetrics).length > 0;

  const isDataTab = activeTab === "data";

  /** The data explorer, plus every state it can be in before it can be shown. */
  const renderExploreSurface = () => {
    if (rowsState.loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acLn mx-auto mb-4"></div>
            <p className="text-t2">Loading objects…</p>
            <p className="text-sm text-t3 mt-1">
              Measurements are computed on demand, so this can take a moment the first time.
            </p>
          </div>
        </div>
      );
    }

    if (rowsState.error) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-start gap-3 rounded-lg border border-errLn bg-errBg px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-err" />
            <p className="text-sm text-err">{rowsState.error}</p>
          </div>
        </div>
      );
    }

    // No rows is not an error: it is what the inclusion toggles do, and the reason has to
    // be given here too or the tab is just an empty grid.
    if (!rows || rows.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-lg text-center">
            <p className="text-t2 mb-2">No objects to show.</p>
            <p className="text-sm text-t3">
              {totalCensus > 0
                ? "This dataset has annotated objects, but they are excluded because their masks are not marked fully-annotated and/or the objects are unreviewed. Use the toggles above to include them."
                : rowsState.message ||
                  "Nothing in this dataset has been annotated and reviewed yet."}
            </p>
          </div>
        </div>
      );
    }

    return (
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acLn mx-auto mb-4"></div>
              <p className="text-t2">Loading the data explorer…</p>
            </div>
          </div>
        }
      >
        <QuantificationExplorer
          datasetId={datasetId}
          profileId={activeProfileId}
          dataKey={dataKey}
          rows={rows}
          theme={theme}
        />
      </Suspense>
    );
  };

  return (
    <DatasetManagementLayout>
      <div className="h-full flex flex-col bg-p1">
        {/* Page Header */}
        <div className="bg-p1 border-b border-ln flex-shrink-0">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-t1">Dataset Quantifications</h1>
              </div>
              <div className="flex items-center space-x-3">
                {canExport && (
                  <button
                    onClick={handleExport}
                    className="flex items-center space-x-2 px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Quantification</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile selector + inclusion toggles */}
        <div className="bg-p1 border-b border-ln flex-shrink-0">
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
                {activeTab === "overview" && (
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
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Surfaces. Overview is the cheap aggregated read; Table and Explore are the same
            per-contour rows viewed two ways, and are gated on the export permission the
            endpoint behind them requires. */}
        <div className="bg-p1 border-b border-ln flex-shrink-0">
          <div className="px-4 sm:px-6 lg:px-8 flex items-center gap-1">
            <TabButton
              icon={LayoutGrid}
              label="Overview"
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            />
            {canExport && (
              <TabButton
                icon={Table2}
                label="Objects"
                active={activeTab === "data"}
                onClick={() => setActiveTab("data")}
              />
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex-shrink-0">
            <ScaleWarningBanner scaleStatus={data.scale_status} />

            {allFilteredOut && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-acLn bg-acS px-4 py-3">
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

            {/* The export query inner-joins the label table, so an object with no label has
                no row to appear in — on either explore surface or in the CSV. Said plainly
                here because the overview *does* count those objects, and a total that
                disagrees with the table is otherwise just confusing. */}
            {isDataTab && hasUnlabeled && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-ln bg-well px-4 py-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-t3" />
                <p className="text-sm text-t2">
                  Objects without a label are not included here, matching the CSV export.
                  Their measurements are on the{" "}
                  <button
                    onClick={() => setActiveTab("overview")}
                    className="font-medium text-ac hover:underline"
                  >
                    Overview
                  </button>{" "}
                  tab, under Unlabeled Objects.
                </p>
              </div>
            )}
          </div>

          {activeTab === "overview" ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <SummaryCards data={data} labelIdToName={labelIdToName} />

              {/* Label hierarchy and metrics. Kept as its own view rather than folded into
                  the Objects tab: the parent/child structure and the child-object
                  counts are not columns of the per-contour table, and Perspective's
                  group-by is flat, so nothing over there can show them. */}
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
              {hasUnlabeled && (
                <div className="bg-p1 rounded-lg shadow-sm border border-ln p-6 mb-6">
                  <h2 className="text-lg font-semibold text-t1 mb-4">Unlabeled Objects</h2>
                  <p className="text-sm text-t2 mb-4">
                    Metrics for objects that do not have an assigned label. These are the only
                    place in the app these objects are measured — the object table and the CSV
                    export both exclude them.
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
          ) : (
            renderExploreSurface()
          )}
        </div>
      </div>
    </DatasetManagementLayout>
  );
};

export default QuantificationPage;
