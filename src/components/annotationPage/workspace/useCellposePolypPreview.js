import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  cancelInferenceJob,
  getInferenceJobItems,
  getInferenceModelCatalog,
  startInferenceJob,
  streamInferenceJob,
} from '../../../api/inference';
import { useDataset } from '../../../contexts/DatasetContext';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import annotationSession from '../../../services/annotationSession';
import {
  useCellposePreview,
  useClearCellposePreview,
  useCurrentImageId,
  useDatasetLabels,
  useDatasetLabelsMap,
  useExpandObject,
  useFocusedParentContourId,
  useImageObject,
  useObjectsList,
  useRemoveCellposePreviewPrediction,
  useSelectedObjects,
  useSetCellposePreview,
  useSetCellposePreviewEditingId,
  useUpdateCellposePreviewPrediction,
} from '../../../stores/selectors/annotationSelectors';
import { Permission } from '../../../utils/permissions';
import {
  buildCellposePreviewRequest,
  extractPreviewPredictions,
  getSelectedFragmentContourIds,
  resolveParentContourId,
  resolvePolypProjectLabel,
  toAcceptedContour,
  CELLPOSE_POLYP_REGISTRY_KEY,
} from './cellposePreviewModel';

const TERMINAL_STATUSES = new Set(['succeeded', 'partial', 'failed', 'cancelled']);

const getPreviewItemFailure = (items) => {
  const itemList = Array.isArray(items) ? items : items?.items || [];
  const failedItem = itemList.find((item) => item?.status === 'failed' || item?.status === 'skipped' || item?.error);
  return failedItem?.error || (failedItem ? 'Cellpose-SAM inference failed for this image. You can retry the preview.' : null);
};

