import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  CornerUpLeft,
  Loader2,
  ScanEye,
  SkipForward,
  Tag,
  Trash2,
  Undo2,
} from 'lucide-react';
import * as api from '../../api';
import { getContoursOfMask, editContourLabel } from '../../api/masks';
import { deleteContour, markContourAsReviewed } from '../../api/contours';
import { undoAnnotationAction } from '../../api/annotationHistory';
import { approveMask, rejectMask } from '../../api/reviews';
import { useToast } from '../../contexts/ToastContext';
import { getChildLabels } from '../../utils/labelHierarchy';
import { getLabelColor } from '../../utils/labelColors';
import Kbd from '../annotationPage/workspace/primitives/Kbd';
import LabelPicker from '../annotationPage/workspace/LabelPicker';
import AnnotationViewerCanvas from '../viewer/AnnotationViewerCanvas';

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API Error:\s*/i, '') || fallback;

/**
 * The send-back reasons of the queue, in shortcut order — 1 sends the first one.
 *
 * The wording is the reviewer's, the values are the backend's `RejectionReason`
 * vocabulary — kept as a fixed map here (rather than the `/reviews/reasons`
 * catalog) because the queue offers a deliberate subset with queue-specific
 * phrasing, and because the shortcut number has to be stable no matter what the
 * catalog grows. The free-text reason is not in this list: it is the note field
 * below the buttons, which sends `other` on Enter.
 */
const SEND_BACK_REASONS = [
  {
    reason: 'bad_outline',
    title: 'Bad outline',
    imageTitle: 'Bad outlines',
    description: 'Under- or oversegmented; the outline does not represent the true object outline.',
  },
  {
    reason: 'wrong_label',
    title: 'Wrong label',
    imageTitle: 'Wrong labels',
    description: 'This is not the correct label for this object.',
  },
  {
    reason: 'merged_objects',
    title: 'Merged objects',
    imageTitle: 'Merged objects',
    description: 'This should be multiple objects.',
  },
  {
    reason: 'missing_parts',
    title: 'Parts are missing',
    imageTitle: 'Parts are missing',
    description:
      'Only partially the target object — other parts are missing because another object overlaps this one.',
  },
];

/** Shared empty set for the modes that have no subject/context split. */
const EMPTY_IDS = new Set();

/** The shortcut number of the free-text reason, one past the listed ones. */
const CUSTOM_REASON_KEY = String(SEND_BACK_REASONS.length + 1);

/**
 * Plays a review queue one item at a time.
 *
 * Image items show the whole mask; instance items frame one contour plus its
 * immediate children, with the rest of the image drawn around it as context —
 * "is this a duplicate?" and "was the thing overlapping it already annotated?"
 * are unanswerable from one outline in isolation. The reviewer has four verdicts:
 *
 *   * **Accept** (Enter) — approves the mask's pending contours, or the one instance.
 *   * **Send back** (1–5) — records a rejection with the chosen reason and returns
 *     the mask to its annotator, which also invalidates every other queued item on
 *     that mask, so those are dropped from the queue on the spot.
 *   * **Reject** (R) — the object is not a real object at all (a model hallucinated
 *     it); it is deleted outright rather than handed back for someone to fix. The
 *     delete goes through the annotation history, so the banner's Undo can restore it.
 *   * **Relabel** (L) — the outline is right but the label is wrong; fix it here
 *     instead of sending it back. The backend records the relabel as an approval
 *     for callers who may review, so a relabelled instance is a settled one.
 *
 * Reject and Relabel act on one object, so in image mode they need one picked on
 * the canvas; in instance mode they act on the queued instance.
 */
