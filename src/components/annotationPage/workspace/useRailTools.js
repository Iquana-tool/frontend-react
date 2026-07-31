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
  useStartCalibration,
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
 * Calibration is a side effect of the scale tool rather than part of the
 * mapping: selecting it starts a calibration, and moving away cancels any
 * in-progress one — otherwise the calibration overlay keeps eating clicks.
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
  const startCalibration = useStartCalibration();
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
      if (currentTool === 'set_scale' && nextRailTool !== 'scale') {
        cancelCalibration();
      }

      // Re-picking the scale tool cancels calibration and falls back to points,
      // matching the old ScaleControl toggle behaviour.
      if (nextRailTool === 'scale' && currentTool === 'set_scale') {
        cancelCalibration();
        applyStoreState(storeStateForRailTool('point', aiAssist));
        return;
      }

      applyStoreState(storeStateForRailTool(nextRailTool, aiAssist));
      if (nextRailTool === 'scale') startCalibration();
    },
    [currentTool, aiAssist, applyStoreState, cancelCalibration, startCalibration]
  );

  const toggleAssist = useCallback(() => {
    const next = !aiAssist;
    setAiAssist(next);
    applyStoreState(storeStateForAssistChange(railTool, next));
  }, [aiAssist, railTool, setAiAssist, applyStoreState]);

  return { railTool, setRailTool, aiAssist, toggleAssist };
}
