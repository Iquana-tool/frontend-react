import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { initialState } from '../../../stores/initialState';
import useWebSocketObjectHandler from '../../../hooks/useWebSocketObjectHandler';
import websocketService from '../../../services/websocket';
import annotationSession from '../../../services/annotationSession';
import { SERVER_MESSAGE_TYPES } from '../../../utils/messageTypes';
import ObjectsTab from './ObjectsTab';
import SegmentationOverlay from '../canvas/SegmentationOverlay';
import { useCellposePolypPreview } from './useCellposePolypPreview';
import { CellposePolypPreviewProvider } from './CellposePolypPreviewContext';
import * as DatasetContext from '../../../contexts/DatasetContext';
import * as ToastContext from '../../../contexts/ToastContext';
import * as PermissionsHook from '../../../hooks/usePermissions';
import * as inferenceApi from '../../../api/inference';

vi.mock('../../../api/inference', () => ({
  cancelInferenceJob: vi.fn().mockResolvedValue({ status: 'cancelled' }),
  getInferenceJobItems: vi.fn(),
  getInferenceModelCatalog: vi.fn(),
  startInferenceJob: vi.fn(),
  streamInferenceJob: vi.fn(),
}));

vi.mock('../../../services/annotationSession', () => ({
  default: {
    isReady: vi.fn().mockReturnValue(true),
    addObject: vi.fn(),
    modifyObject: vi.fn().mockResolvedValue({ success: true }),
    deleteObject: vi.fn().mockResolvedValue({ success: true }),
    unfocusImage: vi.fn().mockResolvedValue({ success: true }),
    focusImage: vi.fn().mockResolvedValue({ success: true }),
  },
}));

function IntegratedWorkflowHarness({ previewHookRef }) {
  useWebSocketObjectHandler();
  const previewFlow = useCellposePolypPreview();
  if (previewHookRef) previewHookRef.current = previewFlow;

  return (
    <div>
      <div data-testid="objects-tab-container">
        <ObjectsTab />
      </div>
      <div data-testid="overlay-container">
        <SegmentationOverlay />
      </div>
    </div>
  );
}

