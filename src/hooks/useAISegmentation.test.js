import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAISegmentation from './useAISegmentation';
import annotationSession from '../services/annotationSession';
import { getInferenceRoutingPolicy } from '../api/inference';
import useAnnotationStore from '../stores/useAnnotationStore';

const hookState = vi.hoisted(() => ({
  currentDataset: { id: 42 },
  routeDatasetId: '42',
  currentImage: { dataset_id: 42 },
  imageObject: { width: 100, height: 100 },
  prompts: [{ type: 'point', coords: { x: 25, y: 50 }, label: 'positive' }],
  promptedModelId: 'routed-model',
  activeLabelId: null,
  availablePromptedModels: [],
}));

const actions = vi.hoisted(() => ({
  consumePrompts: vi.fn(),
  setIsSubmitting: vi.fn(),
  addObject: vi.fn(),
  updateObject: vi.fn(),
  exitRefinementMode: vi.fn(),
  setCurrentTool: vi.fn(),
  setPromptedModel: vi.fn(),
  syncEditModeDraftFromRefinement: vi.fn(),
  setLastPromptedRun: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ datasetId: hookState.routeDatasetId }),
}));

vi.mock('../contexts/DatasetContext', () => ({
  useDataset: () => ({ currentDataset: hookState.currentDataset }),
}));

vi.mock('../stores/selectors/annotationSelectors', () => ({
  useAIPrompts: () => hookState.prompts,
  usePromptedModel: () => hookState.promptedModelId,
  useCurrentImage: () => hookState.currentImage,
  useConsumePrompts: () => actions.consumePrompts,
  useSetIsSubmittingAI: () => actions.setIsSubmitting,
  useImageObject: () => hookState.imageObject,
  useAddObject: () => actions.addObject,
  useUpdateObject: () => actions.updateObject,
  useObjectsList: () => hookState.objects ?? [],
  useRefinementModeActive: () => false,
  useRefinementModeObjectId: () => null,
  useExitRefinementMode: () => actions.exitRefinementMode,
  useSetCurrentTool: () => actions.setCurrentTool,
  useSetPromptedModel: () => actions.setPromptedModel,
  useSyncEditModeDraftFromRefinement: () => actions.syncEditModeDraftFromRefinement,
  useAvailablePromptedModels: () => hookState.availablePromptedModels,
  useActiveLabelId: () => hookState.activeLabelId,
  useBeginInferenceRun: () => () => 1,
  useAckInferenceRun: () => () => {},
  useLastPromptedRun: () => hookState.lastPromptedRun ?? null,
  useSetLastPromptedRun: () => actions.setLastPromptedRun,
}));

vi.mock('../services/annotationSession', () => ({
  default: {
    isReady: vi.fn(),
    isServiceAvailable: vi.fn(),
    runSegmentation: vi.fn(),
    unselectRefinementObject: vi.fn(),
    deleteObject: vi.fn(),
  },
}));

vi.mock('../api/inference', () => ({
  getInferenceRoutingPolicy: vi.fn(),
}));

const makeModel = (id) => ({
  id,
  registry_key: id,
  task: 'prompted-segmentation',
  label_ids: [],
});

const makePolicy = (modelKey = 'routed-model', inputs = { parameters: { mask_threshold: 0.62 } }) => ({
  dataset_id: 42,
  bindings: [
    {
      task: 'prompted-segmentation',
      label_id: null,
      model_registry_key: modelKey,
      inputs,
    },
  ],
});

