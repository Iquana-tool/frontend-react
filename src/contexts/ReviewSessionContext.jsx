import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  TRANSIENT_MS,
  addVerdictMark,
  isLastingVerdict,
  keepMarksOfMask,
} from '../components/annotationPage/canvas/reviewFeedback';

const ReviewSessionContext = createContext(null);

/**
 * The verdict marks on the canvas, kept apart from the session so a mark that
 * appears or fades does not re-render everything that reads the session.
 */
const ReviewFeedbackContext = createContext(null);

/** Stable identity of a queue item, so a verdict survives the queue being filtered. */
export const reviewItemKey = (item) => `${item.mask_id}:${item.contour_id ?? 'image'}`;

/** The verdicts a session counts. `skipped` is recorded but settles nothing. */
const OUTCOMES = ['accepted', 'relabelled', 'sentBack', 'rejected', 'skipped'];

const emptyTally = () => Object.fromEntries(OUTCOMES.map((outcome) => [outcome, 0]));

/**
 * Pure state transition for a verdict on the current item.
 *
 * Exported for tests: the rules here (which later items a verdict invalidates,
 * and when an image is finished and its completeness question is due) are the
 * part of the session that is easy to get subtly wrong.
 *
 * @param {Object} session
 * @param {string} outcome - One of OUTCOMES.
 * @param {Object} [options]
 * @param {number} [options.dropMaskId] - The whole mask went back to its
 *   annotator; its later items are stale.
 * @param {number} [options.sentBackMaskId] - One object of this mask went back.
 *   The mask's other items stay, so the reviewer can finish the image, but its
 *   completeness question is not asked: the image is going back anyway.
 * @param {number[]} [options.dropContourIds] - Deleted objects; their later items
 *   would point at nothing.
 */
export const settleItem = (
  session,
  outcome,
  { dropMaskId = null, sentBackMaskId = null, dropContourIds = null } = {}
) => {
  const current = session.items[session.index];
  if (!current) return session;

  const gone = new Set(dropContourIds || []);
  const items = session.items.filter((item, itemIndex) => {
    if (itemIndex <= session.index) return true;
    if (dropMaskId != null && item.mask_id === dropMaskId) return false;
    return !gone.has(item.contour_id);
  });

  const sentBackMasks =
    sentBackMaskId == null
      ? session.sentBackMasks
      : { ...session.sentBackMasks, [sentBackMaskId]: true };

  // The image is finished once no later item points at its mask. A mask that was
  // sent back is not asked about: it is already on its way to the annotator.
  const maskHasMore = items.some(
    (item, itemIndex) => itemIndex > session.index && item.mask_id === current.mask_id
  );
  const askCompleteness =
    outcome !== 'skipped' &&
    dropMaskId == null &&
    !sentBackMasks?.[current.mask_id] &&
    !maskHasMore &&
    !(current.mask_id in session.completeness);

  return {
    ...session,
    items,
    sentBackMasks,
    index: session.index + 1,
    outcomes: { ...session.outcomes, [reviewItemKey(current)]: outcome },
    pendingCompleteness: askCompleteness
      ? { image_id: current.image_id, mask_id: current.mask_id }
      : null,
  };
};

/**
 * Pure state transition for stepping through the queue without a verdict.
 *
 * Exported for tests. Stepping forward off the last item of an image asks the
 * completeness question when every item of that image already has a verdict and
 * the question is still open. Without this, a reviewer who stepped back while
 * the question was showing could leave the image again without ever answering.
 *
 * @param {Object} session
 * @param {number} delta - -1 for back, 1 for forward.
 */
