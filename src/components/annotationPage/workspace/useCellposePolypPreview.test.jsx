import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CellposePolypCard from './CellposePolypCard';
import { CellposePolypPreviewProvider } from './CellposePolypPreviewContext';
import { useCellposePolypPreview } from './useCellposePolypPreview';
import CellposePreviewOverlay from '../canvas/CellposePreviewOverlay';
import * as inferenceApi from '../../../api/inference';
import annotationSession from '../../../services/annotationSession';

const mock = vi.hoisted(() => {
  const state = {
    datasetId: 5,
    imageId: 100,
    imageObject: { width: 100, height: 50 },
    labelsMap: new Map([[11, 'coral fragment'], [47, 'project polyp']]),
    datasetLabels: [
      { id: 11, name: 'coral fragment', parent_id: null },
      { id: 47, name: 'project polyp', parent_id: 11 },
    ],
    objects: [{ id: 'fragment-object', contour_id: 88, labelId: 11 }],
    selectedIds: ['fragment-object'],
    focusedParentContourId: null,
    preview: null,
  };
  const actions = {
    setPreview: vi.fn((preview) => { state.preview = preview; }),
    clearPreview: vi.fn(() => { state.preview = null; }),
    updatePrediction: vi.fn((id, updates) => {
      const prediction = state.preview?.predictions.find((entry) => entry.id === id);
      if (prediction) Object.assign(prediction, updates);
    }),
    setEditingId: vi.fn((id) => { if (state.preview) state.preview.editingPredictionId = id; }),
    updateVertex: vi.fn(),
    removePrediction: vi.fn((id) => {
      if (state.preview) state.preview.predictions = state.preview.predictions.filter((entry) => entry.id !== id);
    }),
    expandObject: vi.fn(),
    addToast: vi.fn(),
    streamMessage: null,
  };
  return { state, actions };
});
let originalClientWidthDescriptor;
let originalClientHeightDescriptor;

vi.mock('../../../api/inference', () => ({
  cancelInferenceJob: vi.fn(),
  getInferenceJobItems: vi.fn(),
  getInferenceModelCatalog: vi.fn(),
  startInferenceJob: vi.fn(),
  streamInferenceJob: vi.fn(),
}));
vi.mock('../../../contexts/DatasetContext', () => ({
  useDataset: () => ({ currentDataset: { id: mock.state.datasetId } }),
}));
vi.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ addToast: mock.actions.addToast }) }));
vi.mock('../../../hooks/usePermissions', () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock('../../../services/annotationSession', () => ({
  default: { addObject: vi.fn() },
}));
vi.mock('../../../stores/selectors/annotationSelectors', () => ({
  useCellposePreview: () => mock.state.preview,
  useClearCellposePreview: () => mock.actions.clearPreview,
  useCurrentImageId: () => mock.state.imageId,
  useDatasetLabels: () => mock.state.datasetLabels,
  useDatasetLabelsMap: () => mock.state.labelsMap,
  useExpandObject: () => mock.actions.expandObject,
  useFocusedParentContourId: () => mock.state.focusedParentContourId,
  useImageObject: () => mock.state.imageObject,
  useObjectsList: () => mock.state.objects,
  useRemoveCellposePreviewPrediction: () => mock.actions.removePrediction,
  useSelectedObjects: () => mock.state.selectedIds,
  useSetCellposePreview: () => mock.actions.setPreview,
  useSetCellposePreviewEditingId: () => mock.actions.setEditingId,
  useUpdateCellposePreviewPrediction: () => mock.actions.updatePrediction,
  useUpdateCellposePreviewVertex: () => mock.actions.updateVertex,
}));

const catalog = {
  models: [{
    registry_key: 'cpsam_polyp_v3_b_seed17',
    classes: ['polyp'],
    class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 47, source: 'dataset' }],
  }],
};

