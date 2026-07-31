import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  GraduationCap, Plus, Cpu, StopCircle, Loader2, ChevronDown, ChevronRight, Clock, Sparkles,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import DatasetManagementLayout from "../components/datasets/gallery/DatasetManagementLayout";
import { useDataset } from "../contexts/DatasetContext";
import DynamicHyperParameter from "../components/datasets/training/DynamicHyperParameter";
import {
  fetchLabels,
  getInstanceModels,
  getInstanceTrainingRuns,
  startInstanceTraining,
  cancelInstanceTraining,
  streamInstanceTrainingProgress,
} from "../api";
import useThemeColors from "../hooks/useThemeColors";

const TERMINAL = new Set(["SUCCESS", "FAILED", "CANCELLED"]);

const STATE_STYLE = {
  PROGRESS: "bg-acS text-ac",
  SUCCESS: "bg-okBg text-ok",
  FAILED: "bg-errBg text-err",
  CANCELLED: "bg-warnBg text-warn",
  starting: "bg-well text-t2",
};

const fmtTime = (ms) => (ms ? new Date(ms).toLocaleString() : "—");
const lastLoss = (snap) => (snap?.loss?.length ? snap.loss[snap.loss.length - 1].value : null);

function RunCard({ run, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-colors ${
        selected ? "border-acLn bg-acS" : "border-ln bg-p1 hover:bg-hv"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATE_STYLE[run.state] || STATE_STYLE.starting}`}>
          {run.state}
        </span>
        <span className="text-[11px] text-t3 flex items-center gap-1">
          <Clock size={11} /> {fmtTime(run.start_time)}
        </span>
      </div>
      <div className="text-xs text-t2">
        {(run.label_ids?.length ?? 0)} class{(run.label_ids?.length ?? 0) === 1 ? "" : "es"}
        {run.total_epochs ? ` · ${run.epoch}/${run.total_epochs} epochs` : ""}
        {lastLoss(run) != null ? ` · loss ${lastLoss(run).toFixed(3)}` : ""}
      </div>
    </button>
  );
}

function ProgressPanel({ snapshot, onStop, isStopping }) {
  const { colors } = useThemeColors();
  const total = snapshot.total_epochs || 0;
  const current = snapshot.epoch || 0;
  const percent = total ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const lossData = (snapshot.loss || []).map((d) => ({ epoch: d.epoch, loss: d.value }));
  const isActive = !TERMINAL.has(snapshot.state) && snapshot.state !== "starting";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-t2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATE_STYLE[snapshot.state] || STATE_STYLE.starting}`}>
          {snapshot.state}
        </span>
        {snapshot.state === "starting" ? (
          <span className="flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Waiting for worker…</span>
        ) : (
          <span className="flex items-center gap-1">
            <Cpu className="w-4 h-4 text-ac" /> Epoch {current}{total ? ` / ${total}` : ""}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="w-full bg-hv2 rounded h-2">
          <div className="bg-accent h-2 rounded" style={{ width: `${percent}%`, transition: "width 0.5s" }} />
        </div>
      )}

      {lossData.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-t1">Training loss</h3>
          <p className="text-[11px] text-t3 mb-2">
            Mask2Former combined loss (classification + mask + dice), averaged per epoch. Lower is better.
          </p>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lossData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.ln2} />
                <XAxis
                  dataKey="epoch"
                  tick={{ fontSize: 11, fill: colors.t2 }}
                  label={{ value: "epoch", position: "insideBottom", offset: -10, fontSize: 11, fill: colors.t3 }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: colors.t2 }}
                  width={56}
                  label={{ value: "loss", angle: -90, position: "insideLeft", fontSize: 11, fill: colors.t3 }}
                />
                <Tooltip
                  formatter={(value) => [Number(value).toFixed(4), "loss"]}
                  labelFormatter={(epoch) => `Epoch ${epoch}`}
                  contentStyle={{ backgroundColor: colors.p2, border: `1px solid ${colors.ln}`, borderRadius: '8px', color: colors.t1 }}
                  labelStyle={{ color: colors.t2 }}
                />
                <Line type="monotone" dataKey="loss" stroke={colors.ac} dot={false} name="Training loss" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="text-sm text-t3">No loss logged yet.</p>
      )}

      {isActive && (
        <button
          onClick={onStop}
          disabled={isStopping}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-onAccent bg-err rounded-lg hover:brightness-110 transition-colors disabled:opacity-60"
        >
          {isStopping ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
          {isStopping ? "Stopping…" : "Stop Training"}
        </button>
      )}
    </div>
  );
}

