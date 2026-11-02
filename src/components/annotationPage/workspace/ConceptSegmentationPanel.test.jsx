import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { initialState } from '../../../stores/initialState';
import * as api from '../../../api/inference';
import annotationSession from '../../../services/annotationSession';
import { ConceptSegmentationProvider, useConceptSegmentation } from './ConceptSegmentationContext';
import ConceptSegmentationPanel from './ConceptSegmentationPanel';

const mocks = vi.hoisted(() => ({ policy: { bindings: [] }, allowed: true, disabled: [], datasetId: 15 }));
vi.mock('../../../api/inference', () => ({
  getInferenceModelCatalog: vi.fn(), startInferenceJob: vi.fn(), getInferenceJob: vi.fn(),
  getInferenceJobItems: vi.fn(), streamInferenceJob: vi.fn(), cancelInferenceJob: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../../contexts/DatasetContext', () => ({ useDataset: () => ({ currentDataset: { id: mocks.datasetId } }) }));
vi.mock('../../../contexts/AnnotationRoutingPolicyContext', () => ({
  useAnnotationRoutingPolicy: () => ({ policy: mocks.policy, policyResolved: true }),
}));
vi.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../../../hooks/usePermissions', async (importOriginal) => ({
  ...await importOriginal(), usePermissions: () => ({ can: () => mocks.allowed }),
}));
vi.mock('../../../hooks/useAiTools', () => ({ default: () => ({ isEnabled: (tool) => !mocks.disabled.includes(tool) }) }));
vi.mock('../../../services/annotationSession', () => ({
  default: { addObject: vi.fn(), deleteObject: vi.fn().mockResolvedValue({}) },
}));

const model = {
  registry_key: 'cellpose', task: 'instance-segmentation', name: 'Cellpose-SAM',
  classes: [{ key: 'polyp' }], class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 43 }],
};
const yolo = { ...model, registry_key: 'yolo', name: 'YOLO' };
const suggestion = { registry_key: 'sam', name: 'SAM', task: 'instance-suggestion' };
const crossImage = { registry_key: 'sam-cross', name: 'SAM across images', task: 'cross-image-suggestion' };
const parent = { id: 100, contour_id: 100, labelId: 41, label: 'Coral', x: [0, 1, 1, 0], y: [0, 0, 1, 1] };
const prediction = { x: [.2, .3, .3, .2], y: [.2, .2, .3, .3], label_id: 43, parent_id: 100, confidence: .9 };
let flow;
function Probe() { flow = useConceptSegmentation(); return null; }
function Harness({ open = true }) {
  return <ConceptSegmentationProvider><Probe />{open && <ConceptSegmentationPanel />}</ConceptSegmentationProvider>;
}
const segment = () => screen.getByRole('button', { name: 'Segment Coral Polyp' });
const ready = async () => waitFor(() => expect(segment()).toBeEnabled());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.policy = { bindings: [] }; mocks.allowed = true; mocks.disabled = []; mocks.datasetId = 15;
  annotationSession.currentImageId = 385;
  useAnnotationStore.setState({
    ...initialState,
    workspace: { ...initialState.workspace, activeLabelId: 43 },
    images: { ...initialState.images, currentImageId: 385, imageObject: { width: 1000, height: 800 } },
    focusMode: { ...initialState.focusMode, active: true, objectId: 100 },
    objects: { ...initialState.objects, list: [parent], selected: [100], labelDatasetId: 15,
      datasetLabels: [{ id: 41, name: 'Coral', parent_id: null }, { id: 43, name: 'Coral Polyp', parent_id: 41 }],
      datasetLabelsMap: new Map([[41, 'Coral'], [43, 'Coral Polyp']]),
    },
  });
  api.getInferenceModelCatalog.mockResolvedValue({ models: [model, yolo, suggestion, crossImage] });
  api.startInferenceJob.mockResolvedValue({ id: 991, status: 'succeeded' });
  api.getInferenceJobItems.mockResolvedValue([{ image_id: 385, predictions: { contours: [prediction] } }]);
  api.streamInferenceJob.mockReturnValue({ abort: vi.fn() });
  annotationSession.addObject.mockResolvedValue({ type: 'object_added', success: true, data: { contour_id: 200 } });
});

