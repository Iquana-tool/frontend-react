import { useEffect, useRef } from 'react';
import {
  useInferenceRun,
  useObjectsList,
  useImageObject,
  useCurrentImage,
  useEndInferenceRun,
  useClearInferenceRun,
} from '../stores/selectors/annotationSelectors';
import {
  SETTLE_CAP_MS,
  SETTLE_QUIET_MS,
  endingDuration,
  revealSchedule,
  runGeometry,
} from '../components/annotationPage/canvas/inferenceTiming';
import { recordDuration } from '../utils/inferenceEta';

/** The outlines that arrived since the run opened. */
export const arrivedObjects = (run, objects) => {
  const known = new Set(run.knownContourIds);
  return objects.filter((o) => o.contour_id != null && !known.has(o.contour_id));
};

/**
 * Decides whether a settling run is done, and if not, how long to wait.
 *
 * The server's acknowledgement does not mean the outlines are here: a
 * suggestion run acks first and then streams its objects one by one. So the
 * run is done once the announced count has arrived, or — when the ack gave no
 * count — once no new outline has come for SETTLE_QUIET_MS. SETTLE_CAP_MS bounds
 * the wait for a count that never completes (an outline the server skipped).
 *
 * @returns {{ done: true } | { done: false, waitMs: number }}
 */
export const settleDecision = ({ expected, ackAt, lastArrivalAt, arrivedCount, now }) => {
  if (expected != null && arrivedCount >= expected) return { done: true };
  const deadline =
    expected == null
      ? Math.max(ackAt, lastArrivalAt || 0) + SETTLE_QUIET_MS
      : ackAt + SETTLE_CAP_MS;
  return now >= deadline ? { done: true } : { done: false, waitMs: deadline - now };
};

/**
 * Drives the inference run from `settling` to `ending` to cleared.
 *
 * Mounted once, with the canvas (InferenceScanOverlay). When the outlines are
 * in it schedules each one's pop-in, folds the real duration into the estimate,
 * and clears the run once the ending has played. A run whose image is switched
 * away is dropped.
 */
export default function useInferenceRunTracker() {
  const run = useInferenceRun();
  const objects = useObjectsList();
  const imageObject = useImageObject();
  const currentImage = useCurrentImage();
  const endRun = useEndInferenceRun();
  const clearRun = useClearInferenceRun();
  const lastArrival = useRef({ runId: null, count: 0, at: 0 });

  // Switching images abandons the run: its outlines belong to the old image.
  useEffect(() => {
    if (run && run.imageId != null && currentImage?.id != null && currentImage.id !== run.imageId) {
      clearRun(run.id);
    }
  }, [run, currentImage?.id, clearRun]);

  useEffect(() => {
    if (!run || run.phase !== 'settling') return undefined;

    const arrived = arrivedObjects(run, objects);
    const mark = lastArrival.current;
    if (mark.runId !== run.id) lastArrival.current = { runId: run.id, count: 0, at: 0 };
    if (arrived.length !== lastArrival.current.count) {
      lastArrival.current = { runId: run.id, count: arrived.length, at: Date.now() };
    }

    const finish = () => {
      const latest = arrivedObjects(run, objects);
      const w = imageObject?.width || imageObject?.naturalWidth || 0;
      const h = imageObject?.height || imageObject?.naturalHeight || 0;
      // A refinement replaces one outline; it is never "nothing found".
      const outcome = latest.length || run.kind === 'refine' ? 'success' : 'empty';
      const reveal = outcome === 'success'
        ? revealSchedule(runGeometry(run, w, h, objects), latest, w, h)
        : {};
      if (outcome === 'success') recordDuration(run.kind, run.modelKey, (Date.now() - run.startedAt) / 1000);
      endRun(run.id, { outcome, reveal });
    };

    const decision = settleDecision({
      expected: run.expected,
      ackAt: run.ackAt,
      lastArrivalAt: lastArrival.current.at,
      arrivedCount: arrived.length,
      now: Date.now(),
    });
    if (decision.done) {
      finish();
      return undefined;
    }
    const timer = setTimeout(finish, decision.waitMs);
    return () => clearTimeout(timer);
  }, [run, objects, imageObject, endRun]);

  // The ending plays, then the run is gone.
  useEffect(() => {
    if (!run || run.phase !== 'ending') return undefined;
    const ms = endingDuration(run.outcome, run.reveal) * 1000 - (Date.now() - run.endedAt);
    const timer = setTimeout(() => clearRun(run.id), Math.max(0, ms));
    return () => clearTimeout(timer);
  }, [run, clearRun]);
}
