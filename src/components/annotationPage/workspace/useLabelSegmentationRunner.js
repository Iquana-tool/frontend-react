import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  extractPreviewPredictions,
  resolveParentContourId,
  toAcceptedContour,
  getExistingObjectsForScope,
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
  useDatasetLabels,
  useDatasetLabelsMap,
  useSetDatasetLabels,
  useExpandObject,
  useLastInstanceRun,
  useSetLastInstanceRun,
  useClearLastInstanceRun,
  useSetCurrentTool,
  useClearSelection,
} from '../../../stores/selectors/annotationSelectors';
import { useParams } from 'react-router-dom';
import { useDataset } from '../../../contexts/DatasetContext';
import { useToast } from '../../../contexts/ToastContext';
import { fetchLabels } from '../../../api/labels';
import { extractLabelsFromResponse } from '../../../utils/labelHierarchy';
import { buildLabelPreviewRequest } from './labelSegmentationModel';

export const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'partial']);

export function useLabelSegmentationRunner(configuration = null) {
  const selectedModelObj = configuration?.model;
  const modelKey = selectedModelObj?.registry_key ?? selectedModelObj?.id ?? null;
  const modelInfo = useMemo(() => ({
    name: selectedModelObj?.name || modelKey || 'The model',
    sha256: selectedModelObj?.checkpoint_sha256 ?? selectedModelObj?.tags?.default_checkpoint_sha256 ?? null,
  }), [selectedModelObj, modelKey]);
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
  const datasetLabels = useDatasetLabels();
  const datasetLabelsMap = useDatasetLabelsMap();
  const setDatasetLabels = useSetDatasetLabels();
  const expandObject = useExpandObject();
  const setCurrentTool = useSetCurrentTool();
  const clearSelection = useClearSelection();
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

  const useHierarchy = Boolean(configuration?.useHierarchy);
  const scope = useHierarchy && configuration?.parentContourIds?.length > 0 ? 'hierarchy' : 'image';
  const [writeMode, setWriteMode] = useState('patch');
  const [status, setStatus] = useState('ready'); // 'ready' | 'starting' | 'running' | 'saving' | 'done' | 'failed' | 'cancelled'
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Segmenting label…');
  const [error, setError] = useState(null);
  const [suppressedCount, setSuppressedCount] = useState(0);

  const runTokenRef = useRef(0);
  const activeJobIdRef = useRef(null);
  const activeWriteModeRef = useRef('patch');
  const streamRef = useRef(null);
  const currentScopeRef = useRef({ datasetId, imageId });
  const pendingUnresolvedRef = useRef([]);
  const pendingUnresolvedDeletionsRef = useRef([]);
  const successfullyDeletedIdsRef = useRef(new Set());
  const previousCreatedIdsRef = useRef([]);
  const replacedCountRef = useRef(0);
  const handledJobIdsRef = useRef(new Set());
  const retryContextRef = useRef(null);
  const startingRef = useRef(false);

  const handleSetWriteMode = useCallback((mode) => {
    activeWriteModeRef.current = mode;
    setWriteMode(mode);
  }, []);

  useEffect(() => {
    currentScopeRef.current = { datasetId, imageId };
  }, [datasetId, imageId]);

  const mappedLabel = useMemo(() => {
    if (configuration?.labelId == null) return null;
    const label = datasetLabels.find((entry) => Number(entry.id) === Number(configuration.labelId));
    return label ? { labelId: Number(label.id), labelName: label.name, color: label.color, parentLabelId: label.parent_id } : null;
  }, [datasetLabels, configuration?.labelId]);

  // Hierarchy scope is resolved by the context from the dataset taxonomy. Never
  // guess an ROI from a selected object or from a model/label display name here.
  const roiContourIds = useMemo(
    () => useHierarchy ? configuration?.parentContourIds || [] : [],
    [useHierarchy, configuration?.parentContourIds]
  );
  const roiCount = roiContourIds.length;

  const targetParentIds = useMemo(
    () => useHierarchy && roiContourIds.length > 0 ? new Set(roiContourIds.map(Number)) : null,
    [useHierarchy, roiContourIds]
  );
  const hasExistingTargetObjectsInScope = useMemo(
    () => getExistingObjectsForScope(objectsList, {
      targetParentIds,
      labelId: mappedLabel?.labelId,
      scope,
    }).length > 0,
    [objectsList, targetParentIds, mappedLabel, scope]
  );

  const disableReason = useMemo(() => {
    if (isRunning) return 'Inference is running…';
    if (!configuration) return 'Choose a dataset label and its segmentation settings.';
    if (configuration.reason) return configuration.reason;
    if (!modelKey) return 'Choose a compatible model for this label.';
    if (!datasetId) return 'No active dataset selected.';
    if (!imageId) return 'No active image loaded.';
    if (!mappedLabel) return 'Choose a dataset label.';
    if (useHierarchy && mappedLabel?.parentLabelId != null && roiCount === 0) {
      return 'Annotate an eligible parent first, or turn off Use hierarchy.';
    }
    return null;
  }, [isRunning, datasetId, imageId, mappedLabel, useHierarchy, roiCount, modelKey, configuration]);

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
      pendingUnresolvedDeletionsRef.current = [];
      successfullyDeletedIdsRef.current = new Set();
      previousCreatedIdsRef.current = [];
      replacedCountRef.current = 0;
      retryContextRef.current = null;
      startingRef.current = false;
    };
  }, [datasetId, imageId]);

  const persistPredictions = useCallback(
    async (predictions, jobId, token, options = {}) => {
      const isRetry = Boolean(options.isRetry);
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

      // Inference callbacks retain the run-start render; annotations can change before results arrive.
      const currentObjects = useAnnotationStore.getState().objects?.list ?? objectsList;
      setStatus('saving');
      setProgress(90);
      setProgressMessage('Saving objects…');

      // Determine target parent contour IDs for scope matching
      let predictionsToSave = predictions;
      let overlapSuppressedCount = 0;
      let replacedCount = 0;

      const effectiveMode = activeWriteModeRef.current || 'patch';
      const isOverride = effectiveMode === 'override' || effectiveMode === 'replace';
      const unresolvedDeletions = [];

      if (isOverride) {
        const objectsToDelete = isRetry
          ? pendingUnresolvedDeletionsRef.current.filter(
              (cid) => !successfullyDeletedIdsRef.current.has(Number(cid))
            )
          : getExistingObjectsForScope(currentObjects, {
              targetParentIds,
              labelId: mappedLabel.labelId,
              scope,
            })
              .map((existingObj) => existingObj.contour_id ?? existingObj.id)
              .filter(
                (cid) =>
                  cid != null &&
                  !previousCreatedIdsRef.current.some((id) => Number(id) === Number(cid)) &&
                  !successfullyDeletedIdsRef.current.has(Number(cid))
              );

        if (objectsToDelete.length > 0) {
          setProgressMessage(`Replacing ${objectsToDelete.length} existing objects…`);
          for (const cid of objectsToDelete) {
            if (!isCurrentRun()) {
              console.warn('Context changed during replacement; halting');
              unresolvedDeletions.push(cid);
              break;
            }
            try {
              const delRes = await annotationSession.deleteObject(cid);
              if (delRes && (delRes.success === false || delRes.type === 'error')) {
                console.warn('Backend rejected deleting existing object on replace', cid, delRes);
                unresolvedDeletions.push(cid);
              } else {
                successfullyDeletedIdsRef.current.add(Number(cid));
                replacedCount++;
              }
            } catch (e) {
              console.warn('Failed to delete existing object on replace', cid, e);
              unresolvedDeletions.push(cid);
            }
          }
          replacedCountRef.current += replacedCount;
        }
      } else {
        // 'patch' mode: suppress overlapping predictions against existing objects
        const existingTargetObjects = getExistingObjectsForScope(currentObjects, {
          targetParentIds,
          labelId: mappedLabel.labelId,
          scope,
        });

        const suppressionResult = suppressOverlappingPredictions(predictions, existingTargetObjects, {
          iouThreshold: 0.5,
        });
        predictionsToSave = suppressionResult.kept;
        overlapSuppressedCount = suppressionResult.suppressedCount;
      }

      const createdIds = [];
      const unresolved = [];
      let skippedCount = 0;

      const objectsForResolution = useAnnotationStore.getState().objects?.list ?? currentObjects;

      for (const prediction of predictionsToSave) {
        if (!isCurrentRun()) {
          console.warn('Context changed during persistence; halting further saves');
          break;
        }

        const parentId = useHierarchy ? resolveParentContourId(prediction, {
          focusedContourId: null,
          roiContourIds,
          objects: objectsForResolution,
          labelsMap: datasetLabelsMap,
          datasetLabels,
          scope,
        }) : null;

        const contour = toAcceptedContour(
          { ...prediction, parent_id: parentId },
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
              useHierarchy,
              addedBy: modelKey,
              source: ({ 'instance-suggestion': 'instance_suggestion', 'cross-image-suggestion': 'cross_image' })[selectedModelObj?.task] || 'instance_segmentation',
              modelKey,
              modelClass: contour.modelClass ?? contour.model_class ?? prediction.model_class ?? prediction.modelClass,
            }
          );

          if (response && (response.type === 'object_added' || response.success)) {
            if (response.data?.skipped) {
              // In Override mode, if any deletions failed, this prediction may have been
              // suppressed by the backend duplicate check because the old outline still exists.
              // Treat it as unresolved so it is retried once the deletion succeeds on retry.
              if (isOverride && unresolvedDeletions.length > 0) {
                unresolved.push(prediction);
              } else {
                skippedCount++;
              }
            } else {
              const canonicalId = response.data?.contour_id ?? response.data?.id;
              if (canonicalId != null) {
                createdIds.push(canonicalId);
              }
              if (contour.parentId != null) {
                expandObject(contour.parentId);
              }
              expandObject(canonicalId);
            }
          } else {
            unresolved.push(prediction);
          }
        } catch (_) {
          unresolved.push(prediction);
        }
      }

      if (!isCurrentRun()) return;

      // OBJECT_ADDED selects each saved contour. Do not leave the final result
      // selected and accidentally restrict the next hierarchy run to that object.
      clearSelection();
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
          writeMode: activeWriteModeRef.current,
        });
        setCurrentTool?.('selection');
      } else if (replacedCount > 0 || replacedCountRef.current > 0) {
        clearLastInstanceRun?.();
      }

      if (unresolved.length === 0 && unresolvedDeletions.length === 0) {
        activeJobIdRef.current = null;
        setStatus('done');
        setProgress(100);
        setIsRunning(false);
        setError(null);
        pendingUnresolvedRef.current = [];
        pendingUnresolvedDeletionsRef.current = [];

        if (allCreatedIds.length > 0) {
          let msg = `${allCreatedIds.length} ${allCreatedIds.length === 1 ? 'object' : 'objects'} added to Objects`;
          const effectiveReplaced = replacedCountRef.current || replacedCount;
          if (effectiveReplaced > 0) {
            msg = `${allCreatedIds.length} ${allCreatedIds.length === 1 ? 'object' : 'objects'} saved (${effectiveReplaced} previous replaced)`;
          } else if (totalSuppressed > 0) {
            msg = `${allCreatedIds.length} ${allCreatedIds.length === 1 ? 'object' : 'objects'} added (${totalSuppressed} overlapping duplicate${totalSuppressed === 1 ? '' : 's'} suppressed)`;
          }
          addToast?.({ type: 'success', message: `${msg}.` });
        } else if (totalSuppressed > 0) {
          addToast?.({
            type: 'info',
            message: `All ${totalSuppressed} detected objects overlapped with existing annotations and were suppressed.`,
          });
        } else if (replacedCount > 0 || replacedCountRef.current > 0) {
          const effectiveReplaced = replacedCountRef.current || replacedCount;
          addToast?.({
            type: 'info',
            message: `${effectiveReplaced} existing objects removed.`,
          });
        } else {
          addToast?.({ type: 'info', message: 'No objects found in the selected area.' });
        }
      } else {
        setStatus('failed');
        setIsRunning(false);
        pendingUnresolvedRef.current = unresolved;
        pendingUnresolvedDeletionsRef.current = unresolvedDeletions;
        const totalAttempts = allCreatedIds.length + unresolved.length;
        let msg = '';
        if (unresolvedDeletions.length > 0 && unresolved.length > 0) {
          const delNoun = unresolvedDeletions.length === 1 ? 'object' : 'objects';
          const unresNoun = unresolved.length === 1 ? 'object' : 'objects';
          msg = `Could not remove ${unresolvedDeletions.length} existing ${delNoun} and could not save ${unresolved.length} ${unresNoun}.`;
        } else if (unresolvedDeletions.length > 0) {
          const delNoun = unresolvedDeletions.length === 1 ? 'object' : 'objects';
          if (allCreatedIds.length > 0) {
            const savedNoun = allCreatedIds.length === 1 ? 'object' : 'objects';
            msg = `Saved ${allCreatedIds.length} ${savedNoun}, but could not remove ${unresolvedDeletions.length} existing ${delNoun}.`;
          } else {
            msg = `Could not remove ${unresolvedDeletions.length} existing ${delNoun}.`;
          }
        } else {
          msg =
            allCreatedIds.length > 0
              ? `Added ${allCreatedIds.length} of ${totalAttempts} objects. ${unresolved.length} could not be saved.`
              : `Could not save ${predictionsToSave.length} objects.`;
        }
        setError(msg);
      }
    },
    [
      datasetId,
      imageId,
      imageObject,
      mappedLabel,
      scope,
      roiContourIds,
      targetParentIds,
      objectsList,
      datasetLabelsMap,
      datasetLabels,
      selectedModelObj,
      useHierarchy,
      modelKey,
      modelInfo,
      expandObject,
      setLastInstanceRun,
      clearLastInstanceRun,
      addToast,
      setCurrentTool,
      clearSelection,
    ]
  );

  const handleSnapshot = useCallback(
    async (snapshot, token) => {
      if (runTokenRef.current !== token) return;
      if (!snapshot) return;

      if (snapshot.status === 'running') {
        setStatus('running');
        setProgress((prev) => Math.min(80, Math.max(prev, 30)));
        setProgressMessage('Segmenting label…');
      } else if (snapshot.status === 'succeeded') {
        if (handledJobIdsRef.current.has(snapshot.id)) return;
        handledJobIdsRef.current.add(snapshot.id);

        try {
          const items = await getInferenceJobItems(snapshot.id);
          if (runTokenRef.current !== token) return;

          const predictions = extractPreviewPredictions(items, mappedLabel?.labelId);
          const effectiveMode = activeWriteModeRef.current || 'patch';
          const isOverride = effectiveMode === 'override' || effectiveMode === 'replace';
          if (predictions.length === 0 && !isOverride) {
            activeJobIdRef.current = null;
            clearSelection();
            setStatus('done');
            setProgress(100);
            setIsRunning(false);
            addToast?.({ type: 'info', message: 'No objects found in the selected area.' });
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
    [mappedLabel, persistPredictions, addToast, modelInfo, clearSelection]
  );

  const run = useCallback(
    async (selectedWriteMode = null, explicitInputs = null) => {
      if (!canRun || startingRef.current) return false;
      startingRef.current = true;
      retryContextRef.current = { persistPredictions, handleSnapshot };

      const effectiveMode = selectedWriteMode || activeWriteModeRef.current || 'patch';
      activeWriteModeRef.current = effectiveMode;
      setWriteMode(effectiveMode);
      const token = ++runTokenRef.current;
      streamRef.current?.abort();
      streamRef.current = null;
      activeJobIdRef.current = null;
      setError(null);
      setIsRunning(true);
      setStatus('starting');
      setProgress(15);
      setProgressMessage('Segmenting label…');
      pendingUnresolvedRef.current = [];
      pendingUnresolvedDeletionsRef.current = [];
      successfullyDeletedIdsRef.current = new Set();
      previousCreatedIdsRef.current = [];
      replacedCountRef.current = 0;
      setSuppressedCount(0);

      try {
        const request = buildLabelPreviewRequest({
          datasetId,
          imageId,
          labelId: mappedLabel.labelId,
          model: selectedModelObj,
          inputs: explicitInputs || configuration.inputs || {},
          useHierarchy,
          roiContourIds,
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
    } finally {
      startingRef.current = false;
    }
  }, [canRun, datasetId, imageId, mappedLabel, scope, roiContourIds, handleSnapshot, persistPredictions, modelKey, modelInfo, configuration, selectedModelObj, useHierarchy]);

  const retry = useCallback(async () => {
    if (isRunning || startingRef.current) return;
    const persistence = retryContextRef.current?.persistPredictions || persistPredictions;
    const snapshotHandler = retryContextRef.current?.handleSnapshot || handleSnapshot;
    const hasPendingPersistence =
      (pendingUnresolvedRef.current.length > 0 || pendingUnresolvedDeletionsRef.current.length > 0) &&
      activeJobIdRef.current != null;
    if (hasPendingPersistence) {
      const token = ++runTokenRef.current;
      setError(null);
      setIsRunning(true);
      await persistence(pendingUnresolvedRef.current, activeJobIdRef.current, token, { isRetry: true });
      return;
    }

    if (activeJobIdRef.current != null) {
      const token = ++runTokenRef.current;
      const existingJobId = activeJobIdRef.current;
      setError(null);
      setIsRunning(true);
      setStatus('running');
      setProgressMessage('Segmenting label…');

      try {
        if (typeof getInferenceJob === 'function') {
          const snapshot = await getInferenceJob(existingJobId);
          if (runTokenRef.current !== token) return;
          if (snapshot?.id) {
            if (TERMINAL_STATUSES.has(snapshot.status)) {
              await snapshotHandler(snapshot, token);
              return;
            }
            streamRef.current = streamInferenceJob(
              snapshot.id,
              (nextSnapshot) => snapshotHandler(nextSnapshot, token),
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
  }, [persistPredictions, handleSnapshot, run, isRunning]);

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
      message: `Undid run: removed ${idsToDelete.length} ${idsToDelete.length === 1 ? 'object' : 'objects'}.`,
    });
    return true;
  }, [lastRun, objectsList, clearLastInstanceRun, addToast]);

  return {
    scope,
    writeMode,
    setWriteMode: handleSetWriteMode,
    roiCount,
    hasExistingTargetObjectsInScope,
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
    checkpointSha: modelInfo.sha256,
    modelName: modelInfo.name,
  };
}

export const useConceptSegmentationRunner = useLabelSegmentationRunner;
export default useLabelSegmentationRunner;