const settlePolicy = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useAISegmentation routing inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.currentDataset = { id: 42 };
    hookState.routeDatasetId = '42';
    hookState.currentImage = { dataset_id: 42 };
    hookState.imageObject = { width: 100, height: 100 };
    hookState.prompts = [{ type: 'point', coords: { x: 25, y: 50 }, label: 'positive' }];
    hookState.promptedModelId = 'routed-model';
    hookState.activeLabelId = null;
    hookState.availablePromptedModels = [makeModel('routed-model'), makeModel('manual-model')];

    getInferenceRoutingPolicy.mockResolvedValue(null);
    annotationSession.isReady.mockReturnValue(true);
    annotationSession.isServiceAvailable.mockReturnValue(true);
    annotationSession.runSegmentation.mockResolvedValue({ success: true });
  });

  it('sends saved inputs when the selected model matches the resolved binding', async () => {
    const inputs = { parameters: { mask_threshold: 0.62 } };
    getInferenceRoutingPolicy.mockResolvedValue(makePolicy('routed-model', inputs));
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.runSegmentation();
    });

    expect(annotationSession.runSegmentation).toHaveBeenCalledWith(
      'routed-model',
      expect.objectContaining({
        point_prompts: [{ x: 0.25, y: 0.5, label: true }],
      }),
      inputs
    );
  });

  it('does not mistake a click event for explicit routing inputs', async () => {
    const inputs = { parameters: { mask_threshold: 0.62 } };
    getInferenceRoutingPolicy.mockResolvedValue(makePolicy('routed-model', inputs));
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.runSegmentation({
        type: 'click',
        preventDefault: vi.fn(),
        nativeEvent: {},
      });
    });

    expect(annotationSession.runSegmentation).toHaveBeenCalledWith(
      'routed-model',
      expect.any(Object),
      inputs
    );
  });

  it('still accepts an explicit routing-input envelope', async () => {
    const inputs = { parameters: { mask_threshold: 0.8 } };
    const { result } = renderHook(() => useAISegmentation());

    await act(async () => {
      await result.current.runSegmentation(inputs);
    });

    expect(annotationSession.runSegmentation).toHaveBeenCalledWith(
      'routed-model',
      expect.any(Object),
      inputs
    );
  });

  it('does not send the binding inputs after a manual model switch', async () => {
    const inputs = { parameters: { mask_threshold: 0.62 } };
    getInferenceRoutingPolicy.mockResolvedValue(makePolicy('routed-model', inputs));
    hookState.promptedModelId = 'manual-model';
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.runSegmentation();
    });

    expect(annotationSession.runSegmentation).toHaveBeenCalledWith(
      'manual-model',
      expect.any(Object),
      null
    );
  });

  it('blocks a policy-prefilled model while the local policy is still loading', async () => {
    let resolvePolicy;
    const policyPromise = new Promise((resolve) => {
      resolvePolicy = resolve;
    });
    getInferenceRoutingPolicy.mockReturnValue(policyPromise);
    const { result } = renderHook(() => useAISegmentation());

    let runResult;
    await act(async () => {
      runResult = await result.current.runSegmentation();
    });

    expect(runResult).toEqual({
      success: false,
      error: 'Routing policy is still loading. Please try again in a moment.',
    });
    expect(annotationSession.runSegmentation).not.toHaveBeenCalled();

    await act(async () => {
      resolvePolicy(makePolicy('routed-model'));
      await policyPromise;
    });
    await act(async () => {
      await result.current.runSegmentation();
    });

    expect(annotationSession.runSegmentation).toHaveBeenCalledWith(
      'routed-model',
      expect.any(Object),
      { parameters: { mask_threshold: 0.62 } }
    );
  });

  it('preserves manual fallback execution when the loaded policy has no binding', async () => {
    hookState.promptedModelId = 'manual-model';
    getInferenceRoutingPolicy.mockResolvedValue({ dataset_id: 42, bindings: [] });
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.runSegmentation();
    });

    expect(annotationSession.runSegmentation).toHaveBeenCalledWith(
      'manual-model',
      expect.any(Object),
      null
    );
  });

  it('preserves manual fallback execution when policy loading fails', async () => {
    hookState.promptedModelId = 'manual-model';
    getInferenceRoutingPolicy.mockRejectedValue(new Error('policy unavailable'));
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.runSegmentation();
    });

    expect(annotationSession.runSegmentation).toHaveBeenCalledWith(
      'manual-model',
      expect.any(Object),
      null
    );
  });
});

