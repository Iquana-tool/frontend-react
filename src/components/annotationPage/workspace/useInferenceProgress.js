import { useEffect, useState } from 'react';
import { estimatedProgress, progressPercent } from '../canvas/inferenceTiming';

/**
 * The open run's estimated progress, re-read ten times a second.
 *
 * @returns {{ percent: number, fraction: number } | null} null when no run is open.
 *   `percent` holds at 99 until the result is in, however long the run takes.
 */
export default function useInferenceProgress(run) {
  const open = run && run.phase !== 'ending';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [open, run?.id]);

  if (!open) return null;
  const elapsed = Math.max(0, (now - run.startedAt) / 1000);
  return {
    percent: progressPercent(elapsed, run.etaS),
    fraction: estimatedProgress(elapsed, run.etaS),
  };
}
