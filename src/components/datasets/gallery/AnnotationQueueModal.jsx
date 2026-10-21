import React, { useEffect, useState } from "react";
import {
  ArrowDownUp,
  Gauge,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  SquarePen,
  X,
} from "lucide-react";
import {
  buildAnnotationQueue,
  cancelQueuePrepJob,
  fetchAnnotationQueue,
  fetchAnnotationQueueSummary,
  fetchQueuePrepJob,
  fetchScoringModels,
  prepareAnnotationQueue,
} from "../../../api";
import { isAiToolEnabled } from "../../../utils/aiTools";

/** Icon per ordering strategy; falls back to the generic reorder icon. */
const STRATEGY_ICONS = {
  as_uploaded: ArrowDownUp,
  random: Shuffle,
  diversity: Sparkles,
  density: Layers,
  uncertainty: Gauge,
};

/** Job states after which polling stops. */
const JOB_DONE = new Set(["succeeded", "partial", "cancelled"]);

/**
 * The step between the Annotation card and the editor: choose the order images
 * are annotated in (as uploaded, randomized, or an active-learning ordering) and
 * build the queue, or resume the one saved from last time.
 *
 * Model-based orderings score images with a model trained on this dataset. Before
 * building, the backend fills in any missing image vectors or scores in a background
 * job, whose progress is shown here.
 *
 * The built order is persisted per (dataset, user) on the backend; `onStart` is
 * called with the ordered image ids so the caller can jump into the editor. The
 * editor's loader re-reads the saved queue, so the order survives a refresh even
 * though we hand it over here to avoid a reorder flash.
 *
 * @param {number} [pollMs] - How often to check a preparation job; tests shorten it.
 */
