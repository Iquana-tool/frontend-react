import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { initialState } from '../../../stores/initialState';
import * as api from '../../../api/inference';
import annotationSession from '../../../services/annotationSession';
import { LabelSegmentationProvider, useLabelSegmentation } from './LabelSegmentationContext';
import LabelSegmentationPanel from './LabelSegmentationPanel';

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
  description: 'Detects individual polyps within the selected region.',
  input_contract: { parameters: [{ key: 'threshold', label: 'Confidence threshold', min_value: 0, max_value: 1, step: 0.05, default_value: 0.5 }] },
  classes: [{ key: 'polyp' }], class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 43 }],
};
const yolo = { ...model, registry_key: 'yolo', name: 'YOLO' };
const suggestion = { registry_key: 'sam', name: 'SAM', task: 'instance-suggestion' };
const sam3SameImage = { registry_key: 'sam3', name: 'SAM 3', task: 'instance-suggestion', classes: [{ key: 'polyp' }], class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 43 }] };
const sam3OtherImages = { registry_key: 'sam3', name: 'SAM 3', task: 'cross-image-suggestion', classes: [{ key: 'polyp' }], class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 43 }] };
const hierarchicalSuggestion = {
  registry_key: 'sam3_hierarchical', name: 'SAM 3 (hierarchy-aware)', task: 'instance-suggestion',
  classes: [{ key: 'polyp' }], class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 43 }],
  input_contract: { conditioning: { kind: 'instances', min_units: 1 } },
};
const crossImage = { registry_key: 'sam-cross', name: 'SAM across images', task: 'cross-image-suggestion' };
const parent = { id: 100, contour_id: 100, labelId: 41, label: 'Coral', x: [0, 1, 1, 0], y: [0, 0, 1, 1] };
const prediction = { x: [.2, .3, .3, .2], y: [.2, .2, .3, .3], label_id: 43, parent_id: 100, confidence: .9 };
let flow;
function Probe() { flow = useLabelSegmentation(); return null; }
function Harness({ open = true }) {
  return <LabelSegmentationProvider><Probe />{open && <LabelSegmentationPanel />}</LabelSegmentationProvider>;
}
const segment = () => screen.getByRole('button', { name: 'Segment Coral Polyp' });
const ready = async () => waitFor(() => expect(segment()).toBeEnabled());
const settingsButton = (label) => screen.getByRole('button', { name: `Settings for ${label}` });
const openSettings = (label) => {
  const button = settingsButton(label);
  if (button.getAttribute('aria-expanded') !== 'true') fireEvent.click(button);
  return button;
};
const modelSelect = (label) => {
  openSettings(label);
  return screen.getByRole('combobox', { name: `Model for ${label}` });
};

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

