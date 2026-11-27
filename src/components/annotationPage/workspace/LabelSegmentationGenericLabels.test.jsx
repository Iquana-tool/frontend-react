import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { initialState } from '../../../stores/initialState';
import * as api from '../../../api/inference';
import annotationSession from '../../../services/annotationSession';
import { LabelSegmentationProvider, useLabelSegmentation } from './LabelSegmentationContext';
import LabelSegmentationPanel from './LabelSegmentationPanel';
import { getLabelParentIds, isLabelModelCompatible } from './labelSegmentationModel';

const mocks = vi.hoisted(() => ({ datasetId: 81, policy: { bindings: [] } }));
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
  ...await importOriginal(), usePermissions: () => ({ can: () => true }),
}));
vi.mock('../../../hooks/useAiTools', () => ({ default: () => ({ isEnabled: () => true }) }));
vi.mock('../../../services/annotationSession', () => ({
  default: { addObject: vi.fn().mockResolvedValue({ success: true, data: { contour_id: 1900 } }), deleteObject: vi.fn().mockResolvedValue({}) },
}));

const labels = [
  { id: 910, name: 'Component', color: '#10b981', parent_id: null },
  { id: 931, name: 'Surface', color: '#6366f1', parent_id: 910 },
  { id: 964, name: 'Defect', color: '#ef4444', parent_id: 931 },
  { id: 989, name: 'Debris', color: '#f59e0b', parent_id: null },
];
const objects = [
  { id: 1201, contour_id: 1201, labelId: 910, parent_id: null },
  { id: 1202, contour_id: 1202, labelId: 931, parent_id: 1201 },
  { id: 1203, contour_id: 1203, labelId: 931, parent_id: 1201 },
  { id: 1301, contour_id: 1301, labelId: 910, parent_id: null },
  { id: 1302, contour_id: 1302, labelId: 931, parent_id: 1301 },
  { id: 1303, contour_id: 1303, labelId: 931, parent_id: 1301 },
  { id: 1401, contour_id: 1401, labelId: 989, parent_id: null },
];
const generic = {
  registry_key: 'generic-segmentation', name: 'Generic segmenter', task: 'instance-segmentation',
};
const defectModel = {
  registry_key: 'defect-segmenter', name: 'Defect segmenter', task: 'instance-segmentation',
  classes: [{ key: 'defect' }], class_mappings: [{ model_class: 'defect', action: 'map', label_id: 964 }],
};
const polypModel = {
  registry_key: 'yolo_polyp_v3_c_seed1', name: 'YOLO11m-seg · Polyp', task: 'instance-segmentation',
  classes: [{ key: 'polyp' }], class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 43 }],
};
let flow;
function Probe() { flow = useLabelSegmentation(); return null; }
function Harness() {
  return <LabelSegmentationProvider><Probe /><LabelSegmentationPanel /></LabelSegmentationProvider>;
}

const selectLabel = (name) => {
  const chip = screen.getByRole('button', { name: /Selected label:/i });
  if (!chip.getAttribute('aria-label')?.includes(`Selected label: ${name}.`)) {
    fireEvent.click(chip);
    const option = screen.getByRole('option', { name });
    fireEvent.click(option);
  }
};
const button = (name) => {
  selectLabel(name);
  return screen.getByRole('button', { name: `Segment ${name}` });
};
const openSettings = (name) => {
  if (name) selectLabel(name);
  const btn = screen.getByRole('button', { name: name ? `Settings for ${name}` : /^Settings for / });
  if (btn.getAttribute('aria-expanded') !== 'true') fireEvent.click(btn);
  return btn;
};
const ready = () => waitFor(() => expect(flow.loading).toBe(false));
const setLabels = (next) => useAnnotationStore.setState((state) => {
  state.objects.datasetLabels = next;
  state.objects.datasetLabelsMap = new Map(next.map((label) => [label.id, label.name]));
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.datasetId = 81;
  mocks.policy = { bindings: [] };
  annotationSession.currentImageId = 1801;
  useAnnotationStore.setState({
    ...initialState,
    workspace: { ...initialState.workspace, activeLabelId: 964 },
    images: { ...initialState.images, currentImageId: 1801, imageObject: { width: 1000, height: 800 } },
    focusMode: { ...initialState.focusMode, active: true, objectId: 1201 },
    objects: { ...initialState.objects, list: structuredClone(objects), selected: [], labelDatasetId: 81,
      datasetLabels: structuredClone(labels), datasetLabelsMap: new Map(labels.map((label) => [label.id, label.name])),
    },
  });
  api.getInferenceModelCatalog.mockResolvedValue({ models: [defectModel, generic, polypModel] });
  api.startInferenceJob.mockResolvedValue({ id: 1901, status: 'succeeded' });
  api.getInferenceJobItems.mockResolvedValue([]);
  api.streamInferenceJob.mockReturnValue({ abort: vi.fn() });
});

