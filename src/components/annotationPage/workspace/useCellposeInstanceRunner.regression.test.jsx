import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { initialState } from '../../../stores/initialState';
import * as api from '../../../api/inference';
import annotationSession from '../../../services/annotationSession';
import { useCellposeInstanceRunner } from './useCellposeInstanceRunner';
import { CellposeInstanceRunnerProvider, useCellposeInstanceRunnerContext } from './CellposeInstanceRunnerContext';
import ServiceCard from './ServiceCard';
import useAnnotationServices from './useAnnotationServices';

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
  id: 'cpsam_polyp_v3_b_seed17', registry_key: 'cpsam_polyp_v3_b_seed17',
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
  it('owns mapped model metadata before the collapsible panel mounts', () => {
    let flow;
    function Probe() { flow = useCellposeInstanceRunnerContext(); return null; }
    render(<CellposeInstanceRunnerProvider><Probe /></CellposeInstanceRunnerProvider>);
    expect(flow.mappedLabel?.labelId).toBe(43);
    expect(flow.canRun).toBe(true);
  });

  it('keeps the run across card closure but rejects a late result after navigation', async () => {
    const start = deferred();
    api.startInferenceJob.mockReturnValue(start.promise);
    let flow;
    function Probe() { flow = useCellposeInstanceRunnerContext(); return null; }
    render(<CellposeInstanceRunnerProvider><Probe /><ServiceCard service={service} /></CellposeInstanceRunnerProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run model' }));
    await waitFor(() => expect(api.startInferenceJob).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));
    expect(flow.isRunning).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));
    act(() => {
      annotationSession.currentImageId = 999;
      useAnnotationStore.setState((state) => { state.images.currentImageId = 999; state.objects.list = []; });
    });
    await act(async () => { start.resolve({ id: 991, status: 'succeeded' }); await start.promise; });
    await waitFor(() => expect(api.cancelInferenceJob).toHaveBeenCalledWith(991));
    expect(annotationSession.addObject).not.toHaveBeenCalled();
  });

  it('keeps a session model override when the tools drawer closes and reopens', async () => {
    const originalFetch = useAnnotationStore.getState().fetchAvailableInstanceModels;
    const fetchModels = vi.fn().mockResolvedValue();
    const other = { id: 'mask2former', registry_key: 'mask2former', name: 'Mask2Former' };
    useAnnotationStore.setState((state) => {
      state.fetchAvailableInstanceModels = fetchModels;
      state.models.availableInstanceModels = [other, model];
      state.models.availablePromptedModels = [{ id: 'prompted' }];
      state.models.availableSuggestionModels = [{ id: 'suggestion' }];
      state.models.modelsDatasetId = 15;
    });
    function Drawer() { useAnnotationServices(); return null; }
    const view = render(<CellposeInstanceRunnerProvider><Drawer /></CellposeInstanceRunnerProvider>);
    try {
      act(() => useAnnotationStore.getState().setInstanceModel(model.id));
      expect(useAnnotationStore.getState().models.instanceModel).toBe(model.id);
      view.rerender(<CellposeInstanceRunnerProvider />);
      view.rerender(<CellposeInstanceRunnerProvider><Drawer /></CellposeInstanceRunnerProvider>);
      await act(async () => {});
      expect(useAnnotationStore.getState().models.instanceModel).toBe(model.id);
    } finally {
      view.unmount();
      useAnnotationStore.setState({ fetchAvailableInstanceModels: originalFetch });
    }
  });

  it('shows a failed item from a partial terminal job and permits a fresh retry', async () => {
    api.startInferenceJob.mockResolvedValueOnce({ id: 991, status: 'partial' });
    api.getInferenceJobItems.mockResolvedValueOnce([{ status: 'failed', error: 'CUDA out of memory' }]);
    const { result } = renderHook(() => useCellposeInstanceRunner(model));
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
    const { result } = renderHook(() => useCellposeInstanceRunner(model));
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
    const { result } = renderHook(() => useCellposeInstanceRunner(model));
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
    const { result } = renderHook(() => useCellposeInstanceRunner(model));
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
    const { result } = renderHook(() => useCellposeInstanceRunner(model));
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
    const { result } = renderHook(() => useCellposeInstanceRunner(model));
    await act(async () => { await result.current.run(); });
    expect(result.current.error).toBeTruthy();
    await act(async () => { await result.current.retry(); });
    expect(annotationSession.addObject).toHaveBeenCalledTimes(4);
    expect(annotationSession.addObject.mock.calls[3][0]).toEqual([.6, .7, .7, .6]);
    expect(api.startInferenceJob).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });
});