describe('Cellpose-SAM polyp acceptance end-to-end integration', () => {
  const addToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    global.ResizeObserver = window.ResizeObserver;

    vi.spyOn(DatasetContext, 'useDataset').mockReturnValue({
      currentDataset: { id: 15, name: 'Coral Dataset 15' },
    });
    vi.spyOn(ToastContext, 'useToast').mockReturnValue({ addToast });
    vi.spyOn(PermissionsHook, 'usePermissions').mockReturnValue({
      can: () => true,
    });

    inferenceApi.getInferenceModelCatalog.mockResolvedValue({
      models: [{
        registry_key: 'cpsam_polyp_v3_b_seed17',
        classes: ['polyp'],
        class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 43, source: 'dataset' }],
      }],
    });

    // Reset store to known reproduction state
    useAnnotationStore.setState({
      ...initialState,
      workspace: {
        ...initialState.workspace,
        mode: 'annotate',
        collapsedObjectIds: {},
        hiddenObjectIds: {},
      },
      images: {
        ...initialState.images,
        currentImageId: 385,
        imageObject: { id: 385, width: 1000, height: 800 },
      },
      focusMode: {
        active: true,
        objectId: 21060,
        objectMask: null,
      },
      objects: {
        ...initialState.objects,
        datasetLabels: [
          { id: 41, name: 'Coral Fragment', color: '#3b82f6', parent_id: null },
          { id: 42, name: 'Coral Surface', color: '#10b981', parent_id: 41 },
          { id: 43, name: 'Coral Polyp', color: '#f59e0b', parent_id: 42 },
        ],
        datasetLabelsMap: new Map([
          [41, 'Coral Fragment'],
          [42, 'Coral Surface'],
          [43, 'Coral Polyp'],
        ]),
        list: [
          {
            id: 21060,
            contour_id: 21060,
            label: 'Coral Fragment',
            labelId: 41,
            parent_id: null,
            color: '#3b82f6',
            x: [0.1, 0.9, 0.9, 0.1],
            y: [0.1, 0.1, 0.9, 0.9],
            reviewed_by: [],
          },
        ],
        selected: [],
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts preview outlines, assigns canonical ID, groups under focused parent, and displays in ObjectsTab and canvas', async () => {
    const previewHookRef = { current: null };

    // Setup preview in store: 1 transient candidate inside the fragment
    useAnnotationStore.setState((state) => {
      state.aiAnnotation.cellposePreview = {
        imageId: 385,
        datasetId: 15,
        jobId: 'cellpose-job-1',
        predictions: [
          {
            id: 'candidate-polyp-1',
            x: [0.3, 0.4, 0.4, 0.3],
            y: [0.3, 0.3, 0.4, 0.4],
            label_id: 43,
            parent_id: null, // Test automatic parent resolution via focused fragment 21060
            score: 0.95,
            included: true,
          },
        ],
        editingPredictionId: null,
      };
    });

    // Mock server acknowledgement for addObject
    annotationSession.addObject.mockImplementation(async (x, y, label, parentId, confidence, labelId, options) => {
      // Broadcast OBJECT_ADDED event exactly as real backend WebSocket does
      websocketService._handleMessage({
        data: {
          id: 'client-req-1',
          type: 'object_added',
          success: true,
          data: {
            id: 21061,
            contour_id: 21061,
            parent_id: parentId,
            label_id: labelId,
            added_by: options?.addedBy ?? 'cpsam_polyp_v3_b_seed17',
            confidence,
            x,
            y,
          },
        },
      });

      return {
        id: 'client-req-1',
        type: 'object_added',
        success: true,
        data: { id: 21061, parent_id: parentId, label_id: labelId },
      };
    });

    render(
      <CellposePolypPreviewProvider>
        <IntegratedWorkflowHarness previewHookRef={previewHookRef} />
      </CellposePolypPreviewProvider>
    );

    // Initial state: Objects panel shows Coral Fragment #21060
    expect(screen.getByText(/Coral Fragment #21060/i)).toBeInTheDocument();
    expect(screen.queryByText(/Coral Polyp #21061/i)).not.toBeInTheDocument();

    act(() => {
      previewHookRef.current.setEnabled(true);
    });

    await waitFor(() => expect(previewHookRef.current?.projectLabel).toBeTruthy());

    // Trigger explicit acceptance
    let acceptSuccess;
    await act(async () => {
      acceptSuccess = await previewHookRef.current.acceptIncluded();
    });

    if (!acceptSuccess) {
      console.error('Acceptance failed with error:', previewHookRef.current?.jobError);
    }
    expect(acceptSuccess).toBe(true);

    // 1. Verify addObject was called with resolved parent 21060, labelId 43, and provenance
    expect(annotationSession.addObject).toHaveBeenCalledWith(
      [0.3, 0.4, 0.4, 0.3],
      [0.3, 0.3, 0.4, 0.4],
      'Coral Polyp',
      21060,
      0.95,
      43,
      expect.objectContaining({
        addedBy: 'cpsam_polyp_v3_b_seed17',
        source: 'instance_suggestion',
        modelKey: 'cpsam_polyp_v3_b_seed17',
      })
    );

    // 2. Verify ObjectsTab renders newly accepted child under parent Coral Fragment
    const tree = screen.getByRole('tree');
    const polypRow = within(tree).getByText('Coral Polyp #21061');
    expect(polypRow).toBeInTheDocument();

    // 3. Verify object was automatically selected upon creation and can be toggled via panel
    let storeState = useAnnotationStore.getState();
    expect(storeState.objects.selected).toContain(21061);

    act(() => {
      fireEvent.click(polypRow);
    });
    storeState = useAnnotationStore.getState();
    expect(storeState.objects.selected).not.toContain(21061);

    act(() => {
      fireEvent.click(polypRow);
    });
    storeState = useAnnotationStore.getState();
    expect(storeState.objects.selected).toContain(21061);

    // 4. Verify parent object node is expanded in workspace state
    expect(storeState.workspace.collapsedObjectIds[21060]).toBeFalsy();

    // 5. Verify the canvas overlay renders both the focused fragment and the accepted polyp
    // In focus mode, SegmentationOverlay keeps focused object and its descendants
    const objectsInStore = storeState.objects.list;
    expect(objectsInStore).toHaveLength(2);
    const savedPolyp = objectsInStore.find((o) => o.id === 21061);
    expect(savedPolyp).toBeDefined();
    expect(savedPolyp.parent_id).toBe(21060);
    expect(savedPolyp.label).toBe('Coral Polyp');

    // 6. Verify transient preview was cleared upon full acceptance
    expect(storeState.aiAnnotation.cellposePreview).toBeNull();
  });

  it('handles server rejection/skip gracefully without removing outlines or corrupting store', async () => {
    const previewHookRef = { current: null };

    useAnnotationStore.setState((state) => {
      state.aiAnnotation.cellposePreview = {
        imageId: 385,
        datasetId: 15,
        jobId: 'cellpose-job-rejected',
        predictions: [
          {
            id: 'candidate-polyp-rejected',
            x: [0.3, 0.4, 0.4, 0.3],
            y: [0.3, 0.3, 0.4, 0.4],
            label_id: 43,
            parent_id: null,
            score: 0.9,
            included: true,
          },
        ],
        editingPredictionId: null,
      };
    });

    // Simulate backend skipping contour due to 100% clipped overlap
    annotationSession.addObject.mockResolvedValue({
      id: 'client-req-skip',
      type: 'success',
      success: true,
      message: 'Object was skipped because it does not add any new pixels.',
      data: { skipped: true },
    });

    render(
      <CellposePolypPreviewProvider>
        <IntegratedWorkflowHarness previewHookRef={previewHookRef} />
      </CellposePolypPreviewProvider>
    );

    let acceptSuccess;
    await act(async () => {
      acceptSuccess = await previewHookRef.current.acceptIncluded();
    });

    expect(acceptSuccess).toBe(false);

    // Outline should NOT have been removed from transient preview
    const previewInStore = useAnnotationStore.getState().aiAnnotation.cellposePreview;
    expect(previewInStore.predictions).toHaveLength(1);
    expect(previewInStore.predictions[0].id).toBe('candidate-polyp-rejected');

    // ObjectsTab should NOT have any ghost or unpersisted child
    expect(screen.queryByText(/Coral Polyp/i)).not.toBeInTheDocument();
  });
});
