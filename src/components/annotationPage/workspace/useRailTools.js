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

  const setRailTool = useCallback(
    (nextRailTool) => {
      if (currentTool === 'set_scale') cancelCalibration();

      applyStoreState(storeStateForRailTool(nextRailTool, promptAction));
    },
    [currentTool, promptAction, applyStoreState, cancelCalibration]
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

  return { railTool, setRailTool, promptAction, changePromptAction, cyclePromptAction };
}