describe('dataset-driven concept controls for non-coral labels', () => {
  it('renders exactly one control and the label color for each dataset label', async () => {
    render(<Harness />); await ready();
    expect(screen.getByRole('button', { name: 'Segment Defect' })).toBeEnabled();
    const chip = screen.getByRole('button', { name: /Selected label: Defect\./i });
    expect(chip.querySelector('span[aria-hidden]')).toHaveStyle({ backgroundColor: '#ef4444' });

    // Open picker and verify all dataset labels are present with their respective colors
    fireEvent.click(chip);
    for (const label of labels) {
      const option = screen.getByRole('option', { name: label.name });
      expect(option.querySelector('span[aria-hidden]')).toHaveStyle({ backgroundColor: label.color });
    }
    fireEvent.click(screen.getByRole('option', { name: 'Component' }));

    openSettings('Component');
    expect(screen.getByRole('checkbox', { name: 'Use hierarchy for Component' })).toBeChecked();
    openSettings('Debris');
    expect(screen.getByRole('checkbox', { name: 'Use hierarchy for Debris' })).toBeChecked();
    expect(screen.queryByText(/coral/i)).not.toBeInTheDocument();
  });

  it('reflects rename, addition and removal from the label store without reloading the image', async () => {
    render(<Harness />); await ready();
    act(() => setLabels(labels.map((label) => label.id === 964 ? { ...label, name: 'Crack', color: '#ff0000' } : label)));
    expect(screen.queryByRole('button', { name: 'Segment Defect' })).not.toBeInTheDocument();
    expect(button('Crack')).toBeEnabled();
    const chip = screen.getByRole('button', { name: /Selected label: Crack\./i });
    expect(chip.querySelector('span[aria-hidden]')).toHaveStyle({ backgroundColor: '#ff0000' });
    expect(flow.getLabelState(964).model.registry_key).toBe(defectModel.registry_key);

    const renamed = useAnnotationStore.getState().objects.datasetLabels;
    act(() => setLabels([...renamed, { id: 997, name: 'Scratch', parent_id: null }]));
    expect(button('Scratch')).toBeEnabled();

    act(() => setLabels(useAnnotationStore.getState().objects.datasetLabels.filter((label) => label.id !== 964)));
    expect(screen.queryByRole('button', { name: 'Segment Crack' })).not.toBeInTheDocument();
    expect(api.getInferenceModelCatalog).toHaveBeenCalledTimes(1);
  });

  it('preserves independence on reload while allowing requested parent regions', () => {
    useAnnotationStore.getState().setObjectsFromHierarchy({ root_contours: [
      { id: 1202, label_id: 931, hierarchy_enabled: false, x: [0,1,1], y: [0,0,1] },
    ] });
    expect(useAnnotationStore.getState().objects.list[0].hierarchy_enabled).toBe(false);
    expect(getLabelParentIds({ labelId: 964, labels,
      objects: objects.map((object) => ({ ...object, hierarchy_enabled: false })) })).toEqual([1202, 1203, 1302, 1303]);
  });

  it('keeps hierarchy derived from IDs after renaming every label', () => {
    const options = { labelId: 964, labels, objects, focusedContourId: 1201 };
    expect(getLabelParentIds(options)).toEqual([1202, 1203]);
    expect(getLabelParentIds({ ...options, labels: labels.map((label) => ({ ...label, name: `Renamed ${label.id}` })) })).toEqual([1202, 1203]);
    expect(getLabelParentIds({ ...options, selectedIds: [1302] })).toEqual([1302]);
    expect(getLabelParentIds({ ...options, selectedIds: [1401, 'draft-surface'] })).toEqual([1202, 1203]);
    expect(getLabelParentIds({ ...options, labelId: 910 })).toEqual([]);
  });

  it('submits a mapped non-coral target with selected parent IDs instead of the focused sibling branch', async () => {
    useAnnotationStore.setState((state) => {
      state.objects.selected = [1302];
      state.objects.list = state.objects.list.filter((object) => object.labelId !== 964);
    });
    render(<Harness />); await ready();
    fireEvent.click(button('Defect'));
    await waitFor(() => expect(api.startInferenceJob).toHaveBeenCalledTimes(1));
    expect(api.startInferenceJob.mock.calls[0][0]).toMatchObject({
      dataset_id: 81, image_ids: [1801],
      steps: [{ model_registry_key: defectModel.registry_key, label_id: 964, use_hierarchy: true, roi_contour_ids: [1302] }],
    });
    await waitFor(() => expect(flow.runner.status).toBe('done'));
  });

  it('removes hierarchy scope when a child becomes root even while another object remains focused', async () => {
    render(<Harness />); await ready();
    expect(flow.getLabelState(964).parentContourIds).toEqual([1202, 1203]);
    act(() => setLabels(labels.map((label) => label.id === 964 ? { ...label, parent_id: null } : label)));
    openSettings('Defect');
    expect(screen.getByRole('checkbox', { name: 'Use hierarchy for Defect' })).toBeChecked();
    expect(flow.getLabelState(964)).toMatchObject({ useHierarchy: true, parentContourIds: [] });
  });

  it('does not offer the polyp checkpoint as an implicit fallback for a Defect label', async () => {
    api.getInferenceModelCatalog.mockResolvedValue({ models: [polypModel] });
    render(<Harness />); await ready();
    expect(button('Defect')).toBeDisabled();
    expect(flow.getLabelState(964).model).toBeNull();
    expect(flow.getLabelState(964).reason).toMatch(/mapped to this label/);
    act(() => { expect(flow.requestRun(964)).toBe(false); });
    expect(api.startInferenceJob).not.toHaveBeenCalled();
  });

  it('honors per-class mappings and discard actions for multiple arbitrary labels', () => {
    const model = { ...defectModel,
      classes: [{ key: 'component' }, { key: 'defect' }, { key: 'debris' }],
      label_ids: [910, 964, 989],
      class_mappings: [
        { model_class: 'component', action: 'map', label_id: 910 },
        { model_class: 'defect', action: 'map', label_id: 964 },
        { model_class: 'debris', action: 'discard', label_id: 989 },
      ],
    };
    expect(isLabelModelCompatible(model, 910)).toBe(true);
    expect(isLabelModelCompatible(model, 964)).toBe(true);
    expect(isLabelModelCompatible(model, 989)).toBe(false);
    expect(isLabelModelCompatible(model, 927)).toBe(false);
    expect(isLabelModelCompatible({ ...model, class_mappings: [{ model_class: 'defect', action: 'unmapped', label_id: 964 }] }, 964)).toBe(false);
  });

  it('clears a per-label override when switching to a different dataset and taxonomy', async () => {
    const { rerender } = render(<Harness />); await ready();
    act(() => flow.updateSettings(964, { model: 'instance-segmentation:generic-segmentation' }));
    expect(flow.getLabelState(964).model.registry_key).toBe(generic.registry_key);
    mocks.datasetId = 82;
    act(() => {
      setLabels([{ id: 3100, name: 'Tissue', parent_id: null }, { id: 3127, name: 'Cell', parent_id: 3100 }]);
      useAnnotationStore.setState((state) => { state.objects.list = []; state.objects.selected = []; });
      rerender(<Harness />);
    });
    await ready();
    expect(screen.queryByRole('button', { name: 'Segment Defect' })).not.toBeInTheDocument();
    expect(button('Tissue')).toBeEnabled();
    expect(button('Cell')).toBeDisabled();
    expect(flow.getLabelState(3127).reason).toBe('No eligible Tissue objects in the current scope.');
    expect(flow.getLabelState(3127).useHierarchy).toBe(true);
    expect(flow.getLabelState(3127).parentContourIds).toEqual([]);
    expect(flow.getLabelState(3127).setting).toEqual({});
    expect(api.getInferenceModelCatalog).toHaveBeenLastCalledWith(82);
  });

  it('rejects programmatic runs for a deleted target instead of picking a remaining label', async () => {
    render(<Harness />); await ready();
    act(() => setLabels(labels.filter((label) => label.id !== 964)));
    act(() => { expect(flow.requestRun(964)).toBe(false); });
    expect(api.startInferenceJob).not.toHaveBeenCalled();
  });
});
