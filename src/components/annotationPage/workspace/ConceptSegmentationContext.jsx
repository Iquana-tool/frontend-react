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
} from '../../../stores/selectors/annotationSelectors';
import { useConceptSegmentationRunner } from './useConceptSegmentationRunner';
import { getConceptParentIds, isConceptModelAvailable, resolveConceptSelection } from './conceptSegmentationModel';
import InstanceWarningModal from '../modals/InstanceWarningModal';

const ConceptSegmentationContext = createContext(null);
const TOOL = {
  'instance-segmentation': 'instance_segmentation',
  'instance-suggestion': 'instance_suggestion',
  'cross-image-suggestion': 'cross_image',
};

/** Workspace lifetime keeps jobs, retries and per-label settings alive when the drawer closes. */
export function ConceptSegmentationProvider({ children }) {
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
    ? catalog.models.filter((model) => isConceptModelAvailable(model) && isEnabled(TOOL[model.task])) : [], [catalog, datasetId, isEnabled]);
  const loading = catalog.datasetId !== datasetId || catalog.loading || !policyResolved;
  const settingsByLabel = settings.datasetId === datasetId ? settings.labels : {};

  const getLabelState = (labelId) => {
    const label = labels.find((entry) => Number(entry.id) === Number(labelId));
    const setting = settingsByLabel[labelId] || {};
    const selection = resolveConceptSelection({ models, policy, labelId, override: setting.model });
    const useHierarchy = label?.parent_id != null && (setting.useHierarchy ?? true);
    const parentContourIds = useHierarchy
      ? getConceptParentIds({ labelId, labels, objects, selectedIds, focusedContourId }) : [];
    let reason = loading ? 'Loading segmentation settings…' : catalog.error || policyError || selection.reason;
    if (imageId == null) reason = 'Load an image before segmenting.';
    if (!can(Permission.AI_INTERACTIVE) || !can(Permission.ANNOTATION_CREATE)) reason = 'You do not have permission to segment this image.';
    if (!reason && useHierarchy && parentContourIds.length === 0) reason = 'Annotate an eligible parent first, or turn off Use hierarchy.';
    const inputs = setting.threshold == null ? selection.inputs : {
      ...selection.inputs,
      parameters: { ...selection.inputs?.parameters, threshold: setting.threshold },
    };
    return { ...selection, labelId: Number(labelId), useHierarchy, parentContourIds, inputs, reason, setting };
  };

  const targetLabelId = labels.some((label) => Number(label.id) === Number(activeLabelId))
    ? Number(activeLabelId) : labels[0]?.id;
  const selected = getLabelState(targetLabelId);
  const effectiveConfiguration = runConfiguration?.datasetId === datasetId ? runConfiguration : selected;
  const runner = useConceptSegmentationRunner(effectiveConfiguration.model, effectiveConfiguration);
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

  useEffect(() => {
    if (!pending || !runConfiguration || runConfiguration.datasetId !== datasetId) return;
    if (!runner.canRun) {
      setPending(null);
      requestedRef.current = false;
      return;
    }
    if (pending.mode == null && runner.hasExistingPolypsInScope) {
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

  return (
    <ConceptSegmentationContext.Provider value={{
      models, labels, loading, error: catalog.error || policyError, targetLabelId,
      getLabelState, updateSettings, requestRun, busy: busy || warning || Boolean(pending),
      runner, runLabelId: effectiveConfiguration.labelId,
    }}>
      {children}
      <InstanceWarningModal
        isOpen={warning}
        onClose={closeWarning}
        onConfirm={(mode) => { setWarning(false); setPending({ mode }); }}
        labelName={runner.mappedLabel?.labelName}
      />
    </ConceptSegmentationContext.Provider>
  );
}

export const useConceptSegmentation = () => useContext(ConceptSegmentationContext);
