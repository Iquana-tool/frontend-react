import { useCallback, useMemo } from 'react';
import {
  useObjectsList,
  useSelectedObjects,
  useSuggestionModel,
  useWebSocketIsReady,
  useIsRunningSuggestion,
} from '../../../stores/selectors/annotationSelectors';
import { useSuggestionSegmentation } from '../../../hooks/useSuggestionSegmentation';
import { useToast } from '../../../contexts/ToastContext';
import { hasValidLabel } from '../../../stores/utils/labelValidation';

/**
 * Stable identity for an object's class. Unlabelled objects collapse to one
 * shared key so a purely unlabelled selection still counts as homogeneous.
 */
const getClassKey = (object) => {
  if (!hasValidLabel(object.label)) return '__unlabelled__';
  if (object.labelId != null) return `id:${object.labelId}`;
  return `name:${String(object.label).trim()}`;
};

/**
 * "Suggest similar instances" — an action on the current selection rather than
 * a tool, as the redesign specifies.
 *
 * Eligibility is unchanged from the old floating button: the selection must be
 * non-empty, all of one class (or all unlabelled), and every object must expose
 * a contour id to seed from.
 */
export default function useSuggestSimilar() {
  const objectsList = useObjectsList();
  const selectedIds = useSelectedObjects();
  const suggestionModel = useSuggestionModel();
  const wsReady = useWebSocketIsReady();
  const isRunning = useIsRunningSuggestion();
  const { addToast } = useToast();

  const { runSuggestion } = useSuggestionSegmentation(null, (error) =>
    addToast({
      type: 'error',
      message: `Failed to suggest similar instances: ${error.message || 'Unknown error'}`,
    })
  );

  const targets = useMemo(
    () => objectsList.filter((object) => selectedIds.includes(object.id)),
    [objectsList, selectedIds]
  );

  const classKeys = useMemo(() => new Set(targets.map(getClassKey)), [targets]);

  const contourIds = useMemo(
    () => targets.map((object) => object.contour_id).filter((id) => id != null),
    [targets]
  );

  const isHomogeneous = targets.length > 0 && classKeys.size === 1;
  const hasSeeds = contourIds.length === targets.length && contourIds.length > 0;
  const eligible = isHomogeneous && hasSeeds && !!suggestionModel && wsReady && !isRunning;

  const reason = !isHomogeneous
    ? 'Select samples of the same class (or all unlabelled)'
    : !hasSeeds
      ? 'Selected objects are missing contour data'
      : !suggestionModel
        ? 'Select an Instance Suggestion model first'
        : !wsReady
          ? 'Connection not ready'
          : null;

  const run = useCallback(async () => {
    if (!eligible) return;
    const labelId = targets[0]?.labelId;
    await runSuggestion(contourIds.length === 1 ? contourIds[0] : contourIds, labelId);
  }, [eligible, targets, contourIds, runSuggestion]);

  return { eligible, reason, isRunning, run, seedCount: contourIds.length };
}
