import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListOrdered, Loader2, Play, RotateCcw, SquarePen, X } from "lucide-react";
import {
  buildAnnotationQueue,
  cancelQueuePrepJob,
  clearRecommendedQueue,
  fetchAnnotationQueue,
  fetchAnnotationQueueSummary,
  fetchQueueModels,
  fetchQueuePrepJob,
  prepareAnnotationQueue,
  saveRecommendedQueue,
} from "../../../api";
import { isAiToolEnabled } from "../../../utils/aiTools";
import useDatasetMetadata from "../../../hooks/useDatasetMetadata";
import { usePermissions } from "../../../hooks/usePermissions";
import { Permission } from "../../../utils/permissions";
import QueueHelpNote from "../../ui/QueueHelpNote";
import QueueBuilder, {
  ROUND_ROBIN, fieldClass, labelClass, sortPayload, sortStateFrom,
} from "../../queue/QueueBuilder";
import RecommendControls from "../../queue/RecommendControls";

/** Job states after which polling stops. */
const JOB_DONE = new Set(["succeeded", "partial", "cancelled", "failed"]);
const PREFERRED_EMBEDDER = "dinov3";
// The metadata hook falls back to deriving facets from images; this window has none loaded,
// so it passes a stable empty list and relies on the fetched facets.
const NO_IMAGES = [];
const NO_MODELS = { embedding: [], trained: [] };

/** Settings to start from: the saved queue's, otherwise the first method with sensible models. */
const initialSettings = (summary, models) => {
  const saved = summary.saved_settings || {};
  const embedders = models.embedding.map((m) => m.registry_key);
  return {
    ...sortStateFrom(saved, summary.methods),
    embeddingModel: saved.embedding_model
      || (embedders.includes(PREFERRED_EMBEDDER) ? PREFERRED_EMBEDDER : embedders[0]) || null,
    trainedModel: saved.trained_model || models.trained[0]?.registry_key || null,
    hideBuilder: saved.show_builder === false,
  };
};

/**
 * The step between the Annotation card and the editor: choose how images are sorted and
 * filtered, then build the queue -- or resume the one saved last time.
 *
 * Sorting and filters are the shared `QueueBuilder`; this window adds the models a method
 * needs (an embedding model, a trained model), "Don't show this again" and preparation:
 * before building, the backend fills in missing
 * vectors or scores in a background job, whose progress is shown here.
 *
 * Curators can save the current settings as the dataset's recommended queue; everyone can
 * start from it with "Use recommended queue" in the help note.
 *
 * With "Don't show this again" saved, opening the window resumes the saved queue straight
 * away; `forceChooser` (the "Change order" entry points) always shows the settings.
 *
 * @param {number} [pollMs] - How often to check a preparation job; tests shorten it.
 */
