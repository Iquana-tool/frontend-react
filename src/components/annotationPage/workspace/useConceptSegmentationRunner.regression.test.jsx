import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { initialState } from '../../../stores/initialState';
import * as api from '../../../api/inference';
import annotationSession from '../../../services/annotationSession';
import { useConceptSegmentationRunner } from './useConceptSegmentationRunner';

const mocks = vi.hoisted(() => ({ toast: vi.fn(), legacyRun: vi.fn(), policy: { bindings: [] } }));
vi.mock('../../../api/inference', () => ({
  startInferenceJob: vi.fn(), streamInferenceJob: vi.fn(), getInferenceJob: vi.fn(),
  getInferenceJobItems: vi.fn(), cancelInferenceJob: vi.fn(),
}));
vi.mock('../../../services/annotationSession', () => ({ default: {
  currentImageId: 385, addObject: vi.fn(), deleteObject: vi.fn(),
  selectPromptedModel: vi.fn(), selectSuggestionModel: vi.fn(), selectInstanceModel: vi.fn(),
} }));
vi.mock('../../../contexts/DatasetContext', () => ({
  useDataset: () => ({ currentDataset: { id: 15 }, datasets: [{ id: 15 }] }),
}));
vi.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ addToast: mocks.toast }) }));
vi.mock('../../../contexts/AnnotationRoutingPolicyContext', () => ({ useAnnotationRoutingPolicy: () => ({ policy: mocks.policy, policyReady: true, policyResolved: true, policyLoading: false, policyError: null }) }));
vi.mock('../../../hooks/useModelSwitchPreloader', () => ({ default: () => {} }));
vi.mock('../../../hooks/useAiTools', () => ({ default: () => ({ isEnabled: () => true }) }));
vi.mock('../../../hooks/useInstanceSegmentation', () => ({ useInstanceSegmentation: () => ({ runInstance: mocks.legacyRun }) }));

const model = {
  id: 'cpsam_polyp_v3_b_seed17', registry_key: 'cpsam_polyp_v3_b_seed17', roi_input: 'parent_regions',
  name: 'Cellpose-SAM · Polyp', classes: [{ key: 'polyp' }], label_ids: [43],
  class_mappings: [{ model_class: { key: 'polyp' }, action: 'map', label_id: 43 }],
};
const prediction = { x: [.2, .3, .3, .2], y: [.2, .2, .3, .3], label_id: 43, parent_id: 21060, confidence: .9 };
const results = (contours = [prediction]) => [{ status: 'done', image_id: 385, predictions: { contours } }];
const service = {
  key: 'instance', task: 'instance-segmentation', name: 'Instance Segmentation',
  selectedModel: model.id, models: [model], setSelectedModel: vi.fn(),
  isLoading: false, isRunning: false, canRun: true,
};
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

beforeEach(() => {
  vi.clearAllMocks();
  annotationSession.currentImageId = 385;
  useAnnotationStore.setState({
    ...initialState,
    images: { ...initialState.images, currentImageId: 385, imageObject: { id: 385, width: 1000, height: 800 } },
    objects: {
      ...initialState.objects, labelDatasetId: 15,
      datasetLabels: [
        { id: 41, name: 'Coral Fragment', parent_id: null },
        { id: 42, name: 'Coral Surface', parent_id: 41 },
        { id: 43, name: 'Coral Polyp', parent_id: 42 },
      ],
      datasetLabelsMap: new Map([[41, 'Coral Fragment'], [42, 'Coral Surface'], [43, 'Coral Polyp']]),
      list: [{ id: 21060, contour_id: 21060, labelId: 41, x: [.1, .9, .9, .1], y: [.1, .1, .9, .9] }],
      selected: [21060],
    },
    models: { ...initialState.models, favoritesLoaded: true, instanceModel: model.id, availableInstanceModels: [model] },
  });
  api.startInferenceJob.mockResolvedValue({ id: 991, status: 'running' });
  api.streamInferenceJob.mockImplementation(() => ({ abort: vi.fn() }));
  api.getInferenceJob.mockResolvedValue({ id: 991, status: 'running' });
  api.getInferenceJobItems.mockResolvedValue(results());
  api.cancelInferenceJob.mockResolvedValue({ id: 991, status: 'cancelled' });
  annotationSession.addObject.mockResolvedValue({ type: 'object_added', success: true, data: { id: 21061 } });
});