export default function ModelTrainingPage() {
  const { datasetId } = useParams();
  const { currentDataset } = useDataset();

  const [labels, setLabels] = useState([]);
  const [models, setModels] = useState([]);
  const [modelKey, setModelKey] = useState("mask2former");
  const [selectedLabelIds, setSelectedLabelIds] = useState(() => new Set());
  const [hyperValues, setHyperValues] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(true);

  const [runs, setRuns] = useState([]);
  const [mode, setMode] = useState("config"); // "config" | "run"
  const [selectedRun, setSelectedRun] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState(null);

  const streamRef = useRef(null);

  const selectedModel = useMemo(
    () => models.find((m) => m.registry_key === modelKey) || null,
    [models, modelKey]
  );

  const loadRuns = useCallback(async () => {
    try {
      const res = await getInstanceTrainingRuns(datasetId);
      setRuns(res.runs || []);
    } catch (e) {
      // non-fatal
    }
  }, [datasetId]);

  // Initial load: labels, models, runs.
  useEffect(() => {
    if (!datasetId) return;
    (async () => {
      try {
        const labelRes = await fetchLabels(datasetId);
        const idMap = labelRes?.labels?.id_to_label_object || {};
        const list = Object.values(idMap).map((l) => ({ id: l.id, name: l.name }));
        setLabels(list);
        setSelectedLabelIds(new Set(list.map((l) => l.id)));
      } catch (e) {
        setError(e.message || "Failed to load labels.");
      }
      try {
        const modelRes = await getInstanceModels();
        const list = Array.isArray(modelRes?.result) ? modelRes.result : [];
        setModels(list);
        if (list.length > 0) setModelKey(list[0].registry_key);
      } catch (e) {
        // fall back to default key
      }
    })();
    loadRuns();
  }, [datasetId, loadRuns]);

  // Initialize hyperparameter values from the selected model's declared defaults.
  useEffect(() => {
    if (!selectedModel) return;
    const defaults = {};
    (selectedModel.training_parameters || []).forEach((p) => { defaults[p.key] = p.default_value; });
    setHyperValues(defaults);
  }, [selectedModel]);

  // Stream progress for the active task; tear down on change/unmount.
  useEffect(() => {
    if (!activeTaskId) return;
    const controller = streamInstanceTrainingProgress(
      activeTaskId,
      (snap) => {
        setSelectedRun(snap);
        if (TERMINAL.has(snap.state)) {
          setActiveTaskId(null);
          loadRuns();
        }
      },
      (err) => setError(err.message || "Lost connection to training stream."),
    );
    streamRef.current = controller;
    return () => controller.abort();
  }, [activeTaskId, loadRuns]);

  const setHyper = (key, value) => setHyperValues((prev) => ({ ...prev, [key]: value }));

  const toggleLabel = (id) => setSelectedLabelIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleStart = async () => {
    setError(null);
    setIsStarting(true);
    try {
      const res = await startInstanceTraining({
        dataset_id: Number(datasetId),
        // Empty = all labels; sending the explicit selection keeps intent clear.
        label_ids: Array.from(selectedLabelIds),
        model_registry_key: modelKey,
        hyper_parameter: hyperValues,
      });
      setMode("run");
      setSelectedRun({ task_id: res.task_id, run_id: null, state: "starting", epoch: 0, total_epochs: null, loss: [], label_ids: Array.from(selectedLabelIds) });
      setActiveTaskId(res.task_id);
      loadRuns();
    } catch (err) {
      setError(err.message || "Failed to start training.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    if (!activeTaskId) return;
    setIsStopping(true);
    try {
      const snapshot = await cancelInstanceTraining(activeTaskId);
      setSelectedRun(snapshot);
    } catch (err) {
      setError(err.message || "Failed to stop training.");
      return;
    } finally {
      setIsStopping(false);
    }
    setActiveTaskId(null);
    loadRuns();
  };

  const handleSelectRun = (run) => {
    setMode("run");
    setSelectedRun(run);
    // Keep streaming a still-running run; otherwise show its static snapshot.
    setActiveTaskId(!TERMINAL.has(run.state) && run.task_id ? run.task_id : null);
  };

  const handleNewTraining = () => {
    setActiveTaskId(null);
    setSelectedRun(null);
    setMode("config");
  };

  const allSelected = labels.length > 0 && selectedLabelIds.size === labels.length;

  return (
    <DatasetManagementLayout>
      <div className="h-full flex flex-col bg-p1 overflow-hidden">
        {/* Header */}
        <div className="bg-p1 border-b border-ln px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-ac" />
          <div>
            <h1 className="text-2xl font-bold text-t1">Model Training</h1>
            <p className="text-sm text-t2">
              Train an instance segmentation model on {currentDataset?.name ? `“${currentDataset.name}”` : "this dataset"}.
            </p>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: run history */}
          <aside className="w-72 shrink-0 border-r border-ln flex flex-col">
            <div className="p-3 border-b border-ln">
              <button
                onClick={handleNewTraining}
                className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === "config" ? "bg-accent text-onAccent" : "bg-acS text-ac hover:bg-acS"
                }`}
              >
                <Plus size={16} /> New Training
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-t3 px-1">Run history</p>
              {runs.length === 0 && <p className="text-xs text-t3 px-1">No runs yet.</p>}
              {runs.map((run) => (
                <RunCard
                  key={run.run_id || run.task_id}
                  run={run}
                  selected={mode === "run" && selectedRun && (selectedRun.run_id === run.run_id)}
                  onClick={() => handleSelectRun(run)}
                />
              ))}
            </div>
          </aside>

          {/* Right: config or progress */}
          <main className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-errBg border border-errLn rounded-lg text-sm text-err">{error}</div>
            )}

            {mode === "run" && selectedRun ? (
              <div className="max-w-3xl">
                <ProgressPanel snapshot={selectedRun} onStop={handleStop} isStopping={isStopping} />
              </div>
            ) : (
              <div className="max-w-2xl space-y-6">
                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-t1 mb-1">Model</label>
                  <select
                    value={modelKey}
                    onChange={(e) => setModelKey(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-ln2 rounded-lg focus:ring-2 focus:ring-ac focus:border-transparent"
                  >
                    {models.length === 0 && <option value="mask2former">Mask2Former</option>}
                    {models.map((m) => (
                      <option key={m.registry_key} value={m.registry_key}>{m.name || m.registry_key}</option>
                    ))}
                  </select>
                  {selectedModel?.description && (
                    <p className="text-[11px] text-t3 mt-1 line-clamp-2">{selectedModel.description}</p>
                  )}
                </div>

                {/* Labels */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-t1">Classes to train ({selectedLabelIds.size}/{labels.length})</label>
                    <button
                      type="button"
                      onClick={() => setSelectedLabelIds(allSelected ? new Set() : new Set(labels.map((l) => l.id)))}
                      className="text-xs text-ac hover:underline"
                    >
                      {allSelected ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto border border-ln rounded-lg divide-y divide-ln">
                    {labels.length === 0 && <p className="text-xs text-t3 p-3">This dataset has no labels.</p>}
                    {labels.map((l) => (
                      <label key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-hv">
                        <input type="checkbox" checked={selectedLabelIds.has(l.id)} onChange={() => toggleLabel(l.id)} className="h-4 w-4" />
                        {l.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-t3 mt-1">Multiclass by default — all labels are selected. Deselect to train a smaller model.</p>
                </div>

                {/* Advanced (model-declared params) */}
                {(selectedModel?.training_parameters?.length ?? 0) > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((s) => !s)}
                      className="flex items-center gap-1 text-sm font-medium text-t2 hover:text-t1"
                    >
                      {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Training parameters
                    </button>
                    {showAdvanced && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedModel.training_parameters.map((p) => (
                          <DynamicHyperParameter key={p.key} param={p} value={hyperValues[p.key]} onChange={setHyper} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Auto-train (coming soon) */}
                <div className="p-4 rounded-xl border border-dashed border-ln2 bg-well">
                  <div className="flex items-center gap-2 text-sm font-medium text-t2">
                    <Sparkles size={16} className="text-t3" />
                    Automated training triggers
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-hv2 text-t3 px-2 py-0.5 rounded-full">Coming soon</span>
                  </div>
                  <p className="text-xs text-t3 mt-1">Automatically retrain as new images are fully annotated.</p>
                </div>

                <button
                  onClick={handleStart}
                  disabled={isStarting || selectedLabelIds.size === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-onAccent bg-accent rounded-lg hover:brightness-110 transition-colors disabled:opacity-60"
                >
                  {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                  {isStarting ? "Starting…" : "Start Training"}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </DatasetManagementLayout>
  );
}
