import { useEffect, useMemo } from 'react';
import {
  useAvailablePromptedModels,
  useFetchAvailablePromptedModels,
  useIsLoadingPromptedModels,
  usePromptedModel,
  useSetPromptedModel,
  useActiveLabelId,
  useModelFavorites,
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
    }] : [],
    policy,
    policyLoading,
    policyError,
  };
}
