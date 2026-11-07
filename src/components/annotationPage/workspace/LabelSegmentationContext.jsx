import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getInferenceModelCatalog } from '../../../api/inference';
import { useDataset } from '../../../contexts/DatasetContext';
import { useAnnotationRoutingPolicy } from '../../../contexts/AnnotationRoutingPolicyContext';
import useAiTools from '../../../hooks/useAiTools';
import { Permission, usePermissions } from '../../../hooks/usePermissions';
import {
  useActiveLabelId, useSetActiveLabelId, useDatasetLabels, useObjectsList,
  useSelectedObjectIds, useFocusedContourId, useSetInstanceWarningModalOpen,
  useCurrentImageId,
  useSetIsRunningInstance,
  useExitFocusMode,
  useClearSelection,
} from '../../../stores/selectors/annotationSelectors';
import { useLabelSegmentationRunner } from './useLabelSegmentationRunner';
import { getLabelConditioningReason, getLabelParentIds, isLabelModelAvailable, resolveLabelSelection } from './labelSegmentationModel';
import InstanceWarningModal from '../modals/InstanceWarningModal';

const LabelSegmentationContext = createContext(null);
const TOOL = {
  'instance-segmentation': 'instance_segmentation',
  'instance-suggestion': 'instance_suggestion',
  'cross-image-suggestion': 'cross_image',
};

