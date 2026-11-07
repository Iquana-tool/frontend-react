import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAnnotationServices from './useAnnotationServices';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { initialState } from '../../../stores/initialState';
import { getInferenceRoutingPolicy } from '../../../api/inference';
import { getPromptedModels } from '../../../api/models';

vi.mock('../../../api/inference', () => ({ getInferenceRoutingPolicy: vi.fn() }));
vi.mock('../../../api/models', () => ({
  getPromptedModels: vi.fn(), getSuggestionModels: vi.fn(), getModelFavorites: vi.fn(),
  setModelFavorite: vi.fn(), clearModelFavorite: vi.fn(),
}));
vi.mock('../../../hooks/useModelSwitchPreloader', () => ({ default: vi.fn() }));

let mockCurrentDataset = { id: 101 };
vi.mock('../../../contexts/DatasetContext', () => ({
  useDataset: () => ({ currentDataset: mockCurrentDataset }),
}));
const models = [
  { id: 'sam-generic', name: 'Generic', label_ids: [] },
  { id: 'sam-dataset101', name: 'Dataset 101 model', label_ids: [] },
  { id: 'sam-dataset102', name: 'Dataset 102 model', label_ids: [] },
];
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const policy = (datasetId, key) => ({
  dataset_id: datasetId,
  bindings: [{ task: 'prompted-segmentation', label_id: null, model_registry_key: key }],
});
const selected = () => useAnnotationStore.getState().models.promptedModel;

describe('prompted service discovery and routing with the real store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentDataset = { id: 101 };
    useAnnotationStore.setState({
      ...initialState,
      models: { ...initialState.models, favoritesLoaded: true },
      objects: { ...initialState.objects, labelDatasetId: 101 },
    });
    getPromptedModels.mockResolvedValue({ success: true, models });
    getInferenceRoutingPolicy.mockResolvedValue(policy(101, 'sam-dataset101'));
  });

  it('applies dataset policy after model discovery automatically selected the first model', async () => {
    await useAnnotationStore.getState().fetchAvailablePromptedModels();
    expect(selected()).toBe('sam-generic');
    const pending = deferred();
    getInferenceRoutingPolicy.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useAnnotationServices());
    expect(selected()).toBeNull();
    expect(result.current.policyLoading).toBe(true);
    await act(async () => pending.resolve(policy(101, 'sam-dataset101')));
    await waitFor(() => expect(selected()).toBe('sam-dataset101'));
  });

  it('applies a resolved policy when prompted model discovery finishes later', async () => {
    const pending = deferred();
    getPromptedModels.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useAnnotationServices());
    await waitFor(() => expect(result.current.policyLoading).toBe(false));
    expect(selected()).toBeNull();
    await act(async () => pending.resolve({ success: true, models }));
    await waitFor(() => expect(selected()).toBe('sam-dataset101'));
    expect(getPromptedModels).toHaveBeenCalledOnce();
  });

  it('keeps a manual prompted model choice through unrelated store updates', async () => {
    await useAnnotationStore.getState().fetchAvailablePromptedModels();
    const { result } = renderHook(() => useAnnotationServices());
    await waitFor(() => expect(selected()).toBe('sam-dataset101'));
    act(() => result.current.services[0].setSelectedModel('sam-generic'));
    act(() => useAnnotationStore.setState((state) => ({ ui: { ...state.ui, leftSidebarCollapsed: true } })));
    expect(selected()).toBe('sam-generic');
    expect(result.current.services[0].selectedModel).toBe('sam-generic');
  });

  it('disarms the previous dataset while the new dataset policy is loading', async () => {
    await useAnnotationStore.getState().fetchAvailablePromptedModels();
    const nextPolicy = deferred();
    getInferenceRoutingPolicy.mockImplementation((id) => Number(id) === 101
      ? Promise.resolve(policy(101, 'sam-dataset101')) : nextPolicy.promise);
    const { result, rerender } = renderHook(() => useAnnotationServices());
    await waitFor(() => expect(selected()).toBe('sam-dataset101'));
    act(() => result.current.services[0].setSelectedModel('sam-generic'));
    mockCurrentDataset = { id: 102 };
    rerender();
    expect(result.current.policyLoading).toBe(true);
    expect(selected()).toBeNull();
    await act(async () => nextPolicy.resolve(policy(102, 'sam-dataset102')));
    await waitFor(() => expect(selected()).toBe('sam-dataset102'));
  });
});
