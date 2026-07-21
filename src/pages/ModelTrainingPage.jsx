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

const TERMINAL = new Set(["SUCCESS", "FAILED"]);

const STATE_STYLE = {
  PROGRESS: "bg-blue-100 text-blue-700",
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  starting: "bg-gray-100 text-gray-600",
};

const fmtTime = (ms) => (ms ? new Date(ms).toLocaleString() : "—");
const lastLoss = (snap) => (snap?.loss?.length ? snap.loss[snap.loss.length - 1].value : null);

function RunCard({ run, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-colors ${
        selected ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATE_STYLE[run.state] || STATE_STYLE.starting}`}>
          {run.state}
        </span>
        <span className="text-[11px] text-gray-400 flex items-center gap-1">
          <Clock size={11} /> {fmtTime(run.start_time)}
        </span>
      </div>
      <div className="text-xs text-gray-600">
        {(run.label_ids?.length ?? 0)} class{(run.label_ids?.length ?? 0) === 1 ? "" : "es"}
        {run.total_epochs ? ` · ${run.epoch}/${run.total_epochs} epochs` : ""}
        {lastLoss(run) != null ? ` · loss ${lastLoss(run).toFixed(3)}` : ""}
      </div>
    </button>
  );
}

function ProgressPanel({ snapshot, onStop, isStopping }) {
  const total = snapshot.total_epochs || 0;
  const current = snapshot.epoch || 0;
  const percent = total ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const lossData = (snapshot.loss || []).map((d) => ({ epoch: d.epoch, loss: d.value }));
  const isActive = !TERMINAL.has(snapshot.state) && snapshot.state !== "starting";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATE_STYLE[snapshot.state] || STATE_STYLE.starting}`}>
          {snapshot.state}
        </span>
        {snapshot.state === "starting" ? (
          <span className="flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Waiting for worker…</span>
        ) : (
          <span className="flex items-center gap-1">
            <Cpu className="w-4 h-4 text-indigo-600" /> Epoch {current}{total ? ` / ${total}` : ""}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="w-full bg-gray-200 rounded h-2">
          <div className="bg-indigo-500 h-2 rounded" style={{ width: `${percent}%`, transition: "width 0.5s" }} />
        </div>
      )}

      {lossData.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Training loss</h3>
          <p className="text-[11px] text-gray-500 mb-2">
            Mask2Former combined loss (classification + mask + dice), averaged per epoch. Lower is better.
          </p>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lossData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="epoch"
                  tick={{ fontSize: 11 }}
                  label={{ value: "epoch", position: "insideBottom", offset: -10, fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  width={56}
                  label={{ value: "loss", angle: -90, position: "insideLeft", fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => [Number(value).toFixed(4), "loss"]}
                  labelFormatter={(epoch) => `Epoch ${epoch}`}
                />
                <Line type="monotone" dataKey="loss" stroke="#6366F1" dot={false} name="Training loss" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No loss logged yet.</p>
      )}

      {isActive && (
        <button
          onClick={onStop}
          disabled={isStopping}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
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
      await cancelInstanceTraining(activeTaskId);
    } catch (e) {
      // run may already be terminal
    }
    setActiveTaskId(null);
    setIsStopping(false);
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
      <div className="h-full flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Model Training</h1>
            <p className="text-sm text-gray-600">
              Train an instance segmentation model on {currentDataset?.name ? `“${currentDataset.name}”` : "this dataset"}.
            </p>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: run history */}
          <aside className="w-72 shrink-0 border-r border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <button
                onClick={handleNewTraining}
                className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === "config" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                <Plus size={16} /> New Training
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-1">Run history</p>
              {runs.length === 0 && <p className="text-xs text-gray-400 px-1">No runs yet.</p>}
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
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            {mode === "run" && selectedRun ? (
              <div className="max-w-3xl">
                <ProgressPanel snapshot={selectedRun} onStop={handleStop} isStopping={isStopping} />
              </div>
            ) : (
              <div className="max-w-2xl space-y-6">
                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Model</label>
                  <select
                    value={modelKey}
                    onChange={(e) => setModelKey(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {models.length === 0 && <option value="mask2former">Mask2Former</option>}
                    {models.map((m) => (
                      <option key={m.registry_key} value={m.registry_key}>{m.name || m.registry_key}</option>
                    ))}
                  </select>
                  {selectedModel?.description && (
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{selectedModel.description}</p>
                  )}
                </div>

                {/* Labels */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-800">Classes to train ({selectedLabelIds.size}/{labels.length})</label>
                    <button
                      type="button"
                      onClick={() => setSelectedLabelIds(allSelected ? new Set() : new Set(labels.map((l) => l.id)))}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {allSelected ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {labels.length === 0 && <p className="text-xs text-gray-400 p-3">This dataset has no labels.</p>}
                    {labels.map((l) => (
                      <label key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={selectedLabelIds.has(l.id)} onChange={() => toggleLabel(l.id)} className="h-4 w-4" />
                        {l.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Multiclass by default — all labels are selected. Deselect to train a smaller model.</p>
                </div>

                {/* Advanced (model-declared params) */}
                {(selectedModel?.training_parameters?.length ?? 0) > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((s) => !s)}
                      className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
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
                <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Sparkles size={16} className="text-gray-400" />
                    Automated training triggers
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Coming soon</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Automatically retrain as new images are fully annotated.</p>
                </div>

                <button
                  onClick={handleStart}
                  disabled={isStarting || selectedLabelIds.size === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
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