export const stepItem = (session, delta) => {
  const index = Math.min(Math.max(session.index + delta, 0), session.items.length);
  const leaving = delta > 0 ? session.items[session.index] : null;
  let pendingCompleteness = null;
  if (
    leaving &&
    !(leaving.mask_id in session.completeness) &&
    !session.sentBackMasks?.[leaving.mask_id]
  ) {
    const imageItems = session.items.filter((item) => item.mask_id === leaving.mask_id);
    const leavesImage = !session.items
      .slice(index)
      .some((item) => item.mask_id === leaving.mask_id);
    const allSettled = imageItems.every((item) => {
      const outcome = session.outcomes[reviewItemKey(item)];
      return outcome && outcome !== 'skipped';
    });
    if (leavesImage && allSettled) {
      pendingCompleteness = { image_id: leaving.image_id, mask_id: leaving.mask_id };
    }
  }
  return { ...session, index, pendingCompleteness };
};

/**
 * Holds an in-flight review session: the queue built on the review setup page,
 * the reviewer's position in it, and the verdicts given so far.
 *
 * The session is played inside the annotation editor (`ReviewSessionBar` drives
 * the canvas), and moving between items on different images navigates the
 * editor's route — so, like `CorrectionContext`, this state lives above the
 * router. It is memory-only: a refresh ends the session, which is honest since
 * the backend queue is a snapshot, not a reservation.
 *
 * Network calls stay with the components that own the toasts and error surface;
 * this context only tracks position, verdicts and the completeness step.
 */