const previewItems = [{
  status: 'done',
  image_id: 100,
  predictions: {
    contours: [{
      id: 'poly-1',
      source_instance_id: 'instance-1',
      x: [0.1, 0.8, 0.7],
      y: [0.2, 0.3, 0.9],
      label_id: 47,
    }],
    prediction_metadata: {
      checkpoint_sha256: 'abc123',
      instances: [{ source_instance_id: 'instance-1', score: 0.93, rle: { size: [50, 100], counts: 'x' } }],
    },
  },
}];

const renderCard = () => render(
  <CellposePolypPreviewProvider><CellposePolypCard /></CellposePolypPreviewProvider>
);

describe('Cellpose polyp preview flow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalClientWidthDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidthDescriptor);
    else delete HTMLElement.prototype.clientWidth;
    if (originalClientHeightDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeightDescriptor);
    else delete HTMLElement.prototype.clientHeight;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mock.state.datasetId = 5;
    mock.state.imageId = 100;
    mock.state.imageObject = { width: 100, height: 50 };
    mock.state.labelsMap = new Map([[11, 'coral fragment'], [47, 'project polyp']]);
    mock.state.datasetLabels = [
      { id: 11, name: 'coral fragment', parent_id: null },
      { id: 47, name: 'project polyp', parent_id: 11 },
    ];
    mock.state.objects = [{ id: 'fragment-object', contour_id: 88, labelId: 11 }];
    mock.state.selectedIds = ['fragment-object'];
    mock.state.preview = null;
    mock.actions.streamMessage = null;
    mock.actions.updateVertex.mockClear();
    Object.values(mock.actions).forEach((action) => action?.mockClear?.());
    inferenceApi.getInferenceModelCatalog.mockResolvedValue(catalog);
    inferenceApi.startInferenceJob.mockResolvedValue({ id: 123, status: 'queued' });
    inferenceApi.getInferenceJobItems.mockResolvedValue(previewItems);
    inferenceApi.cancelInferenceJob.mockResolvedValue({ status: 'cancelled' });
    inferenceApi.streamInferenceJob.mockImplementation((id, onMessage) => {
      mock.actions.streamMessage = onMessage;
      return { abort: vi.fn() };
    });
    annotationSession.addObject.mockReset().mockResolvedValue({ type: 'object_added', success: true, data: { id: 999 } });
  });

  it('renders the explicit opt-in, runs an ROI preview, and accepts normalized contours only on click', async () => {
    const ui = renderCard();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select experimental Cellpose-SAM polyp model' }));
    await screen.findByText((_, element) => element?.tagName === 'P' && element.textContent.includes('project label'));
    fireEvent.click(screen.getByRole('button', { name: 'Run preview' }));

    await waitFor(() => expect(inferenceApi.startInferenceJob).toHaveBeenCalledTimes(1));
    expect(inferenceApi.startInferenceJob).toHaveBeenCalledWith(expect.objectContaining({
      result_mode: 'preview',
      image_selection: 'custom',
      image_ids: [100],
      steps: [expect.objectContaining({
        model_registry_key: 'cpsam_polyp_v3_b_seed17',
        task: 'instance-segmentation',
        label_id: 47,
        roi_contour_ids: [88],
      })],
    }));
    expect(annotationSession.addObject).not.toHaveBeenCalled();

    act(() => mock.actions.streamMessage({ id: 123, status: 'succeeded' }));
    await waitFor(() => expect(mock.state.preview?.predictions).toHaveLength(1));
    ui.rerender(<CellposePolypPreviewProvider><CellposePolypCard /></CellposePolypPreviewProvider>);
    expect(await screen.findByText('1 preview outline')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit outline' }));
    expect(mock.state.preview.editingPredictionId).toBe(mock.state.preview.predictions[0].id);
    expect(annotationSession.addObject).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Accept 1 outline' }));
    await waitFor(() => expect(annotationSession.addObject).toHaveBeenCalledTimes(1));
    expect(annotationSession.addObject).toHaveBeenCalledWith(
      [0.1, 0.8, 0.7], [0.2, 0.3, 0.9], 'project polyp', 88, 0.93, 47,
      expect.objectContaining({ addedBy: 'cpsam_polyp_v3_b_seed17', source: 'instance_suggestion' })
    );
    expect(mock.actions.expandObject).toHaveBeenCalledWith(88);
    await waitFor(() => expect(inferenceApi.cancelInferenceJob).toHaveBeenCalledWith(123));
  });

  it('requires an explicit whole-image choice when there is no selected saved fragment', async () => {
    mock.state.selectedIds = [];
    renderCard();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select experimental Cellpose-SAM polyp model' }));
    await screen.findByText(/Select one or more saved coral \/ fragment outlines/);
    expect(screen.getByRole('button', { name: 'Run preview' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Whole image (run without a fragment ROI)' }));
    expect(screen.getByRole('button', { name: 'Run preview' })).toBeEnabled();
  });

  it('cancels a running job, clears transient results, and ignores a late success', async () => {
    const { result } = renderHook(() => useCellposePolypPreview());
    await waitFor(() => expect(inferenceApi.getInferenceModelCatalog).toHaveBeenCalled());
    await act(async () => { await result.current.run(); });
    const lateMessage = mock.actions.streamMessage;
    await act(async () => { await result.current.cancel(); });
    expect(inferenceApi.cancelInferenceJob).toHaveBeenCalledWith(123);
    expect(mock.state.preview).toBeNull();
    act(() => lateMessage({ id: 123, status: 'succeeded' }));
    await act(async () => {});
    expect(mock.state.preview).toBeNull();
    expect(annotationSession.addObject).not.toHaveBeenCalled();
  });

  it('invalidates a preview when the image changes and ignores the previous image result', async () => {
    const { result, rerender } = renderHook(() => useCellposePolypPreview());
    await waitFor(() => expect(inferenceApi.getInferenceModelCatalog).toHaveBeenCalled());
    await act(async () => { await result.current.run(); });
    const lateMessage = mock.actions.streamMessage;
    mock.state.imageId = 200;
    rerender();
    await waitFor(() => expect(inferenceApi.cancelInferenceJob).toHaveBeenCalledWith(123));
    act(() => lateMessage({ id: 123, status: 'succeeded' }));
    await act(async () => {});
    expect(mock.state.preview).toBeNull();
    expect(annotationSession.addObject).not.toHaveBeenCalled();
  });

  it('allows a retry after a failed start and reports the service error', async () => {
    inferenceApi.startInferenceJob.mockRejectedValueOnce(new Error('job queue unavailable'));
    const { result } = renderHook(() => useCellposePolypPreview());
    await waitFor(() => expect(inferenceApi.getInferenceModelCatalog).toHaveBeenCalled());
    await act(async () => { await result.current.run(); });
    expect(result.current.jobStatus).toBe('failed');
    expect(result.current.jobError).toBe('job queue unavailable');
    inferenceApi.startInferenceJob.mockResolvedValueOnce({ id: 456, status: 'queued' });
    await act(async () => { await result.current.run(); });
    expect(inferenceApi.startInferenceJob).toHaveBeenCalledTimes(2);
  });

  it('shows a failed item error after a partial job and keeps Retry available', async () => {
    inferenceApi.getInferenceJobItems.mockResolvedValueOnce([{
      status: 'failed',
      image_id: 100,
      error: 'Cellpose CUDA inference failed.',
    }]);
    renderCard();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select experimental Cellpose-SAM polyp model' }));
    await screen.findByText((_, element) => element?.tagName === 'P' && element.textContent.includes('project label'));
    fireEvent.click(screen.getByRole('button', { name: 'Run preview' }));
    await waitFor(() => expect(inferenceApi.startInferenceJob).toHaveBeenCalledTimes(1));

    act(() => mock.actions.streamMessage({ id: 123, status: 'partial' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cellpose CUDA inference failed.');
    expect(screen.getByRole('button', { name: 'Retry preview' })).toBeEnabled();
    expect(mock.state.preview).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Retry preview' }));
    await waitFor(() => expect(inferenceApi.startInferenceJob).toHaveBeenCalledTimes(2));
  });

  it('accepts each included contour once and preserves already-normalized coordinates', async () => {
    mock.state.preview = {
      imageId: 100,
      datasetId: 5,
      jobId: 333,
      predictions: [{
        id: 'candidate-1',
        x: [0.2, 0.7, 0.6],
        y: [0.2, 0.3, 0.8],
        label_id: 47,
        score: 0.9,
        included: true,
      }],
      editingPredictionId: null,
    };
    let resolveAdd;
    annotationSession.addObject.mockImplementation(() => new Promise((resolve) => { resolveAdd = resolve; }));
    const { result } = renderHook(() => useCellposePolypPreview());
    await waitFor(() => expect(inferenceApi.getInferenceModelCatalog).toHaveBeenCalled());
    let first;
    act(() => { first = result.current.acceptIncluded(); });
    let duplicateResult;
    await act(async () => { duplicateResult = await result.current.acceptIncluded(); });
    expect(duplicateResult).toBe(false);
    expect(annotationSession.addObject).toHaveBeenCalledTimes(1);
    resolveAdd({ type: 'object_added', success: true, data: { id: 999 } });
    await act(async () => { await first; });
    expect(annotationSession.addObject).toHaveBeenCalledWith(
      [0.2, 0.7, 0.6], [0.2, 0.3, 0.8], 'project polyp', 88, 0.9, 47,
      expect.objectContaining({ addedBy: 'cpsam_polyp_v3_b_seed17' })
    );
  });

  it('stops acceptance after image navigation while a contour save is pending', async () => {
    mock.state.preview = {
      imageId: 100,
      datasetId: 5,
      jobId: 444,
      predictions: [
        { id: 'candidate-1', x: [0.1, 0.8, 0.7], y: [0.2, 0.3, 0.9], label_id: 47, score: 0.9, included: true },
        { id: 'candidate-2', x: [0.2, 0.8, 0.7], y: [0.2, 0.3, 0.9], label_id: 47, score: 0.8, included: true },
      ],
      editingPredictionId: null,
    };
    let resolveFirstSave;
    annotationSession.addObject.mockImplementationOnce(() => new Promise((resolve) => { resolveFirstSave = resolve; }));
    const { result, rerender } = renderHook(() => useCellposePolypPreview());
    await waitFor(() => expect(inferenceApi.getInferenceModelCatalog).toHaveBeenCalled());

    let acceptance;
    act(() => { acceptance = result.current.acceptIncluded(); });
    expect(annotationSession.addObject).toHaveBeenCalledTimes(1);

    mock.state.imageId = 200;
    rerender();
    resolveFirstSave({ type: 'object_added', success: true, data: { id: 999 } });
    await act(async () => { await acceptance; });

    expect(annotationSession.addObject).toHaveBeenCalledTimes(1);
    expect(mock.state.preview).toBeNull();
    expect(inferenceApi.cancelInferenceJob).toHaveBeenCalledWith(444);
    expect(mock.actions.addToast).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('before the active image changed'),
    }));
  });

  it('discard clears the transient server preview as well as the local outline', async () => {
    mock.state.preview = {
      imageId: 100,
      datasetId: 5,
      jobId: 777,
      predictions: [{ id: 'candidate-1', x: [0.1, 0.8, 0.7], y: [0.2, 0.3, 0.9], label_id: 47, included: true }],
      editingPredictionId: null,
    };
    const { result } = renderHook(() => useCellposePolypPreview());
    await waitFor(() => expect(inferenceApi.getInferenceModelCatalog).toHaveBeenCalled());

    act(() => result.current.discard());

    expect(mock.state.preview).toBeNull();
    expect(inferenceApi.cancelInferenceJob).toHaveBeenCalledWith(777);
  });

  it('reports partial acceptance and leaves only unsaved outlines for an explicit retry', async () => {
    mock.state.preview = {
      imageId: 100,
      datasetId: 5,
      jobId: 555,
      predictions: [
        { id: 'candidate-1', x: [0.1, 0.8, 0.7], y: [0.2, 0.3, 0.9], label_id: 47, score: 0.9, included: true },
        { id: 'candidate-2', x: [0.2, 0.8, 0.7], y: [0.2, 0.3, 0.9], label_id: 47, score: 0.8, included: true },
        { id: 'candidate-3', x: [0.3, 0.8, 0.7], y: [0.2, 0.3, 0.9], label_id: 47, score: 0.7, included: true },
      ],
      editingPredictionId: null,
    };
    annotationSession.addObject
      .mockResolvedValueOnce({ type: 'object_added', success: true, data: { id: 991 } })
      .mockRejectedValueOnce(new Error('annotation connection lost'))
      .mockResolvedValue({ type: 'object_added', success: true, data: { id: 992 } });
    const { result, rerender } = renderHook(() => useCellposePolypPreview());
    await waitFor(() => expect(inferenceApi.getInferenceModelCatalog).toHaveBeenCalled());

    let firstAttempt;
    await act(async () => { firstAttempt = await result.current.acceptIncluded(); });
    expect(firstAttempt).toBe(false);
    expect(result.current.jobError).toContain('Accepted 1 of 3 outlines');
    expect(result.current.jobError).toContain('2 remain in the preview');
    expect(result.current.jobError).toContain('annotation connection lost');
    expect(mock.state.preview.predictions.map((entry) => entry.id)).toEqual(['candidate-2', 'candidate-3']);
    expect(annotationSession.addObject).toHaveBeenCalledTimes(2);

    rerender();
    let retryAttempt;
    await act(async () => { retryAttempt = await result.current.acceptIncluded(); });
    expect(retryAttempt).toBe(true);
    expect(annotationSession.addObject).toHaveBeenCalledTimes(4);
    expect(annotationSession.addObject.mock.calls.map((call) => call[0])).toEqual([
      [0.1, 0.8, 0.7],
      [0.2, 0.8, 0.7],
      [0.2, 0.8, 0.7],
      [0.3, 0.8, 0.7],
    ]);
  });

  it('lets the user drag any original vertex, including points without a visible handle', async () => {
    const x = Array.from({ length: 80 }, (_, index) => 0.5 + 0.4 * Math.cos((index / 80) * Math.PI * 2));
    const y = Array.from({ length: 80 }, (_, index) => 0.5 + 0.4 * Math.sin((index / 80) * Math.PI * 2));
    mock.state.preview = {
      imageId: 100,
      datasetId: 5,
      predictions: [{ id: 'candidate', x, y, label_id: 47, score: 0.9, included: true }],
      editingPredictionId: 'candidate',
    };
    originalClientWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    originalClientHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 250 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 140 });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.tagName === 'IMG') return { left: 10, top: 20, width: 200, height: 100, right: 210, bottom: 120 };
      return { left: 0, top: 0, width: 250, height: 140, right: 250, bottom: 140 };
    });

    function EditableCanvas() {
      const imageRef = React.useRef(null);
      return (
        <div data-testid="preview-stage">
          <div><img ref={imageRef} alt="test image" /></div>
          <CellposePreviewOverlay canvasRef={imageRef} zoomLevel={1} panOffset={{ x: 0, y: 0 }} />
        </div>
      );
    }
    const editableUi = render(<EditableCanvas />);
    await waitFor(() => expect(editableUi.container.querySelector('svg')).toBeTruthy());
    const polygon = editableUi.container.querySelector('polygon');
    const vertexIndex = 10; // only every third vertex gets a visible handle
    const startX = 10 + x[vertexIndex] * 200;
    const startY = 20 + y[vertexIndex] * 100;
    fireEvent.pointerDown(polygon, { clientX: startX, clientY: startY });
    fireEvent.pointerMove(window, { clientX: 70, clientY: 55 });
    fireEvent.pointerUp(window);

    expect(mock.actions.updateVertex).toHaveBeenCalledWith('candidate', vertexIndex, 0.3, 0.35);
    editableUi.unmount();
  });
});
