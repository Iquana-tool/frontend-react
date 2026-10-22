import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useAnnotationKeyboardShortcuts from './useAnnotationKeyboardShortcuts';
import { CellposeInstanceRunnerProvider, useCellposeInstanceRunnerContext } from '../components/annotationPage/workspace/CellposeInstanceRunnerContext';
import { CELLPOSE_POLYP_REGISTRY_KEY } from '../components/annotationPage/workspace/cellposePreviewModel';
import useAnnotationStore from '../stores/useAnnotationStore';
import { initialState } from '../stores/initialState';
import * as inferenceApi from '../api/inference';

const mockRunInstance = vi.fn();
vi.mock('./useInstanceSegmentation', () => ({
  useInstanceSegmentation: () => ({ runInstance: mockRunInstance }),
}));

vi.mock('../api/inference', () => ({
  startInferenceJob: vi.fn(),
  getInferenceJob: vi.fn(),
  streamInferenceJob: vi.fn(() => ({ abort: vi.fn() })),
  getInferenceJobItems: vi.fn(),
  cancelInferenceJob: vi.fn().mockResolvedValue({}),
  getInferenceRoutingPolicy: vi.fn().mockResolvedValue({ bindings: [] }),
}));

vi.mock('../contexts/DatasetContext', () => ({
  useDataset: () => ({ currentDataset: { id: 15 }, datasets: [{ id: 15 }] }),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('./useAISegmentation', () => ({
  default: () => ({ runSegmentation: vi.fn() }),
}));

vi.mock('../components/annotationPage/workspace/useSuggestSimilar', () => ({
  default: () => ({ eligible: false, run: vi.fn() }),
}));

vi.mock('../api/labels', () => ({
  fetchLabels: vi.fn().mockResolvedValue({ success: true, labels: [] }),
}));

vi.mock('../services/annotationSession', () => ({
  default: {
    addObject: vi.fn().mockResolvedValue({ success: true, data: { contour_id: 999 } }),
  },
}));

function Harness() {
  useAnnotationKeyboardShortcuts();
  return null;
}

const cellposeModel = {
  id: CELLPOSE_POLYP_REGISTRY_KEY,
  registry_key: CELLPOSE_POLYP_REGISTRY_KEY,
  name: 'Cellpose-SAM · Polyp',
  task: 'instance-segmentation',
  classes: [{ key: 'polyp' }],
  class_mappings: [{ model_class: { key: 'polyp' }, action: 'map', label_id: 42 }],
};

const mask2formerModel = {
  id: 'mask2former',
  registry_key: 'mask2former',
  name: 'Mask2Former Generic',
  task: 'instance-segmentation',
};

describe('Shortcut "3" Cellpose workflow integration (Bug 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inferenceApi.startInferenceJob.mockResolvedValue({ id: 5001, status: 'running' });

    const labelsMap = new Map([
      [42, 'Coral Polyp'],
      ['42', 'Coral Polyp'],
      [10, 'Coral Colony'],
      ['10', 'Coral Colony'],
    ]);

    useAnnotationStore.setState({
      ...initialState,
      tools: {
        ...initialState.tools,
        aiToolsSettings: {
          instance_segmentation: true,
        },
      },
      models: {
        ...initialState.models,
        instanceModel: CELLPOSE_POLYP_REGISTRY_KEY,
        availableInstanceModels: [cellposeModel, mask2formerModel],
      },
      images: {
        ...initialState.images,
        currentImageId: 1001,
        currentImage: { id: 1001, width: 800, height: 600 },
      },
      objects: {
        ...initialState.objects,
        labelDatasetId: 15,
        datasetLabels: [
          { id: 42, name: 'Coral Polyp', parent_id: 10 },
          { id: 10, name: 'Coral Colony', parent_id: null },
        ],
        datasetLabelsMap: labelsMap,
        list: [
          {
            id: 201,
            contour_id: 201,
            labelId: 10,
            x: [10, 100, 100, 10],
            y: [10, 10, 100, 100],
          },
        ],
        selected: [201],
      },
      selection: {
        ...initialState.selection,
        selectedObjectIds: [201],
        focusedContourId: 201,
      },
    });
  });

  it.each([CELLPOSE_POLYP_REGISTRY_KEY, 'yolo_polyp_v3_c_seed1'])('pressing "3" with %s starts the mapped polyp job without legacy inference', async (modelKey) => {
    useAnnotationStore.setState((state) => {
      state.models.availableInstanceModels = [cellposeModel, { ...cellposeModel, id: 'yolo_polyp_v3_c_seed1', registry_key: 'yolo_polyp_v3_c_seed1' }];
      state.models.instanceModel = modelKey;
    });
    render(
      <CellposeInstanceRunnerProvider>
        <Harness />
      </CellposeInstanceRunnerProvider>
    );

    // Press key "3"
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    });

    await waitFor(() => {
      expect(inferenceApi.startInferenceJob).toHaveBeenCalledTimes(1);
    });

    const jobRequest = inferenceApi.startInferenceJob.mock.calls[0][0];
    expect(jobRequest).toMatchObject({
      image_selection: 'custom',
      image_ids: [1001],
      steps: [
        {
          task: 'instance-segmentation',
          model_registry_key: modelKey,
          label_id: 42, // mapped polyp label ID
          roi_contour_ids: [201], // selected fragment contour
        },
      ],
    });

    // Legacy runInstance must NOT be called
    expect(mockRunInstance).not.toHaveBeenCalled();
    expect(useAnnotationStore.getState().ui.instanceRunRequested).toBe(false);
  });

  it('pressing "3" while Cellpose is busy does not dispatch duplicate runs', async () => {
    let resolveJob;
    const pendingPromise = new Promise((res) => {
      resolveJob = res;
    });
    inferenceApi.startInferenceJob.mockReturnValueOnce(pendingPromise);

    render(
      <CellposeInstanceRunnerProvider>
        <Harness />
      </CellposeInstanceRunnerProvider>
    );

    // First keypress initiates job
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    });

    expect(inferenceApi.startInferenceJob).toHaveBeenCalledTimes(1);

    // Second keypress while job is starting / running
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    });

    // Still only 1 call
    expect(inferenceApi.startInferenceJob).toHaveBeenCalledTimes(1);

    // Complete job
    await act(async () => {
      resolveJob({ id: 5002, status: 'succeeded' });
    });
  });

  it('does not bypass an open write-mode warning with the polyp shortcut', () => {
    useAnnotationStore.setState((state) => {
      state.ui.instanceWarningModalOpen = true;
    });
    render(
      <CellposeInstanceRunnerProvider>
        <Harness />
      </CellposeInstanceRunnerProvider>
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    });

    expect(inferenceApi.startInferenceJob).not.toHaveBeenCalled();
    expect(useAnnotationStore.getState().ui.instanceRunRequested).toBe(false);
  });

  it('preserves established behavior and write-mode modal request for non-Cellpose instance models', async () => {
    useAnnotationStore.setState((state) => {
      state.models.instanceModel = 'mask2former';
    });

    render(
      <CellposeInstanceRunnerProvider>
        <Harness />
      </CellposeInstanceRunnerProvider>
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    });

    // Cellpose runner must not be invoked
    expect(inferenceApi.startInferenceJob).not.toHaveBeenCalled();

    // Established workflow sets instanceRunRequested = true (which opens write-mode modal)
    expect(useAnnotationStore.getState().ui.instanceRunRequested).toBe(true);
  });
});
