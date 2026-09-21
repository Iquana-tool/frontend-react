import { useCallback } from 'react';
import {
  useCurrentTool,
  useSetCurrentTool,
  usePromptMode,
  useSetPromptMode,
  useManualDrawMode,
  useSetManualDrawMode,
  usePromptAction,
  useSetPromptAction,
  useCancelCalibration,
  useRefinementModeActive,
} from '../../../stores/selectors/annotationSelectors';
import {
  railToolFromStore,
  storeStateForRailTool,
  storeStateForActionChange,
  nextPromptAction,
} from './toolModel';

/**
 * Bridges the rail's two-axis selection — a shape and a prompt action — to the
 * three-axis tool state in the store (see toolModel.js for the mapping and its
 * rationale).
 *
 * A scale measurement is started from the Calibrate tab, not from the rail, but
 * it puts the store in 'set_scale' — so picking any rail tool cancels an
 * in-progress one, otherwise the calibration overlay keeps eating clicks.
 *
 * Refinement mode owns the tool outright while it is open: each of its three
 * tools needs a particular canvas on top (the prompt canvas for AI, none of it
 * for the two geometry tools), so a rail pick would drop a second canvas over
 * the one being used. The rail therefore refuses while refining and says why —
 * `railDisabledReason` — rather than silently doing nothing.
 */
export default function useRailTools() {
  const currentTool = useCurrentTool();
  const promptMode = usePromptMode();
  const manualDrawMode = useManualDrawMode();
  const promptAction = usePromptAction();

  const setCurrentTool = useSetCurrentTool();
  const setPromptMode = useSetPromptMode();
  const setManualDrawMode = useSetManualDrawMode();
  const setPromptAction = useSetPromptAction();
  const cancelCalibration = useCancelCalibration();
  const refinementModeActive = useRefinementModeActive();

  const railTool = railToolFromStore({ currentTool, promptMode, manualDrawMode });

  const applyStoreState = useCallback(
    (next) => {
      if (!next) return;
      if (next.promptMode) setPromptMode(next.promptMode);
      if (next.manualDrawMode) setManualDrawMode(next.manualDrawMode);
      setCurrentTool(next.currentTool);
    },
    [setPromptMode, setManualDrawMode, setCurrentTool]
  );

  const railDisabledReason = refinementModeActive
    ? 'Refinement mode is using the canvas — exit it (Esc) to pick a tool'
    : null;

  const setRailTool = useCallback(
    (nextRailTool) => {
      if (refinementModeActive) return;
      if (currentTool === 'set_scale') cancelCalibration();

      applyStoreState(storeStateForRailTool(nextRailTool, promptAction));
    },
    [refinementModeActive, currentTool, promptAction, applyStoreState, cancelCalibration]
  );

  const changePromptAction = useCallback(
    (nextAction) => {
      if (nextAction === promptAction) return;
      setPromptAction(nextAction);
      applyStoreState(storeStateForActionChange(railTool, nextAction));
    },
    [promptAction, railTool, setPromptAction, applyStoreState]
  );

  const cyclePromptAction = useCallback(
    () => changePromptAction(nextPromptAction(promptAction)),
    [promptAction, changePromptAction]
  );

  return {
    railTool,
    setRailTool,
    railDisabledReason,
    promptAction,
    changePromptAction,
    cyclePromptAction,
  };
}