/** Runs Cellpose-SAM in the async inference service and keeps results transient until accepted. */
export function useCellposePolypPreview() {
  const { currentDataset } = useDataset();
  const datasetId = currentDataset?.id;
  const imageId = useCurrentImageId();
  const imageObject = useImageObject();
  const datasetLabels = useDatasetLabels();
  const labelsMap = useDatasetLabelsMap();
  const objects = useObjectsList();
  const selectedObjectIds = useSelectedObjects();
  const focusedParentContourId = useFocusedParentContourId();
  const expandObject = useExpandObject();
  const preview = useCellposePreview();
  const setPreview = useSetCellposePreview();
  const clearPreview = useClearCellposePreview();
  const updatePrediction = useUpdateCellposePreviewPrediction();
  const setEditingPredictionId = useSetCellposePreviewEditingId();
  const removePrediction = useRemoveCellposePreviewPrediction();
  const { addToast } = useToast();
  const { can } = usePermissions(datasetId);

  const [catalogModels, setCatalogModels] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  const [scope, setScope] = useState('fragments');
  const [enabled, setEnabled] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const [jobError, setJobError] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const requestTokenRef = useRef(0);
  const catalogTokenRef = useRef(0);
  const activeJobIdRef = useRef(null);
  const previewJobIdRef = useRef(null);
  const streamRef = useRef(null);
  const imageScopeRef = useRef({ datasetId, imageId });
  const currentScopeRef = useRef({ datasetId, imageId, imageObject });
  currentScopeRef.current = { datasetId, imageId, imageObject };
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const acceptanceTokenRef = useRef(0);
  const acceptingRef = useRef(false);

  const canUseTool = can(Permission.AI_INTERACTIVE) && can(Permission.ANNOTATION_CREATE);
  const model = useMemo(
    () => catalogModels.find((entry) => entry?.registry_key === CELLPOSE_POLYP_REGISTRY_KEY) ?? null,
    [catalogModels]
  );
  const projectLabel = useMemo(() => resolvePolypProjectLabel(model, labelsMap), [model, labelsMap]);
  const roiContourIds = useMemo(
    () => getSelectedFragmentContourIds(selectedObjectIds, objects, labelsMap),
    [selectedObjectIds, objects, labelsMap]
  );
  const isRunning = jobStatus != null && !TERMINAL_STATUSES.has(jobStatus);

  const loadPredictions = useCallback(async (jobId, token) => {
    try {
      const items = await getInferenceJobItems(jobId);
      if (requestTokenRef.current !== token) return;
      const itemFailure = getPreviewItemFailure(items);
      if (itemFailure) {
        clearPreview();
        setJobStatus('failed');
        setJobError(itemFailure);
        return;
      }
      const predictions = extractPreviewPredictions(items, projectLabel?.labelId);
      setPreview({
        imageId,
        datasetId,
        jobId,
        predictions,
        predictionMetadata: (Array.isArray(items) ? items : items?.items || [])
          .map((item) => item?.predictions?.prediction_metadata)
          .find(Boolean) ?? null,
        editingPredictionId: null,
      });
      setJobStatus('succeeded');
      setJobError(predictions.length ? null : 'The model returned no polyp outlines. You can adjust the ROI and try again.');
    } catch (error) {
      if (requestTokenRef.current !== token) return;
      setJobStatus('failed');
      setJobError(error?.message || 'Could not load the Cellpose-SAM preview.');
    }
  }, [clearPreview, datasetId, imageId, projectLabel?.labelId, setPreview]);

  const handleSnapshot = useCallback((snapshot, token) => {
    if (requestTokenRef.current !== token) return;
    const status = snapshot?.status;
    if (!status) return;
    setJobStatus(status);
    if (!TERMINAL_STATUSES.has(status)) return;

    streamRef.current?.abort();
    streamRef.current = null;
    const jobId = snapshot.id ?? activeJobIdRef.current;
    activeJobIdRef.current = null;
    if (status === 'succeeded' || status === 'partial') {
      if (jobId != null) loadPredictions(jobId, token);
      else setJobError('The completed preview did not include a job ID.');
    } else if (status === 'failed') {
      setJobError(snapshot.error || 'Cellpose-SAM inference failed. You can retry the preview.');
    } else {
      clearPreview();
      setJobError('Cellpose-SAM preview was cancelled.');
    }
  }, [clearPreview, loadPredictions]);

  const refreshModelCatalog = useCallback(async () => {
    const token = ++catalogTokenRef.current;
    setCatalogModels([]);
    setCatalogError(null);
    if (!datasetId) {
      setCatalogLoading(false);
      return;
    }
    setCatalogLoading(true);
    try {
      const catalog = await getInferenceModelCatalog(datasetId);
      if (catalogTokenRef.current === token) setCatalogModels(catalog?.models || []);
    } catch (error) {
      if (catalogTokenRef.current === token) {
        setCatalogModels([]);
        setCatalogError(error?.message || 'Could not load available inference models.');
      }
    } finally {
      if (catalogTokenRef.current === token) setCatalogLoading(false);
    }
  }, [datasetId]);

  useEffect(() => {
    refreshModelCatalog();
    return () => {
      catalogTokenRef.current += 1;
    };
  }, [refreshModelCatalog]);

  const stopActiveJob = useCallback((message = null) => {
    requestTokenRef.current += 1;
    streamRef.current?.abort();
    streamRef.current = null;
    const jobId = activeJobIdRef.current;
    activeJobIdRef.current = null;
    const previewJobId = previewJobIdRef.current;
    previewJobIdRef.current = null;
    clearPreview();
    if (message) setJobError(message);
    const jobIds = [...new Set([jobId, previewJobId, previewRef.current?.jobId].filter((id) => id != null))];
    for (const id of jobIds) {
      cancelInferenceJob(id).catch(() => {
        // Cancellation remains local even if the server has already finished the job.
      });
    }
  }, [clearPreview]);

  useLayoutEffect(() => {
    const previousScope = imageScopeRef.current;
    if (previousScope.datasetId === datasetId && previousScope.imageId === imageId) return undefined;
    imageScopeRef.current = { datasetId, imageId };
    acceptanceTokenRef.current += 1;
    stopActiveJob();
    setJobStatus(null);
    setJobError(null);
    setScope('fragments');
    return undefined;
  }, [datasetId, imageId, stopActiveJob]);

  useEffect(() => () => {
    requestTokenRef.current += 1;
    streamRef.current?.abort();
    const jobId = activeJobIdRef.current;
    activeJobIdRef.current = null;
    const previewJobId = previewJobIdRef.current;
    previewJobIdRef.current = null;
    clearPreview();
    const jobIds = [...new Set([jobId, previewJobId, previewRef.current?.jobId].filter((id) => id != null))];
    for (const id of jobIds) cancelInferenceJob(id).catch(() => {});
  }, [clearPreview]);

  const selectModel = useCallback((selected) => {
    setEnabled(selected);
    if (!selected) {
      stopActiveJob();
      setJobStatus(null);
      setJobError(null);
    }
  }, [stopActiveJob]);

  const run = useCallback(async () => {
    if (!datasetId || !imageId || !projectLabel || !model || !canUseTool || isRunning || preview) return false;
    if (scope === 'fragments' && roiContourIds.length === 0) return false;

    const token = ++requestTokenRef.current;
    const priorJobId = previewJobIdRef.current;
    previewJobIdRef.current = null;
    if (priorJobId != null) cancelInferenceJob(priorJobId).catch(() => {});
    clearPreview();
    setJobError(null);
    setJobStatus('starting');
    try {
      const request = buildCellposePreviewRequest({
        datasetId,
        imageId,
        labelId: projectLabel.labelId,
        roiContourIds: scope === 'fragments' ? roiContourIds : [],
      });
      const snapshot = await startInferenceJob(request);
      if (requestTokenRef.current !== token) {
        if (snapshot?.id != null) cancelInferenceJob(snapshot.id).catch(() => {});
        return false;
      }
      if (snapshot?.id == null) throw new Error('The inference service did not return a job ID.');
      activeJobIdRef.current = snapshot.id;
      previewJobIdRef.current = snapshot.id;
      setJobStatus(snapshot.status || 'queued');
      if (TERMINAL_STATUSES.has(snapshot.status)) {
        handleSnapshot(snapshot, token);
      } else {
        streamRef.current = streamInferenceJob(
          snapshot.id,
          (nextSnapshot) => handleSnapshot(nextSnapshot, token),
          (error) => {
            if (requestTokenRef.current === token) {
              setJobError(error?.message || 'Lost the preview progress stream. You can cancel or retry.');
            }
          }
        );
      }
      return true;
    } catch (error) {
      if (requestTokenRef.current === token) {
        setJobStatus('failed');
        setJobError(error?.message || 'Could not start Cellpose-SAM inference.');
      }
      return false;
    }
  }, [
    canUseTool, clearPreview, datasetId, handleSnapshot, imageId, isRunning, model,
    preview, projectLabel, roiContourIds, scope,
  ]);

  const cancel = useCallback(async () => {
    const jobId = activeJobIdRef.current ?? previewJobIdRef.current ?? previewRef.current?.jobId;
    requestTokenRef.current += 1;
    streamRef.current?.abort();
    streamRef.current = null;
    activeJobIdRef.current = null;
    previewJobIdRef.current = null;
    clearPreview();
    setJobStatus('cancelled');
    setJobError('Cellpose-SAM preview cancelled.');
    if (jobId != null) {
      try {
        await cancelInferenceJob(jobId);
      } catch {
        // A local cancellation must still ignore any late preview payload.
      }
    }
  }, [clearPreview]);

  const discard = useCallback(() => {
    const jobId = preview?.jobId ?? previewJobIdRef.current;
    previewJobIdRef.current = null;
    clearPreview();
    setEditingPredictionId(null);
    setJobStatus(null);
    setJobError(null);
    if (jobId != null) cancelInferenceJob(jobId).catch(() => {});
  }, [clearPreview, preview, setEditingPredictionId]);

  const acceptIncluded = useCallback(async () => {
    if (!preview || preview.imageId !== imageId || preview.datasetId !== datasetId || !imageObject || acceptingRef.current) return false;
    const included = preview.predictions.filter((prediction) => prediction.included);
    if (included.length === 0) return false;
    const acceptance = {
      token: ++acceptanceTokenRef.current,
      datasetId,
      imageId,
      imageObject,
      previewJobId: preview.jobId,
      previewReference: preview,
      session: annotationSession,
    };
    const isCurrentAcceptance = () => {
      const scope = currentScopeRef.current;
      const latestPreview = previewRef.current;
      const samePreview = acceptance.previewJobId != null
        ? String(latestPreview?.jobId) === String(acceptance.previewJobId)
        : latestPreview === acceptance.previewReference;
      return acceptanceTokenRef.current === acceptance.token
        && String(scope.datasetId) === String(acceptance.datasetId)
        && String(scope.imageId) === String(acceptance.imageId)
        && scope.imageObject === acceptance.imageObject
        && annotationSession === acceptance.session
        && samePreview
        && String(latestPreview?.datasetId) === String(acceptance.datasetId)
        && String(latestPreview?.imageId) === String(acceptance.imageId);
    };
    acceptingRef.current = true;
    setIsAccepting(true);
    setJobError(null);
    let acceptedIds = [];
    try {
      for (const prediction of included) {
        if (!isCurrentAcceptance()) throw new Error('The active image changed during acceptance.');
        const parentId = resolveParentContourId(prediction, {
          focusedContourId: scope === 'fragments' ? focusedParentContourId : null,
          roiContourIds: scope === 'fragments' ? roiContourIds : [],
          objects,
          labelsMap,
          datasetLabels,
          scope: scope === 'image' ? 'whole_image' : 'fragment',
        });
        const contour = toAcceptedContour(prediction, imageObject.width, imageObject.height, parentId);
        if (!contour) throw new Error('A preview outline has invalid coordinates. Remove it or discard the preview.');
        const response = await annotationSession.addObject(
          contour.x,
          contour.y,
          projectLabel?.labelName ?? null,
          contour.parentId,
          contour.confidence,
          contour.labelId,
          {
            addedBy: CELLPOSE_POLYP_REGISTRY_KEY,
            source: 'instance_suggestion',
            modelKey: CELLPOSE_POLYP_REGISTRY_KEY,
          }
        );
        if (!response || response.type !== 'object_added' || response.data?.skipped) {
          throw new Error(response?.message || 'Outline was rejected by the server (e.g. invalid hierarchy or duplicate pixels).');
        }
        acceptedIds.push(prediction.id);
        if (contour.parentId != null) {
          expandObject(contour.parentId);
        }
        if (!isCurrentAcceptance()) throw new Error('The active image changed during acceptance.');
        // Remove only after the server acknowledges that one contour.
        removePrediction(prediction.id);
      }
      if (!isCurrentAcceptance()) throw new Error('The active image changed during acceptance.');
      setEditingPredictionId(null);
      if (acceptedIds.length && preview.predictions.every((prediction) => acceptedIds.includes(prediction.id))) {
        clearPreview();
        const jobId = preview.jobId ?? previewJobIdRef.current;
        previewJobIdRef.current = null;
        if (jobId != null) cancelInferenceJob(jobId).catch(() => {});
      }
      if (acceptedIds.length) addToast({ type: 'success', message: `Accepted ${acceptedIds.length} polyp outline${acceptedIds.length === 1 ? '' : 's'}.` });
      return true;
    } catch (error) {
      const acceptanceIsCurrent = isCurrentAcceptance();
      const remainingCount = included.length - acceptedIds.length;
      const message = acceptanceIsCurrent
        ? (acceptedIds.length
          ? `Accepted ${acceptedIds.length} of ${included.length} outlines. ${remainingCount} remain in the preview. ${error?.message || 'The next outline could not be saved.'}`
          : `None of the ${included.length} outlines were accepted. ${error?.message || 'Could not save the accepted outline.'}`)
        : `Accepted ${acceptedIds.length} outline${acceptedIds.length === 1 ? '' : 's'} before the active image changed. The remaining outlines were not submitted.`;
      if (acceptanceIsCurrent) setJobError(message);
      else addToast({ type: 'success', message });
      return false;
    } finally {
      acceptingRef.current = false;
      setIsAccepting(false);
    }
  }, [addToast, clearPreview, datasetId, datasetLabels, expandObject, focusedParentContourId, imageId, imageObject, labelsMap, objects, preview, projectLabel?.labelName, removePrediction, roiContourIds, setEditingPredictionId]);

  const acceptPrediction = useCallback(async (predictionId) => {
    if (!preview || preview.imageId !== imageId || preview.datasetId !== datasetId || !imageObject || acceptingRef.current) return false;
    const prediction = preview.predictions.find((p) => p.id === predictionId);
    if (!prediction) return false;
    const acceptance = {
      token: ++acceptanceTokenRef.current,
      datasetId,
      imageId,
      imageObject,
      previewJobId: preview.jobId,
      previewReference: preview,
      session: annotationSession,
    };
    const isCurrentAcceptance = () => {
      const scope = currentScopeRef.current;
      const latestPreview = previewRef.current;
      const samePreview = acceptance.previewJobId != null
        ? String(latestPreview?.jobId) === String(acceptance.previewJobId)
        : latestPreview === acceptance.previewReference;
      return acceptanceTokenRef.current === acceptance.token
        && String(scope.datasetId) === String(acceptance.datasetId)
        && String(scope.imageId) === String(acceptance.imageId)
        && scope.imageObject === acceptance.imageObject
        && annotationSession === acceptance.session
        && samePreview
        && String(latestPreview?.datasetId) === String(acceptance.datasetId)
        && String(latestPreview?.imageId) === String(acceptance.imageId);
    };
    acceptingRef.current = true;
    setIsAccepting(true);
    setJobError(null);
    try {
      if (!isCurrentAcceptance()) throw new Error('The active image changed during acceptance.');
      const parentId = resolveParentContourId(prediction, {
        focusedContourId: scope === 'fragments' ? focusedParentContourId : null,
        roiContourIds: scope === 'fragments' ? roiContourIds : [],
        objects,
        labelsMap,
        datasetLabels,
        scope: scope === 'image' ? 'whole_image' : 'fragment',
      });
      const contour = toAcceptedContour(prediction, imageObject.width, imageObject.height, parentId);
      if (!contour) throw new Error('A preview outline has invalid coordinates. Remove it or discard the preview.');
      const response = await annotationSession.addObject(
        contour.x,
        contour.y,
        projectLabel?.labelName ?? null,
        contour.parentId,
        contour.confidence,
        contour.labelId,
        {
          addedBy: CELLPOSE_POLYP_REGISTRY_KEY,
          source: 'instance_suggestion',
          modelKey: CELLPOSE_POLYP_REGISTRY_KEY,
        }
      );
      if (!response || response.type !== 'object_added' || response.data?.skipped) {
        throw new Error(response?.message || 'Outline was rejected by the server (e.g. invalid hierarchy or duplicate pixels).');
      }
      if (contour.parentId != null) {
        expandObject(contour.parentId);
      }
      if (!isCurrentAcceptance()) throw new Error('The active image changed during acceptance.');
      removePrediction(prediction.id);
      if (preview.predictions.length <= 1) {
        clearPreview();
        const jobId = preview.jobId ?? previewJobIdRef.current;
        previewJobIdRef.current = null;
        if (jobId != null) cancelInferenceJob(jobId).catch(() => {});
      }
      addToast({ type: 'success', message: 'Accepted polyp outline.' });
      return true;
    } catch (error) {
      if (isCurrentAcceptance()) {
        setJobError(error?.message || 'Could not save the accepted outline.');
      }
      return false;
    } finally {
      acceptingRef.current = false;
      setIsAccepting(false);
    }
  }, [addToast, clearPreview, datasetId, datasetLabels, expandObject, focusedParentContourId, imageId, imageObject, labelsMap, objects, preview, projectLabel?.labelName, removePrediction, roiContourIds]);

  const toggleIncluded = useCallback((predictionId, included) => {
    updatePrediction(predictionId, { included });
  }, [updatePrediction]);

  return {
    datasetId,
    imageId,
    model,
    projectLabel,
    catalogLoading,
    catalogError,
    refreshModelCatalog,
    enabled,
    setEnabled: selectModel,
    scope,
    setScope,
    roiContourIds,
    canUseTool,
    isRunning,
    jobStatus,
    jobError,
    preview: preview?.imageId === imageId && String(preview.datasetId) === String(datasetId) ? preview : null,
    isAccepting,
    run,
    cancel,
    discard,
    acceptIncluded,
    acceptPrediction,
    toggleIncluded,
    setEditingPredictionId,
  };
}

export default useCellposePolypPreview;