const AnnotationQueueModal = ({
  isOpen, onClose, dataset, onStart, forceChooser = false, pollMs = 2000,
}) => {
  const [summary, setSummary] = useState(null);
  const [models, setModels] = useState(NO_MODELS);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Neutral feedback that is not an error, e.g. after preparation was stopped.
  const [notice, setNotice] = useState(null);
  // A running preparation job (filling image vectors / model scores), shown as progress.
  const [prepJob, setPrepJob] = useState(null);
  // Set when the user leaves the wait (closing the window, or a shared job they cannot stop):
  // the poll loop ends and nothing is built or opened behind their back.
  const detachedRef = useRef(false);
  const { facets } = useDatasetMetadata(isOpen ? dataset?.id : null, NO_IMAGES);
  const { can } = usePermissions(dataset);
  const canRecommend = can(Permission.DATASET_UPDATE);

  const update = useCallback((patch) => setSettings((current) => ({ ...current, ...patch })), []);

  // Load the workload, methods, models and saved queue each time the window opens.
  useEffect(() => {
    if (!isOpen || !dataset?.id) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotice(null);
    setRecomputing(forceChooser);
    detachedRef.current = false;
    Promise.all([
      fetchAnnotationQueueSummary(dataset.id),
      fetchQueueModels(dataset.id).catch(() => null),
    ])
      .then(async ([summaryResponse, modelsResponse]) => {
        if (cancelled) return;
        if (!summaryResponse?.success) {
          setError("Could not load annotation options.");
          return;
        }
        const loadedSummary = summaryResponse.summary;
        const loadedModels = modelsResponse?.success ? modelsResponse.models : NO_MODELS;
        // "Don't show this again": go straight to the saved queue.
        if (!forceChooser && loadedSummary.has_saved_queue
            && loadedSummary.saved_settings?.show_builder === false) {
          const saved = await fetchAnnotationQueue(dataset.id);
          if (!cancelled && saved?.success && saved.queue?.image_ids?.length) {
            onStart(saved.queue.image_ids);
            return;
          }
        }
        setSummary(loadedSummary);
        setModels(loadedModels);
        setSettings(initialSettings(loadedSummary, loadedModels));
      })
      .catch(() => !cancelled && setError("Could not load annotation options."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // onStart is a fresh closure on every parent render; reloading on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dataset?.id, forceChooser]);

  const methods = useMemo(
    () => Object.fromEntries((summary?.methods || []).map((m) => [m.key, m])),
    [summary]
  );
  const batchInferenceOff = !isAiToolEnabled(dataset, "batch_inference");

  if (!isOpen) return null;

  /** Why a need cannot be met here, or null. */
  const blockedNeed = (need) => {
    if (need === "trained_model") {
      if (batchInferenceOff) {
        return "needs Batch inference, which is switched off for this dataset (Manage access, under Review policy)";
      }
      if (!models.trained.length) return "needs a model trained on this dataset";
    }
    if (need === "embedding_model" && !models.embedding.length) {
      return "needs an embedding model in the AI service";
    }
    return null;
  };
  const blockedMethod = (m) => m.needs.map(blockedNeed).find(Boolean) || null;
  const confidenceBlocked = blockedNeed("trained_model");

  const method = settings && methods[settings.method];
  const roundRobin = settings?.order === ROUND_ROBIN;
  const partner = roundRobin && methods[settings.roundRobinWith];
  // The confidence filter needs a model that predicts confidences on this dataset.
  const useConfidence = settings?.confidencePct != null && !confidenceBlocked;
  const needs = new Set([
    ...(method?.needs || []),
    ...(partner?.needs || []),
    ...(useConfidence ? ["trained_model"] : []),
  ]);
  const blocked = !method
    || Boolean(blockedMethod(method))
    || (roundRobin && (!partner || Boolean(blockedMethod(partner))))
    || (useConfidence && Boolean(confidenceBlocked));
  const hasSavedQueue = summary?.has_saved_queue;
  const noImages = summary != null && summary.total === 0;
  const showChooser = Boolean(settings) && (!hasSavedQueue || recomputing);

  const payload = () => ({
    ...sortPayload(settings, method, useConfidence),
    embedding_model: needs.has("embedding_model") ? settings.embeddingModel : null,
    trained_model: needs.has("trained_model") ? settings.trainedModel : null,
    show_builder: !settings.hideBuilder,
  });

  // Fills the builder with the recommendation; "Don't show this again" stays the user's own.
  const useRecommended = () => setSettings(initialSettings(
    { ...summary, saved_settings: { ...summary.recommended.settings, show_builder: !settings.hideBuilder } },
    models,
  ));

  const saveRecommended = async (reason) => {
    const body = payload();
    delete body.show_builder;
    const response = await saveRecommendedQueue("annotation", dataset.id, { settings: body, reason });
    setSummary((current) => ({ ...current, recommended: response.recommended }));
  };

  const clearRecommended = async () => {
    await clearRecommendedQueue("annotation", dataset.id);
    setSummary((current) => ({ ...current, recommended: null }));
  };

  const finish = (imageIds) => {
    if (!imageIds?.length) {
      setError("No images match these settings.");
      return;
    }
    onStart(imageIds);
  };

  const handleResume = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetchAnnotationQueue(dataset.id);
      if (response?.success && response.queue) finish(response.queue.image_ids);
      else setRecomputing(true);
    } catch (err) {
      setError(err.message || "Could not load the saved queue.");
    } finally {
      setBusy(false);
    }
  };

  // Polling (rather than a stream) keeps this window self-contained; preparation is short
  // on a typical dataset and the check is cheap.
  // Returns null when the user stopped waiting (see `detachedRef`).
  const waitForJob = async (job) => {
    let current = job;
    while (!JOB_DONE.has(current.status)) {
      if (detachedRef.current) return null;
      setPrepJob(current);
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      if (detachedRef.current) return null;
      current = (await fetchQueuePrepJob(dataset.id, current.id)).job;
    }
    setPrepJob(null);
    return current;
  };

  // Ask the backend to fill whatever the settings still need, wait for that job, then build.
  const handleBuild = async () => {
    if (blocked) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const body = payload();
    try {
      const prepared = await prepareAnnotationQueue(dataset.id, body);
      if (!prepared.ready && prepared.job) {
        const finished = await waitForJob(prepared.job);
        if (!finished) return;
        if (finished.status === "cancelled") {
          setNotice("Preparation stopped. Your saved queue was not changed.");
          return;
        }
        if (finished.status === "failed") {
          setError("Preparation stopped because the worker stopped responding. Try again.");
          return;
        }
      }
      const response = await buildAnnotationQueue(dataset.id, body);
      if (response?.success && response.queue) finish(response.queue.image_ids);
      else setError("Could not build the queue.");
    } catch (err) {
      // The shared API helper prefixes every message for logs; the sentence is enough here.
      setError((err.message || "Could not build the queue.").replace(/^API Error: /, ""));
    } finally {
      setBusy(false);
      setPrepJob(null);
    }
  };

  // Stops the job when this user started it. A job is shared with everyone who asked for
  // the same preparation, so for anyone else the server refuses and we only stop waiting.
  const handleCancelPrep = async () => {
    if (!prepJob) return;
    try {
      await cancelQueuePrepJob(dataset.id, prepJob.id);
    } catch (err) {
      detachedRef.current = true;
      setPrepJob(null);
      setNotice((err.message || "Stopped waiting for the preparation.").replace(/^API Error: /, ""));
    }
  };

  // Closing only stops waiting. The job keeps filling vectors and scores, which are saved
  // and reused by the next build, and may be shared with other annotators; and the poll
  // loop must not build a queue or open the editor after the window is gone.
  const handleClose = () => {
    detachedRef.current = true;
    setPrepJob(null);
    onClose();
  };

  const modelSelect = (id, label, value, options, onChange, hint) => (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <select id={id} value={value || ""} onChange={(e) => onChange(e.target.value)}
        disabled={busy} className={fieldClass}>
        {options.map((m) => <option key={m.registry_key} value={m.registry_key}>{m.name}</option>)}
      </select>
      <p className="text-[11px] text-t3 mt-1">{hint}</p>
    </div>
  );

  const saved = summary?.saved_settings;
  const savedDescription = saved && [
    methods[saved.method]?.label || saved.method,
    saved.round_robin_with
      ? `alternating with ${methods[saved.round_robin_with]?.label || saved.round_robin_with}`
      : saved.direction,
  ].filter(Boolean).join(", ");

  return (
    // z-80: the window also opens inside the editor, whose floating action bar sits at z-70.
    <div className="fixed inset-0 z-[80] overflow-y-auto">
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
            {loading || !summary ? (
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
                {hasSavedQueue && !recomputing && (
                  <div className="rounded-xl border border-acLn bg-acS p-4">
                    <div className="text-sm font-semibold text-t1">Resume your saved queue</div>
                    <div className="text-sm text-t2 mt-0.5">
                      Sorted by <span className="font-medium">{savedDescription}</span>. You’ll
                      start at the first unfinished image.
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecomputing(true)}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ac hover:text-ac"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Change order
                    </button>
                  </div>
                )}

                {showChooser && (
                  <div className="space-y-4">
                    <QueueHelpNote kind="annotation" recommended={summary.recommended}
                      onUseRecommended={useRecommended} />

                    <QueueBuilder
                      unit={{ singular: "image", plural: "images" }}
                      methods={summary.methods}
                      settings={settings}
                      update={update}
                      facets={facets || []}
                      authors={summary.authors || []}
                      busy={busy}
                      blockedMethod={blockedMethod}
                      confidence={{ label: "Model confidence below", blocked: confidenceBlocked }}
                    >
                      {needs.has("embedding_model") && models.embedding.length > 0 && modelSelect(
                        "queue-embedder", "Embedding model", settings.embeddingModel, models.embedding,
                        (embeddingModel) => update({ embeddingModel }),
                        "Compares how images look. The first use computes a vector for every image."
                      )}
                      {needs.has("trained_model") && !confidenceBlocked && modelSelect(
                        "queue-model", "Trained model", settings.trainedModel, models.trained,
                        (trainedModel) => update({ trainedModel }),
                        "Scores unfinished images in the background. It does not add any objects."
                      )}
                    </QueueBuilder>

                    {canRecommend && (
                      <RecommendControls
                        recommended={summary.recommended}
                        onSave={saveRecommended}
                        onClear={clearRecommended}
                        unavailable={blocked ? "Pick settings that can run on this dataset first." : null}
                        busy={busy}
                      />
                    )}

                    <label className="flex items-center gap-2 text-sm text-t2">
                      <input type="checkbox" className="h-4 w-4" checked={settings.hideBuilder}
                        disabled={busy} onChange={(e) => update({ hideBuilder: e.target.checked })} />
                      Don’t show this again — open this queue directly next time
                    </label>
                  </div>
                )}

                {prepJob && (
                  <div className="space-y-1" role="status">
                    <div className="flex justify-between text-sm text-t2">
                      <span>Preparing images…</span>
                      <span className="tabular-nums">{prepJob.done} / {prepJob.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-well overflow-hidden">
                      <div className="h-full bg-accent"
                        style={{ width: `${prepJob.total ? (100 * prepJob.done) / prepJob.total : 0}%` }} />
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
              onClick={prepJob ? handleCancelPrep : handleClose}
              disabled={busy && !prepJob}
              className="px-4 py-2 text-sm font-medium text-t2 bg-p1 border border-ln2 rounded-lg hover:bg-hv transition-colors disabled:opacity-50"
            >
              {prepJob ? "Stop preparing" : "Cancel"}
            </button>
            {hasSavedQueue && !recomputing ? (
              <button
                onClick={handleResume}
                disabled={busy || loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-onAccent bg-accent rounded-lg hover:brightness-110 transition-colors disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Resume
              </button>
            ) : (
              <button
                onClick={handleBuild}
                disabled={busy || loading || noImages || !showChooser || blocked}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-onAccent bg-accent rounded-lg hover:brightness-110 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListOrdered className="w-4 h-4" />}
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
