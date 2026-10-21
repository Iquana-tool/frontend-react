import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CELLPOSE_POLYP_REGISTRY_KEY,
  POLYP_MODEL_INFO,
  resolvePolypProjectLabel,
  getSelectedFragmentContourIds,
  buildCellposePreviewRequest,
  extractPreviewPredictions,
  resolveParentContourId,
  toAcceptedContour,
  getExistingPolypsForScope,
  suppressOverlappingPredictions,
} from './cellposePreviewModel';
import {
  startInferenceJob,
  getInferenceJob,
  streamInferenceJob,
  getInferenceJobItems,
  cancelInferenceJob,
} from '../../../api/inference';
import annotationSession from '../../../services/annotationSession';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import {
  useCurrentImageId,
  useImageObject,
  useObjectsList,
  useSelectedObjectIds,
  useDatasetLabels,
  useDatasetLabelsMap,
  useSetDatasetLabels,
  useFocusedContourId,
  useExpandObject,
  useLastInstanceRun,
  useSetLastInstanceRun,
  useClearLastInstanceRun,
  useSetCurrentTool,
} from '../../../stores/selectors/annotationSelectors';
import { useParams } from 'react-router-dom';
import { useDataset } from '../../../contexts/DatasetContext';
import { useToast } from '../../../contexts/ToastContext';
import { fetchLabels } from '../../../api/labels';
import { extractLabelsFromResponse } from '../../../utils/labelHierarchy';

export const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'partial']);

