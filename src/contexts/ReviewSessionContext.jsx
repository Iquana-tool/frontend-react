import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ReviewSessionContext = createContext(null);

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
 * @param {number} [options.dropMaskId] - The mask went back to its annotator; its
 *   later items are stale.
 * @param {number[]} [options.dropContourIds] - Deleted objects; their later items
 *   would point at nothing.
 */
export const settleItem = (session, outcome, { dropMaskId = null, dropContourIds = null } = {}) => {
  const current = session.items[session.index];
  if (!current) return session;

  const gone = new Set(dropContourIds || []);
  const items = session.items.filter((item, itemIndex) => {
    if (itemIndex <= session.index) return true;
    if (dropMaskId != null && item.mask_id === dropMaskId) return false;
    return !gone.has(item.contour_id);
  });

  // The image is finished once no later item points at its mask. A mask that was
  // sent back is not asked about: it is already on its way to the annotator.
  const maskHasMore = items.some(
    (item, itemIndex) => itemIndex > session.index && item.mask_id === current.mask_id
  );
  const askCompleteness =
    outcome !== 'skipped' &&
    dropMaskId == null &&
    !maskHasMore &&
    !(current.mask_id in session.completeness);

  return {
    ...session,
    items,
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
  if (leaving && !(leaving.mask_id in session.completeness)) {
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
  // The object the canvas should briefly glow around. A new nonce replays the
  // glow when review returns to the same object.
  const [spotlight, setSpotlight] = useState(null);

  const spotlightObject = useCallback((objectId) => {
    if (objectId == null) return;
    setSpotlight((current) => ({ objectId, nonce: (current?.nonce ?? 0) + 1 }));
  }, []);

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
      extras: { relabelled: 0, rejected: 0 },
      completeness: {},
      pendingCompleteness: null,
    });
  }, []);

  const settle = useCallback((outcome, options) => {
    setSession((current) => (current ? settleItem(current, outcome, options) : current));
  }, []);

  /**
   * Count a verdict on an object that is not the current queue item. Deleting
   * such an object still invalidates the later items that point at it.
   */
  const countExtra = useCallback((outcome, { dropContourIds = null } = {}) => {
    setSession((current) => {
      if (!current) return current;
      const gone = new Set(dropContourIds || []);
      return {
        ...current,
        items: current.items.filter(
          (item, itemIndex) => itemIndex <= current.index || !gone.has(item.contour_id)
        ),
        extras: { ...current.extras, [outcome]: (current.extras[outcome] || 0) + 1 },
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

  return <ReviewSessionContext.Provider value={value}>{children}</ReviewSessionContext.Provider>;
};

/**
 * The object the review is pointing at, for the canvas glow. Returns null outside
 * the provider, so the canvas also renders where no review can run (tests,
 * embedded viewers).
 */
export const useReviewSpotlight = () => useContext(ReviewSessionContext)?.spotlight ?? null;

export const useReviewSession = () => {
  const ctx = useContext(ReviewSessionContext);
  if (!ctx) throw new Error('useReviewSession must be used within a ReviewSessionProvider');
  return ctx;
};
