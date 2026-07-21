import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Loader2, Clock } from 'lucide-react';
import {
  useCurrentTool,
  useObjectsList,
  useSelectedObjects,
  useSuggestionModel,
  useWebSocketIsReady,
  useIsRunningSuggestion,
} from '../../../stores/selectors/annotationSelectors';
import { hasValidLabel } from '../../../stores/utils/labelValidation';
import { useSuggestionSegmentation } from '../../../hooks/useSuggestionSegmentation';

/**
 * Stable identity for an object's "class". Unlabelled objects collapse to a
 * single shared key so a pure-unlabelled selection counts as homogeneous.
 */
const getClassKey = (obj) => {
  if (!hasValidLabel(obj.label)) return '__unlabelled__';
  if (obj.labelId !== undefined && obj.labelId !== null) return `id:${obj.labelId}`;
  return `name:${String(obj.label).trim()}`;
};

const formatDuration = (ms) => {
  if (ms == null) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

/**
 * Suggest Similar (Instance Suggestion) button.
 *
 * Lights up when one or multiple selected samples share the same class (or are
 * all unlabelled), and runs instance suggestion on them when clicked. While the
 * suggestion runs it shows a live elapsed timer, and afterwards reports the last
 * run's duration.
 */
const SuggestSimilarButton = () => {
  const currentTool = useCurrentTool();
  const objectsList = useObjectsList();
  const selectedObjects = useSelectedObjects();
  const suggestionModel = useSuggestionModel();
  const wsIsReady = useWebSocketIsReady();
  const isRunning = useIsRunningSuggestion();

  const { runSuggestion } = useSuggestionSegmentation(
    null,
    (error) => alert(`Failed to suggest similar instances: ${error.message || 'Unknown error'}`)
  );

  // Resolve the selected ids to full objects.
  const targetObjects = useMemo(
    () => objectsList.filter((obj) => selectedObjects.includes(obj.id)),
    [objectsList, selectedObjects]
  );

  // A selection is eligible when it is non-empty, homogeneous (one class key, or
  // all unlabelled) and every object exposes a contour id to seed from.
  const distinctClassKeys = useMemo(
    () => new Set(targetObjects.map(getClassKey)),
    [targetObjects]
  );
  const contourIds = useMemo(
    () => targetObjects.map((obj) => obj.contour_id).filter((id) => id !== null && id !== undefined),
    [targetObjects]
  );
  const isHomogeneous = targetObjects.length > 0 && distinctClassKeys.size === 1;
  const hasSeeds = contourIds.length === targetObjects.length && contourIds.length > 0;

  const eligible = isHomogeneous && hasSeeds && !!suggestionModel && wsIsReady && !isRunning;

  const selectionClassName = useMemo(() => {
    if (targetObjects.length === 0) return null;
    if (distinctClassKeys.has('__unlabelled__') && distinctClassKeys.size === 1) return 'Unlabelled';
    const first = targetObjects.find((obj) => hasValidLabel(obj.label));
    return first ? String(first.label).trim() : null;
  }, [targetObjects, distinctClassKeys]);

  // --- Run-time tracking -----------------------------------------------------
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastRunMs, setLastRunMs] = useState(null);
  const startRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      startRef.current = Date.now();
      setElapsedMs(0);
      intervalRef.current = setInterval(() => {
        if (startRef.current) setElapsedMs(Date.now() - startRef.current);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (startRef.current) {
        setLastRunMs(Date.now() - startRef.current);
        startRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  // Always visible so users discover the feature — except in manual drawing,
  // where the tool owns the bottom-center slot with its own finish button.
  if (currentTool === 'manual_drawing') return null;

  const handleClick = async () => {
    if (!eligible) return;
    const labelId = targetObjects[0]?.labelId;
    await runSuggestion(contourIds.length === 1 ? contourIds[0] : contourIds, labelId);
  };

  const title = !isHomogeneous
    ? 'Select samples of the same class (or all unlabelled) to suggest similar instances'
    : !hasSeeds
    ? 'Selected objects are missing contour data'
    : !suggestionModel
    ? 'Select an Instance Suggestion model first'
    : !wsIsReady
    ? 'Connection not ready'
    : `Run instance suggestion using ${contourIds.length} selected sample(s) as seeds`;

  const lastRunLabel = formatDuration(lastRunMs);

  return (
    <div className="relative pointer-events-auto">
      <button
        onClick={handleClick}
        disabled={!eligible}
        title={title}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-full shadow-2xl
          font-semibold text-white text-sm
          transition-all duration-200 transform
          ${
            isRunning
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 cursor-progress'
              : eligible
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-3xl hover:scale-105 active:scale-95'
              : 'bg-gray-300 cursor-not-allowed opacity-60'
          }
        `}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Finding similar…</span>
            <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-xs tabular-nums">
              <Clock className="w-3 h-3" />
              {formatDuration(elapsedMs)}
            </span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Suggest Similar</span>
            {targetObjects.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {targetObjects.length}
              </span>
            )}
          </>
        )}
      </button>

      {/* Selection / last-run hint */}
      {!isRunning && (eligible || lastRunLabel) && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded shadow-lg flex items-center gap-2">
            {eligible && selectionClassName && (
              <span>Class: {selectionClassName}</span>
            )}
            {lastRunLabel && (
              <span className="inline-flex items-center gap-1 text-gray-300">
                <Clock className="w-3 h-3" />
                Last run: {lastRunLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestSimilarButton;