describe('YOLO polyp uses the shared instance workflow', () => {
  const yolo = { ...model, id: 'yolo_polyp_v3_c_seed1', registry_key: 'yolo_polyp_v3_c_seed1', name: 'YOLO11m-seg · Polyp' };
  it('saves YOLO results with the selected model identity and mapped dataset label', async () => {
    useAnnotationStore.setState((state) => {
      state.models.availableInstanceModels = [model, yolo];
      state.models.instanceModel = yolo.id;
    });
    api.startInferenceJob.mockResolvedValue({ id: 992, status: 'succeeded' });
    let flow;
    function Probe() { flow = useCellposeInstanceRunnerContext(); return null; }
    render(<CellposeInstanceRunnerProvider><Probe /></CellposeInstanceRunnerProvider>);
    await act(async () => { await flow.run(); });
    expect(api.startInferenceJob).toHaveBeenCalledWith(expect.objectContaining({
      steps: [expect.objectContaining({ model_registry_key: yolo.id, label_id: 43, roi_contour_ids: [21060] })],
    }));
    expect(annotationSession.addObject).toHaveBeenCalledWith(
      expect.any(Array), expect.any(Array), 'Coral Polyp', 21060, .9, 43,
      { addedBy: yolo.id, source: 'instance_segmentation', modelKey: yolo.id }
    );
    expect(flow.status).toBe('done');
    expect(flow.modelName).toContain('YOLO');
    expect(flow.checkpointSha).toBe('7e9ac2eec159b4d227d1b8c6553de224a982f420f96b738362ef04bbfad08edf');
  });
  it('retains the YOLO job across model switches and prevents a competing polyp run', async () => {
    useAnnotationStore.setState((state) => {
      state.models.availableInstanceModels = [model, yolo];
      state.models.instanceModel = yolo.id;
    });
    let flow;
    function Probe() { flow = useCellposeInstanceRunnerContext(); return null; }
    render(<CellposeInstanceRunnerProvider><Probe /></CellposeInstanceRunnerProvider>);
    await act(async () => { await flow.run(); });
    act(() => { useAnnotationStore.getState().setInstanceModel(model.id); });
    expect(flow.canRun).toBe(false);
    await act(async () => { await flow.run(); });
    expect(api.startInferenceJob).toHaveBeenCalledTimes(1);
    act(() => { useAnnotationStore.getState().setInstanceModel(yolo.id); });
    expect(flow.isRunning).toBe(true);
    await act(async () => { await flow.cancel(); });
    expect(api.cancelInferenceJob).toHaveBeenCalledWith(991);
  });

  it('keeps the focused coral ROI after selecting a result polyp and switching models both ways', async () => {
    const yolo = { ...model, id: 'yolo_polyp_v3_c_seed1', registry_key: 'yolo_polyp_v3_c_seed1', name: 'YOLO11m-seg · Polyp' };
    useAnnotationStore.setState((state) => {
      state.models.availableInstanceModels = [model, yolo];
      state.models.instanceModel = model.id;
      state.focusMode = { ...state.focusMode, active: true, objectId: 21060 };
    });
    api.startInferenceJob
      .mockResolvedValueOnce({ id: 993, status: 'succeeded' })
      .mockResolvedValueOnce({ id: 994, status: 'succeeded' })
      .mockResolvedValueOnce({ id: 995, status: 'succeeded' });
    let flow;
    function Probe() { flow = useCellposeInstanceRunnerContext(); return null; }
    render(<CellposeInstanceRunnerProvider><Probe /></CellposeInstanceRunnerProvider>);

    await act(async () => { await flow.run(); });
    act(() => {
      useAnnotationStore.setState((state) => {
        state.objects.list.push({ id: 30001, contour_id: 30001, labelId: 43, parent_id: 21060 });
        state.objects.selected = [30001];
        state.models.instanceModel = yolo.id;
      });
    });
    expect(flow.roiCount).toBe(1);
    await act(async () => { await flow.run(); });

    act(() => { useAnnotationStore.getState().setInstanceModel(model.id); });
    expect(flow.roiCount).toBe(1);
    await act(async () => { await flow.run(); });
    expect(api.startInferenceJob.mock.calls.map(([request]) => request.steps[0].model_registry_key))
      .toEqual([model.id, yolo.id, model.id]);
    expect(api.startInferenceJob.mock.calls.map(([request]) => request.steps[0].roi_contour_ids))
      .toEqual([[21060], [21060], [21060]]);
  });

  it('skips the write-mode warning when the current scope has no existing target polyps', async () => {
    render(<CellposeInstanceRunnerProvider><ServiceCard service={service} /></CellposeInstanceRunnerProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run model' }));
    await waitFor(() => expect(api.startInferenceJob).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: /Patch and run/i })).not.toBeInTheDocument();
  });

  it('shows the write-mode warning for a nested in-scope polyp and honors cancellation', async () => {
    useAnnotationStore.setState((state) => {
      state.objects.list.push(
        { id: 21061, contour_id: 21061, labelId: 42, parent_id: 21060 },
        { id: 30001, contour_id: 30001, labelId: 43, parent_id: 21061 },
        { id: 22060, contour_id: 22060, labelId: 41 },
        { id: 30002, contour_id: 30002, labelId: 43, parent_id: 22060 },
        { id: 30003, contour_id: 30003, labelId: 44, parent_id: 21060 }
      );
    });
    render(<CellposeInstanceRunnerProvider><ServiceCard service={service} /></CellposeInstanceRunnerProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run model' }));
    expect(screen.getByRole('button', { name: /Patch and run/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('button', { name: /Patch and run/i })).not.toBeInTheDocument();
    expect(api.startInferenceJob).not.toHaveBeenCalled();
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
      const { result } = renderHook(() => useCellposeInstanceRunner(selectedModel));
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
    const { result } = renderHook(() => useCellposeInstanceRunner(model));
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

    const { result } = renderHook(() => useCellposeInstanceRunner(model));
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

    const { result } = renderHook(() => useCellposeInstanceRunner(model));
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

    const { result } = renderHook(() => useCellposeInstanceRunner(model));

    await act(async () => {
      await result.current.run('override');
    });

    // In first pass: existing polyp 30001 was deleted
    expect(annotationSession.deleteObject).toHaveBeenCalledTimes(1);
    expect(annotationSession.deleteObject).toHaveBeenCalledWith(30001);
    // P1 was saved, P2 failed
    expect(result.current.status).toBe('failed');
    expect(result.current.error).toContain('1 of 2 polyps');

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

    const { result } = renderHook(() => useCellposeInstanceRunner(model));

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

    const { result } = renderHook(() => useCellposeInstanceRunner(model));

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

    const { result } = renderHook(() => useCellposeInstanceRunner(model));

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
