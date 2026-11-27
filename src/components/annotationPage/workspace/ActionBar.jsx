import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Layers,
  Loader2,
  Palette,
  Pencil,
  PenLine,
  RotateCcw,
  Ruler,
  SlidersHorizontal,
  Shapes,
  Sparkles,
  SkipForward,
  Tag,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import BarButton from './BarButton';
import LabelPicker from './LabelPicker';
import RejectMaskModal from '../modals/RejectMaskModal';
import useActionBarState from './useActionBarState';
import useObjectActions from './useObjectActions';
import useLabelAssignment from './useLabelAssignment';
import useAddShapesAsObjects from './useAddShapesAsObjects';
import useSupportedPromptTypes from './useSupportedPromptTypes';
import { useLabelSegmentation } from './LabelSegmentationContext';
import useRailTools from './useRailTools';
import useInferenceProgress from './useInferenceProgress';
import useInferenceColors from '../canvas/useInferenceColors';
import { CALIBRATION_KIND_ICONS, getPromptAction } from './toolModel';
import { formatArea, getObjectDisplayName, getObjectState } from './objectViewModel';
import { resolveLabelColor } from './labelColorUtils';
import { getContourId } from '../../../utils/objectUtils';
import { trackAnnotation, trackSuggestionVerdict } from '../../../services/activityLog';
import { rejectMask } from '../../../api/reviews';
import { useReviewSession } from '../../../contexts/ReviewSessionContext';
import useAiTools from '../../../hooks/useAiTools';
import useAISegmentation from '../../../hooks/useAISegmentation';
import annotationSession from '../../../services/annotationSession';
import { useToast } from '../../../contexts/ToastContext';
import {
  useAIPrompts,
  useClearAllPrompts,
  useClearSelection,
  useSelectObject,
  useAvailablePromptedModels,
  usePromptedModel,
  useSetPromptedModel,
  usePicker,
  useSetPicker,
  useSetActiveCalibrationKind,
  useSetLeftDrawerOpen,
  useImageScale,
  useDatasetLabels,
  useLabelColorOverrides,
  useCurrentMaskId,
  useObjectsList,
  useUpdateObject,
  useRefinementModeActive,
  useInferenceRun,
} from '../../../stores/selectors/annotationSelectors';
import { useCurrentImage, useTimelineOpen } from '../../../stores/selectors/annotationSelectors';
import { TIMELINE_HEIGHT } from './stack/TimelineDrawer';

/** Icons for the three prompt actions, keyed as PROMPT_ACTIONS names them. */
const ACTION_ICONS = { Ban, Sparkles, Pencil };

const RUN_COPY = {
  segment: 'Segmenting…',
  refine: 'Refining object…',
  suggest: 'Finding similar instances…',
  instance: 'Detecting instances…',
};

/** Small coloured dot that precedes the bar's context label. */
/** The same per-kind icons the rail uses, resolved to components for the bar. */
const CALIBRATION_BAR_ICONS = Object.fromEntries(
  Object.entries(CALIBRATION_KIND_ICONS).map(([kind, icon]) => [
    kind,
    { Ruler, Palette, SlidersHorizontal }[icon] || SlidersHorizontal,
  ])
);

/**
 * The send-back reasons offered on number keys, in shortcut order — `1` sends
 * the first. Values are the backend's `RejectionReason` vocabulary; the list is
 * fixed here rather than read from `/reviews/reasons` because a shortcut number
 * has to stay put however that catalogue grows. Every other reason, and any
 * note, goes through the dialog on the last key.
 */
const QUICK_SEND_BACK_REASONS = [
  { reason: 'bad_outline', title: 'Bad outline' },
  { reason: 'wrong_label', title: 'Wrong label' },
  { reason: 'merged_objects', title: 'Merged objects' },
  { reason: 'missing_parts', title: 'Parts are missing' },
];

/** The key that opens the full send-back dialog, one past the quick reasons. */
const OTHER_REASON_KEY = String(QUICK_SEND_BACK_REASONS.length + 1);

const Dot = ({ color, className = '' }) => (
  <span
    className={`w-[6px] h-[6px] rounded-full flex-none ${className}`}
    style={color ? { background: color } : undefined}
  />
);

