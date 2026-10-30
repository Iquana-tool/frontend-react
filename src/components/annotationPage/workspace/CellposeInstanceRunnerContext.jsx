import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useCellposeInstanceRunner } from './useCellposeInstanceRunner';
import { useAvailableInstanceModels, useInstanceModel } from '../../../stores/selectors/annotationSelectors';
import { acceptsRoiInput } from './cellposePreviewModel';

export const CellposeInstanceRunnerContext = createContext(null);

const keyOf = (model) => model?.registry_key ?? model?.id ?? null;

/**
 * Owns the preview run for models that accept saved outlines as an ROI (see
 * `acceptsRoiInput`). The runner follows the selected model, but stays on the model a run
 * was started with until that run ends, so switching the picker never loses it.
 */
export function CellposeInstanceRunnerProvider({ children }) {
  const availableInstanceModels = useAvailableInstanceModels();
  const selectedModel = useInstanceModel();
  const selectedRoiModel = useMemo(
    () => (availableInstanceModels || []).find(
      (m) => (m.id === selectedModel || m.registry_key === selectedModel) && acceptsRoiInput(m)
    ) || null,
    [availableInstanceModels, selectedModel]
  );

  const pinnedRef = useRef(null);
  const runnerModel = pinnedRef.current ?? selectedRoiModel;
  const runner = useCellposeInstanceRunner(runnerModel);
  const busy = Boolean(runner.isRunning || runner.status === 'saving');
  useEffect(() => {
    pinnedRef.current = busy ? runnerModel : null;
  }, [busy, runnerModel]);

  const value = busy && keyOf(runnerModel) !== keyOf(selectedRoiModel) ? {
    ...runner,
    canRun: false,
    disableReason: `${runnerModel?.name || 'Another model'} is still running.`,
    run: async () => false,
  } : runner;

  return (
    <CellposeInstanceRunnerContext.Provider value={value}>
      {children}
    </CellposeInstanceRunnerContext.Provider>
  );
}

export function useCellposeInstanceRunnerContext() {
  return useContext(CellposeInstanceRunnerContext);
}

export default CellposeInstanceRunnerProvider;