const ReviewSession = ({ queue, labels = [], labelsById, onExit }) => {
  const { addToast } = useToast();
  const isImageMode = queue.granularity === 'images';

  // The queue is state, not a constant: a rejection removes the sibling items of
  // the same mask (they went back to the annotator along with it), and a reject
  // removes the items pointing at the objects it deleted.
  const [items, setItems] = useState(() =>
    isImageMode ? queue.images : queue.instances
  );
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState({
    accepted: 0,
    relabelled: 0,
    rejected: 0,
    discarded: 0,
    skipped: 0,
  });

  const [imageSrc, setImageSrc] = useState(null);
  const [contours, setContours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');
  const [zoomTarget, setZoomTarget] = useState(null);
  const [selectedContourId, setSelectedContourId] = useState(null);
  const [showRelabel, setShowRelabel] = useState(false);
  // Instance review draws the rest of the image as context; a dense mask can
  // still be easier to judge with it off.
  const [showContext, setShowContext] = useState(true);
  const [labelQuery, setLabelQuery] = useState('');
  // The last delete, while it is still the caller's newest history entry on that
  // image — see `handleReject`.
  const [undoable, setUndoable] = useState(null);
  // Bumped to re-run the loader after an action changed the mask behind our back.
  const [reloadToken, setReloadToken] = useState(0);

  const noteRef = useRef(null);
  // Consecutive queue items often share an image/mask (hierarchy order groups
  // them); the caches make advancing through those instant.
  const imageCache = useRef(new Map());
  const contourCache = useRef(new Map());

  const current = items[index] || null;
  const done = index >= items.length;

  // -- Data loading ---------------------------------------------------------

  useEffect(() => {
    if (!current) return undefined;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let src = imageCache.current.get(current.image_id);
        if (!src) {
          const imageData = await api.getImageById(current.image_id, false);
          const base64 =
            imageData[current.image_id] ??
            imageData[String(current.image_id)] ??
            Object.entries(imageData).find(
              ([key]) => key !== 'success' && key !== 'message'
            )?.[1];
          src = base64 ? `data:image/png;base64,${base64}` : null;
          imageCache.current.set(current.image_id, src);
        }

        let maskContours = contourCache.current.get(current.mask_id);
        if (!maskContours) {
          const contourResponse = await getContoursOfMask(current.mask_id, true);
          maskContours = contourResponse.contours || [];
          contourCache.current.set(current.mask_id, maskContours);
        }

        if (cancelled) return;
        setImageSrc(src);
        setContours(maskContours);
        if (!isImageMode) {
          const instance = maskContours.find((c) => c.id === current.contour_id);
          setSelectedContourId(current.contour_id);
          // New object identity so revisiting the same instance re-frames it.
          setZoomTarget(instance ? { ...instance } : null);
        } else {
          setSelectedContourId(null);
          setZoomTarget(null);
        }
      } catch (err) {
        if (!cancelled) setError(readableError(err, 'Could not load this item.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [current, isImageMode, reloadToken]);

  // -- Derived display state --------------------------------------------------

  /**
   * The queued instance and its immediate children — what the item is actually
   * about. Empty in image mode, where the whole mask is the subject.
   */
  const subjectIds = useMemo(() => {
    if (isImageMode || !current) return EMPTY_IDS;
    const ids = new Set([current.contour_id]);
    contours.forEach((contour) => {
      if (contour.parent_id === current.contour_id) ids.add(contour.id);
    });
    return ids;
  }, [contours, current, isImageMode]);

  /**
   * Everything else on the image. Instance review used to hide these, which made
   * the very questions review exists to answer unanswerable: whether an object is
   * a duplicate of its neighbour, or whether the thing overlapping it was already
   * annotated, cannot be judged from a single outline in isolation. They are drawn
   * as context (see `AnnotationViewerCanvas`) rather than as equals, and stay
   * clickable so a duplicate can be rejected on the spot.
   */
  const contextIds = useMemo(() => {
    if (isImageMode || !current) return EMPTY_IDS;
    return new Set(
      contours.filter((contour) => !subjectIds.has(contour.id)).map((contour) => contour.id)
    );
  }, [contours, current, isImageMode, subjectIds]);

  /** All of it, unless the reviewer turned the surroundings off for a busy image. */
  const visibleContours = useMemo(() => {
    if (isImageMode || showContext) return contours;
    return contours.filter((contour) => subjectIds.has(contour.id));
  }, [contours, isImageMode, showContext, subjectIds]);

  const instanceContour = useMemo(
    () =>
      !isImageMode && current
        ? contours.find((contour) => contour.id === current.contour_id) || null
        : null,
    [contours, current, isImageMode]
  );

  const childCount = useMemo(
    () =>
      !isImageMode && current
        ? contours.filter((contour) => contour.parent_id === current.contour_id).length
        : 0,
    [contours, current, isImageMode]
  );

  /**
   * The object Reject and Relabel act on: whatever is picked on the canvas, which
   * the loader pre-sets to the queued instance. Clicking a neighbour retargets
   * them at it — that is how a duplicate spotted in the context gets dealt with
   * without leaving the item.
   */
  const targetContourId =
    selectedContourId ?? (isImageMode ? null : current?.contour_id ?? null);

  /** Whether the acted-on object is the one this queue item is about: only then
   *  does dealing with it settle the item and move the queue on. */
  const targetIsSubject = !isImageMode && targetContourId === current?.contour_id;

  const targetContour = useMemo(
    () => contours.find((contour) => contour.id === targetContourId) || null,
    [contours, targetContourId]
  );

  /**
   * The labels valid for the target object: the children of its parent object's
   * label, the same rule the annotation editor applies. Falls back to the whole
   * label space when that level is empty, so a relabel is never a dead end.
   */
  const relabelItems = useMemo(() => {
    if (!targetContour) return [];
    const parent = targetContour.parent_id
      ? contours.find((contour) => contour.id === targetContour.parent_id)
      : null;
    const level = getChildLabels(labels, parent?.label_id ?? null);
    return level.length > 0 ? level : labels;
  }, [contours, labels, targetContour]);

  const labelNameFor = useCallback(
    (labelId) => labelsById[labelId]?.name || 'Unlabelled',
    [labelsById]
  );

  const colorFor = useCallback(
    (contour) => (contour.label_id ? getLabelColor(contour.label_id) : '#94a3b8'),
    []
  );

  // -- Advancing ---------------------------------------------------------------

  const advance = useCallback(
    (outcome, { dropMaskId = null, dropContourIds = null } = {}) => {
      setTally((current_) => ({ ...current_, [outcome]: current_[outcome] + 1 }));
      setNote('');
      setShowRelabel(false);
      setLabelQuery('');
      setItems((currentItems) => {
        if (dropMaskId != null) {
          // A rejected mask went back to the annotator: its other queued items
          // are stale now, so drop everything after the current position that
          // points at it. The contour cache entry is stale too.
          contourCache.current.delete(dropMaskId);
          return currentItems.filter(
            (item, itemIndex) => itemIndex <= index || item.mask_id !== dropMaskId
          );
        }
        if (dropContourIds?.length) {
          // Deleted objects: their queue items would 404 on load.
          const gone = new Set(dropContourIds);
          return currentItems.filter(
            (item, itemIndex) => itemIndex <= index || !gone.has(item.contour_id)
          );
        }
        return currentItems;
      });
      setIndex((currentIndex) => currentIndex + 1);
    },
    [index]
  );

  /** Any mutating action invalidates the standing Undo — it only ever offers the
   *  caller's newest history entry, which this action just became. */
  const clearUndo = () => setUndoable(null);

  const handleAccept = async () => {
    if (!current || busy) return;
    setBusy(true);
    clearUndo();
    try {
      if (isImageMode) {
        // The Accept must cover exactly what this queue considers open, so the
        // second-opinion flag travels with the queue it was built for.
        const response = await approveMask(current.mask_id, {
          includeReviewed: Boolean(queue.include_reviewed),
        });
        contourCache.current.delete(current.mask_id);
        if (response?.skipped?.length) {
          addToast({
            type: 'error',
            message: `${response.skipped.length} of your own annotations were not self-approved; another reviewer has to look at those.`,
          });
        }
      } else {
        await markContourAsReviewed(current.contour_id);
        contourCache.current.delete(current.mask_id);
      }
      advance('accepted');
    } catch (err) {
      setError(readableError(err, 'Could not approve this item.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSendBack = async (reason, noteText = note) => {
    if (!current || busy) return;
    setBusy(true);
    clearUndo();
    try {
      await rejectMask(current.mask_id, {
        reason,
        note: noteText.trim() || null,
        contourId: isImageMode ? null : current.contour_id,
      });
      advance('rejected', { dropMaskId: current.mask_id });
    } catch (err) {
      setError(readableError(err, 'Could not send this item back.'));
    } finally {
      setBusy(false);
    }
  };

  /** Enter in the free-text field: send back with `other` and that text. */
  const handleCustomSendBack = () => {
    if (!note.trim()) {
      setError('Describe what is wrong before sending it back with a custom reason.');
      return;
    }
    handleSendBack('other');
  };

  /**
   * Delete the object outright — the "this is not an object at all" verdict, for
   * a prediction that has no business being in the dataset. Distinct from a send
   * back, which asks the annotator to fix something that is basically there.
   */
  const handleReject = async () => {
    if (!current || !targetContourId || busy) return;
    const maskId = current.mask_id;
    const imageId = current.image_id;
    const name = labelNameFor(targetContour?.label_id);
    setBusy(true);
    try {
      const response = await deleteContour(targetContourId);
      // Descendants go with the CASCADE; the backend reports every id it removed.
      const deletedIds = response?.deleted_ids?.length
        ? response.deleted_ids
        : [targetContourId];
      contourCache.current.delete(maskId);
      setUndoable({ imageId, maskId, contourId: targetContourId, name });

      if (targetIsSubject) {
        advance('discarded', { dropContourIds: deletedIds });
      } else {
        // A whole-image item, or a neighbour rejected out of the context: what
        // the queue asked about is still open, so stay put and just drop the
        // object from the view.
        const gone = new Set(deletedIds);
        const remaining = contours.filter((contour) => !gone.has(contour.id));
        contourCache.current.set(maskId, remaining);
        setContours(remaining);
        setSelectedContourId(isImageMode ? null : current.contour_id);
        setTally((current_) => ({ ...current_, discarded: current_.discarded + 1 }));
      }
    } catch (err) {
      setError(readableError(err, 'Could not reject this object.'));
    } finally {
      setBusy(false);
    }
  };

  /** Restore the object the last Reject deleted, while it is still the newest
   *  entry on the caller's history stack for that image. */
  const handleUndoReject = async () => {
    if (!undoable || busy) return;
    setBusy(true);
    try {
      await undoAnnotationAction(undoable.imageId);
      contourCache.current.delete(undoable.maskId);
      setUndoable(null);
      setTally((current_) => ({ ...current_, discarded: Math.max(current_.discarded - 1, 0) }));
      setReloadToken((token) => token + 1);
      addToast({ message: `Restored ${undoable.name} #${undoable.contourId}.` });
    } catch (err) {
      setError(readableError(err, 'Could not restore that object.'));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Fix the label here instead of handing the object back for it. The backend
   * records an approval alongside the change for callers who hold `review.approve`,
   * so a relabelled instance counts as reviewed and the queue moves on.
   */
  const handleRelabel = async (label) => {
    if (!current || !targetContourId || busy) return;
    const maskId = current.mask_id;
    setShowRelabel(false);
    setLabelQuery('');
    setBusy(true);
    clearUndo();
    try {
      await editContourLabel(targetContourId, label.id);
      contourCache.current.delete(maskId);
      if (targetIsSubject) {
        advance('relabelled');
      } else {
        const relabelled = contours.map((contour) =>
          contour.id === targetContourId ? { ...contour, label_id: label.id } : contour
        );
        contourCache.current.set(maskId, relabelled);
        setContours(relabelled);
        setTally((current_) => ({ ...current_, relabelled: current_.relabelled + 1 }));
        addToast({ message: `Relabelled #${targetContourId} to ${label.name}.` });
      }
    } catch (err) {
      setError(readableError(err, 'Could not change the label.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    if (!current || busy) return;
    clearUndo();
    advance('skipped');
  };

  // Keyboard. Never fires while the reviewer is typing (the note field, the label
  // search), so Enter can mean "accept" out here and "commit what I typed" in there.
  useEffect(() => {
    const onKey = (event) => {
      if (done || busy) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      // The picker owns the keyboard while it is open; it closes on Escape itself.
      if (showRelabel) return;

      const key = event.key || '';
      const reasonIndex = SEND_BACK_REASONS.findIndex(
        (_, position) => key === String(position + 1)
      );
      if (reasonIndex >= 0) {
        event.preventDefault();
        handleSendBack(SEND_BACK_REASONS[reasonIndex].reason);
        return;
      }
      if (key === CUSTOM_REASON_KEY) {
        // The free-text field is always on screen; the shortcut only puts the
        // cursor in it, and Enter in there does the sending.
        event.preventDefault();
        noteRef.current?.focus();
        return;
      }
      switch (key.toLowerCase()) {
        case 'enter':
          event.preventDefault();
          handleAccept();
          break;
        case 'a':
          handleAccept();
          break;
        case 'r':
          handleReject();
          break;
        case 'l':
          if (targetContourId) setShowRelabel(true);
          break;
        case 's':
          handleSkip();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // -- Rendering -----------------------------------------------------------------

  if (done) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4">
        <CheckCircle2 className="w-12 h-12 text-ac mb-4" />
        <h2 className="text-2xl font-bold text-t1 mb-2">Session finished</h2>
        <p className="text-t2 mb-6">
          {tally.accepted} accepted · {tally.relabelled} relabelled · {tally.rejected} sent
          back · {tally.discarded} rejected · {tally.skipped} skipped
        </p>
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold bg-accent text-onAccent hover:brightness-110 transition-colors"
        >
          <Undo2 className="w-4 h-4" />
          Back to review setup
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex min-h-0">
      {/* Canvas */}
      <main className="flex-1 relative min-w-0">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-scrim text-white">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading…
          </div>
        )}
        {imageSrc && (
          <AnnotationViewerCanvas
            imageSrc={imageSrc}
            contours={visibleContours}
            selectedId={selectedContourId}
            onSelect={setSelectedContourId}
            zoomTarget={zoomTarget}
            colorFor={colorFor}
            contextIds={contextIds}
          />
        )}
      </main>

      {/* Action panel */}
      <aside className="relative w-80 border-l border-ln bg-p1 flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-ln">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-t3">
              {isImageMode ? 'Image review' : 'Instance review'}
            </span>
            <span className="text-sm font-medium text-t2">
              {index + 1} / {items.length}
            </span>
          </div>
          <div className="w-full bg-well rounded-full h-1.5">
            <div
              className="bg-accent h-1.5 rounded-full transition-all"
              style={{ width: `${(index / Math.max(items.length, 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* What is on the table */}
        <div className="px-4 py-3 border-b border-ln text-sm text-t2 space-y-1">
          {isImageMode ? (
            <>
              <div>
                Image <span className="font-medium">#{current.image_id}</span>
              </div>
              <div className="text-t3">
                {current.pending_instances} of {current.total_instances} instances awaiting{' '}
                {queue.include_reviewed ? 'your review' : 'review'}
              </div>
              <div className="text-t3">
                {targetContour ? (
                  <>
                    Picked:{' '}
                    <span className="font-medium text-t2">
                      {labelNameFor(targetContour.label_id)} #{targetContour.id}
                    </span>{' '}
                    — Reject and Relabel act on it.
                  </>
                ) : (
                  'Click an object on the canvas to reject or relabel just that one.'
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full border border-ln flex-shrink-0"
                  style={{
                    backgroundColor: current.label_id
                      ? getLabelColor(current.label_id)
                      : '#94a3b8',
                  }}
                />
                <span className="font-medium">
                  {labelNameFor(targetContour?.label_id ?? current.label_id)}
                </span>
                <span className="text-t3">#{current.contour_id}</span>
              </div>
              <div className="text-t3">
                Depth {current.depth}
                {childCount > 0 &&
                  ` · ${childCount} direct child${childCount === 1 ? '' : 'ren'} shown`}
                {instanceContour?.added_by && ` · by ${instanceContour.added_by}`}
              </div>
              {(instanceContour?.reviewed_by?.length ?? 0) > 0 && (
                <div className="text-ok">
                  Already approved by {instanceContour.reviewed_by.join(', ')} — accept to
                  confirm, send back to overrule (withdraws your own approval).
                </div>
              )}
              {!targetIsSubject && targetContour && (
                <div className="text-t2">
                  Picked{' '}
                  <span className="font-medium">
                    {labelNameFor(targetContour.label_id)} #{targetContour.id}
                  </span>{' '}
                  from the surroundings — Reject and Relabel act on it, Accept and the
                  send-backs still apply to #{current.contour_id}.
                </div>
              )}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  onClick={() => {
                    if (!instanceContour) return;
                    setSelectedContourId(instanceContour.id);
                    setZoomTarget({ ...instanceContour });
                  }}
                  className="flex items-center gap-1.5 text-ac hover:text-ac text-xs font-medium"
                >
                  <ScanEye className="w-3.5 h-3.5" />
                  Back to this instance
                </button>
                <label className="flex items-center gap-1.5 text-xs text-t3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showContext}
                    // Blurred on change: the keyboard handler stands down while
                    // a form control has focus, so leaving it focused would kill
                    // every shortcut until the reviewer clicked elsewhere.
                    onChange={(e) => {
                      setShowContext(e.target.checked);
                      e.target.blur();
                    }}
                    className="accent-current w-3 h-3"
                  />
                  Surroundings
                </label>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="px-4 py-2 bg-errBg border-b border-errLn">
            <p className="text-sm text-err">{error}</p>
          </div>
        )}

        {undoable && (
          <div className="px-4 py-2 border-b border-ln flex items-center justify-between gap-2 bg-well">
            <span className="text-xs text-t2 min-w-0 truncate">
              Rejected {undoable.name} #{undoable.contourId}
            </span>
            <button
              onClick={handleUndoReject}
              disabled={busy}
              className="flex items-center gap-1 text-xs font-semibold text-ac hover:underline disabled:text-t3 flex-shrink-0"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
              Undo
            </button>
          </div>
        )}

        {showRelabel && targetContourId && (
          <div className="absolute left-1/2 -translate-x-1/2 top-32 z-30">
            <LabelPicker
              items={relabelItems}
              query={labelQuery}
              onQueryChange={setLabelQuery}
              onSelect={handleRelabel}
              onClose={() => {
                setShowRelabel(false);
                setLabelQuery('');
              }}
              caption={`New label for #${targetContourId}`}
              emptyMessage="No labels valid at this level"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          <button
            onClick={handleAccept}
            disabled={busy || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold bg-accent text-onAccent hover:brightness-110 disabled:bg-hv2 disabled:text-t3 transition-colors"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Accept
            <Kbd tone="solid">⏎</Kbd>
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={busy || loading || !targetContourId}
              title={
                targetContourId
                  ? 'Delete this object — it is not a real object at all'
                  : 'Pick an object on the canvas first'
              }
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-errLn text-err font-semibold hover:bg-errBg disabled:border-ln disabled:text-t3 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Reject
              <Kbd>R</Kbd>
            </button>
            <button
              onClick={() => setShowRelabel(true)}
              disabled={busy || loading || !targetContourId}
              title={
                targetContourId
                  ? 'Give this object the right label instead of sending it back'
                  : 'Pick an object on the canvas first'
              }
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-ln2 text-t1 font-semibold hover:bg-hv disabled:border-ln disabled:text-t3 transition-colors text-sm"
            >
              <Tag className="w-4 h-4" />
              Relabel
              <Kbd>L</Kbd>
            </button>
          </div>
          <p className="text-xs text-t3">
            Reject deletes the object outright — for a prediction that is not the object at
            all. Relabel fixes the label on the spot and counts as your approval.
          </p>

          <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-t3">
            Send back to the annotator
          </div>
          {SEND_BACK_REASONS.map(({ reason, title, imageTitle, description }, position) => (
            <button
              key={reason}
              onClick={() => handleSendBack(reason)}
              disabled={busy || loading}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-errLn text-err hover:bg-errBg disabled:border-ln disabled:text-t3 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Kbd>{position + 1}</Kbd>
                {isImageMode ? imageTitle : title}
              </span>
              <span className="block mt-1 text-xs text-t3">{description}</span>
            </button>
          ))}

          {/* The free-text reason is the field itself: no button to press first,
              and Enter in it sends the object back with what was typed. It doubles
              as the optional note on the reasons above. */}
          <div className="rounded-lg border border-ln2 px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-t1">
              <Kbd>{CUSTOM_REASON_KEY}</Kbd>
              Custom reason
            </span>
            <input
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomSendBack();
                } else if (e.key === 'Escape') {
                  e.currentTarget.blur();
                }
              }}
              disabled={busy || loading}
              placeholder="Something else is wrong…"
              className="w-full mt-1.5 bg-transparent border-b border-ln2 pb-1 text-sm text-t1 placeholder:text-t3 focus:border-ac focus:outline-none disabled:text-t3"
            />
            <span className="block mt-1 text-xs text-t3">
              Enter sends the object back with this text. Typed here, it also rides along
              as the note on the reasons above.
            </span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-ln">
          <button
            onClick={handleSkip}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-ln2 text-t2 hover:bg-hv disabled:text-t3 transition-colors text-sm font-medium"
          >
            <SkipForward className="w-4 h-4" />
            Skip
            <Kbd>S</Kbd>
          </button>
        </div>
      </aside>
    </div>
  );
};

export default ReviewSession;