describe('shared per-label segmentation workflow', () => {
  it('uses all three independently saved parents when hierarchy is requested for a child', async () => {
    useAnnotationStore.setState((state) => {
      state.focusMode = { ...initialState.focusMode, active: false, objectId: null };
      state.objects.list = [100, 101, 102].map((id) => ({
        ...parent, id, contour_id: id, hierarchy_enabled: false,
      }));
      state.objects.selected = [];
    });
    render(<Harness />); await ready();
    expect(screen.getByRole('checkbox', { name: 'Use hierarchy for Coral Polyp' })).toBeChecked();
    expect(screen.getByText('Runs inside 3 Coral objects')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Segment Coral Polyp' }));
    await waitFor(() => expect(api.startInferenceJob).toHaveBeenCalledTimes(1));
    expect(api.startInferenceJob.mock.calls[0][0].steps[0]).toMatchObject({
      use_hierarchy: true, roi_contour_ids: [100, 101, 102],
    });
    await waitFor(() => expect(annotationSession.addObject).toHaveBeenCalledTimes(1));
    expect(annotationSession.addObject.mock.calls[0][3]).toBe(100);
    expect(useAnnotationStore.getState().objects.list.filter((o) => o.labelId === 41)
      .every((o) => o.hierarchy_enabled === false)).toBe(true);
  });

  it.each([true, false])('runs root whole-image and saves hierarchy choice %s', async (enabled) => {
    api.getInferenceModelCatalog.mockResolvedValue({ models: [{ ...model,
      class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 41 }] }] });
    api.getInferenceJobItems.mockResolvedValue([{ status: 'done', image_id: 385,
      predictions: { contours: [{ ...prediction, label_id: 41, parent_id: null }] } }]);
    useAnnotationStore.setState((state) => { state.objects.list = []; });
    render(<Harness />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Segment Coral' })).toBeEnabled());
    const checkbox = screen.getByRole('checkbox', { name: 'Use hierarchy for Coral' });
    expect(checkbox).toBeChecked();
    if (!enabled) fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Segment Coral' }));
    await waitFor(() => expect(annotationSession.addObject).toHaveBeenCalledTimes(1));
    expect(api.startInferenceJob.mock.calls[0][0].steps[0]).toMatchObject({ use_hierarchy: enabled, label_id: 41 });
    expect(api.startInferenceJob.mock.calls[0][0].steps[0].roi_contour_ids || []).toEqual([]);
    expect(annotationSession.addObject.mock.calls[0][3]).toBeNull();
    expect(annotationSession.addObject.mock.calls[0][6].useHierarchy).toBe(enabled);
    expect(checkbox.checked).toBe(enabled);
  });

  it('saves a child independently despite a returned parent ID', async () => {
    render(<Harness />); await ready();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use hierarchy for Coral Polyp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Segment Coral Polyp' }));
    await waitFor(() => expect(annotationSession.addObject).toHaveBeenCalledTimes(1));
    expect(annotationSession.addObject.mock.calls[0][3]).toBeNull();
    expect(annotationSession.addObject.mock.calls[0][6].useHierarchy).toBe(false);
  });

  it('starts with independent collapsed settings while keeping Segment available', async () => {
    render(<Harness />); await ready();
    const polypSettings = settingsButton('Coral Polyp');
    const coralSettings = settingsButton('Coral');
    expect(polypSettings).toHaveAttribute('aria-expanded', 'false');
    expect(coralSettings).toHaveAttribute('aria-expanded', 'false');
    const polypPanelId = polypSettings.getAttribute('aria-controls');
    const coralPanelId = coralSettings.getAttribute('aria-controls');
    expect(polypPanelId).toBeTruthy();
    expect(coralPanelId).toBeTruthy();
    expect(polypPanelId).not.toBe(coralPanelId);
    expect(document.getElementById(polypPanelId)).toBeInTheDocument();
    expect(document.getElementById(coralPanelId)).toBeInTheDocument();
    expect(segment()).toBeEnabled();
    expect(screen.queryByRole('combobox', { name: 'Model for Coral Polyp' })).not.toBeInTheDocument();

    fireEvent.click(polypSettings);
    expect(polypSettings).toHaveAttribute('aria-expanded', 'true');
    expect(coralSettings).toHaveAttribute('aria-expanded', 'false');
    expect(modelSelect('Coral Polyp')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Threshold for Coral Polyp' })).toHaveValue(0.5);
    expect(screen.getByText(model.description)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Model for Coral' })).not.toBeInTheDocument();
    expect(segment()).toBeEnabled();

    fireEvent.change(modelSelect('Coral Polyp'), { target: { value: 'instance-segmentation:yolo' } });
    expect(screen.getByText('YOLO', { selector: 'span' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Threshold for Coral Polyp' }), { target: { value: '0.8' } });
    fireEvent.click(polypSettings);
    expect(polypSettings).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('YOLO', { selector: 'span' })).toBeInTheDocument();
    expect(segment()).toBeEnabled();
    fireEvent.click(polypSettings);
    expect(modelSelect('Coral Polyp')).toHaveValue('instance-segmentation:yolo');
    expect(screen.getByRole('spinbutton', { name: 'Threshold for Coral Polyp' })).toHaveValue(0.8);
  });

  it('marks only a dataset policy selection as Dataset default', async () => {
    const { rerender } = render(<Harness />); await ready();
    expect(screen.queryByText('Dataset default', { exact: true, selector: 'span' })).not.toBeInTheDocument();

    mocks.policy = { bindings: [{ task: 'instance-segmentation', label_id: null, model_registry_key: 'cellpose' }] };
    rerender(<Harness />); await ready();
    expect(screen.getByText('Dataset default', { exact: true, selector: 'span' })).toBeInTheDocument();

    fireEvent.change(modelSelect('Coral Polyp'), { target: { value: 'instance-segmentation:cellpose' } });
    expect(screen.queryByText('Dataset default', { exact: true, selector: 'span' })).not.toBeInTheDocument();
    fireEvent.change(modelSelect('Coral Polyp'), { target: { value: '' } });
    expect(screen.getByText('Dataset default', { exact: true, selector: 'span' })).toBeInTheDocument();
  });

  it('requires a saved same-label instance before running an instance-conditioned suggestion model', async () => {
    api.getInferenceModelCatalog.mockResolvedValue({ models: [model, yolo, suggestion, hierarchicalSuggestion, crossImage] });
    mocks.policy = { bindings: [{
      task: 'instance-suggestion', label_id: 43, model_registry_key: 'sam3_hierarchical',
      inputs: { conditioning: { kind: 'instances', min_units: 1 } },
    }] };
    render(<Harness />);
    const reason = 'Annotate and save at least 1 Coral Polyp example on this image before using SAM 3 (hierarchy-aware).';
    await screen.findByText(reason);
    expect(segment()).toBeDisabled();
    expect(flow.getLabelState(43).reason).toBe(reason);
    act(() => { expect(flow.requestRun(43)).toBe(false); });
    expect(api.startInferenceJob).not.toHaveBeenCalled();

    act(() => {
      useAnnotationStore.setState((state) => {
        state.objects.list.push({ id: 101, contour_id: 101, labelId: 43, parent_id: 100, temporary: true });
      });
    });
    expect(segment()).toBeDisabled();
    act(() => {
      useAnnotationStore.setState((state) => {
        state.objects.list.push({ id: 102, contour_id: 102, labelId: 43, parent_id: 100 });
      });
    });
    await waitFor(() => expect(segment()).toBeEnabled());
    expect(screen.queryByText(reason)).not.toBeInTheDocument();
  });

  it('disambiguates same-named models by task without changing their routing identities', async () => {
    api.getInferenceModelCatalog.mockResolvedValue({ models: [sam3SameImage, sam3OtherImages] });
    api.getInferenceJobItems.mockResolvedValue([]);
    mocks.policy = { bindings: [{
      task: 'instance-suggestion', label_id: 43, model_registry_key: 'sam3',
    }] };
    render(<Harness />); await ready();

    const select = modelSelect('Coral Polyp');
    expect(screen.getByRole('option', { name: 'SAM 3 · This image' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'SAM 3 · Other images' })).toBeInTheDocument();
    expect(select).toHaveValue('');
    expect(screen.getByText('SAM 3 · This image', { selector: 'span' })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'cross-image-suggestion:sam3' } });
    fireEvent.click(settingsButton('Coral Polyp'));
    expect(screen.getByText('SAM 3 · Other images', { selector: 'span' })).toBeInTheDocument();
    fireEvent.click(segment());
    await waitFor(() => expect(api.startInferenceJob).toHaveBeenCalledTimes(1));
    expect(api.startInferenceJob.mock.calls[0][0].steps[0]).toMatchObject({
      task: 'cross-image-suggestion', model_registry_key: 'sam3', label_id: 43,
    });
    await waitFor(() => expect(flow.runner.status).toBe('done'));

    fireEvent.change(modelSelect('Coral Polyp'), { target: { value: 'instance-suggestion:sam3' } });
    fireEvent.click(settingsButton('Coral Polyp'));
    expect(screen.getByText('SAM 3 · This image', { selector: 'span' })).toBeInTheDocument();
    fireEvent.click(segment());
    await waitFor(() => expect(api.startInferenceJob).toHaveBeenCalledTimes(2));
    expect(api.startInferenceJob.mock.calls[1][0].steps[0]).toMatchObject({
      task: 'instance-suggestion', model_registry_key: 'sam3', label_id: 43,
    });
  });

  it('offers one action per label and saves directly with hierarchy and mapped provenance', async () => {
    render(<Harness />); await ready();
    expect(screen.getAllByRole('button', { name: /^Segment / })).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: 'Use hierarchy for Coral' })).toBeChecked();
    fireEvent.click(segment());
    await waitFor(() => expect(annotationSession.addObject).toHaveBeenCalledWith(
      prediction.x, prediction.y, 'Coral Polyp', 100, .9, 43,
      { useHierarchy: true, addedBy: 'cellpose', modelKey: 'cellpose', source: 'instance_segmentation' },
    ));
    expect(api.startInferenceJob.mock.calls[0][0].steps[0]).toMatchObject({
      task: 'instance-segmentation', model_registry_key: 'cellpose', label_id: 43, use_hierarchy: true, roi_contour_ids: [100],
    });
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
  });
  it('defaults hierarchy off with no parents, and explains missing scope if explicitly enabled', async () => {
    useAnnotationStore.setState((state) => { state.objects.list = []; });
    render(<Harness />);
    await screen.findByText('Runs on the whole image; saves independent objects');
    expect(screen.getByRole('checkbox', { name: 'Use hierarchy for Coral Polyp' })).not.toBeChecked();
    expect(segment()).toBeEnabled();

    // Explicitly enable hierarchy when no parents exist:
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use hierarchy for Coral Polyp' }));
    await screen.findByText(/No eligible Coral objects in the current scope/);
    expect(segment()).toBeDisabled();

    // Click direct "Run on whole image" action:
    fireEvent.click(screen.getByRole('button', { name: 'Run on whole image' }));
    await waitFor(() => expect(api.startInferenceJob).toHaveBeenCalledTimes(1));
    expect(api.startInferenceJob.mock.calls[0][0].steps[0]).toMatchObject({ use_hierarchy: false });
    expect(api.startInferenceJob.mock.calls[0][0].steps[0]).not.toHaveProperty('roi_contour_ids');
  });
  it('revalidates permissions before running on the whole image and blocks dispatch if denied', async () => {
    useAnnotationStore.setState((state) => { state.objects.list = []; });
    render(<Harness />);
    await screen.findByText('Runs on the whole image; saves independent objects');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use hierarchy for Coral Polyp' }));
    await screen.findByText(/No eligible Coral objects in the current scope/);

    mocks.allowed = false;
    fireEvent.click(screen.getByRole('button', { name: 'Run on whole image' }));
    expect(api.startInferenceJob).not.toHaveBeenCalled();
  });
  it('revalidates required conditioning examples before running on the whole image and blocks dispatch if missing', async () => {
    api.getInferenceModelCatalog.mockResolvedValue({ models: [hierarchicalSuggestion] });
    mocks.policy = { bindings: [{ task: hierarchicalSuggestion.task, label_id: 43, model_registry_key: hierarchicalSuggestion.registry_key }] };
    useAnnotationStore.setState((state) => { state.objects.list = []; });
    render(<Harness />);
    await screen.findByText('Runs on the whole image; saves independent objects');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use hierarchy for Coral Polyp' }));
    await screen.findByText(/No eligible Coral objects in the current scope/);

    fireEvent.click(screen.getByRole('button', { name: 'Run on whole image' }));
    expect(api.startInferenceJob).not.toHaveBeenCalled();
    await screen.findByText(/Annotate and save at least 1 Coral Polyp example/);
  });
  it('distinguishes scope when parents exist elsewhere on the image and allows clearing scope', async () => {
    const fragment1 = { id: 501, contour_id: 501, labelId: 40, x: [0, 1, 1, 0], y: [0, 0, 1, 1] };
    const fragment2 = { id: 502, contour_id: 502, labelId: 40, x: [2, 3, 3, 2], y: [2, 2, 3, 3] };
    const coralUnderFragment1 = { id: 100, contour_id: 100, labelId: 41, parent_id: 501, x: [0.1, 0.9, 0.9, 0.1], y: [0.1, 0.1, 0.9, 0.9] };
    useAnnotationStore.setState({
      ...initialState,
      workspace: { ...initialState.workspace, activeLabelId: 43 },
      images: { ...initialState.images, currentImageId: 385, imageObject: { width: 1000, height: 800 } },
      focusMode: { ...initialState.focusMode, active: true, objectId: 502 },
      objects: {
        ...initialState.objects,
        list: [fragment1, fragment2, coralUnderFragment1],
        selected: [502],
        labelDatasetId: 15,
        datasetLabels: [
          { id: 40, name: 'Coral Fragment', parent_id: null },
          { id: 41, name: 'Coral', parent_id: 40 },
          { id: 43, name: 'Coral Polyp', parent_id: 41 },
        ],
        datasetLabelsMap: new Map([[40, 'Coral Fragment'], [41, 'Coral'], [43, 'Coral Polyp']]),
      },
    });
    render(<Harness />);
    await screen.findByText('Runs on the whole image; saves independent objects');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use hierarchy for Coral Polyp' }));
    await screen.findByText(/No eligible Coral objects in the current scope/);
    const clearButton = await screen.findByRole('button', { name: 'Clear scope (1 on image)' });
    expect(screen.getByRole('button', { name: 'Run on whole image' })).toBeInTheDocument();

    fireEvent.click(clearButton);
    await screen.findByText('Runs inside 1 Coral object');
  });
  it.each([[suggestion, 'instance_suggestion'], [crossImage, 'cross_image']])('resolves $task internally and saves its real source', async (selectedModel, source) => {
    mocks.policy = { bindings: [{ task: selectedModel.task, label_id: 43, model_registry_key: selectedModel.registry_key, inputs: { parameters: { threshold: .7 } } }] };
    render(<Harness />); await ready(); fireEvent.click(segment());
    await waitFor(() => expect(annotationSession.addObject).toHaveBeenCalled());
    expect(api.startInferenceJob.mock.calls[0][0].steps[0]).toMatchObject({
      task: selectedModel.task, model_registry_key: selectedModel.registry_key, inputs: { parameters: { threshold: .7 } },
    });
    expect(annotationSession.addObject.mock.calls[0][6]).toEqual({ useHierarchy: true, addedBy: selectedModel.registry_key, modelKey: selectedModel.registry_key, source });
  });
  it('switches Cellpose to YOLO without leaving focus, even after a result is selected', async () => {
    render(<Harness />); await ready(); fireEvent.click(segment());
    await waitFor(() => expect(flow.runner.status).toBe('done'));
    act(() => { useAnnotationStore.setState((state) => { state.objects.selected = [200]; state.objects.list.push({ id: 200, contour_id: 200, labelId: 43, parent_id: 100 }); }); });
    fireEvent.change(modelSelect('Coral Polyp'), { target: { value: 'instance-segmentation:yolo' } });
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
    fireEvent.change(modelSelect('Coral Polyp'), { target: { value: 'instance-segmentation:yolo' } });
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
    fireEvent.change(modelSelect('Coral Polyp'), { target: { value: 'instance-segmentation:yolo' } });
    fireEvent.click(segment());
    await waitFor(() => expect(api.startInferenceJob).toHaveBeenCalledTimes(1));
    rerender(<Harness open={false} />);
    expect(flow.busy).toBe(true);
    expect(useAnnotationStore.getState().models.isRunningInstance).toBe(true);
    act(() => { expect(flow.requestRun(43)).toBe(false); });
    rerender(<Harness />);
    expect(modelSelect('Coral Polyp')).toHaveValue('instance-segmentation:yolo');
    act(() => { annotationSession.currentImageId = 386; useAnnotationStore.setState((state) => { state.images.currentImageId = 386; }); });
    await act(async () => { finish({ id: 991, status: 'succeeded' }); });
    expect(annotationSession.addObject).not.toHaveBeenCalled();
    expect(api.cancelInferenceJob).toHaveBeenCalledWith(991);
    expect(useAnnotationStore.getState().models.isRunningInstance).toBe(false);
  });
  it('keeps session overrides per label, then clears them on a dataset change', async () => {
    const { rerender } = render(<Harness />); await ready();
    fireEvent.change(modelSelect('Coral Polyp'), { target: { value: 'instance-segmentation:yolo' } });
    expect(modelSelect('Coral')).toHaveValue('');
    mocks.datasetId = 16; rerender(<Harness />);
    await waitFor(() => expect(modelSelect('Coral Polyp')).toHaveValue(''));
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
