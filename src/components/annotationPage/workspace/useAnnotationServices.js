import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAvailablePromptedModels,
  useAvailableSuggestionModels,
  useAvailableInstanceModels,
  useFetchAvailablePromptedModels,
  useFetchAvailableSuggestionModels,
  useFetchAvailableInstanceModels,
  useIsLoadingPromptedModels,
  useIsLoadingSuggestionModels,
  useIsLoadingInstanceModels,
  useIsRunningSuggestion,
  useIsRunningInstance,
  usePromptedModel,
  useSuggestionModel,
  useInstanceModel,
  useSetPromptedModel,
  useSetSuggestionModel,
  useSetInstanceModel,
  useAutoSelectedInstanceModel,
  useInstanceRunRequested,
  useSetInstanceRunRequested,
  useSetInstanceWarningModalOpen,
  useActiveLabelId,
  useModelFavorites,
} from '../../../stores/selectors/annotationSelectors';
import { useDataset } from '../../../contexts/DatasetContext';
import { useAnnotationRoutingPolicy } from '../../../contexts/AnnotationRoutingPolicyContext';
import {
  getAutoTaskModelKey,
  resolveRoutingBinding,
  isModelCompatibleWithLabel,
  matchesModelKey,
} from '../../../utils/inferenceRouting';
import annotationSession from '../../../services/annotationSession';
import useModelSwitchPreloader from '../../../hooks/useModelSwitchPreloader';
import useAiTools from '../../../hooks/useAiTools';
import { useInstanceSegmentation } from '../../../hooks/useInstanceSegmentation';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { useCellposeInstanceRunnerContext } from './CellposeInstanceRunnerContext';
import { isPolypInstanceModel } from './cellposePreviewModel';

// Module-level map tracking explicit user selections per dataset: datasetKey -> modelId
const manualInstanceOverridesByDataset = new Map();

export const clearManualInstanceOverrides = () => {
  manualInstanceOverridesByDataset.clear();
};

export const setManualInstanceOverride = (datasetId, modelId) => {
  const datasetKey = datasetId != null ? String(datasetId) : '__default__';
  if (modelId) {
    manualInstanceOverridesByDataset.set(datasetKey, modelId);
  } else {
    manualInstanceOverridesByDataset.delete(datasetKey);
  }
};

/** The dataset AI tool switch behind each service card. */
const SERVICE_TOOL = {
  prompted: 'prompted',
  instance: 'instance_segmentation',
  suggestion: 'instance_suggestion',
};

const getModelKey = (model) => model?.id || model?.registry_key || model?.identifier || null;

const getFallbackModelId = (models, task, favoriteKey, labelId = null) => {
  const compatibleModels = (models || []).filter((model) =>
    isModelCompatibleWithLabel(model, labelId)
  );
  const favorite = favoriteKey
    ? compatibleModels.find((model) => matchesModelKey(model, task, favoriteKey))
    : null;
  return getModelKey(favorite || compatibleModels[0]);
};

const isUsableBinding = (resolved) =>
  Boolean(resolved?.binding && resolved.model && resolved.isCompatible && !resolved.isStale);

const getMatchingBindingInputs = (resolved, task, selectedModel) => {
  if (!isUsableBinding(resolved) || !matchesModelKey(resolved.model, task, selectedModel)) {
    return null;
  }

  return resolved.binding?.inputs ?? null;
};

/**
 * Model lists, selections, dataset policy defaults, preloading and the instance-segmentation
 * write-mode flow for the three annotation services.
 */