const AnnotationQueueModal = ({ isOpen, onClose, dataset, onStart, pollMs = 2000 }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState(null);
  // Even when a queue is saved, let the user drop into the chooser to rebuild it.
  const [recomputing, setRecomputing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Models trained on this dataset; the model-based orderings score with one of them.
  const [models, setModels] = useState([]);
  const [modelKey, setModelKey] = useState("");
  // A running preparation job (filling image vectors / model scores), shown as progress.
  const [prepJob, setPrepJob] = useState(null);
  // Neutral feedback that is not an error, e.g. after preparation was stopped.
  const [notice, setNotice] = useState(null);

  // Load the workload, saved-queue state and scoring models each time the modal opens.
  useEffect(() => {
    if (!isOpen || !dataset?.id) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotice(null);
    setRecomputing(false);
    fetchAnnotationQueueSummary(dataset.id)
      .then((response) => {
        if (cancelled) return;
        if (response?.success) {
          setSummary(response.summary);
          const available = (response.summary.strategies || []).filter((s) => s.available);
          setStrategy(response.summary.saved_strategy || available[0]?.key || null);
          // Functional, so it cannot wipe a model the models request already picked.
          setModelKey((current) => response.summary.saved_model_key || current);
        } else {
          setError("Could not load annotation options.");
        }
      })
      .catch(() => !cancelled && setError("Could not load annotation options."))
      .finally(() => !cancelled && setLoading(false));
    fetchScoringModels(dataset.id)
      .then((response) => {
        if (cancelled) return;
        const list = response?.success ? response.models || [] : [];
        setModels(list);
        setModelKey((current) => current || list[0]?.registry_key || "");
      })
      .catch(() => !cancelled && setModels([]));
    return () => {
      cancelled = true;
    };
  }, [isOpen, dataset?.id]);

  if (!isOpen) return null;

  const strategies = summary?.strategies || [];
  const hasSavedQueue = summary?.has_saved_queue;
  const noImages = summary != null && summary.total === 0;
  // The chooser shows either when nothing is saved, or the user asked to rebuild.
  const showChooser = !hasSavedQueue || recomputing;
  const selected = strategies.find((s) => s.key === strategy);
  const needsModel = Boolean(selected?.needs_model);
  const noModels = models.length === 0;
  // Model-based orderings score images by running the model over the dataset, which the
  // dataset's Batch inference switch governs (the backend refuses it when off).
  const batchInferenceOff = !isAiToolEnabled(dataset, "batch_inference");

  const finish = (imageIds) => {
    if (!imageIds || imageIds.length === 0) {
      setError("This dataset has no images to annotate.");
      return;
    }
    onStart(imageIds);
  };

  const handleResume = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetchAnnotationQueue(dataset.id);
      if (response?.success && response.queue) {
        finish(response.queue.image_ids);
      } else {
        // The saved queue vanished (e.g. cleared elsewhere) — fall back to building.
        setRecomputing(true);
      }
    } catch (err) {
      setError(err.message || "Could not load the saved queue.");
    } finally {
      setBusy(false);
    }
  };

  // Polling (rather than a stream) keeps this modal self-contained; preparation is
  // short on a typical dataset and the check is cheap.
  const waitForJob = async (job) => {
    let current = job;
    while (!JOB_DONE.has(current.status)) {
      setPrepJob(current);
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      const response = await fetchQueuePrepJob(dataset.id, current.id);
      current = response.job;
    }
    setPrepJob(null);
    return current;
  };

  // Ask the backend to fill whatever the ordering still needs, wait for that job, then build.
  const handleBuild = async () => {
    if (!strategy || (needsModel && (!modelKey || batchInferenceOff))) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const options = { strategy, model_key: needsModel ? modelKey : null };
    try {
      const prepared = await prepareAnnotationQueue(dataset.id, options);
      if (!prepared.ready && prepared.job) {
        const finished = await waitForJob(prepared.job);
        if (finished.status === "cancelled") {
          setNotice("Preparation stopped. Your saved queue was not changed.");
          return;
        }
      }
      const response = await buildAnnotationQueue(dataset.id, options);
      if (response?.success && response.queue) {
        finish(response.queue.image_ids);
      } else {
        setError("Could not build the queue.");
      }
    } catch (err) {
      // The shared API helper prefixes every message for logs; the sentence is enough here.
      setError((err.message || "Could not build the queue.").replace(/^API Error: /, ""));
    } finally {
      setBusy(false);
      setPrepJob(null);
    }
  };

  const handleCancelPrep = async () => {
    if (!prepJob) return;
    await cancelQueuePrepJob(dataset.id, prepJob.id);
  };

  // Closing while images are being prepared stops the job too. Otherwise the polling loop
  // would keep running unseen and open the editor when the job finished.
  const handleClose = () => {
    if (prepJob) handleCancelPrep();
    onClose();
  };

  const savedStrategyLabel =
    strategies.find((s) => s.key === summary?.saved_strategy)?.label || summary?.saved_strategy;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        <div className="fixed inset-0 bg-scrim transition-opacity" onClick={handleClose} />

        <div className="relative inline-block w-full max-w-lg text-left align-middle bg-p1 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="relative bg-p2 border-b border-ln px-6 py-5 text-t1">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 rounded-lg text-t3 hover:text-t1 hover:bg-hv2 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 pr-8">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-hv shrink-0">
                <SquarePen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Annotate images</h3>
                <p className="text-sm text-t3 mt-0.5">
                  Choose the order to work through{" "}
                  {dataset?.name ? `“${dataset.name}”` : "this dataset"}.
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4 min-h-[8rem]">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-t3">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading…
              </div>
            ) : noImages ? (
              <div className="p-4 bg-warnBg border border-warnLn rounded-lg text-sm text-warn">
                This dataset has no images yet. Upload some from Data Management first.
              </div>
            ) : (
              <>
                {/* Resume state: offer to pick up the saved order, with a way to rebuild. */}
                {hasSavedQueue && !recomputing && (
                  <div className="rounded-xl border border-acLn bg-acS p-4">
                    <div className="text-sm font-semibold text-t1">
                      Resume your saved queue
                    </div>
                    <div className="text-sm text-t2 mt-0.5">
                      Ordered <span className="font-medium">{savedStrategyLabel}</span>. You’ll
                      start at the first unfinished image.
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecomputing(true)}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ac hover:text-ac"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Change or recompute order
                    </button>
                  </div>
                )}

                {/* Ordering chooser. */}
                {showChooser && (
                  <div className="space-y-2">
                    {hasSavedQueue && (
                      <div className="text-sm font-semibold text-t2">Pick a new order</div>
                    )}
                    {strategies.map((option) => {
                      const Icon = STRATEGY_ICONS[option.key] || ArrowDownUp;
                      const active = strategy === option.key;
                      const needsMissingModel = option.needs_model && noModels;
                      const needsBatchInference = option.needs_model && batchInferenceOff;
                      const disabled = !option.available || needsMissingModel || needsBatchInference;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          disabled={disabled}
                          onClick={() => setStrategy(option.key)}
                          className={`w-full text-left rounded-xl border-2 p-3 transition-all flex items-start gap-3 ${
                            disabled
                              ? "border-ln bg-well cursor-not-allowed opacity-70"
                              : active
                                ? "border-acLn bg-acS shadow-sm"
                                : "border-ln bg-p1 hover:border-acLn"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 mt-0.5 shrink-0 ${
                              active && !disabled ? "text-ac" : "text-t3"
                            }`}
                          />
                          <span className="flex-1">
                            <span className="flex items-center gap-2">
                              <span className="font-semibold text-t1">{option.label}</span>
                              {!option.available && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-hv2 text-t2 text-[11px] font-medium">
                                  Coming soon
                                </span>
                              )}
                            </span>
                            <span className="block text-sm text-t2 leading-snug">
                              {option.description}
                            </span>
                            {needsBatchInference ? (
                              <span className="block text-xs text-t3 mt-0.5">
                                Needs Batch inference, which is switched off for this dataset
                                (Manage access, under Review policy)
                              </span>
                            ) : needsMissingModel && (
                              <span className="block text-xs text-t3 mt-0.5">
                                Needs a model trained on this dataset
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {showChooser && needsModel && !noModels && !batchInferenceOff && (
                  <div>
                    <label htmlFor="queue-model" className="block text-sm font-medium text-t1 mb-1">
                      Model
                    </label>
                    <select
                      id="queue-model"
                      value={modelKey}
                      onChange={(e) => setModelKey(e.target.value)}
                      disabled={busy}
                      className="w-full px-3 py-2 text-sm border border-ln2 rounded-lg bg-p1"
                    >
                      {models.map((m) => (
                        <option key={m.registry_key} value={m.registry_key}>{m.name}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-t3 mt-1">
                      The model scores unfinished images in the background. It does not add any objects.
                    </p>
                  </div>
                )}

                {prepJob && (
                  <div className="space-y-1" role="status">
                    <div className="flex justify-between text-sm text-t2">
                      <span>Preparing images…</span>
                      <span className="tabular-nums">{prepJob.done} / {prepJob.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-well overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${prepJob.total ? (100 * prepJob.done) / prepJob.total : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {notice && (
                  <div className="p-3 bg-well border border-ln rounded-lg text-sm text-t2" role="status">
                    {notice}
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-errBg border border-errLn rounded-lg text-sm text-err">
                    {error}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 bg-well border-t border-ln">
            {/* While images are being prepared this stops the job; otherwise it closes. */}
            <button
              onClick={prepJob ? handleCancelPrep : onClose}
              disabled={busy && !prepJob}
              className="px-4 py-2 text-sm font-medium text-t2 bg-p1 border border-ln2 rounded-lg hover:bg-hv transition-colors disabled:opacity-50"
            >
              {prepJob ? "Stop preparing" : "Cancel"}
            </button>
            {!loading && !noImages && hasSavedQueue && !recomputing ? (
              <button
                onClick={handleResume}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-onAccent bg-accent rounded-lg hover:brightness-110 transition-colors disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Resume
              </button>
            ) : (
              <button
                onClick={handleBuild}
                disabled={busy || loading || noImages || !strategy || (needsModel && (!modelKey || batchInferenceOff))}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-onAccent bg-accent rounded-lg hover:brightness-110 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {prepJob ? "Preparing…" : busy ? "Building…" : "Build queue & start"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotationQueueModal;