describe('shared per-label concept workflow', () => {
  it('offers one action per label and saves directly with hierarchy and mapped provenance', async () => {
    render(<Harness />); await ready();
    expect(screen.getAllByRole('button', { name: /^Segment / })).toHaveLength(2);
    expect(screen.queryByRole('checkbox', { name: 'Use hierarchy for Coral' })).not.toBeInTheDocument();
    fireEvent.click(segment());
    await waitFor(() => expect(annotationSession.addObject).toHaveBeenCalledWith(
      prediction.x, prediction.y, 'Coral Polyp', 100, .9, 43,
      { addedBy: 'cellpose', modelKey: 'cellpose', source: 'instance_segmentation' },
    ));
    expect(api.startInferenceJob.mock.calls[0][0].steps[0]).toMatchObject({
      task: 'instance-segmentation', model_registry_key: 'cellpose', label_id: 43, use_hierarchy: true, roi_contour_ids: [100],
    });
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
  });
  it('requires parents with hierarchy on, and explicitly permits whole-image inference when off', async () => {
    useAnnotationStore.setState((state) => { state.objects.list = []; });
    render(<Harness />);
    await screen.findByText('Annotate an eligible parent first, or turn off Use hierarchy.');
    expect(segment()).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use hierarchy for Coral Polyp' }));
    fireEvent.click(segment());
    await waitFor(() => expect(api.startInferenceJob).toHaveBeenCalledTimes(1));
    expect(api.startInferenceJob.mock.calls[0][0].steps[0]).toMatchObject({ use_hierarchy: false });
    expect(api.startInferenceJob.mock.calls[0][0].steps[0]).not.toHaveProperty('roi_contour_ids');
  });
  it.each([[suggestion, 'instance_suggestion'], [crossImage, 'cross_image']])('resolves $task internally and saves its real source', async (selectedModel, source) => {
    mocks.policy = { bindings: [{ task: selectedModel.task, label_id: 43, model_registry_key: selectedModel.registry_key, inputs: { parameters: { threshold: .7 } } }] };
    render(<Harness />); await ready(); fireEvent.click(segment());
    await waitFor(() => expect(annotationSession.addObject).toHaveBeenCalled());
    expect(api.startInferenceJob.mock.calls[0][0].steps[0]).toMatchObject({
      task: selectedModel.task, model_registry_key: selectedModel.registry_key, inputs: { parameters: { threshold: .7 } },
    });
    expect(annotationSession.addObject.mock.calls[0][6]).toEqual({ addedBy: selectedModel.registry_key, modelKey: selectedModel.registry_key, source });
  });
  it('switches Cellpose to YOLO without leaving focus, even after a result is selected', async () => {
    render(<Harness />); await ready(); fireEvent.click(segment());
    await waitFor(() => expect(flow.runner.status).toBe('done'));
    act(() => { useAnnotationStore.setState((state) => { state.objects.selected = [200]; state.objects.list.push({ id: 200, contour_id: 200, labelId: 43, parent_id: 100 }); }); });
    fireEvent.change(screen.getByRole('combobox', { name: 'Model for Coral Polyp' }), { target: { value: 'instance-segmentation:yolo' } });
    fireEvent.click(segment());
    await screen.findByRole('button', { name: 'Patch and run' });
    fireEvent.click(screen.getByRole('button', { name: 'Patch and run' }));
    await waitFor(() => expect(api.startInferenceJob).toHaveBeenCalledTimes(2));
    expect(api.startInferenceJob.mock.calls[1][0].steps[0]).toMatchObject({ model_registry_key: 'yolo', roi_contour_ids: [100] });
  });
  it('warns only for existing target-label objects in scope and honors cancellation', async () => {
    useAnnotationStore.setState((state) => { state.objects.list.push({ id: 201, contour_id: 201, labelId: 43, parent_id: 100 }); });
    render(<Harness />); await ready(); fireEvent.click(segment());
    await screen.findByRole('button', { name: 'Override and run' });
    expect(screen.getByText(/replaces Coral Polyp objects in the inference area/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.startInferenceJob).not.toHaveBeenCalled();
  });
  it('retries only failed saves with the original model after settings change', async () => {
    api.getInferenceJobItems.mockResolvedValue([{ image_id: 385, predictions: { contours: [
      prediction, { ...prediction, x: [.5, .6, .6, .5] },
    ] } }]);
    annotationSession.addObject.mockResolvedValueOnce({ success: true, data: { contour_id: 200 } })
      .mockRejectedValueOnce(new Error('Save failed'))
      .mockResolvedValueOnce({ success: true, data: { contour_id: 201 } });
    render(<Harness />); await ready(); fireEvent.click(segment());
    await waitFor(() => expect(flow.runner.status).toBe('failed'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Model for Coral Polyp' }), { target: { value: 'instance-segmentation:yolo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(flow.runner.status).toBe('done'));
    expect(annotationSession.addObject).toHaveBeenCalledTimes(3);
    expect(annotationSession.addObject.mock.calls[2][6].modelKey).toBe('cellpose');
    expect(api.startInferenceJob).toHaveBeenCalledTimes(1);
    expect(annotationSession.deleteObject).not.toHaveBeenCalled();
  });
  it('retains jobs and settings across drawer closure, blocks competing runs, and rejects late results after navigation', async () => {
    let finish;
    api.startInferenceJob.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { rerender } = render(<Harness />); await ready();
    fireEvent.change(screen.getByRole('combobox', { name: 'Model for Coral Polyp' }), { target: { value: 'instance-segmentation:yolo' } });
    fireEvent.click(segment());
    await waitFor(() => expect(api.startInferenceJob).toHaveBeenCalledTimes(1));
    rerender(<Harness open={false} />);
    expect(flow.busy).toBe(true);
    expect(useAnnotationStore.getState().models.isRunningInstance).toBe(true);
    act(() => { expect(flow.requestRun(43)).toBe(false); });
    rerender(<Harness />);
    expect(screen.getByRole('combobox', { name: 'Model for Coral Polyp' })).toHaveValue('instance-segmentation:yolo');
    act(() => { annotationSession.currentImageId = 386; useAnnotationStore.setState((state) => { state.images.currentImageId = 386; }); });
    await act(async () => { finish({ id: 991, status: 'succeeded' }); });
    expect(annotationSession.addObject).not.toHaveBeenCalled();
    expect(api.cancelInferenceJob).toHaveBeenCalledWith(991);
    expect(useAnnotationStore.getState().models.isRunningInstance).toBe(false);
  });
  it('keeps session overrides per label, then clears them on a dataset change', async () => {
    const { rerender } = render(<Harness />); await ready();
    fireEvent.change(screen.getByRole('combobox', { name: 'Model for Coral Polyp' }), { target: { value: 'instance-segmentation:yolo' } });
    expect(screen.getByRole('combobox', { name: 'Model for Coral' })).toHaveValue('');
    mocks.datasetId = 16; rerender(<Harness />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Model for Coral Polyp' })).toHaveValue(''));
  });
  it('does not offer models from disabled tools or dispatch without annotation permission', async () => {
    mocks.allowed = false; mocks.disabled = ['instance_segmentation'];
    render(<Harness />);
    await waitFor(() => expect(flow.loading).toBe(false));
    expect(segment()).toBeDisabled();
    expect(flow.models.map((entry) => entry.registry_key)).toEqual(['sam', 'sam-cross']);
    act(() => { expect(flow.requestRun(43)).toBe(false); });
    expect(api.startInferenceJob).not.toHaveBeenCalled();
  });
  it('omits unsupported tasks and unready providers from label settings', async () => {
    api.getInferenceModelCatalog.mockResolvedValue({ models: [model,
      { registry_key: 'prompted', name: 'Prompted only', task: 'prompted-segmentation' },
      { ...yolo, status: 'not_ready' },
    ] });
    render(<Harness />); await ready();
    expect(flow.models).toEqual([model]);
    expect(screen.queryByRole('option', { name: 'Prompted only' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'YOLO' })).not.toBeInTheDocument();
  });
  it('disables segmentation with an explicit reason before an image is loaded', async () => {
    useAnnotationStore.setState((state) => { state.images.currentImageId = null; state.images.imageObject = null; });
    render(<Harness />);
    await waitFor(() => expect(flow.loading).toBe(false));
    expect(segment()).toBeDisabled();
    expect(flow.getLabelState(43).reason).toBe('Load an image before segmenting.');
    act(() => { expect(flow.requestRun(43)).toBe(false); });
    expect(api.startInferenceJob).not.toHaveBeenCalled();
  });
});