export function useCellposeInstanceRunner(selectedModelObj = null) {
  const modelKey = selectedModelObj?.registry_key ?? selectedModelObj?.id ?? CELLPOSE_POLYP_REGISTRY_KEY;
  const modelInfo = POLYP_MODEL_INFO[modelKey] ?? POLYP_MODEL_INFO[CELLPOSE_POLYP_REGISTRY_KEY];
  let routeParams = {};
  try {
    routeParams = useParams() || {};
  } catch (_) {
    routeParams = {};
  }
  const routeDatasetId = routeParams.datasetId;
  const routeImageId = routeParams.imageId;

  const { currentDataset, datasets } = useDataset();
  const storeImageId = useCurrentImageId();

  const datasetId = useMemo(() => {
    if (routeDatasetId != null && !isNaN(routeDatasetId)) return Number(routeDatasetId);
    if (currentDataset?.id != null) return Number(currentDataset.id);
    const found = datasets?.find((d) => String(d.id) === String(routeDatasetId));
    return found?.id ?? null;
  }, [routeDatasetId, currentDataset, datasets]);

  const imageId = useMemo(() => {
    if (storeImageId != null) return Number(storeImageId);
    if (routeImageId != null && !isNaN(routeImageId)) return Number(routeImageId);
    return null;
  }, [storeImageId, routeImageId]);

  const imageObject = useImageObject();
  const objectsList = useObjectsList();
  const selectedObjectIds = useSelectedObjectIds();
  const datasetLabels = useDatasetLabels();
  const datasetLabelsMap = useDatasetLabelsMap();
  const setDatasetLabels = useSetDatasetLabels();
  const focusedContourId = useFocusedContourId();
  const expandObject = useExpandObject();
  const setCurrentTool = useSetCurrentTool();
  const { addToast } = useToast();

  // If dataset is active but labels are not yet loaded in store, fetch them automatically
  useEffect(() => {
    if (datasetId && (!datasetLabelsMap || (Array.isArray(datasetLabels) && datasetLabels.length === 0))) {
      fetchLabels(datasetId)
        .then((res) => {
          const extracted = extractLabelsFromResponse(res);
          if (extracted && extracted.length > 0) {
            const map = new Map();
            extracted.forEach((l) => {
              if (l?.id && l?.name) {
                map.set(Number(l.id), l.name);
                map.set(String(l.id), l.name);
              }
            });
            setDatasetLabels(extracted, map, datasetId);
          }
        })
        .catch(() => {});
    }
  }, [datasetId, datasetLabelsMap, datasetLabels, setDatasetLabels]);

  const lastRun = useLastInstanceRun();
  const setLastInstanceRun = useSetLastInstanceRun();
  const clearLastInstanceRun = useClearLastInstanceRun();

  const [scope, setScope] = useState('fragment');
  const [writeMode, setWriteMode] = useState('replace'); // 'replace' | 'add'
  const [status, setStatus] = useState('ready'); // 'ready' | 'starting' | 'running' | 'saving' | 'done' | 'failed' | 'cancelled'
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Finding polyps…');
  const [error, setError] = useState(null);
  const [suppressedCount, setSuppressedCount] = useState(0);

  const runTokenRef = useRef(0);
  const activeJobIdRef = useRef(null);
  const streamRef = useRef(null);
  const currentScopeRef = useRef({ datasetId, imageId });
  const pendingUnresolvedRef = useRef([]);
  const previousCreatedIdsRef = useRef([]);
  const handledJobIdsRef = useRef(new Set());

  useEffect(() => {
    currentScopeRef.current = { datasetId, imageId };
  }, [datasetId, imageId]);

  const mappedLabel = useMemo(
    () => resolvePolypProjectLabel(selectedModelObj, datasetLabelsMap, datasetLabels, objectsList),
    [selectedModelObj, datasetLabelsMap, datasetLabels, objectsList]
  );

  const roiContourIds = useMemo(
    () =>
      getSelectedFragmentContourIds(
        selectedObjectIds,
        objectsList,
        datasetLabelsMap,
        mappedLabel?.labelId,
        datasetLabels
      ),
    [selectedObjectIds, objectsList, datasetLabelsMap, mappedLabel, datasetLabels]
  );
  const roiCount = roiContourIds.length;

  const disableReason = useMemo(() => {
    if (isRunning) return 'Inference is running…';
    if (!datasetId) return 'No active dataset selected.';
    if (!imageId) return 'No active image loaded.';
    if (!mappedLabel) return 'No compatible polyp label found in dataset.';
    if (scope === 'fragment' && roiCount === 0) {
      return 'Select a coral outline to run on, or choose "Whole image".';
    }
    return null;
  }, [isRunning, datasetId, imageId, mappedLabel, scope, roiCount]);

  const canRun = !disableReason;

  // Clean up and abort on unmount or navigation
  useLayoutEffect(() => {
    return () => {
      runTokenRef.current += 1;
      streamRef.current?.abort();
      streamRef.current = null;
      const jobId = activeJobIdRef.current;
      activeJobIdRef.current = null;
      if (jobId != null) {
        cancelInferenceJob(jobId).catch(() => {});
      }
      setIsRunning(false);
      setStatus('ready');
      setProgress(0);
      setError(null);
      setSuppressedCount(0);
      pendingUnresolvedRef.current = [];
      previousCreatedIdsRef.current = [];
    };
  }, [datasetId, imageId]);

  const persistPredictions = useCallback(
    async (predictions, jobId, token) => {
      const isCurrentRun = () => {
        const storeImageId = useAnnotationStore.getState().images?.currentImageId;
        const wsImageId = annotationSession?.currentImageId;
        return (
          runTokenRef.current === token &&
          currentScopeRef.current.datasetId === datasetId &&
          currentScopeRef.current.imageId === imageId &&
          (storeImageId == null || Number(storeImageId) === Number(imageId)) &&
          (wsImageId == null || Number(wsImageId) === Number(imageId))
        );
      };

      if (!isCurrentRun()) return;

      setStatus('saving');
      setProgress(90);
      setProgressMessage('Saving objects…');

      // Determine target parent contour IDs for scope matching
      const targetParentIds = scope === 'fragment'
        ? new Set([
            ...(focusedContourId != null ? [Number(focusedContourId)] : []),
            ...roiContourIds.map(Number),
          ])
        : null;

      let predictionsToSave = predictions;
      let overlapSuppressedCount = 0;
      let replacedCount = 0;

      if (writeMode === 'replace') {
        const existingPolypsToDelete = getExistingPolypsForScope(objectsList, {
          targetParentIds,
          labelId: mappedLabel.labelId,
          scope,
        });

        if (existingPolypsToDelete.length > 0) {
          setProgressMessage(`Replacing ${existingPolypsToDelete.length} existing polyps…`);
          for (const existingObj of existingPolypsToDelete) {
            if (!isCurrentRun()) {
              console.warn('Context changed during replacement; halting');
              break;
            }
            const cid = existingObj.contour_id ?? existingObj.id;
            if (cid != null) {
              try {
                await annotationSession.deleteObject(cid);
                replacedCount++;
              } catch (e) {
                console.warn('Failed to delete existing polyp on replace', cid, e);
              }
            }
          }
        }
      } else {
        // 'add' mode: suppress overlapping predictions against existing polyps
        const existingPolyps = getExistingPolypsForScope(objectsList, {
          targetParentIds,
          labelId: mappedLabel.labelId,
          scope,
        });

        const suppressionResult = suppressOverlappingPredictions(predictions, existingPolyps, {
          iouThreshold: 0.5,
        });
        predictionsToSave = suppressionResult.kept;
        overlapSuppressedCount = suppressionResult.suppressedCount;
      }

      const createdIds = [];
      const unresolved = [];
      let skippedCount = 0;

      for (const prediction of predictionsToSave) {
        if (!isCurrentRun()) {
          console.warn('Context changed during persistence; halting further saves');
          break;
        }

        const parentId = resolveParentContourId(prediction, {
          focusedContourId: scope === 'fragment' ? focusedContourId : null,
          roiContourIds: scope === 'fragment' ? roiContourIds : [],
          objects: objectsList,
          labelsMap: datasetLabelsMap,
          datasetLabels,
          scope,
        });

        const contour = toAcceptedContour(
          prediction,
          imageObject?.width,
          imageObject?.height,
          parentId
        );

        if (!contour) {
          unresolved.push(prediction);
          continue;
        }

        try {
          const response = await annotationSession.addObject(
            contour.x,
            contour.y,
            mappedLabel.labelName,
            contour.parentId,
            contour.confidence,
            contour.labelId,
            {
              addedBy: modelKey,
              source: 'instance_segmentation',
              modelKey,
            }
          );

          if (response && (response.type === 'object_added' || response.success)) {
            if (response.data?.skipped) {
              skippedCount++;
            } else {
              const canonicalId = response.data?.contour_id ?? response.data?.id;
              if (canonicalId != null) {
                createdIds.push(canonicalId);
              }
              if (contour.parentId != null) {
                expandObject(contour.parentId);
              }
            }
          } else {
            unresolved.push(prediction);
          }
        } catch (_) {
          unresolved.push(prediction);
        }
      }

      if (!isCurrentRun()) return;

      const totalSuppressed = skippedCount + overlapSuppressedCount;
      setSuppressedCount(totalSuppressed);
      const allCreatedIds = [...new Set([...previousCreatedIdsRef.current, ...createdIds])];
      previousCreatedIdsRef.current = allCreatedIds;

      if (allCreatedIds.length > 0) {
        setLastInstanceRun({
          count: allCreatedIds.length,
          objectIds: allCreatedIds,
          labelName: mappedLabel.labelName,
          modelName: selectedModelObj?.name || modelInfo.name,
          imageId,
          datasetId,
          writeMode,
        });
        setCurrentTool?.('selection');
      }

      if (unresolved.length === 0) {
        setStatus('done');
        setProgress(100);
        setIsRunning(false);
        setError(null);
        pendingUnresolvedRef.current = [];

        if (createdIds.length > 0) {
          let msg = `${createdIds.length} ${createdIds.length === 1 ? 'polyp' : 'polyps'} added to Objects`;
          if (replacedCount > 0) {
            msg = `${createdIds.length} ${createdIds.length === 1 ? 'polyp' : 'polyps'} saved (${replacedCount} previous replaced)`;
          } else if (totalSuppressed > 0) {
            msg = `${createdIds.length} ${createdIds.length === 1 ? 'polyp' : 'polyps'} added (${totalSuppressed} overlapping duplicate${totalSuppressed === 1 ? '' : 's'} suppressed)`;
          }
          addToast?.({ type: 'success', message: `${msg}.` });
        } else if (totalSuppressed > 0) {
          addToast?.({
            type: 'info',
            message: `All ${totalSuppressed} detected polyps overlapped with existing annotations and were suppressed.`,
          });
        } else if (replacedCount > 0) {
          addToast?.({
            type: 'info',
            message: `${replacedCount} existing polyps removed.`,
          });
        }
      } else {
        setStatus('failed');
        setIsRunning(false);
        pendingUnresolvedRef.current = unresolved;
        const msg =
          allCreatedIds.length > 0
            ? `Added ${allCreatedIds.length} of ${predictionsToSave.length} polyps. ${unresolved.length} could not be saved.`
            : `Could not save ${predictionsToSave.length} polyps.`;
        setError(msg);
      }
    },
    [
      datasetId,
      imageId,
      imageObject,
      mappedLabel,
      focusedContourId,
      scope,
      writeMode,
      roiContourIds,
      objectsList,
      datasetLabelsMap,
      selectedModelObj,
      modelKey,
      modelInfo,
      expandObject,
      setLastInstanceRun,
      addToast,
      setCurrentTool,
    ]
  );

  const handleSnapshot = useCallback(
    async (snapshot, token) => {
      if (runTokenRef.current !== token) return;
      if (!snapshot) return;

      if (snapshot.status === 'running') {
        setStatus('running');
        setProgress((prev) => Math.min(80, Math.max(prev, 30)));
        setProgressMessage('Finding polyps…');
      } else if (snapshot.status === 'succeeded') {
        if (handledJobIdsRef.current.has(snapshot.id)) return;
        handledJobIdsRef.current.add(snapshot.id);

        try {
          const items = await getInferenceJobItems(snapshot.id);
          if (runTokenRef.current !== token) return;

          const predictions = extractPreviewPredictions(items, mappedLabel?.labelId);
          if (predictions.length === 0) {
            setStatus('done');
            setProgress(100);
            setIsRunning(false);
            addToast?.({ type: 'info', message: 'No polyps found in the selected area.' });
            return;
          }

          await persistPredictions(predictions, snapshot.id, token);
        } catch (err) {
          handledJobIdsRef.current.delete(snapshot.id);
          if (runTokenRef.current !== token) return;
          setStatus('failed');
          setIsRunning(false);
          setError(err?.message || 'Could not load inference results.');
        }
      } else if (snapshot.status === 'partial') {
        activeJobIdRef.current = null;
        if (handledJobIdsRef.current.has(snapshot.id)) return;
        handledJobIdsRef.current.add(snapshot.id);

        try {
          const items = await getInferenceJobItems(snapshot.id);
          if (runTokenRef.current !== token) return;

          const failedItem = (Array.isArray(items) ? items : items?.items || []).find(
            (item) => item?.status === 'failed' || item?.error
          );
          const errorMsg =
            failedItem?.error || snapshot.error || `${modelInfo.name} inference partially failed.`;

          setStatus('failed');
          setIsRunning(false);
          setError(errorMsg);
        } catch (err) {
          if (runTokenRef.current !== token) return;
          setStatus('failed');
          setIsRunning(false);
          setError(err?.message || snapshot.error || `${modelInfo.name} inference partially failed.`);
        }
      } else if (snapshot.status === 'failed') {
        activeJobIdRef.current = null;
        setStatus('failed');
        setIsRunning(false);
        setError(snapshot.error || `${modelInfo.name} inference failed.`);
      } else if (snapshot.status === 'cancelled') {
        activeJobIdRef.current = null;
        setStatus('cancelled');
        setIsRunning(false);
      }
    },
    [mappedLabel, persistPredictions, addToast, modelInfo]
  );

  const run = useCallback(async () => {
    if (!canRun) return false;

    const token = ++runTokenRef.current;
    streamRef.current?.abort();
    streamRef.current = null;
    setError(null);
    setIsRunning(true);
    setStatus('starting');
    setProgress(15);
    setProgressMessage('Finding polyps…');
    pendingUnresolvedRef.current = [];
    previousCreatedIdsRef.current = [];
    setSuppressedCount(0);

    try {
      const request = buildCellposePreviewRequest({
        datasetId,
        imageId,
        labelId: mappedLabel.labelId,
        modelKey,
        roiContourIds: scope === 'fragment' ? roiContourIds : [],
      });

      const snapshot = await startInferenceJob(request);
      if (runTokenRef.current !== token) {
        if (snapshot?.id != null) cancelInferenceJob(snapshot.id).catch(() => {});
        return false;
      }

      if (!snapshot?.id) {
        throw new Error('The inference service did not return a job ID.');
      }

      activeJobIdRef.current = snapshot.id;

      if (TERMINAL_STATUSES.has(snapshot.status)) {
        await handleSnapshot(snapshot, token);
      } else {
        streamRef.current = streamInferenceJob(
          snapshot.id,
          (nextSnapshot) => handleSnapshot(nextSnapshot, token),
          (err) => {
            if (runTokenRef.current === token) {
              streamRef.current?.abort();
              streamRef.current = null;
              setIsRunning(false);
              setStatus('failed');
              setError(err?.message || 'Lost connection to inference job. You can retry.');
            }
          }
        );
      }
      return true;
    } catch (err) {
      if (runTokenRef.current === token) {
        setStatus('failed');
        setIsRunning(false);
        setError(err?.message || `Could not start ${modelInfo.name} inference.`);
      }
      return false;
    }
  }, [canRun, datasetId, imageId, mappedLabel, scope, roiContourIds, handleSnapshot, modelKey, modelInfo]);

  const retry = useCallback(async () => {
    if (pendingUnresolvedRef.current.length > 0 && activeJobIdRef.current != null) {
      const token = ++runTokenRef.current;
      setError(null);
      setIsRunning(true);
      await persistPredictions(pendingUnresolvedRef.current, activeJobIdRef.current, token);
      return;
    }

    if (activeJobIdRef.current != null) {
      const token = ++runTokenRef.current;
      const existingJobId = activeJobIdRef.current;
      setError(null);
      setIsRunning(true);
      setStatus('running');
      setProgressMessage('Finding polyps…');

      try {
        if (typeof getInferenceJob === 'function') {
          const snapshot = await getInferenceJob(existingJobId);
          if (runTokenRef.current !== token) return;
          if (snapshot?.id) {
            if (TERMINAL_STATUSES.has(snapshot.status)) {
              await handleSnapshot(snapshot, token);
              return;
            }
            streamRef.current = streamInferenceJob(
              snapshot.id,
              (nextSnapshot) => handleSnapshot(nextSnapshot, token),
              (err) => {
                if (runTokenRef.current === token) {
                  streamRef.current?.abort();
                  streamRef.current = null;
                  setIsRunning(false);
                  setStatus('failed');
                  setError(err?.message || 'Lost connection to inference job. You can retry.');
                }
              }
            );
            return;
          }
        }
      } catch (err) {
        if (runTokenRef.current === token) {
          setIsRunning(false);
          setStatus('failed');
          setError(err?.message || 'Could not reconnect to inference job. You can retry.');
        }
        return;
      }
      activeJobIdRef.current = null;
    }

    await run();
  }, [persistPredictions, handleSnapshot, run]);

  const cancel = useCallback(async () => {
    const jobId = activeJobIdRef.current;
    runTokenRef.current += 1;
    streamRef.current?.abort();
    streamRef.current = null;
    activeJobIdRef.current = null;
    setIsRunning(false);
    setStatus('cancelled');
    setProgress(0);

    if (jobId != null) {
      try {
        await cancelInferenceJob(jobId);
      } catch (_) {}
    }
  }, []);

  const undoRun = useCallback(async () => {
    if (!lastRun || !Array.isArray(lastRun.objectIds) || lastRun.objectIds.length === 0) {
      return false;
    }

    const currentList = objectsList || [];
    const idsToDelete = lastRun.objectIds.filter((id) =>
      currentList.some((obj) => obj.contour_id === id || obj.id === id)
    );

    for (const id of idsToDelete) {
      try {
        await annotationSession.deleteObject(id);
      } catch (_) {}
    }

    clearLastInstanceRun();
    addToast?.({
      type: 'info',
      message: `Undid run: removed ${idsToDelete.length} ${idsToDelete.length === 1 ? 'polyp' : 'polyps'}.`,
    });
    return true;
  }, [lastRun, objectsList, clearLastInstanceRun, addToast]);

  return {
    scope,
    setScope,
    writeMode,
    setWriteMode,
    roiCount,
    mappedLabel,
    canRun,
    disableReason,
    status,
    isRunning,
    progress,
    progressMessage,
    error,
    suppressedCount,
    lastRun,
    run,
    retry,
    cancel,
    undoRun,
    checkpointSha:
      selectedModelObj?.checkpoint_sha256 ||
      modelInfo.sha256,
    modelName: selectedModelObj?.name || modelInfo.name,
  };
}

export default useCellposeInstanceRunner;