describe('live Cellpose runner regressions', () => {
  it('shows a failed item from a partial terminal job and permits a fresh retry', async () => {
    api.startInferenceJob.mockResolvedValueOnce({ id: 991, status: 'partial' });
    api.getInferenceJobItems.mockResolvedValueOnce([{ status: 'failed', error: 'CUDA out of memory' }]);
    const { result } = renderHook(() => useConceptSegmentationRunner(model));
    await act(async () => { await result.current.run(); });
    expect(result.current.isRunning).toBe(false);
    expect(result.current.error).toContain('CUDA out of memory');
    expect(annotationSession.addObject).not.toHaveBeenCalled();
    await act(async () => { await result.current.retry(); });
    expect(api.startInferenceJob).toHaveBeenCalledTimes(2);
  });

  it('reconnects the same running job after a stream failure and saves its completion once', async () => {
    const connections = [];
    api.streamInferenceJob.mockImplementation((id, next, error) => {
      connections.push({ id, next, error }); return { abort: vi.fn() };
    });
    const { result } = renderHook(() => useConceptSegmentationRunner(model));
    await act(async () => { await result.current.run(); });
    await act(async () => { connections[0].error(new Error('stream lost')); });
    await act(async () => { await result.current.retry(); });
    expect(api.startInferenceJob).toHaveBeenCalledTimes(1);
    expect(api.getInferenceJob).toHaveBeenCalledWith(991);
    expect(connections).toHaveLength(2);
    await act(async () => { await connections[1].next({ id: 991, status: 'succeeded' }); });
    await act(async () => { await connections[1].next({ id: 991, status: 'succeeded' }); });
    expect(annotationSession.addObject).toHaveBeenCalledTimes(1);
    expect(annotationSession.addObject.mock.calls[0][6].source).toBe('instance_segmentation');
  });

  it('retries a failed result fetch without rerunning inference or duplicating saves', async () => {
    api.startInferenceJob.mockResolvedValue({ id: 991, status: 'succeeded' });
    api.getInferenceJob.mockResolvedValue({ id: 991, status: 'succeeded' });
    api.getInferenceJobItems.mockRejectedValueOnce(new Error('fetch failed')).mockResolvedValue(results());
    const { result } = renderHook(() => useConceptSegmentationRunner(model));
    await act(async () => { await result.current.run(); });
    expect(result.current.error).toBeTruthy();
    await act(async () => { await result.current.retry(); });
    expect(api.startInferenceJob).toHaveBeenCalledTimes(1);
    expect(annotationSession.addObject).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('retains the existing job when reconnecting cannot read its status', async () => {
    let onError;
    api.streamInferenceJob.mockImplementation((_id, _next, error) => { onError = error; return { abort: vi.fn() }; });
    const { result } = renderHook(() => useConceptSegmentationRunner(model));
    await act(async () => { await result.current.run(); });
    await act(async () => { onError(new Error('stream lost')); });
    api.getInferenceJob.mockRejectedValueOnce(new Error('status unavailable'));
    await act(async () => { await result.current.retry(); });
    expect(api.startInferenceJob).toHaveBeenCalledTimes(1);
    expect(api.cancelInferenceJob).not.toHaveBeenCalled();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.error).toBeTruthy();
    await act(async () => { await result.current.retry(); });
    expect(api.getInferenceJob).toHaveBeenCalledTimes(2);
    expect(api.startInferenceJob).toHaveBeenCalledTimes(1);
  });

  it('finishes suppressed duplicates with feedback instead of a permanent save failure', async () => {
    api.startInferenceJob.mockResolvedValue({ id: 991, status: 'succeeded' });
    annotationSession.addObject.mockResolvedValue({ type: 'success', success: true, data: { skipped: true } });
    const { result } = renderHook(() => useConceptSegmentationRunner(model));
    await act(async () => { await result.current.run(); });
    expect(result.current.status).toBe('done');
    expect(result.current.error).toBeNull();
    expect(mocks.toast.mock.calls.some(([message]) => /skipp|suppress|existing|duplicate|already/i.test(message.message))).toBe(true);
  });

  it('retries only failed saves after a mixed created/suppressed/failed result', async () => {
    api.startInferenceJob.mockResolvedValue({ id: 991, status: 'succeeded' });
    api.getInferenceJobItems.mockResolvedValue(results([prediction, { ...prediction, x: [.4, .5, .5, .4] }, { ...prediction, x: [.6, .7, .7, .6] }]));
    annotationSession.addObject.mockResolvedValueOnce({ success: true, data: { id: 21061 } })
      .mockResolvedValueOnce({ success: true, data: { skipped: true } })
      .mockRejectedValueOnce(new Error('save failed'))
      .mockResolvedValueOnce({ success: true, data: { id: 21062 } });
    const { result } = renderHook(() => useConceptSegmentationRunner(model));
    await act(async () => { await result.current.run(); });
    expect(result.current.error).toBeTruthy();
    await act(async () => { await result.current.retry(); });
    expect(annotationSession.addObject).toHaveBeenCalledTimes(4);
    expect(annotationSession.addObject.mock.calls[3][0]).toEqual([.6, .7, .7, .6]);
    expect(api.startInferenceJob).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });
});


describe('writeMode: replace vs add with overlap suppression', () => {
  it.each(['cpsam_polyp_v3_b_seed17', 'yolo_polyp_v3_c_seed1'])(
    'patch with %s skips shifted cross-model duplicates and keeps new polyps', async (modelKey) => {
      const selectedModel = { ...model, id: modelKey, registry_key: modelKey };
      useAnnotationStore.setState((state) => {
        state.models.instanceModel = modelKey;
        state.models.availableInstanceModels = [selectedModel];
        state.objects.list.push({
          id: 30001, contour_id: 30001, labelId: 43, parent_id: 21060,
          x: [.2, .3, .3, .2], y: [.2, .2, .3, .3],
        });
      });
      const shifted = { ...prediction, x: [.26, .36, .36, .26] };
      const fresh = { ...prediction, x: [.6, .7, .7, .6], y: [.6, .6, .7, .7] };
      api.startInferenceJob.mockResolvedValue({ id: 997, status: 'succeeded' });
      api.getInferenceJobItems.mockResolvedValue(results([shifted, fresh]));
      const { result } = renderHook(() => useConceptSegmentationRunner(selectedModel));
      await act(async () => { await result.current.run('patch'); });
      expect(annotationSession.addObject).toHaveBeenCalledTimes(1);
      expect(annotationSession.addObject.mock.calls[0][0]).toEqual(fresh.x);
      expect(annotationSession.deleteObject).not.toHaveBeenCalled();
      expect(result.current.suppressedCount).toBe(1);
      expect(result.current.status).toBe('done');
    }
  );

  it('checks newly saved polyps in the current store before persisting a delayed result', async () => {
    let complete;
    api.streamInferenceJob.mockImplementation((_id, next) => {
      complete = next;
      return { abort: vi.fn() };
    });
    const { result } = renderHook(() => useConceptSegmentationRunner(model));
    await act(async () => { await result.current.run('patch'); });
    // Another annotation is saved while inference is in flight, nested under a surface.
    act(() => {
      useAnnotationStore.setState((state) => {
        state.objects.list.push(
          { id: 21062, contour_id: 21062, labelId: 42, parent_id: 21060 },
          { id: 30001, contour_id: 30001, labelId: 43, parent_id: 21062,
            x: [.2, .3, .3, .2], y: [.2, .2, .3, .3] }
        );
      });
    });
    await act(async () => { await complete({ id: 991, status: 'succeeded' }); });
    expect(annotationSession.addObject).not.toHaveBeenCalled();
    expect(annotationSession.deleteObject).not.toHaveBeenCalled();
    expect(result.current.suppressedCount).toBe(1);
  });

  it('replaces existing polyps on the coral when writeMode is replace', async () => {
    // Coral 21060 has an existing polyp 30001
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .9, .9, .1], y: [.1, .1, .9, .9] },
        { id: 30001, contour_id: 30001, labelId: 43, parentId: 21060, x: [.2, .3, .3, .2], y: [.2, .2, .3, .3] },
      ];
      state.objects.selected = [21060];
    });

    api.startInferenceJob.mockResolvedValue({ id: 995, status: 'succeeded' });
    const newPred = { x: [.5, .6, .6, .5], y: [.5, .5, .6, .6], label_id: 43, parent_id: 21060, confidence: .95 };
    api.getInferenceJobItems.mockResolvedValue(results([newPred]));
    annotationSession.addObject.mockResolvedValue({ success: true, data: { id: 30002 } });
    annotationSession.deleteObject.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useConceptSegmentationRunner(model));
    expect(result.current.writeMode).toBe('patch');

    await act(async () => {
      await result.current.run('override');
    });

    // Existing polyp on that coral was deleted
    expect(annotationSession.deleteObject).toHaveBeenCalledWith(30001);
    // New prediction was added
    expect(annotationSession.addObject).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('done');
    expect(mocks.toast.mock.calls.some(([t]) => /replaced/i.test(t.message))).toBe(true);
  });

  it('removes existing in-scope polyps and preserves out-of-scope annotations when Override returns zero predictions', async () => {
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .45, .45, .1], y: [.1, .1, .9, .9] },
        { id: 21061, contour_id: 21061, labelId: 41, x: [.55, .9, .9, .55], y: [.1, .1, .9, .9] },
        { id: 30001, contour_id: 30001, labelId: 43, parent_id: 21060, x: [.2, .3, .3, .2], y: [.2, .2, .3, .3] },
        { id: 30002, contour_id: 30002, labelId: 43, parent_id: 21061, x: [.6, .7, .7, .6], y: [.2, .2, .3, .3] },
      ];
      state.objects.selected = [21060];
      state.aiAnnotation.lastInstanceRun = {
        count: 1,
        objectIds: [30001],
        labelName: 'Coral Polyp',
        imageId: 385,
        datasetId: 15,
      };
    });

    api.startInferenceJob.mockResolvedValue({ id: 1005, status: 'succeeded' });
    api.getInferenceJobItems.mockResolvedValue(results([]));
    let resolveDelete;
    annotationSession.deleteObject.mockImplementation(
      () => new Promise((resolve) => {
        resolveDelete = resolve;
      })
    );

    const { result } = renderHook(() => useConceptSegmentationRunner(model));

    let runPromise;
    act(() => {
      runPromise = result.current.run('override');
    });

    await waitFor(() => {
      expect(annotationSession.deleteObject).toHaveBeenCalledWith(30001);
    });
    // Must remain busy in 'saving' state while backend deletion is still in flight
    expect(result.current.isRunning).toBe(true);
    expect(result.current.status).toBe('saving');

    await act(async () => {
      resolveDelete({ success: true });
      await runPromise;
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledTimes(1);
    expect(annotationSession.deleteObject).not.toHaveBeenCalledWith(30002);
    expect(annotationSession.deleteObject).not.toHaveBeenCalledWith(21060);
    expect(annotationSession.addObject).not.toHaveBeenCalled();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.status).toBe('done');
    expect(result.current.lastRun).toBeNull();
    expect(mocks.toast).toHaveBeenCalledWith({
      type: 'info',
      message: '1 existing objects removed.',
    });
  });

  it('reports failure when deleting an existing object throws during Override and recovers on retry', async () => {
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .45, .45, .1], y: [.1, .1, .9, .9] },
        { id: 30001, contour_id: 30001, labelId: 43, parent_id: 21060, x: [.2, .3, .3, .2], y: [.2, .2, .3, .3] },
      ];
      state.objects.selected = [21060];
    });

    api.startInferenceJob.mockResolvedValue({ id: 1007, status: 'succeeded' });
    api.getInferenceJobItems.mockResolvedValue(results([]));
    annotationSession.deleteObject.mockRejectedValueOnce(new Error('Network error deleting object'));

    const { result } = renderHook(() => useConceptSegmentationRunner(model));

    await act(async () => {
      await result.current.run('override');
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledWith(30001);
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toMatch(/could not remove 1 existing object/i);
    expect(result.current.isRunning).toBe(false);

    // Now retry after failure:
    annotationSession.deleteObject.mockResolvedValueOnce({ success: true });
    await act(async () => {
      await result.current.retry();
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('done');
    expect(result.current.error).toBeNull();
  });

  it('reports failure when deleting an existing object returns success: false and recovers on retry', async () => {
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .45, .45, .1], y: [.1, .1, .9, .9] },
        { id: 30001, contour_id: 30001, labelId: 43, parent_id: 21060, x: [.2, .3, .3, .2], y: [.2, .2, .3, .3] },
      ];
      state.objects.selected = [21060];
    });

    api.startInferenceJob.mockResolvedValue({ id: 1008, status: 'succeeded' });
    api.getInferenceJobItems.mockResolvedValue(results([]));
    annotationSession.deleteObject.mockResolvedValueOnce({ success: false, message: 'Object locked' });

    const { result } = renderHook(() => useConceptSegmentationRunner(model));

    await act(async () => {
      await result.current.run('override');
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledWith(30001);
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toMatch(/could not remove 1 existing object/i);
    expect(result.current.isRunning).toBe(false);

    // Now retry after failure:
    annotationSession.deleteObject.mockResolvedValueOnce({ success: true });
    await act(async () => {
      await result.current.retry();
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('done');
    expect(result.current.error).toBeNull();
  });

  it('reports failure and preserves safe retry when deletion fails with incoming predictions', async () => {
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .45, .45, .1], y: [.1, .1, .9, .9] },
        { id: 30001, contour_id: 30001, labelId: 43, parent_id: 21060, x: [.2, .3, .3, .2], y: [.2, .2, .3, .3] },
      ];
      state.objects.selected = [21060];
    });

    api.startInferenceJob.mockResolvedValue({ id: 1009, status: 'succeeded' });
    const p1 = { x: [.4, .5, .5, .4], y: [.4, .4, .5, .5], label_id: 43, parent_id: 21060, confidence: .9 };
    api.getInferenceJobItems.mockResolvedValue(results([p1]));
    annotationSession.deleteObject.mockResolvedValueOnce({ success: false });
    annotationSession.addObject.mockResolvedValueOnce({ success: true, data: { id: 30002 } });

    const { result } = renderHook(() => useConceptSegmentationRunner(model));

    await act(async () => {
      await result.current.run('override');
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledWith(30001);
    expect(annotationSession.addObject).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toMatch(/could not remove 1 existing object/i);

    // On retry, deletion succeeds, prediction already added is not re-added
    annotationSession.deleteObject.mockResolvedValueOnce({ success: true });
    await act(async () => {
      await result.current.retry();
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledTimes(2);
    expect(annotationSession.addObject).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('done');
    expect(result.current.error).toBeNull();
  });

  it('retries suppressed replacement predictions when override deletion failed on first attempt and succeeds on retry', async () => {
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .45, .45, .1], y: [.1, .1, .9, .9] },
        { id: 30001, contour_id: 30001, labelId: 43, parent_id: 21060, x: [.2, .3, .3, .2], y: [.2, .2, .3, .3] },
      ];
      state.objects.selected = [21060];
    });

    api.startInferenceJob.mockResolvedValue({ id: 1010, status: 'succeeded' });
    const p1 = { x: [.2, .3, .3, .2], y: [.2, .2, .3, .3], label_id: 43, parent_id: 21060, confidence: .9 };
    api.getInferenceJobItems.mockResolvedValue(results([p1]));

    // Pass 1: Deletion fails, replacement is suppressed by backend duplicate check because old outline still exists
    annotationSession.deleteObject.mockResolvedValueOnce({ success: false });
    annotationSession.addObject.mockResolvedValueOnce({ success: true, data: { skipped: true, duplicate: true } });

    const { result } = renderHook(() => useConceptSegmentationRunner(model));

    await act(async () => {
      await result.current.run('override');
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledWith(30001);
    expect(annotationSession.addObject).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toMatch(/could not remove 1 existing object and could not save 1 object/i);

    // Pass 2: Retry deletes old outline successfully; suppressed replacement is retried and saved
    annotationSession.deleteObject.mockResolvedValueOnce({ success: true });
    annotationSession.addObject.mockResolvedValueOnce({ success: true, data: { id: 30002 } });

    await act(async () => {
      await result.current.retry();
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledTimes(2);
    expect(annotationSession.addObject).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('done');
    expect(result.current.error).toBeNull();
  });

  it('retries suppressed replacement predictions while properly treating remaining duplicates as suppressed once deletions succeed on retry', async () => {
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .45, .45, .1], y: [.1, .1, .9, .9] },
        { id: 30001, contour_id: 30001, labelId: 43, parent_id: 21060, x: [.2, .3, .3, .2], y: [.2, .2, .3, .3] },
      ];
      state.objects.selected = [21060];
    });

    api.startInferenceJob.mockResolvedValue({ id: 1011, status: 'succeeded' });
    // p1 replaces 30001; p2 is a within-batch duplicate or out-of-scope duplicate
    const p1 = { x: [.2, .3, .3, .2], y: [.2, .2, .3, .3], label_id: 43, parent_id: 21060, confidence: .9 };
    const p2 = { x: [.6, .7, .7, .6], y: [.6, .6, .7, .7], label_id: 43, parent_id: 21060, confidence: .85 };
    api.getInferenceJobItems.mockResolvedValue(results([p1, p2]));

    // Pass 1: Deletion fails, both p1 and p2 get skipped
    annotationSession.deleteObject.mockResolvedValueOnce({ success: false });
    annotationSession.addObject.mockResolvedValueOnce({ success: true, data: { skipped: true, duplicate: true } });
    annotationSession.addObject.mockResolvedValueOnce({ success: true, data: { skipped: true, duplicate: true } });

    const { result } = renderHook(() => useConceptSegmentationRunner(model));

    await act(async () => {
      await result.current.run('override');
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledWith(30001);
    expect(annotationSession.addObject).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('failed');

    // Pass 2: Deletion succeeds. p1 succeeds. p2 is still duplicate and skipped.
    annotationSession.deleteObject.mockResolvedValueOnce({ success: true });
    annotationSession.addObject.mockResolvedValueOnce({ success: true, data: { id: 30002 } });
    annotationSession.addObject.mockResolvedValueOnce({ success: true, data: { skipped: true, duplicate: true } });

    await act(async () => {
      await result.current.retry();
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledTimes(2);
    expect(annotationSession.addObject).toHaveBeenCalledTimes(4);
    // Since deletion succeeded, p2's skip is treated as suppressed, not unresolved!
    expect(result.current.status).toBe('done');
    expect(result.current.error).toBeNull();
  });

  it('keeps existing polyps untouched when Patch returns zero predictions', async () => {
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .45, .45, .1], y: [.1, .1, .9, .9] },
        { id: 30001, contour_id: 30001, labelId: 43, parent_id: 21060, x: [.2, .3, .3, .2], y: [.2, .2, .3, .3] },
      ];
      state.objects.selected = [21060];
    });

    api.startInferenceJob.mockResolvedValue({ id: 1006, status: 'succeeded' });
    api.getInferenceJobItems.mockResolvedValue(results([]));

    const { result } = renderHook(() => useConceptSegmentationRunner(model));

    await act(async () => {
      await result.current.run('patch');
    });

    expect(annotationSession.deleteObject).not.toHaveBeenCalled();
    expect(annotationSession.addObject).not.toHaveBeenCalled();
    expect(result.current.status).toBe('done');
    expect(mocks.toast).toHaveBeenCalledWith({
      type: 'info',
      message: 'No objects found in the selected area.',
    });
  });

  it('keeps existing polyps and suppresses overlapping predictions when writeMode is patch (add)', async () => {
    // Coral 21060 has an existing polyp at [0.2..0.3, 0.2..0.3]
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .9, .9, .1], y: [.1, .1, .9, .9] },
        { id: 30001, contour_id: 30001, labelId: 43, parentId: 21060, x: [.2, .3, .3, .2], y: [.2, .2, .3, .3] },
      ];
      state.objects.selected = [21060];
    });

    api.startInferenceJob.mockResolvedValue({ id: 996, status: 'succeeded' });
    // Pred 1: near-duplicate of existing polyp 30001 (IoU > 0.8)
    const duplicatePred = { x: [.2, .3, .3, .2], y: [.2, .2, .3, .3], label_id: 43, parent_id: 21060, confidence: .95 };
    // Pred 2: genuine new polyp elsewhere on coral
    const freshPred = { x: [.6, .7, .7, .6], y: [.6, .6, .7, .7], label_id: 43, parent_id: 21060, confidence: .85 };

    api.getInferenceJobItems.mockResolvedValue(results([duplicatePred, freshPred]));
    annotationSession.addObject.mockResolvedValue({ success: true, data: { id: 30003 } });
    annotationSession.deleteObject.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useConceptSegmentationRunner(model));
    act(() => {
      result.current.setWriteMode('patch');
    });
    expect(result.current.writeMode).toBe('patch');

    await act(async () => {
      await result.current.run();
    });

    // Existing polyp was NOT deleted
    expect(annotationSession.deleteObject).not.toHaveBeenCalled();
    // Only the non-overlapping fresh prediction was added! Duplicate was suppressed.
    expect(annotationSession.addObject).toHaveBeenCalledTimes(1);
    expect(annotationSession.addObject.mock.calls[0][0]).toEqual([.6, .7, .7, .6]);
    expect(result.current.status).toBe('done');
    expect(result.current.suppressedCount).toBe(1);
    expect(mocks.toast.mock.calls.some(([t]) => /suppressed/i.test(t.message))).toBe(true);
  });

  it('preserves successful saves during Override retries when a subsequent prediction fails', async () => {
    // Initial state: Coral 21060 with an existing polyp 30001
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .9, .9, .1], y: [.1, .1, .9, .9] },
        { id: 30001, contour_id: 30001, labelId: 43, parentId: 21060, x: [.2, .3, .3, .2], y: [.2, .2, .3, .3] },
      ];
      state.objects.selected = [21060];
    });

    api.startInferenceJob.mockResolvedValue({ id: 997, status: 'succeeded' });
    const p1 = { x: [.4, .5, .5, .4], y: [.4, .4, .5, .5], label_id: 43, parent_id: 21060, confidence: .9 };
    const p2 = { x: [.6, .7, .7, .6], y: [.6, .6, .7, .7], label_id: 43, parent_id: 21060, confidence: .9 };
    api.getInferenceJobItems.mockResolvedValue(results([p1, p2]));
    annotationSession.deleteObject.mockResolvedValue({ success: true });
    // First pass: p1 succeeds (id 30002), p2 fails
    annotationSession.addObject
      .mockResolvedValueOnce({ success: true, data: { id: 30002 } })
      .mockRejectedValueOnce(new Error('temporary network failure'))
      // Retry pass: p2 succeeds (id 30003)
      .mockResolvedValueOnce({ success: true, data: { id: 30003 } });

    const { result } = renderHook(() => useConceptSegmentationRunner(model));

    await act(async () => {
      await result.current.run('override');
    });

    // In first pass: existing polyp 30001 was deleted
    expect(annotationSession.deleteObject).toHaveBeenCalledTimes(1);
    expect(annotationSession.deleteObject).toHaveBeenCalledWith(30001);
    // P1 was saved, P2 failed
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toContain('1 of 2 objects');

    // Simulate store updating to include newly created polyp 30002
    act(() => {
      useAnnotationStore.setState((state) => {
        state.objects.list = [
          { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .9, .9, .1], y: [.1, .1, .9, .9] },
          { id: 30002, contour_id: 30002, labelId: 43, parentId: 21060, x: [.4, .5, .5, .4], y: [.4, .4, .5, .5] },
        ];
      });
    });

    // Now user clicks Retry
    await act(async () => {
      await result.current.retry();
    });

    // CRITICAL: deleteObject must NOT be called on retry (30002 must NOT be deleted!)
    expect(annotationSession.deleteObject).toHaveBeenCalledTimes(1);
    // P2 was saved on retry
    expect(annotationSession.addObject).toHaveBeenCalledTimes(3);
    expect(result.current.status).toBe('done');
    expect(result.current.error).toBeNull();
  });

  it('restricts Override deletion to the selected surface ROI when a fragment is focused', async () => {
    // Fragment 21060 contains Surface 21062 and Surface 21063.
    // Polyp 30001 is on Surface 21062.
    // Polyp 30002 is on Surface 21063.
    // Polyp 30003 is directly on Fragment 21060.
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        { id: 21060, contour_id: 21060, labelId: 41, x: [.1, .9, .9, .1], y: [.1, .1, .9, .9] },
        { id: 21062, contour_id: 21062, labelId: 42, parentId: 21060, x: [.2, .5, .5, .2], y: [.2, .2, .5, .5] },
        { id: 21063, contour_id: 21063, labelId: 42, parentId: 21060, x: [.6, .8, .8, .6], y: [.6, .6, .8, .8] },
        { id: 30001, contour_id: 30001, labelId: 43, parentId: 21062, x: [.3, .4, .4, .3], y: [.3, .3, .4, .4] },
        { id: 30002, contour_id: 30002, labelId: 43, parentId: 21063, x: [.65, .75, .75, .65], y: [.65, .65, .75, .75] },
        { id: 30003, contour_id: 30003, labelId: 43, parentId: 21060, x: [.15, .2, .2, .15], y: [.15, .15, .2, .2] },
      ];
      // Fragment 21060 is focused, but Surface 21062 is selected as ROI
      state.objects.focused = 21060;
      state.objects.selected = [21062];
    });

    api.startInferenceJob.mockResolvedValue({ id: 998, status: 'succeeded' });
    const newPred = { x: [.35, .45, .45, .35], y: [.35, .35, .45, .45], label_id: 43, parent_id: null, confidence: .95 };
    api.getInferenceJobItems.mockResolvedValue(results([newPred]));
    annotationSession.addObject.mockResolvedValue({ success: true, data: { id: 30004 } });
    annotationSession.deleteObject.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useConceptSegmentationRunner(model));

    await act(async () => {
      await result.current.run('override');
    });

    // Only polyp 30001 (on Surface 21062) was deleted!
    expect(annotationSession.deleteObject).toHaveBeenCalledTimes(1);
    expect(annotationSession.deleteObject).toHaveBeenCalledWith(30001);
    expect(annotationSession.deleteObject).not.toHaveBeenCalledWith(30002);
    expect(annotationSession.deleteObject).not.toHaveBeenCalledWith(30003);

    // New prediction attached to Surface 21062 (the selected ROI)
    expect(annotationSession.addObject).toHaveBeenCalledWith(
      expect.any(Array), expect.any(Array), 'Coral Polyp', 21062, .95, 43,
      expect.any(Object)
    );
  });

  it('forwards configured confidence threshold from dataset routing policy', async () => {
    mocks.policy = {
      dataset_id: 15,
      bindings: [
        {
          task: 'instance-segmentation',
          label_id: 43,
          model_registry_key: model.id,
          inputs: { parameters: { threshold: 0.9 } },
        },
      ],
    };

    api.startInferenceJob.mockResolvedValue({ id: 999, status: 'succeeded' });
    api.getInferenceJobItems.mockResolvedValue(results());

    const { result } = renderHook(() => useConceptSegmentationRunner(model));

    await act(async () => {
      await result.current.run();
    });

    expect(api.startInferenceJob).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: [
          expect.objectContaining({
            model_registry_key: model.id,
            label_id: 43,
            inputs: { parameters: { threshold: 0.9 } },
          }),
        ],
      })
    );
  });

  it('does not forward confidence threshold from unrelated label binding of same model', async () => {
    mocks.policy = {
      dataset_id: 15,
      bindings: [
        {
          task: 'instance-segmentation',
          label_id: 44, // different label binding
          model_registry_key: model.id,
          inputs: { parameters: { threshold: 0.99 } },
        },
      ],
    };

    api.startInferenceJob.mockResolvedValue({ id: 1000, status: 'succeeded' });
    api.getInferenceJobItems.mockResolvedValue(results());

    const { result } = renderHook(() => useConceptSegmentationRunner(model));

    await act(async () => {
      await result.current.run();
    });

    expect(api.startInferenceJob).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: [
          expect.objectContaining({
            model_registry_key: model.id,
            label_id: 43,
            inputs: {},
          }),
        ],
      })
    );
  });
});