describe('useAISegmentation canvas parameters', () => {
  const setCanvasParameters = (modelKey, values) =>
    useAnnotationStore.setState((state) => {
      state.models.promptedParameters = { [modelKey]: values };
    });

  beforeEach(() => {
    vi.clearAllMocks();
    hookState.currentDataset = { id: 42 };
    hookState.routeDatasetId = '42';
    hookState.currentImage = { id: 7, dataset_id: 42 };
    hookState.imageObject = { width: 100, height: 100 };
    hookState.prompts = [{ type: 'point', coords: { x: 25, y: 50 }, label: 'positive' }];
    hookState.promptedModelId = 'routed-model';
    hookState.activeLabelId = null;
    hookState.availablePromptedModels = [makeModel('routed-model'), makeModel('manual-model')];
    hookState.lastPromptedRun = null;
    setCanvasParameters('routed-model', {});

    getInferenceRoutingPolicy.mockResolvedValue(null);
    annotationSession.isReady.mockReturnValue(true);
    annotationSession.isServiceAvailable.mockReturnValue(true);
    annotationSession.runSegmentation.mockResolvedValue({ success: true });
  });

  it('sends the canvas value when no binding applies', async () => {
    setCanvasParameters('routed-model', { granularity: 0.7 });
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.runSegmentation();
    });

    expect(annotationSession.runSegmentation).toHaveBeenCalledWith(
      'routed-model', expect.any(Object), { parameters: { granularity: 0.7 } }
    );
  });

  it('lets the canvas value win over the routing binding and keeps the binding rest', async () => {
    getInferenceRoutingPolicy.mockResolvedValue(
      makePolicy('routed-model', { parameters: { granularity: 0.2, mask_threshold: 0.62 } })
    );
    setCanvasParameters('routed-model', { granularity: 0.9 });
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.runSegmentation();
    });

    expect(annotationSession.runSegmentation).toHaveBeenCalledWith(
      'routed-model', expect.any(Object), { parameters: { granularity: 0.9, mask_threshold: 0.62 } }
    );
  });

  it('leaves explicit caller inputs alone', async () => {
    setCanvasParameters('routed-model', { granularity: 0.9 });
    const inputs = { parameters: { granularity: 0.3 } };
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.runSegmentation(inputs);
    });

    expect(annotationSession.runSegmentation).toHaveBeenCalledWith('routed-model', expect.any(Object), inputs);
  });

  it('remembers a run that added an object', async () => {
    annotationSession.runSegmentation.mockResolvedValue({
      success: true, type: 'object_added', data: { id: 501, x: [0.1, 0.2, 0.2], y: [0.1, 0.1, 0.2] },
    });
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.runSegmentation();
    });

    expect(actions.setLastPromptedRun).toHaveBeenCalledWith({
      imageId: 7, modelKey: 'routed-model', prompts: hookState.prompts, contourId: 501,
    });
  });

  it('re-runs the last prompt: deletes its object, then runs its prompts', async () => {
    const saved = [{ type: 'box', coords: { x1: 10, y1: 10, x2: 50, y2: 50 } }];
    hookState.prompts = [];
    hookState.lastPromptedRun = { imageId: 7, modelKey: 'routed-model', prompts: saved, contourId: 501 };
    hookState.objects = [{ id: 1, contour_id: 501 }];
    setCanvasParameters('routed-model', { granularity: 1 });
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.rerunLastPrompt();
    });

    expect(annotationSession.deleteObject).toHaveBeenCalledWith(501);
    expect(annotationSession.deleteObject.mock.invocationCallOrder[0])
      .toBeLessThan(annotationSession.runSegmentation.mock.invocationCallOrder[0]);
    expect(annotationSession.runSegmentation).toHaveBeenCalledWith(
      'routed-model',
      expect.objectContaining({ box_prompt: { min_x: 0.1, min_y: 0.1, max_x: 0.5, max_y: 0.5 } }),
      { parameters: { granularity: 1 } }
    );
  });

  it('does not re-run while new prompts wait on the canvas', async () => {
    hookState.lastPromptedRun = { imageId: 7, modelKey: 'routed-model', prompts: [], contourId: 501 };
    hookState.objects = [{ id: 1, contour_id: 501 }];
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.rerunLastPrompt();
    });

    expect(annotationSession.deleteObject).not.toHaveBeenCalled();
    expect(annotationSession.runSegmentation).not.toHaveBeenCalled();
  });

  it('forgets the last run once its object is gone', async () => {
    hookState.prompts = [];
    hookState.lastPromptedRun = { imageId: 7, modelKey: 'routed-model', prompts: [], contourId: 501 };
    hookState.objects = [];
    const { result } = renderHook(() => useAISegmentation());

    await settlePolicy();
    await act(async () => {
      await result.current.rerunLastPrompt();
    });

    expect(annotationSession.deleteObject).not.toHaveBeenCalled();
    expect(actions.setLastPromptedRun).toHaveBeenCalledWith(null);
  });
});
