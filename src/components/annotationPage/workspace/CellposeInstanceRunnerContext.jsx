import React, { createContext, useContext, useMemo } from 'react';
import { useCellposeInstanceRunner } from './useCellposeInstanceRunner';
import { useAvailableInstanceModels, useInstanceModel } from '../../../stores/selectors/annotationSelectors';
import { CELLPOSE_POLYP_REGISTRY_KEY, YOLO_POLYP_REGISTRY_KEY } from './cellposePreviewModel';

export const CellposeInstanceRunnerContext = createContext(null);

export function CellposeInstanceRunnerProvider({ children }) {
  const availableInstanceModels = useAvailableInstanceModels();
  const selectedModel = useInstanceModel();
  const cpsamModel = useMemo(() => {
    return (
      (availableInstanceModels || []).find(
        (m) =>
          m.id === CELLPOSE_POLYP_REGISTRY_KEY ||
          m.registry_key === CELLPOSE_POLYP_REGISTRY_KEY
      ) || null
    );
  }, [availableInstanceModels]);

  const yoloModel = useMemo(() => (availableInstanceModels || []).find(
    (m) => m.id === YOLO_POLYP_REGISTRY_KEY || m.registry_key === YOLO_POLYP_REGISTRY_KEY
  ) || null, [availableInstanceModels]);

  // Both owners stay mounted so switching the model never loses an active run or retry.
  const cellposeRunner = useCellposeInstanceRunner(cpsamModel);
  const yoloRunner = useCellposeInstanceRunner(yoloModel);
  const runner = selectedModel === YOLO_POLYP_REGISTRY_KEY ? yoloRunner : cellposeRunner;
  const other = selectedModel === YOLO_POLYP_REGISTRY_KEY ? cellposeRunner : yoloRunner;
  const value = other.isRunning ? {
    ...runner,
    canRun: false,
    disableReason: 'Another polyp model is running.',
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
