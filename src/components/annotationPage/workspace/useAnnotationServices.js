import { useCallback, useEffect, useMemo } from 'react';
import {
  useAvailablePromptedModels,
  useFetchAvailablePromptedModels,
  useIsLoadingPromptedModels,
  usePromptedModel,
  useSetPromptedModel,
  useActiveLabelId,
  useModelFavorites,
  usePromptedParameters,
  useSetPromptedParameter,
} from '../../../stores/selectors/annotationSelectors';
import { useDataset } from '../../../contexts/DatasetContext';
import { useAnnotationRoutingPolicy } from '../../../contexts/AnnotationRoutingPolicyContext';
import {
  resolveRoutingBinding,
  isModelCompatibleWithLabel,
  matchesModelKey,
} from '../../../utils/inferenceRouting';
import annotationSession from '../../../services/annotationSession';
import useModelSwitchPreloader from '../../../hooks/useModelSwitchPreloader';
import useAiTools from '../../../hooks/useAiTools';
import useAISegmentation from '../../../hooks/useAISegmentation';

const getModelKey = (model) => model?.id ?? model?.registry_key ?? model?.identifier ?? null;

/** Prompted segmentation keeps its point/box controls; concept segmentation has one per-label action. */
export default function useAnnotationServices() {
  const { currentDataset } = useDataset();
  const datasetId = currentDataset?.id;
  const { isEnabled: isToolEnabled } = useAiTools();
  const activeLabelId = useActiveLabelId();
  const favorites = useModelFavorites();
  const { policy, policyReady, policyResolved, policyLoading, policyError } = useAnnotationRoutingPolicy(datasetId);
  const fetchModels = useFetchAvailablePromptedModels();
  const models = useAvailablePromptedModels();
  const selectedModel = usePromptedModel();
  const setSelectedModel = useSetPromptedModel();
  const isLoading = useIsLoadingPromptedModels();
  const enabled = isToolEnabled('prompted');
  const promptedParameters = usePromptedParameters();
  const setPromptedParameter = useSetPromptedParameter();
  const { rerunLastPrompt } = useAISegmentation();

  // The selected model's contract parameters (e.g. UnSAMv2's granularity), shown on
  // the card. Values live per model for the session; the default fills the rest.
  const selectedModelObj = models.find((model) => getModelKey(model) === selectedModel) || null;
  const parameters = selectedModelObj?.input_contract?.parameters || [];
  const parameterValues = promptedParameters?.[selectedModel] || {};
  const changeParameter = useCallback(
    (key, value) => setPromptedParameter(selectedModel, key, value),
    [selectedModel, setPromptedParameter]
  );

  const routing = useMemo(
    () => policyReady
      ? resolveRoutingBinding(policy, 'prompted-segmentation', activeLabelId, models)
      : null,
    [policy, policyReady, activeLabelId, models]
  );

  useEffect(() => {
    if (models.length === 0) fetchModels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Disarm the old dataset's model until the new policy has resolved.
  useEffect(() => {
    setSelectedModel(null);
  }, [datasetId, setSelectedModel]);

  useEffect(() => {
    if (!policyResolved || models.length === 0) return;
    if (routing?.binding) {
      // An explicit route remains authoritative when its model is unavailable or incompatible.
      const usable = routing.model && routing.isCompatible && !routing.isStale;
      setSelectedModel(usable ? getModelKey(routing.model) : null);
      return;
    }
    const compatible = models.filter((model) => isModelCompatibleWithLabel(model, activeLabelId));
    const favorite = compatible.find((model) =>
      matchesModelKey(model, 'prompted-segmentation', favorites?.['prompted-segmentation'])
    );
    setSelectedModel(getModelKey(favorite ?? compatible[0]));
  }, [policyResolved, routing, activeLabelId, models, favorites, setSelectedModel]);

  useModelSwitchPreloader(
    enabled && policyResolved ? selectedModel : null,
    annotationSession.selectPromptedModel.bind(annotationSession),
    'prompted'
  );

  return {
    services: enabled ? [{
      key: 'prompted',
      task: 'prompted-segmentation',
      name: 'Prompted Segmentation',
      models,
      isLoading,
      selectedModel,
      setSelectedModel,
      isRunning: false,
      parameters,
      parameterValues,
      onParameterChange: changeParameter,
      // Releasing a slider runs the last prompt again with the new value.
      onParameterCommit: rerunLastPrompt,
    }] : [],
    policy,
    policyLoading,
    policyError,
  };
}