/** Workspace lifetime keeps jobs, retries and per-label settings alive when the drawer closes. */
export function LabelSegmentationProvider({ children }) {
  const { currentDataset } = useDataset();
  const datasetId = currentDataset?.id;
  const imageId = useCurrentImageId();
  const labels = useDatasetLabels();
  const objects = useObjectsList();
  const selectedIds = useSelectedObjectIds();
  const focusedContourId = useFocusedContourId();
  const activeLabelId = useActiveLabelId();
  const setActiveLabelId = useSetActiveLabelId();
  const setWarningOpen = useSetInstanceWarningModalOpen();
  const setIsRunningInstance = useSetIsRunningInstance();
  const { isEnabled } = useAiTools();
  const { can } = usePermissions();
  const { policy, policyResolved, policyError } = useAnnotationRoutingPolicy(datasetId);
  const exitFocusMode = useExitFocusMode();
  const clearSelection = useClearSelection();
  const [catalog, setCatalog] = useState({ datasetId: null, models: [], loading: true, error: null });
  const [settings, setSettings] = useState({ datasetId, labels: {} });
  const [runConfiguration, setRunConfiguration] = useState(null);
  const [pending, setPending] = useState(null);
  const [warning, setWarning] = useState(false);
  const requestedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setCatalog({ datasetId, models: [], loading: datasetId != null, error: null });
    setSettings({ datasetId, labels: {} });
    setRunConfiguration(null);
    setPending(null);
    setWarning(false);
    requestedRef.current = false;
    if (datasetId != null) {
      getInferenceModelCatalog(datasetId).then((result) => {
        if (!cancelled) setCatalog({ datasetId, models: result?.models || [], loading: false, error: null });
      }).catch((error) => {
        if (!cancelled) setCatalog({ datasetId, models: [], loading: false, error: error.message || 'Could not load segmentation models.' });
      });
    }
    return () => { cancelled = true; };
  }, [datasetId]);

  useEffect(() => {
    setRunConfiguration(null);
    setPending(null);
    setWarning(false);
    requestedRef.current = false;
  }, [imageId]);

  useEffect(() => {
    setWarningOpen(warning);
    return () => setWarningOpen(false);
  }, [warning, setWarningOpen]);

  const models = useMemo(() => catalog.datasetId === datasetId
    ? catalog.models.filter((model) => isLabelModelAvailable(model) && isEnabled(TOOL[model.task])) : [], [catalog, datasetId, isEnabled]);
  const loading = catalog.datasetId !== datasetId || catalog.loading || !policyResolved;
  const settingsByLabel = settings.datasetId === datasetId ? settings.labels : {};

  const getLabelState = (labelId, overrides = {}) => {
    const label = labels.find((entry) => Number(entry.id) === Number(labelId));
    const parentLabel = label?.parent_id != null ? labels.find((entry) => Number(entry.id) === Number(label.parent_id)) : null;
    const setting = { ...(settingsByLabel[labelId] || {}), ...overrides };
    const selection = resolveLabelSelection({ models, policy, labelId, override: setting.model });
    const followsDatasetDefault = Boolean(!setting.model && selection.model && Array.isArray(policy?.bindings) && policy.bindings.some((binding) =>
      binding.task === selection.model.task
      && (binding.label_id == null || Number(binding.label_id) === Number(labelId))));
    const availableParentIds = label?.parent_id != null
      ? getLabelParentIds({ labelId, labels, objects, selectedIds, focusedContourId }) : [];
    const imageParentIds = label?.parent_id != null
      ? getLabelParentIds({ labelId, labels, objects, selectedIds: [], focusedContourId: null }) : [];
    const defaultUseHierarchy = label?.parent_id == null || availableParentIds.length > 0;
    const useHierarchy = setting.useHierarchy ?? defaultUseHierarchy;
    const parentContourIds = useHierarchy ? availableParentIds : [];
    let reason = loading ? 'Loading segmentation settings…' : catalog.error || policyError || selection.reason;
    if (imageId == null) reason = 'Load an image before segmenting.';
    if (!can(Permission.AI_INTERACTIVE) || !can(Permission.ANNOTATION_CREATE)) reason = 'You do not have permission to segment this image.';
    if (!label) reason = 'This label is no longer available in this dataset.';
    const isMissingParents = Boolean(useHierarchy && label?.parent_id != null && parentContourIds.length === 0);
    const missingParentsReason = Boolean(!reason && isMissingParents);
    if (missingParentsReason) {
      reason = `No eligible ${parentLabel?.name || 'parent'} objects in the current scope.`;
    }
    if (!reason) reason = getLabelConditioningReason({ model: selection.model, label, objects });
    const inputs = setting.threshold == null ? selection.inputs : {
      ...selection.inputs,
      parameters: { ...selection.inputs?.parameters, threshold: setting.threshold },
    };
    return {
      ...selection,
      followsDatasetDefault,
      labelId: Number(labelId),
      useHierarchy,
      parentContourIds,
      inputs,
      reason,
      setting,
      parentLabelName: parentLabel?.name || 'parent',
      missingParentsReason,
      hasParentsElsewhere: imageParentIds.length > 0 && availableParentIds.length === 0,
      imageParentCount: imageParentIds.length,
    };
  };

  const targetLabelId = labels.some((label) => Number(label.id) === Number(activeLabelId))
    ? Number(activeLabelId) : labels[0]?.id;
  const selected = getLabelState(targetLabelId);
  const effectiveConfiguration = runConfiguration?.datasetId === datasetId ? runConfiguration : selected;
  const runner = useLabelSegmentationRunner(effectiveConfiguration);
  const busy = runner.isRunning || runner.status === 'saving';

  useEffect(() => {
    setIsRunningInstance(busy);
    return () => setIsRunningInstance(false);
  }, [busy, setIsRunningInstance]);

  const updateSettings = (labelId, changes) => {
    if (busy || warning || requestedRef.current) return;
    setSettings((current) => ({
      datasetId,
      labels: { ...(current.datasetId === datasetId ? current.labels : {}), [labelId]: { ...(current.datasetId === datasetId ? current.labels[labelId] : {}), ...changes } },
    }));
  };

  const requestRun = (labelId = targetLabelId) => {
    if (requestedRef.current || busy || warning) return false;
    const configuration = getLabelState(labelId);
    if (configuration.reason || !configuration.model) return false;
    requestedRef.current = true;
    setActiveLabelId(Number(labelId));
    setRunConfiguration({ ...configuration, datasetId });
    setPending({ mode: null });
    return true;
  };

  const runOnWholeImage = (labelId = targetLabelId) => {
    if (requestedRef.current || busy || warning) return false;
    updateSettings(labelId, { useHierarchy: false });
    const wholeConfig = getLabelState(labelId, { useHierarchy: false });
    if (wholeConfig.reason || !wholeConfig.model) return false;
    requestedRef.current = true;
    setActiveLabelId(Number(labelId));
    setRunConfiguration({ ...wholeConfig, datasetId });
    setPending({ mode: null });
    return true;
  };

  useEffect(() => {
    if (!pending || !runConfiguration || runConfiguration.datasetId !== datasetId) return;
    if (!runner.canRun) {
      setPending(null);
      requestedRef.current = false;
      return;
    }
    if (pending.mode == null && runner.hasExistingTargetObjectsInScope) {
      setWarning(true);
      setPending(null);
      return;
    }
    setPending(null);
    runner.run(pending.mode || 'patch').finally(() => { requestedRef.current = false; });
  }, [pending, runConfiguration, datasetId, runner]);

  const closeWarning = useCallback(() => {
    setWarning(false);
    requestedRef.current = false;
  }, []);

  const clearScope = useCallback(() => {
    exitFocusMode();
    clearSelection();
  }, [exitFocusMode, clearSelection]);

  return (
    <LabelSegmentationContext.Provider value={{
      models, labels, loading, error: catalog.error || policyError, targetLabelId,
      getLabelState, updateSettings, requestRun, runOnWholeImage, clearScope, busy: busy || warning || Boolean(pending),
      runner, runLabelId: effectiveConfiguration.labelId,
    }}>
      {children}
      <InstanceWarningModal
        isOpen={warning}
        onClose={closeWarning}
        onConfirm={(mode) => { setWarning(false); setPending({ mode }); }}
        labelName={runner.mappedLabel?.labelName}
      />
    </LabelSegmentationContext.Provider>
  );
}

export const useLabelSegmentation = () => useContext(LabelSegmentationContext);
export const useConceptSegmentation = useLabelSegmentation;
export const ConceptSegmentationContext = LabelSegmentationContext;
export const ConceptSegmentationProvider = LabelSegmentationProvider;
