import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAnnotationServices from './useAnnotationServices';
import { getInferenceRoutingPolicy } from '../../../api/inference';
import useModelSwitchPreloader from '../../../hooks/useModelSwitchPreloader';

const { state, fetchModels, setModel } = vi.hoisted(() => {
  const state = {};
  return {
    state,
    fetchModels: vi.fn(),
    setModel: vi.fn((value) => { state.selectedModel = value; }),
  };
});

vi.mock('../../../contexts/DatasetContext', () => ({
  useDataset: () => ({ currentDataset: state.dataset }),
}));
vi.mock('../../../api/inference', () => ({ getInferenceRoutingPolicy: vi.fn() }));
vi.mock('../../../stores/selectors/annotationSelectors', () => ({
  useAvailablePromptedModels: () => state.models,
  useFetchAvailablePromptedModels: () => fetchModels,
  useIsLoadingPromptedModels: () => state.loading,
  usePromptedModel: () => state.selectedModel,
  useSetPromptedModel: () => setModel,
  useActiveLabelId: () => state.labelId,
  useModelFavorites: () => state.favorites,
}));
vi.mock('../../../services/annotationSession', () => ({
  default: { selectPromptedModel: vi.fn() },
}));
vi.mock('../../../hooks/useModelSwitchPreloader', () => ({ default: vi.fn() }));

const models = [
  { id: 'sam-generic', label_ids: [], supported_prompt_types: ['point', 'box'] },
  { id: 'sam-specialist', label_ids: [1] },
];
const route = (key, labelId = null) => ({
  dataset_id: 101,
  bindings: [{ task: 'prompted-segmentation', model_registry_key: key, label_id: labelId }],
});

describe('prompted annotation service policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(state, {
      dataset: { id: 101 }, models, selectedModel: null, labelId: 1, favorites: {}, loading: false,
    });
    getInferenceRoutingPolicy.mockResolvedValue(null);
  });

  it('exposes only prompted controls and applies an active-label override', async () => {
    getInferenceRoutingPolicy.mockResolvedValue(route('sam-specialist', 1));
    const { result } = renderHook(() => useAnnotationServices());
    await waitFor(() => expect(setModel).toHaveBeenLastCalledWith('sam-specialist'));
    expect(result.current.services.map((service) => service.key)).toEqual(['prompted']);
    expect(result.current).not.toHaveProperty('confirmInstanceRun');
    expect(result.current.services[0]).toMatchObject({ task: 'prompted-segmentation', models });
  });

  it('uses the task default when the active label has no override', async () => {
    getInferenceRoutingPolicy.mockResolvedValue(route('sam-generic'));
    renderHook(() => useAnnotationServices());
    await waitFor(() => expect(setModel).toHaveBeenLastCalledWith('sam-generic'));
  });

  it('restores the compatible favorite when moving to an unrouted label', async () => {
    state.favorites = { 'prompted-segmentation': 'sam-generic' };
    getInferenceRoutingPolicy.mockResolvedValue(route('sam-specialist', 1));
    const { rerender } = renderHook(() => useAnnotationServices());
    await waitFor(() => expect(setModel).toHaveBeenLastCalledWith('sam-specialist'));
    state.labelId = 2;
    rerender();
    await waitFor(() => expect(setModel).toHaveBeenLastCalledWith('sam-generic'));
  });

  it('uses the first compatible fallback when the favorite does not support the label', async () => {
    state.labelId = 2;
    state.favorites = { 'prompted-segmentation': 'sam-specialist' };
    renderHook(() => useAnnotationServices());
    await waitFor(() => expect(setModel).toHaveBeenLastCalledWith('sam-generic'));
  });

  it.each(['missing-model', 'sam-specialist'])('disarms unavailable or incompatible configured route %s', async (key) => {
    state.labelId = 2;
    state.selectedModel = 'sam-generic';
    getInferenceRoutingPolicy.mockResolvedValue(route(key));
    const { result } = renderHook(() => useAnnotationServices());
    await waitFor(() => expect(result.current.policyLoading).toBe(false));
    expect(setModel).toHaveBeenLastCalledWith(null);
    expect(setModel).not.toHaveBeenCalledWith('sam-generic');
  });

  it('preserves manual model changes through unrelated rerenders', async () => {
    getInferenceRoutingPolicy.mockResolvedValue(route('sam-specialist', 1));
    const { result, rerender } = renderHook(() => useAnnotationServices());
    await waitFor(() => expect(setModel).toHaveBeenLastCalledWith('sam-specialist'));
    act(() => result.current.services[0].setSelectedModel('sam-generic'));
    const callCount = setModel.mock.calls.length;
    rerender();
    expect(setModel).toHaveBeenCalledTimes(callCount);
    expect(result.current.services[0].selectedModel).toBe('sam-generic');
    expect(useModelSwitchPreloader).toHaveBeenLastCalledWith('sam-generic', expect.any(Function), 'prompted');
  });

  it('shows policy errors while resolving the normal prompted fallback', async () => {
    getInferenceRoutingPolicy.mockRejectedValue(new Error('routing unavailable'));
    const { result } = renderHook(() => useAnnotationServices());
    await waitFor(() => expect(result.current.policyError).toBe('routing unavailable'));
    expect(result.current.policy).toBeNull();
    expect(setModel).toHaveBeenLastCalledWith('sam-generic');
  });

  it('does not preload an old selection while policy is loading', () => {
    state.selectedModel = 'sam-specialist';
    getInferenceRoutingPolicy.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAnnotationServices());
    expect(result.current.policyLoading).toBe(true);
    expect(useModelSwitchPreloader).toHaveBeenLastCalledWith(null, expect.any(Function), 'prompted');
  });

  it('honors the dataset tool gate and forwards model loading state', async () => {
    state.dataset = { id: 101, disabled_ai_tools: 'prompted' };
    const { result } = renderHook(() => useAnnotationServices());
    await waitFor(() => expect(result.current.policyLoading).toBe(false));
    expect(result.current.services).toEqual([]);
    expect(useModelSwitchPreloader).toHaveBeenLastCalledWith(null, expect.any(Function), 'prompted');
  });

  it('fetches only the prompted model list when discovery has not run', async () => {
    state.models = [];
    state.loading = true;
    const { result } = renderHook(() => useAnnotationServices());
    await waitFor(() => expect(result.current.policyLoading).toBe(false));
    expect(fetchModels).toHaveBeenCalledOnce();
    expect(result.current.services[0].isLoading).toBe(true);
  });
});
