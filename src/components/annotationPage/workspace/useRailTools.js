import { useCallback } from 'react';
import {
  useCurrentTool,
  useSetCurrentTool,
  usePromptMode,
  useSetPromptMode,
  useManualDrawMode,
  useSetManualDrawMode,
  useAiAssist,
  useSetAiAssist,
  useCancelCalibration,
} from '../../../stores/selectors/annotationSelectors';
import {
  railToolFromStore,
  storeStateForRailTool,
  storeStateForAssistChange,
} from './toolModel';

/**
 * Bridges the single-axis rail selection to the three-axis tool state in the
 * store (see toolModel.js for the mapping and its rationale).
 *
 * A scale measurement is started from the Calibrate tab, not from the rail, but
 * it puts the store in 'set_scale' — so picking any rail tool cancels an
 * in-progress one, otherwise the calibration overlay keeps eating clicks.
 */
export default function useRailTools() {
  const currentTool = useCurrentTool();
  const promptMode = usePromptMode();
  const manualDrawMode = useManualDrawMode();
  const aiAssist = useAiAssist();

  const setCurrentTool = useSetCurrentTool();
  const setPromptMode = useSetPromptMode();
  const setManualDrawMode = useSetManualDrawMode();
  const setAiAssist = useSetAiAssist();
  const cancelCalibration = useCancelCalibration();

  const railTool = railToolFromStore({ currentTool, promptMode, manualDrawMode });

  const applyStoreState = useCallback(
    (next) => {
      if (!next) return;
      if (next.aiAssist !== undefined) setAiAssist(next.aiAssist);
      if (next.promptMode) setPromptMode(next.promptMode);
      if (next.manualDrawMode) setManualDrawMode(next.manualDrawMode);
      setCurrentTool(next.currentTool);
    },
    [setAiAssist, setPromptMode, setManualDrawMode, setCurrentTool]
  );

  const setRailTool = useCallback(
    (nextRailTool) => {
      if (currentTool === 'set_scale') cancelCalibration();

      applyStoreState(storeStateForRailTool(nextRailTool, aiAssist));
    },
    [currentTool, aiAssist, applyStoreState, cancelCalibration]
  );

  const toggleAssist = useCallback(() => {
    const next = !aiAssist;
    setAiAssist(next);
    applyStoreState(storeStateForAssistChange(railTool, next));
  }, [aiAssist, railTool, setAiAssist, applyStoreState]);

  return { railTool, setRailTool, aiAssist, toggleAssist };
}