/**
 * The dynamic action bar.
 *
 * One floating bar under the canvas that morphs to the current context. It
 * replaces the old in-canvas pills (`RunAIButton`, `SuggestSimilarButton`,
 * `AddAsObjectButton`) and surfaces the per-object actions that previously only
 * existed on row hover or in the context menu — both of which still work.
 *
 * See useActionBarState for how the state is derived, including why there is no
 * `draft` state on this backend.
 */
const ActionBar = () => {
  // The object timeline covers the bottom of a stack's canvas; the bar rides
  // above it rather than over its lanes.
  const timelineOpen = useTimelineOpen();
  const onStack = useCurrentImage()?.stackId != null;
  const liftAboveTimeline = timelineOpen && onStack;
  const bar = useActionBarState();
  const actions = useObjectActions();
  const labelling = useLabelAssignment();
  const labelSegmentation = useLabelSegmentation();
  const { isAdding, addShapes } = useAddShapesAsObjects();
  const supportedPromptTypes = useSupportedPromptTypes();
  const { promptAction, cyclePromptAction } = useRailTools();
  const { runSegmentation } = useAISegmentation();
  const { isEnabled: isToolEnabled } = useAiTools();
  const { addToast } = useToast();

  const prompts = useAIPrompts();
  const clearAllPrompts = useClearAllPrompts();
  const clearSelection = useClearSelection();
  const selectObject = useSelectObject();
  const availableModels = useAvailablePromptedModels();
  const promptedModel = usePromptedModel();
  const setPromptedModel = useSetPromptedModel();
  const picker = usePicker();
  const setPicker = useSetPicker();
  const setActiveCalibrationKind = useSetActiveCalibrationKind();
  const setLeftDrawerOpen = useSetLeftDrawerOpen();
  const scale = useImageScale();
  const labels = useDatasetLabels();
  const targetLabel = labels.find((label) => Number(label.id) === Number(labelSegmentation?.targetLabelId));
  const targetLabelState = targetLabel ? labelSegmentation?.getLabelState(targetLabel.id) : null;
  const colorOverrides = useLabelColorOverrides();
  const currentMaskId = useCurrentMaskId();
  const objects = useObjectsList();
  const updateObject = useUpdateObject();
  const refinementActive = useRefinementModeActive();
  const inferenceRun = useInferenceRun();
  const progress = useInferenceProgress(inferenceRun);
  const runColors = useInferenceColors(inferenceRun);

  const [query, setQuery] = useState('');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [sendBackFor, setSendBackFor] = useState(null);
  const [sendBackTrayOpen, setSendBackTrayOpen] = useState(false);
  const [sendingBack, setSendingBack] = useState(false);

  // A review session (built on the review setup page) decides which object the
  // bar asks about; without one the bar walks this image's pending objects.
  const { datasetId } = useParams();
  const session = useReviewSession();
  const inSession =
    session.active &&
    !session.pendingCompleteness &&
    String(session.datasetId) === String(datasetId);
  const instanceSession = inSession && !session.isImageMode;
  const sessionItem = instanceSession ? session.currentItem : null;
  const sessionMaskReady = Boolean(sessionItem) && currentMaskId === sessionItem.mask_id;
  const sessionSubject = useMemo(
    () =>
      sessionMaskReady
        ? objects.find(
            (object) => Number(getContourId(object)) === Number(sessionItem.contour_id)
          ) || null
        : null,
    [sessionMaskReady, sessionItem, objects]
  );
  // The queue item the canvas was last pointed at, so that happens once per item.
  const focusedSessionItemRef = useRef(null);

  const modelName =
    availableModels.find((model) => model.id === promptedModel)?.name || promptedModel || 'no model';

  /**
   * Whether the model can take what is on the canvas.
   *
   * This is where a model's declared prompt types belong now: the rail keeps
   * every shape available, because a polygon may be headed for "Add this
   * object" rather than for the model, and it is only this button that a
   * point/box-only model can actually refuse.
   */
  const unsupportedPrompt = useMemo(() => {
    if (!supportedPromptTypes) return null;
    const rejected = prompts.find((prompt) => supportedPromptTypes[prompt.type] === false);
    return rejected
      ? `${supportedPromptTypes.modelName} doesn’t accept ${rejected.type} prompts`
      : null;
  }, [prompts, supportedPromptTypes]);

  const runAIBlockedReason = !promptedModel ? 'Select a model first' : unsupportedPrompt;
  // Hidden rather than disabled when the dataset switches the tool off: there is
  // nothing the annotator could do to enable it.
  const runAIAvailable = isToolEnabled(refinementActive ? 'refine' : 'prompted');
  const canRunAI = runAIAvailable && !runAIBlockedReason;
  const addLabel = bar.addableCount > 1 ? `Add ${bar.addableCount} objects` : 'Add this object';

  const single = bar.selection.length === 1 ? bar.selection[0] : null;
  // In an instance session the target is whatever is picked on the canvas, which
  // starts out as the queued object. Clicking a neighbour retargets the verdicts
  // at it — that is how a duplicate spotted in the surroundings is dealt with
  // without leaving the item.
  const reviewTarget = instanceSession
    ? single || sessionSubject
    : bar.reviewQueue[reviewIndex] || null;
  /** Whether a verdict on the target settles the current queue item. */
  const targetIsSubject =
    instanceSession && Boolean(sessionSubject) && reviewTarget?.id === sessionSubject.id;

  // Keep the queue index in range as objects are approved or removed.
  useEffect(() => {
    setReviewIndex((current) => Math.min(current, Math.max(bar.reviewQueue.length - 1, 0)));
  }, [bar.reviewQueue.length]);

  // Point the canvas at each new session item once its object has loaded, and
  // keep the queued object selected afterwards: a refresh of the objects (or a
  // click on empty canvas) would otherwise leave the reviewer with nothing
  // marked as the object under review. Picking another object still retargets
  // the verdicts, because that selection is not empty.
  useEffect(() => {
    if (!instanceSession || !sessionItem) {
      focusedSessionItemRef.current = null;
      return;
    }
    if (!sessionSubject) return;
    if (focusedSessionItemRef.current !== sessionItem) {
      focusedSessionItemRef.current = sessionItem;
      clearSelection();
      selectObject(sessionSubject.id);
      actions.frameObject(sessionSubject);
    } else if (bar.selection.length === 0) {
      selectObject(sessionSubject.id);
    }
    // `actions` is recreated each render; this follows the queue item only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceSession, sessionItem, sessionSubject?.id, bar.selection.length]);

  // The review queue drives the canvas selection so the current instance is framed.
  useEffect(() => {
    if (bar.state !== 'review' || !reviewTarget || instanceSession) return;
    selectObject(reviewTarget.id);
    actions.frameObject(reviewTarget);
    // `actions` is recreated each render; framing should follow the target only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bar.state, reviewTarget?.id]);

  const closePicker = () => {
    setPicker(null);
    setQuery('');
  };

  const labelItems = useMemo(() => {
    const target = picker === 'label' ? single || reviewTarget : bar.selection[0];
    return labelling.getLabelsForObject(target);
  }, [picker, single, reviewTarget, bar.selection, labelling]);

  const parentItems = useMemo(
    () =>
      objects
        .filter((object) => !bar.selection.some((selected) => selected.id === object.id))
        .map((object) => ({
          id: object.id,
          name: getObjectDisplayName(object),
          color: object.color,
        })),
    [objects, bar.selection]
  );

  const applyLabel = async (label) => {
    const targets =
      picker === 'label' && single
        ? [single]
        : bar.state === 'review' && reviewTarget
          ? [reviewTarget]
          : bar.selection;
    closePicker();
    if (bar.state === 'review' && inSession && reviewTarget) {
      // A relabel by a reviewer is recorded as an approval by the backend, so in
      // a session it is a verdict of its own rather than a step before Accept.
      try {
        await labelling.assignLabel(reviewTarget, label);
      } catch {
        return; // Already toasted; the item stays open.
      }
      settleReview('relabelled');
      return;
    }
    await labelling.assignLabelToMany(targets, label);
  };

  /** Nests every selected object under the chosen parent. */
  const nestUnder = async (parent) => {
    closePicker();
    const parentContourId = getContourId(objects.find((object) => object.id === parent.id));
    if (parentContourId == null) {
      addToast({ type: 'error', message: 'That object cannot be a parent yet.' });
      return;
    }
    for (const object of bar.selection) {
      const contourId = getContourId(object);
      if (contourId == null) continue;
      try {
        // eslint-disable-next-line no-await-in-loop
        await annotationSession.modifyObject(contourId, { parent_id: parentContourId });
        updateObject(object.id, { parent_id: parent.id });
      } catch (error) {
        addToast({
          type: 'error',
          message: `Could not nest objects: ${error.message || 'not supported by the server'}`,
        });
        break;
      }
    }
  };

  const advanceReview = () =>
    setReviewIndex((current) => Math.min(current + 1, Math.max(bar.reviewQueue.length - 1, 0)));

  /**
   * Move on after a verdict.
   *
   * Outside a session that is this image's own cursor. In a session the verdict
   * settles the queue item when it was about the queued object; a verdict on
   * anything else (a neighbour, or one object of a whole-image item) is counted
   * and leaves the item open. Sending back is the exception: it returns the
   * whole mask to its annotator, so the item is settled whatever was picked.
   */
  function settleReview(outcome, { dropContourIds = null } = {}) {
    if (!inSession) {
      advanceReview();
      return;
    }
    if (outcome === 'sentBack') {
      session.settle('sentBack', { dropMaskId: currentMaskId });
      return;
    }
    if (targetIsSubject) {
      session.settle(outcome, { dropContourIds });
      return;
    }
    if (outcome !== 'accepted') session.countExtra(outcome, { dropContourIds });
    if (!instanceSession) advanceReview();
  }

  /** Contour ids of an object and everything nested under it. */
  const contourIdsWithDescendants = (root) => {
    const ids = [];
    const visit = (object) => {
      ids.push(Number(getContourId(object)));
      objects.filter((child) => child.parent_id === object.id).forEach(visit);
    };
    visit(root);
    return ids;
  };

  /** Send the target back with one of the quick reasons, without the dialog. */
  const quickSendBack = async (reason) => {
    if (!currentMaskId || !reviewTarget || sendingBack) return;
    setSendingBack(true);
    try {
      await rejectMask(currentMaskId, {
        reason: reason.reason,
        contourId: Number(getContourId(reviewTarget)),
      });
      addToast({ message: `Sent back: ${reason.title}.` });
      setSendBackTrayOpen(false);
      settleReview('sentBack');
    } catch (error) {
      addToast({
        type: 'error',
        message: `Could not send this back: ${(error.message || 'Unknown error').replace(/^API Error:\s*/i, '')}`,
      });
    } finally {
      setSendingBack(false);
    }
  };

  const acceptCurrent = async () => {
    if (!reviewTarget) return;
    if (getObjectState(reviewTarget) === 'unlabelled') {
      // Approval requires a class — open the picker rather than failing.
      setPicker('label');
      return;
    }
    try {
      await labelling.markReviewed(reviewTarget);
    } catch {
      // Already toasted; stay on the instance the server refused to approve.
      return;
    }
    trackSuggestionVerdict('suggestion.accept', [reviewTarget]);
    settleReview('accepted');
  };

  const rejectCurrent = async () => {
    if (!reviewTarget) return;
    const deletedIds = contourIdsWithDescendants(reviewTarget);
    try {
      await actions.remove(reviewTarget);
    } catch {
      // The action has already toasted; stay on the instance that failed.
      return;
    }
    trackSuggestionVerdict('suggestion.reject', [reviewTarget]);
    // The review verdict under its own name, next to the AI-suggestion statistic above.
    trackAnnotation('review.discard', {
      datasetId: Number(datasetId),
      payload: { contour_id: deletedIds[0], removed: deletedIds.length, in_session: inSession },
    });
    settleReview('rejected', { dropContourIds: deletedIds });
  };

  /**
   * The review verdict keys: `R` rejects the instance, `⏎` accepts it, and the
   * number keys send it back with the matching quick reason.
   *
   * They are bound here rather than in one of the shortcut hooks because the
   * review cursor is local state on this bar — a hook would have to duplicate it
   * to know what "the current instance" is. Neither key is contested while
   * reviewing: the rail no longer claims `R`, and useAnnotationKeyboardShortcuts
   * stands down from `⏎` in this mode.
   */
  useEffect(() => {
    if (bar.state !== 'review') return undefined;

    const handleKeyDown = (event) => {
      const isReject = event.key.toUpperCase() === 'R';
      const isAccept = event.key === 'Enter';
      const quickReason = QUICK_SEND_BACK_REASONS[Number(event.key) - 1] || null;
      const isOtherReason = event.key === OTHER_REASON_KEY;
      if (!isReject && !isAccept && !quickReason && !isOtherReason) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // Open overlays own the keyboard — the picker's own Enter would otherwise
      // both choose a label and approve.
      if (picker || sendBackFor) return;
      const target = event.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }
      if (!reviewTarget) return;
      event.preventDefault();
      if (quickReason) quickSendBack(quickReason);
      else if (isOtherReason) setSendBackFor(reviewTarget);
      else if (isReject) rejectCurrent();
      else acceptCurrent();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // The handlers are recreated each render; the target they act on is the dep
    // that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bar.state, picker, sendBackFor, sendingBack, reviewTarget?.id, bar.reviewQueue.length, inSession, targetIsSubject]);

  /**
   * `⇧⏎` commits the outlines on the canvas.
   *
   * Bound here because `addShapes` lives on this bar, and kept off plain `⏎` so
   * the two actions the bar offers keep distinct keys —
   * useAnnotationKeyboardShortcuts owns `⏎` for running the model.
   */
  useEffect(() => {
    if (bar.state !== 'prompt' || !bar.addableCount) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Enter' || !event.shiftKey) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (picker) return;
      const target = event.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      addShapes();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bar.state, bar.addableCount, picker, addShapes]);

  if (bar.state === 'editing') return null;

  // ---------------------------------------------------------------- contents

  let context = null;
  let sub = null;
  let buttons = null;
  let hint = null;
  let progressLine = null;

  if (bar.state === 'running' || labelSegmentation?.runner.isRunning) {
    context = (
      <>
        <Loader2 size={13} className="text-ac animate-spin flex-none" />
        <span className="text-btn font-bold text-t1">{labelSegmentation?.runner.isRunning ? 'Segmenting label…' : RUN_COPY[bar.runKind]}</span>
        {progress && (
          <span
            className="font-mono text-btn font-semibold text-t1 tabular-nums min-w-[4.2ch] text-right"
            role="progressbar"
            aria-label="Estimated progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
          >
            {progress.percent} %
          </span>
        )}
      </>
    );
    // An estimate from this model's earlier runs; it holds at 99 % until the
    // result is in. The fill carries the labels in flight, like the canvas.
    if (progress) {
      progressLine = (
        <div className="absolute left-[12px] right-[12px] bottom-[3px] h-[2px] rounded-full bg-well overflow-hidden" aria-hidden="true">
          <div
            className="h-full rounded-full transition-[width] duration-100 ease-linear"
            style={{
              width: `${(progress.fraction * 100).toFixed(1)}%`,
              background: runColors.length > 1 ? `linear-gradient(90deg, ${runColors.join(', ')})` : runColors[0],
            }}
          />
        </div>
      );
    }
    sub = labelSegmentation?.runner.isRunning ? labelSegmentation.runner.modelName : `${modelName}${prompts.length ? ` · ${prompts.length} prompts` : ''}`;
    if (labelSegmentation?.runner.isRunning) buttons = <BarButton icon={X} label="Cancel" onClick={labelSegmentation.runner.cancel} />;
  } else if (bar.state === 'prompt') {
    context = (
      <>
        <Dot className="bg-ok" />
        <span className="text-btn font-bold text-t1">
          {bar.promptCount} {bar.promptCount === 1 ? 'prompt' : 'prompts'} placed
        </span>
      </>
    );
    sub = canRunAI ? modelName : runAIBlockedReason;
    buttons = (
      <>
        <BarButton icon={Eraser} label="Clear" shortcut="⌫" onClick={clearAllPrompts} />
        {bar.addableCount > 0 && (
          <BarButton
            icon={Shapes}
            label={isAdding ? 'Adding…' : addLabel}
            shortcut="⇧⏎"
            variant={canRunAI ? undefined : 'primary'}
            disabled={isAdding}
            title="Save the outline exactly as drawn, without running a model"
            onClick={addShapes}
            guide="action-add-object"
          />
        )}
        {runAIAvailable && (
          <BarButton
            icon={Sparkles}
            label={refinementActive ? 'Refine object' : 'Run AI'}
            shortcut="⏎"
            variant={canRunAI ? 'primary' : undefined}
            disabled={!canRunAI}
            title={runAIBlockedReason || undefined}
            onClick={() => runSegmentation()}
            guide="action-run-ai"
          />
        )}
      </>
    );
    if (promptAction === 'ai') {
      hint = 'Every prompt runs the model as soon as it is placed.';
    }
  } else if (bar.state === 'object' && single) {
    const state = getObjectState(single);
    const area = formatArea(single, scale);
    const labelForObject = labels.find((label) => String(label.id) === String(single.labelId));
    context = (
      <>
        <Dot color={labelForObject ? resolveLabelColor(labelForObject, colorOverrides) : single.color} />
        <span className="text-btn font-bold text-t1 truncate max-w-[220px]">
          {getObjectDisplayName(single)}
        </span>
      </>
    );
    sub = area;
    buttons = (
      <>
        {/* One way in. The three ways of fixing an outline — AI, control points,
            redrawing a stretch — are tools inside Refinement mode now, switched
            on the canvas, so the bar no longer has to offer them as three
            competing buttons that each opened a different mode.

            Hidden once the mode is open, which it can be while this state still
            shows (the AI tool leaves the selection alone): a second Refine there
            would only re-enter the mode it is already in. */}
        {!refinementActive && (
          <BarButton
            icon={Wand2}
            label="Refine"
            shortcut="E"
            title="Fix this outline — with the AI, by dragging its points, or by redrawing a stretch"
            onClick={() => actions.refine(single)}
            guide="action-refine"
          />
        )}
        {targetLabel && (
          <BarButton
            icon={Sparkles}
            label={`Segment ${targetLabel.name}`}
            shortcut="2"
            disabled={labelSegmentation.busy || Boolean(targetLabelState?.reason)}
            title={targetLabelState?.reason || undefined}
            onClick={() => labelSegmentation.requestRun(targetLabel.id)}
            guide="action-segment-label"
          />
        )}
        <BarButton
          icon={Trash2}
          label="Delete"
          shortcut="⌫"
          onClick={() => actions.remove(single)}
        />
        {state === 'unlabelled' ? (
          <BarButton
            icon={Tag}
            label="Assign label"
            shortcut="L"
            variant="primary"
            onClick={() => setPicker('label')}
            guide="action-assign-label"
          />
        ) : (
          <BarButton
            icon={Tag}
            label={single.label}
            shortcut="L"
            variant="chip"
            onClick={() => setPicker('label')}
            guide="action-assign-label"
          />
        )}
      </>
    );
  } else if (bar.state === 'multi') {
    context = (
      <>
        <Dot className="bg-ac" />
        <span className="text-btn font-bold text-t1">
          {bar.selection.length} objects selected
        </span>
      </>
    );
    buttons = (
      <>
        <BarButton icon={Layers} label="Group under…" onClick={() => setPicker('parent')} />
        {targetLabel && (
          <BarButton
            icon={Sparkles}
            label={`Segment ${targetLabel.name}`}
            shortcut="2"
            disabled={labelSegmentation.busy || Boolean(targetLabelState?.reason)}
            title={targetLabelState?.reason || undefined}
            onClick={() => labelSegmentation.requestRun(targetLabel.id)}
            guide="action-segment-label"
          />
        )}
        <BarButton
          icon={Trash2}
          label="Delete"
          shortcut="⌫"
          onClick={() => actions.removeMany(bar.selection)}
        />
        <BarButton icon={X} label="Clear selection" shortcut="esc" onClick={clearSelection} />
        <BarButton
          icon={Tag}
          label="Label all"
          shortcut="L"
          variant="primary"
          onClick={() => setPicker('label')}
        />
      </>
    );
  } else if (bar.state === 'calibrate') {
    // Named after the calibrations the server's registry actually offers, so a
    // kind added there gets its button here without a client change.
    //
    // The buttons select a calibration and open its controls rather than
    // starting its measurement: how a measurement begins is kind-specific — the
    // scale hands off to the draw-a-line overlay, the colour response to a patch
    // pick — and forking that into a second place is how the two would drift.
    const active = bar.activeCalibration;
    context = (
      <>
        <Dot className={active?.calibrated ? 'bg-ok' : 'bg-t3'} />
        <span className="text-btn font-bold text-t1">
          {active ? `${active.label} — ${active.calibrated ? 'set' : 'not set'}` : 'Calibrate'}
        </span>
      </>
    );
    sub = active
      ? active.summary
      : bar.calibrations.length
        ? 'Pick a calibration to set it'
        : 'No calibrations are available for this image';
    buttons = bar.calibrations.length === 0 ? null : (
      <>
        {bar.calibrations.map((entry) => (
          <BarButton
            key={entry.kind}
            icon={CALIBRATION_BAR_ICONS[entry.kind] || SlidersHorizontal}
            label={`Calibrate ${entry.label.toLowerCase()}`}
            variant={entry.kind === active?.kind ? 'primary' : 'chip'}
            title={entry.summary}
            onClick={() => {
              setActiveCalibrationKind(entry.kind);
              setLeftDrawerOpen(true);
            }}
          />
        ))}
      </>
    );
  } else if (bar.state === 'review') {
    const total = bar.reviewQueue.length;
    // In an instance session the queue position is the session bar's to show;
    // this bar names the object the verdicts will land on.
    const waitingForSubject = instanceSession && !reviewTarget;
    context = (
      <>
        <Dot className="bg-rev" />
        <span className="text-btn font-bold text-t1">
          {instanceSession
            ? reviewTarget
              ? getObjectDisplayName(reviewTarget)
              : sessionMaskReady
                ? 'This object no longer exists'
                : 'Loading…'
            : total === 0
              ? 'Nothing to review'
              : `Instance ${reviewIndex + 1} of ${total}`}
        </span>
      </>
    );
    sub = instanceSession
      ? reviewTarget && !targetIsSubject
        ? 'from the surroundings'
        : waitingForSubject && sessionMaskReady
          ? 'skip it, or undo to restore it'
          : null
      : reviewTarget
        ? getObjectDisplayName(reviewTarget)
        : null;
    const hasWork = instanceSession ? Boolean(reviewTarget) : total > 0;
    buttons = !hasWork ? null : (
      <>
        <BarButton
          icon={PenLine}
          label="Fix outline"
          shortcut="E"
          title="Correct the outline yourself instead of sending it back"
          disabled={!reviewTarget}
          onClick={() => actions.refine(reviewTarget)}
        />
        <BarButton
          icon={Tag}
          label="Relabel"
          shortcut="L"
          disabled={!reviewTarget}
          onClick={() => setPicker('label')}
        />
        <BarButton
          icon={RotateCcw}
          label="Send back"
          shortcut={`1–${OTHER_REASON_KEY}`}
          title="Return this to its annotator with a reason"
          disabled={!currentMaskId || !reviewTarget || sendingBack}
          onClick={() => setSendBackTrayOpen((open) => !open)}
        />
        {!instanceSession && (
          <>
            <BarButton icon={SkipForward} label="Skip" onClick={advanceReview} />
            <BarButton
              icon={ChevronLeft}
              disabled={reviewIndex === 0}
              title="Previous instance"
              onClick={() => setReviewIndex((current) => Math.max(current - 1, 0))}
            />
            <BarButton
              icon={ChevronRight}
              disabled={reviewIndex >= total - 1}
              title="Next instance"
              onClick={advanceReview}
            />
          </>
        )}
        <BarButton
          icon={Trash2}
          label="Reject"
          shortcut="R"
          variant="danger"
          title="Delete it: this is not a real object"
          disabled={!reviewTarget}
          onClick={rejectCurrent}
        />
        <BarButton
          icon={Check}
          label="Accept"
          shortcut="⏎"
          variant="ok"
          disabled={!reviewTarget}
          onClick={acceptCurrent}
          guide="review-accept"
        />
      </>
    );
  } else {
    const action = getPromptAction(promptAction);
    const ActionIcon = ACTION_ICONS[action.icon] || Sparkles;
    context = (
      <>
        <Dot className={promptAction === 'nothing' ? 'bg-t3' : 'bg-ac'} />
        <span className="text-btn font-bold text-t1">Ready to annotate</span>
      </>
    );
    sub = action.short;
    buttons = (
      <>
        <BarButton
          icon={Sparkles}
          label={modelName}
          variant="chip"
          disabled={availableModels.length === 0}
          onClick={() => setPicker('model')}
        />
        <BarButton
          icon={ActionIcon}
          label={action.name}
          shortcut="A"
          variant="chip"
          title={action.hint}
          onClick={cyclePromptAction}
        />
      </>
    );
  }

  // z-70 keeps the bar above every canvas overlay: the focus dim (z40), the
  // prompt canvas as focus/refinement lift it (z45/z62) and the contour control
  // points (z65). Those overlays are full-bleed and pointer-events-auto, so
  // anything below them loses both the hover cursor and its clicks.
  return (
    <div
      className="absolute left-1/2 bottom-4 -translate-x-1/2 z-[70] w-max max-w-[calc(100%-28px)] flex flex-col items-center gap-[8px] pointer-events-none"
      style={liftAboveTimeline ? { bottom: TIMELINE_HEIGHT + 16 } : undefined}
    >
      {picker && (
        <div className="pointer-events-auto">
          {picker === 'model' ? (
            <LabelPicker
              items={availableModels.map((model) => ({ id: model.id, name: model.name }))}
              query={query}
              onQueryChange={setQuery}
              onSelect={(model) => {
                setPromptedModel(model.id);
                closePicker();
              }}
              onClose={closePicker}
              placeholder="Search models…"
              showColors={false}
              emptyMessage="No models available"
            />
          ) : picker === 'parent' ? (
            <LabelPicker
              items={parentItems}
              query={query}
              onQueryChange={setQuery}
              onSelect={nestUnder}
              onClose={closePicker}
              placeholder="Search objects…"
              caption="Nest the selected objects under…"
              emptyMessage="No other objects"
            />
          ) : (
            <LabelPicker
              items={labelItems}
              query={query}
              onQueryChange={setQuery}
              onSelect={applyLabel}
              onClose={closePicker}
              colorOverrides={colorOverrides}
              caption={
                labelling.getParentLabelName(single || reviewTarget || bar.selection[0])
                  ? `Sub-labels of ${labelling.getParentLabelName(single || reviewTarget || bar.selection[0])}`
                  : 'Root level'
              }
              emptyMessage="No labels valid at this level"
            />
          )}
        </div>
      )}

      {bar.state === 'review' && sendBackTrayOpen && reviewTarget && !picker && (
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-[5px] p-[5px] pl-[10px] rounded-11 bg-glass border border-warnLn shadow-bar backdrop-blur-sm">
          <span className="text-ctl font-bold text-warn mr-[3px]">Send back because…</span>
          {QUICK_SEND_BACK_REASONS.map((reason, position) => (
            <BarButton
              key={reason.reason}
              label={reason.title}
              shortcut={String(position + 1)}
              variant="chip"
              disabled={sendingBack}
              onClick={() => quickSendBack(reason)}
            />
          ))}
          <BarButton
            label="Other reason…"
            shortcut={OTHER_REASON_KEY}
            variant="chip"
            title="Every other reason, with a note"
            onClick={() => setSendBackFor(reviewTarget)}
          />
        </div>
      )}

      <div
        data-guide="action-bar"
        className="pointer-events-auto relative flex flex-wrap items-center justify-center gap-[7px] p-[6px] rounded-12 bg-glass border border-ln2 shadow-bar backdrop-blur-sm"
      >
        {progressLine}
        <div className="flex items-center gap-[6px] pl-[5px]">{context}</div>
        {sub && <span className="font-mono text-meta text-t3">{sub}</span>}
        {buttons && <div className="w-px h-5 bg-ln2" />}
        {buttons}
      </div>

      {hint && (
        <div className="pointer-events-none px-[9px] py-[3px] rounded-6 bg-glass text-sect text-t3">
          {hint}
        </div>
      )}

      {currentMaskId && sendBackFor && (
        <RejectMaskModal
          isOpen
          maskId={currentMaskId}
          contourId={getContourId(sendBackFor)}
          contourLabel={sendBackFor.label_name || sendBackFor.label}
          onClose={() => setSendBackFor(null)}
          onRejected={() => {
            setSendBackTrayOpen(false);
            settleReview('sentBack');
          }}
        />
      )}
    </div>
  );
};

export default ActionBar;