export const ReviewSessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  // The object the canvas circles with the comet. A new nonce restarts the comet
  // when review returns to the same object.
  const [spotlight, setSpotlight] = useState(null);

  const spotlightObject = useCallback((objectId) => {
    if (objectId == null) return;
    setSpotlight((current) => ({ objectId, nonce: (current?.nonce ?? 0) + 1 }));
  }, []);

  // What the canvas shows after each verdict: a badge and a short outline
  // animation, plus ghosts of rejected objects and the purple of sent-back ones,
  // which stay until the reviewer leaves the image. See reviewFeedback.js.
  const [verdictMarks, setVerdictMarks] = useState([]);
  const markNonce = useRef(0);
  const markTimers = useRef(new Set());

  useEffect(() => {
    const timers = markTimers.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  /**
   * Show a verdict on the canvas.
   * @param {Object} mark - `{ kind, maskId, contourId, ... }`; `kind` is one of
   *   accepted, edited, relabelled, rejected, sentBack.
   */
  const markVerdict = useCallback((mark) => {
    if (!mark?.kind || mark.maskId == null) return;
    markNonce.current += 1;
    const id = markNonce.current;
    setVerdictMarks((current) => addVerdictMark(current, { ...mark, id, at: Date.now() }));
    if (isLastingVerdict(mark.kind)) return;
    const timer = setTimeout(() => {
      markTimers.current.delete(timer);
      setVerdictMarks((current) => current.filter((existing) => existing.id !== id));
    }, TRANSIENT_MS);
    markTimers.current.add(timer);
  }, []);

  /** Drop the marks of every other image, so returning to one starts clean. */
  const keepVerdictMarksOf = useCallback((maskId) => {
    setVerdictMarks((current) => keepMarksOfMask(current, maskId));
  }, []);

  const feedback = useMemo(
    () => ({ marks: verdictMarks, markVerdict, keepVerdictMarksOf }),
    [verdictMarks, markVerdict, keepVerdictMarksOf]
  );

  const start = useCallback((datasetId, queue) => {
    const isImageMode = queue.granularity === 'images';
    const items = (isImageMode ? queue.images : queue.instances) || [];
    if (!items.length) return;
    setSession({
      datasetId: String(datasetId),
      granularity: queue.granularity,
      includeReviewed: Boolean(queue.include_reviewed),
      items,
      index: 0,
      outcomes: {},
      // Verdicts on objects that are not queue items themselves: a neighbour
      // rejected out of the surroundings, or an object inside an image item.
      extras: { relabelled: 0, rejected: 0, sentBack: 0 },
      completeness: {},
      // Masks with an object sent back in this session: never asked about.
      sentBackMasks: {},
      pendingCompleteness: null,
    });
  }, []);

  const settle = useCallback((outcome, options) => {
    setSession((current) => (current ? settleItem(current, outcome, options) : current));
  }, []);

  /**
   * Count a verdict on an object that is not the current queue item. Deleting
   * such an object still invalidates the later items that point at it, and
   * sending it back means its image is not asked about at the end.
   */
  const countExtra = useCallback((outcome, { dropContourIds = null, sentBackMaskId = null } = {}) => {
    setSession((current) => {
      if (!current) return current;
      const gone = new Set(dropContourIds || []);
      return {
        ...current,
        items: current.items.filter(
          (item, itemIndex) => itemIndex <= current.index || !gone.has(item.contour_id)
        ),
        extras: { ...current.extras, [outcome]: (current.extras[outcome] || 0) + 1 },
        sentBackMasks:
          sentBackMaskId == null
            ? current.sentBackMasks
            : { ...current.sentBackMasks, [sentBackMaskId]: true },
      };
    });
  }, []);

  /** Step through the queue without giving a verdict. Stays within its bounds. */
  const step = useCallback((delta) => {
    setSession((current) => (current ? stepItem(current, delta) : current));
  }, []);

  /**
   * Record the completeness answer for an image and move on.
   * @param {number} maskId
   * @param {'complete'|'incomplete'|'unsure'|'skipped'} answer
   */
  const answerCompleteness = useCallback((maskId, answer) => {
    setSession((current) =>
      current
        ? {
            ...current,
            completeness: { ...current.completeness, [maskId]: answer },
            pendingCompleteness: null,
          }
        : current
    );
  }, []);

  const endSession = useCallback(() => setSession(null), []);

  const value = useMemo(() => {
    const total = session?.items.length ?? 0;
    const index = session?.index ?? 0;
    const pendingCompleteness = session?.pendingCompleteness ?? null;
    const active = Boolean(session) && (index < total || Boolean(pendingCompleteness));
    const finished = Boolean(session) && !active;

    const tally = emptyTally();
    Object.values(session?.outcomes ?? {}).forEach((outcome) => {
      tally[outcome] += 1;
    });
    tally.relabelled += session?.extras.relabelled ?? 0;
    tally.rejected += session?.extras.rejected ?? 0;
    tally.sentBack += session?.extras.sentBack ?? 0;

    const completenessTally = { complete: 0, incomplete: 0, unsure: 0 };
    Object.values(session?.completeness ?? {}).forEach((answer) => {
      if (answer in completenessTally) completenessTally[answer] += 1;
    });

    return {
      active,
      finished,
      datasetId: session?.datasetId ?? null,
      granularity: session?.granularity ?? null,
      isImageMode: session?.granularity === 'images',
      includeReviewed: session?.includeReviewed ?? false,
      items: session?.items ?? [],
      index,
      total,
      currentItem: session && index < total ? session.items[index] : null,
      pendingCompleteness,
      tally,
      completenessTally,
      start,
      settle,
      countExtra,
      step,
      answerCompleteness,
      endSession,
      spotlight,
      spotlightObject,
    };
  }, [session, start, settle, countExtra, step, answerCompleteness, endSession, spotlight, spotlightObject]);

  return (
    <ReviewSessionContext.Provider value={value}>
      <ReviewFeedbackContext.Provider value={feedback}>{children}</ReviewFeedbackContext.Provider>
    </ReviewSessionContext.Provider>
  );
};

const NO_FEEDBACK = { marks: [], markVerdict: () => {}, keepVerdictMarksOf: () => {} };

/**
 * The verdict marks and the function that adds one. Outside the provider it
 * returns an inert stand-in, so the canvas and the action bar still render.
 */
export const useReviewFeedback = () => useContext(ReviewFeedbackContext) ?? NO_FEEDBACK;

/**
 * The object the review is pointing at, for the canvas comet. Returns null outside
 * the provider, so the canvas also renders where no review can run (tests,
 * embedded viewers).
 */
export const useReviewSpotlight = () => useContext(ReviewSessionContext)?.spotlight ?? null;

export const useReviewSession = () => {
  const ctx = useContext(ReviewSessionContext);
  if (!ctx) throw new Error('useReviewSession must be used within a ReviewSessionProvider');
  return ctx;
};