export default function useAnnotationServices() {
  const { currentDataset } = useDataset();
  const datasetId = currentDataset?.id;
  const { isEnabled: isToolEnabled } = useAiTools();
  const activeLabelId = useActiveLabelId();
  const favorites = useModelFavorites();
  const {
    policy,
    policyReady,
    policyResolved,
    policyLoading,
    policyError,
  } = useAnnotationRoutingPolicy(datasetId);

  const fetchPromptedModels = useFetchAvailablePromptedModels();
  const fetchSuggestionModels = useFetchAvailableSuggestionModels();
  const fetchInstanceModels = useFetchAvailableInstanceModels();

  const availablePromptedModels = useAvailablePromptedModels();
  const availableSuggestionModels = useAvailableSuggestionModels();
  const availableInstanceModels = useAvailableInstanceModels();

  const promptedModel = usePromptedModel();
  const suggestionModel = useSuggestionModel();
  const instanceModel = useInstanceModel();
  const setPromptedModel = useSetPromptedModel();
  const setSuggestionModel = useSetSuggestionModel();
  const setInstanceModel = useSetInstanceModel();

  const isLoadingPrompted = useIsLoadingPromptedModels();
  const isLoadingSuggestion = useIsLoadingSuggestionModels();
  const isLoadingInstance = useIsLoadingInstanceModels();
  const isRunningSuggestion = useIsRunningSuggestion();
  const isRunningInstance = useIsRunningInstance();

  const instanceRunRequested = useInstanceRunRequested();
  const setInstanceRunRequested = useSetInstanceRunRequested();
  const setInstanceWarningModalOpen = useSetInstanceWarningModalOpen();
  const { runInstance } = useInstanceSegmentation();

  const [showInstanceWarning, setShowInstanceWarning] = useState(false);

  const promptedRouting = useMemo(
    () =>
      policyReady
        ? resolveRoutingBinding(
            policy,
            'prompted-segmentation',
            activeLabelId,
            availablePromptedModels
          )
        : null,
    [policy, policyReady, activeLabelId, availablePromptedModels]
  );
  const suggestionRouting = useMemo(
    () =>
      policyReady
        ? resolveRoutingBinding(policy, 'instance-suggestion', null, availableSuggestionModels)
        : null,
    [policy, policyReady, availableSuggestionModels]
  );
  const instanceRouting = useMemo(
    () =>
      policyReady
        ? resolveRoutingBinding(policy, 'instance-segmentation', null, availableInstanceModels)
        : null,
    [policy, policyReady, availableInstanceModels]
  );
  const cellposeRunner = useCellposeInstanceRunnerContext();
  const selectedInstanceModel = availableInstanceModels.find((model) =>
    matchesModelKey(model, 'instance-segmentation', instanceModel)
  );
  const isCellposeSelected =
    isPolypInstanceModel(instanceModel) ||
    isPolypInstanceModel(selectedInstanceModel?.id) ||
    isPolypInstanceModel(selectedInstanceModel?.registry_key);
  const hasUsableSelectedInstanceModel = Boolean(selectedInstanceModel);
  const instanceInputs = getMatchingBindingInputs(
    instanceRouting,
    'instance-segmentation',
    instanceModel
  );
  const canRunInstance =
    !isLoadingInstance &&
    !isRunningInstance &&
    hasUsableSelectedInstanceModel;
  const instanceDefaultIsValid =
    policyResolved &&
    isUsableBinding(instanceRouting) &&
    matchesModelKey(instanceRouting.model, 'instance-segmentation', instanceModel);
  const instanceSelectionNotice =
    policyResolved && hasUsableSelectedInstanceModel && !instanceDefaultIsValid
      ? 'Session override for this image — dataset default remains unchanged.'
      : null;

  const autoSelectedInstanceModel = useAutoSelectedInstanceModel();
  const isAutoDefaultInstanceModel = Boolean(
    autoSelectedInstanceModel && instanceModel === autoSelectedInstanceModel
  );

  const handleSetInstanceModel = useCallback(
    (modelId) => {
      const datasetKey = datasetId != null ? String(datasetId) : '__default__';
      if (modelId) {
        manualInstanceOverridesByDataset.set(datasetKey, modelId);
      } else {
        manualInstanceOverridesByDataset.delete(datasetKey);
      }
      setInstanceModel(modelId);
    },
    [datasetId, setInstanceModel]
  );

  const suggestionSelectionNotice =
    policyResolved &&
    suggestionModel &&
    suggestionModel !==
      getAutoTaskModelKey(
        policyReady ? policy : null,
        'instance-suggestion',
        availableSuggestionModels,
        favorites?.['instance-suggestion']
      )
      ? 'Session override — used for every label instead of the dataset routing.'
      : null;

  useEffect(() => {
    if (instanceRunRequested) {
      if (isCellposeSelected && cellposeRunner) {
        if (
          cellposeRunner.canRun &&
          !cellposeRunner.isRunning &&
          cellposeRunner.status !== 'saving'
        ) {
          setShowInstanceWarning(true);
        }
      } else if (canRunInstance) {
        setShowInstanceWarning(true);
      }
      setInstanceRunRequested(false);
    }
  }, [
    instanceRunRequested,
    isCellposeSelected,
    cellposeRunner,
    canRunInstance,
    setInstanceRunRequested,
  ]);

  // Mirrored to the store so keyboard shortcuts don't steal Enter while the
  // modal has focus.
  useEffect(() => {
    setInstanceWarningModalOpen(showInstanceWarning);
  }, [showInstanceWarning, setInstanceWarningModalOpen]);

  // Fetch model lists on mount if empty
  useEffect(() => {
    if (availablePromptedModels.length === 0) fetchPromptedModels();
    if (availableSuggestionModels.length === 0) fetchSuggestionModels();
    if (availableInstanceModels.length === 0) fetchInstanceModels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear model selections immediately on dataset changes. The shared page-level
  // policy loader then resolves either configured routes or the normal fallbacks.
  useEffect(() => {
    const currentStoredDatasetId = useAnnotationStore?.getState?.()?.models?.modelsDatasetId;
    if (
      datasetId != null &&
      currentStoredDatasetId != null &&
      String(datasetId) === String(currentStoredDatasetId)
    ) {
      return;
    }
    const prevKey = currentStoredDatasetId != null ? String(currentStoredDatasetId) : null;
    if (prevKey) manualInstanceOverridesByDataset.delete(prevKey);
    if (datasetId != null) manualInstanceOverridesByDataset.delete(String(datasetId));
    setPromptedModel(null);
    setSuggestionModel(null);
    setInstanceModel(null, false);
    fetchInstanceModels(datasetId);
  }, [datasetId, setPromptedModel, setSuggestionModel, setInstanceModel]);

  // Prompted Segmentation model resolution (active label override -> task default -> favorite/first compatible)
  useEffect(() => {
    if (!policyResolved || availablePromptedModels.length === 0) return;
    if (promptedRouting?.binding) {
      if (isUsableBinding(promptedRouting)) {
        const modelId = getModelKey(promptedRouting.model);
        if (modelId) setPromptedModel(modelId);
      } else {
        setPromptedModel(null);
      }
      return;
    }

    const modelId = getFallbackModelId(
      availablePromptedModels,
      'prompted-segmentation',
      favorites?.['prompted-segmentation'],
      activeLabelId
    );
    if (modelId) setPromptedModel(modelId);
  }, [
    policyResolved,
    promptedRouting,
    activeLabelId,
    availablePromptedModels,
    favorites,
    setPromptedModel,
  ]);

  // Instance Suggestion model resolution (task default -> favorite/first; label overrides resolve dynamically on exemplar selection)
  useEffect(() => {
    if (!policyResolved || availableSuggestionModels.length === 0) return;
    if (suggestionRouting?.binding) {
      if (isUsableBinding(suggestionRouting)) {
        const modelId = getModelKey(suggestionRouting.model);
        if (modelId) setSuggestionModel(modelId);
      } else {
        setSuggestionModel(null);
      }
      return;
    }

    const modelId = getFallbackModelId(
      availableSuggestionModels,
      'instance-suggestion',
      favorites?.['instance-suggestion']
    );
    if (modelId) setSuggestionModel(modelId);
  }, [
    policyResolved,
    suggestionRouting,
    availableSuggestionModels,
    favorites,
    setSuggestionModel,
  ]);

  // Whole-image Instance Segmentation model resolution (task default -> favorite/first)
  useEffect(() => {
    if (!policyResolved || availableInstanceModels.length === 0) return;
    const datasetKey = datasetId != null ? String(datasetId) : '__default__';
    const manualOverride = manualInstanceOverridesByDataset.get(datasetKey);
    const hasManualOverride = Boolean(
      manualOverride &&
        availableInstanceModels.some((m) =>
          matchesModelKey(m, 'instance-segmentation', manualOverride)
        )
    );

    if (hasManualOverride) {
      if (instanceModel !== manualOverride) {
        setInstanceModel(manualOverride);
      }
      return;
    }

    if (hasUsableSelectedInstanceModel && !isAutoDefaultInstanceModel) {
      return;
    }

    if (instanceRouting?.binding && isUsableBinding(instanceRouting)) {
      const modelId = getModelKey(instanceRouting.model);
      if (modelId) {
        if (instanceModel !== modelId) setInstanceModel(modelId);
        return;
      }
    }

    const modelId = getFallbackModelId(
      availableInstanceModels,
      'instance-segmentation',
      favorites?.['instance-segmentation']
    );
    if (modelId && instanceModel !== modelId) setInstanceModel(modelId);
  }, [
    policyResolved,
    instanceRouting,
    availableInstanceModels,
    favorites,
    datasetId,
    hasUsableSelectedInstanceModel,
    isAutoDefaultInstanceModel,
    instanceModel,
    setInstanceModel,
  ]);

  useModelSwitchPreloader(
    promptedModel,
    annotationSession.selectPromptedModel.bind(annotationSession),
    'prompted'
  );
  useModelSwitchPreloader(
    suggestionModel,
    annotationSession.selectSuggestionModel.bind(annotationSession),
    'suggestion'
  );
  useModelSwitchPreloader(
    instanceModel,
    annotationSession.selectInstanceModel.bind(annotationSession),
    'instance'
  );

  const closeInstanceWarning = () => {
    setShowInstanceWarning(false);
    setInstanceWarningModalOpen(false);
  };

  const confirmInstanceRun = (writeMode = 'patch') => {
    if (isCellposeSelected && cellposeRunner) {
      if (!cellposeRunner.canRun || cellposeRunner.isRunning || cellposeRunner.status === 'saving') {
        return;
      }
      setShowInstanceWarning(false);
      setInstanceRunRequested(false);
      setInstanceWarningModalOpen(false);
      cellposeRunner.run(writeMode);
      return;
    }
    if (!canRunInstance) return;
    setShowInstanceWarning(false);
    setInstanceRunRequested(false);
    setInstanceWarningModalOpen(false);
    if (instanceInputs == null) {
      runInstance(writeMode);
    } else {
      runInstance(writeMode, instanceInputs);
    }
  };

  const services = [
    {
      key: 'prompted',
      task: 'prompted-segmentation',
      name: 'Prompted Segmentation',
      models: availablePromptedModels,
      isLoading: isLoadingPrompted,
      selectedModel: promptedModel,
      setSelectedModel: setPromptedModel,
      isRunning: false,
    },
    {
      key: 'instance',
      task: 'instance-segmentation',
      name: 'Instance Segmentation',
      models: availableInstanceModels,
      isLoading: isLoadingInstance,
      selectedModel: instanceModel,
      setSelectedModel: handleSetInstanceModel,
      isRunning:
        isCellposeSelected && cellposeRunner
          ? Boolean(cellposeRunner.isRunning || cellposeRunner.status === 'saving')
          : isRunningInstance,
      canRun: isCellposeSelected && cellposeRunner ? cellposeRunner.canRun : canRunInstance,
      onRun: () => {
        if (isCellposeSelected && cellposeRunner) {
          if (
            cellposeRunner.canRun &&
            !cellposeRunner.isRunning &&
            cellposeRunner.status !== 'saving'
          ) {
            setShowInstanceWarning(true);
          }
        } else if (canRunInstance) {
          setShowInstanceWarning(true);
        }
      },
      selectionNotice: instanceSelectionNotice,
    },
    {
      key: 'suggestion',
      task: 'instance-suggestion',
      name: 'Within-Image Suggestion',
      models: availableSuggestionModels,
      isLoading: isLoadingSuggestion,
      selectedModel: suggestionModel,
      setSelectedModel: setSuggestionModel,
      isRunning: isRunningSuggestion,
      selectionNotice: suggestionSelectionNotice,
      usageHint:
        'Select exemplars of one class, then press “Suggest similar” (2) in the action bar.',
    },
  ].filter((service) => isToolEnabled(SERVICE_TOOL[service.key]));

  return {
    services,
    policy,
    policyLoading,
    policyError,
    showInstanceWarning,
    closeInstanceWarning,
    confirmInstanceRun,
  };
}
