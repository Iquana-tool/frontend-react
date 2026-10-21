import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useAnnotationServices, { clearManualInstanceOverrides } from './useAnnotationServices';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { initialState } from '../../../stores/initialState';
import { getInferenceRoutingPolicy, getInferenceModelCatalog } from '../../../api/inference';
import { getInstanceModels } from '../../../api/instance_segmentation';

vi.mock('../../../api/inference', () => ({
  getInferenceRoutingPolicy: vi.fn(),
  getInferenceModelCatalog: vi.fn(),
}));

vi.mock('../../../api/instance_segmentation', () => ({
  getInstanceModels: vi.fn(),
}));

vi.mock('../../../hooks/useModelSwitchPreloader', () => ({
  default: vi.fn(),
}));

vi.mock('../../../hooks/useInstanceSegmentation', () => ({
  useInstanceSegmentation: () => ({ runInstance: vi.fn() }),
}));

let mockCurrentDataset = { id: 101, name: 'Dataset 101' };

vi.mock('../../../contexts/DatasetContext', () => ({
  useDataset: () => ({
    currentDataset: mockCurrentDataset,
    datasets: [{ id: 101 }, { id: 102 }],
  }),
}));

const models = [
  { id: 'm2f-generic', name: 'Mask2Former Generic', task: 'instance-segmentation', label_ids: [] },
  { id: 'm2f-routed-default', name: 'Mask2Former Routed Default', task: 'instance-segmentation', label_ids: [] },
  { id: 'm2f-dataset102-default', name: 'Mask2Former Dataset 102 Default', task: 'instance-segmentation', label_ids: [] },
];

describe('useAnnotationServices real store integration (Bug 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearManualInstanceOverrides();
    mockCurrentDataset = { id: 101, name: 'Dataset 101' };
    useAnnotationStore.setState({
      ...initialState,
      models: { ...initialState.models, favoritesLoaded: true },
      objects: { ...initialState.objects, labelDatasetId: 101 },
    });
    getInstanceModels.mockResolvedValue({ success: true, result: models });
    getInferenceModelCatalog.mockResolvedValue({ models });
  });

  it('discovery-before-policy: dataset routing default overrides automatic first-model default selection', async () => {
    // 1. Discovery finishes first and auto-selects m2f-generic
    await useAnnotationStore.getState().fetchAvailableInstanceModels(101);
    expect(useAnnotationStore.getState().models.instanceModel).toBe('m2f-generic');
    expect(useAnnotationStore.getState().models.autoSelectedInstanceModel).toBe('m2f-generic');

    // 2. Policy resolves afterwards with m2f-routed-default
    getInferenceRoutingPolicy.mockResolvedValueOnce({
      dataset_id: 101,
      bindings: [
        {
          task: 'instance-segmentation',
          label_id: null,
          model_registry_key: 'm2f-routed-default',
        },
      ],
    });

    renderHook(() => useAnnotationServices());

    await waitFor(() => {
      expect(useAnnotationStore.getState().models.instanceModel).toBe('m2f-routed-default');
    });
  });

  it('policy-before-discovery: dataset routing default takes precedence when policy is ready before models load', async () => {
    // 1. Policy is configured before discovery completes
    getInferenceRoutingPolicy.mockResolvedValueOnce({
      dataset_id: 101,
      bindings: [
        {
          task: 'instance-segmentation',
          label_id: null,
          model_registry_key: 'm2f-routed-default',
        },
      ],
    });

    renderHook(() => useAnnotationServices());

    // 2. Discovery finishes afterwards
    await act(async () => {
      await useAnnotationStore.getState().fetchAvailableInstanceModels(101);
    });

    await waitFor(() => {
      expect(useAnnotationStore.getState().models.instanceModel).toBe('m2f-routed-default');
    });
  });

  it('manual override survives drawer closure and reopening without being reset to dataset default', async () => {
    getInferenceRoutingPolicy.mockResolvedValue({
      dataset_id: 101,
      bindings: [
        {
          task: 'instance-segmentation',
          label_id: null,
          model_registry_key: 'm2f-routed-default',
        },
      ],
    });

    await useAnnotationStore.getState().fetchAvailableInstanceModels(101);

    const { result, unmount } = renderHook(() => useAnnotationServices());

    await waitFor(() => {
      expect(useAnnotationStore.getState().models.instanceModel).toBe('m2f-routed-default');
    });

    // Explicit user selection in the UI
    act(() => {
      const instanceService = result.current.services.find((s) => s.key === 'instance');
      instanceService.setSelectedModel('m2f-generic');
    });

    expect(useAnnotationStore.getState().models.instanceModel).toBe('m2f-generic');

    // Drawer closes (unmount)
    unmount();

    // Drawer reopens (remount)
    const { result: remountResult } = renderHook(() => useAnnotationServices());

    await act(async () => {});

    // Must remain m2f-generic, not reset to m2f-routed-default
    expect(useAnnotationStore.getState().models.instanceModel).toBe('m2f-generic');
    const instanceService = remountResult.current.services.find((s) => s.key === 'instance');
    expect(instanceService.selectedModel).toBe('m2f-generic');
  });

  it('switching datasets resolves new dataset defaults without carrying old manual override across', async () => {
    getInferenceRoutingPolicy.mockImplementation((dsId) => {
      if (Number(dsId) === 101) {
        return Promise.resolve({
          dataset_id: 101,
          bindings: [{ task: 'instance-segmentation', label_id: null, model_registry_key: 'm2f-routed-default' }],
        });
      }
      return Promise.resolve({
        dataset_id: 102,
        bindings: [{ task: 'instance-segmentation', label_id: null, model_registry_key: 'm2f-dataset102-default' }],
      });
    });

    await useAnnotationStore.getState().fetchAvailableInstanceModels(101);

    const { result, rerender } = renderHook(() => useAnnotationServices());

    await waitFor(() => {
      expect(useAnnotationStore.getState().models.instanceModel).toBe('m2f-routed-default');
    });

    // User manual override on dataset 101
    act(() => {
      result.current.services.find((s) => s.key === 'instance').setSelectedModel('m2f-generic');
    });
    expect(useAnnotationStore.getState().models.instanceModel).toBe('m2f-generic');

    // Switch dataset to 102
    mockCurrentDataset = { id: 102, name: 'Dataset 102' };
    rerender();

    await waitFor(() => {
      expect(useAnnotationStore.getState().models.instanceModel).toBe('m2f-dataset102-default');
    });
  });
});
