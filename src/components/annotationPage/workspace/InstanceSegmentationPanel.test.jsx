import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { initialState } from '../../../stores/initialState';
import useWebSocketObjectHandler from '../../../hooks/useWebSocketObjectHandler';
import websocketService from '../../../services/websocket';
import annotationSession from '../../../services/annotationSession';
import ServiceCard from './ServiceCard';
import ObjectsTab from './ObjectsTab';
import EditableContourOverlay from '../canvas/EditableContourOverlay';
import CanvasContainer from '../canvas/CanvasContainer';
import { CellposeInstanceRunnerProvider } from './CellposeInstanceRunnerContext';
import * as DatasetContext from '../../../contexts/DatasetContext';
import * as ToastContext from '../../../contexts/ToastContext';
import * as PermissionsHook from '../../../hooks/usePermissions';
import * as inferenceApi from '../../../api/inference';

vi.mock('../../../api/inference', () => ({
  cancelInferenceJob: vi.fn().mockResolvedValue({ status: 'cancelled' }),
  getInferenceJobItems: vi.fn(),
  getInferenceModelCatalog: vi.fn(),
  getInferenceRoutingPolicy: vi.fn().mockResolvedValue({ bindings: [] }),
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

function IntegrationHarness({ service }) {
  useWebSocketObjectHandler();

  return (
    <CellposeInstanceRunnerProvider>
      <div>
        <div data-testid="left-service-container">
          <ServiceCard service={service} />
        </div>
        <div data-testid="canvas-container">
          <CanvasContainer
            imageObject={{ id: 385, width: 1000, height: 800 }}
            currentImage={{ id: 385 }}
            zoomLevel={1}
            panOffset={{ x: 0, y: 0 }}
          />
        </div>
        <div data-testid="objects-tab-container">
          <ObjectsTab />
        </div>
      </div>
    </CellposeInstanceRunnerProvider>
  );
}

describe('Instance Segmentation Panel - Cellpose-SAM integration', () => {
  const addToast = vi.fn();

  const mockService = {
    key: 'instance',
    task: 'instance-segmentation',
    name: 'Instance Segmentation',
    models: [
      {
        id: 'cpsam_polyp_v3_b_seed17',
        registry_key: 'cpsam_polyp_v3_b_seed17',
        name: 'Cellpose-SAM · Polyp',
        is_experimental: true,
        checkpoint_sha256: '8d17682741428d0c71b93dc6112de9ff9d6595fc586fe797bf4566423b788eba',
        classes: [{ key: 'polyp', name: 'Polyp' }],
        class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 43 }],
      },
      {
        id: 'mask2former',
        registry_key: 'mask2former',
        name: 'Mask2Former',
        is_experimental: false,
      },
    ],
    selectedModel: 'cpsam_polyp_v3_b_seed17',
    setSelectedModel: vi.fn(),
    isLoading: false,
    isRunning: false,
    canRun: true,
    onRun: vi.fn(),
  };

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
      models: [
        {
          registry_key: 'cpsam_polyp_v3_b_seed17',
          name: 'Cellpose-SAM · Polyp',
          task: 'instance-segmentation',
          is_experimental: true,
          checkpoint_sha256: '8d17682741428d0c71b93dc6112de9ff9d6595fc586fe797bf4566423b788eba',
          classes: [{ key: 'polyp', name: 'Polyp' }],
          class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 43 }],
        },
      ],
    });

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
        active: false,
        objectId: null,
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
        selected: [21060], // Coral fragment selected as ROI
      },
      models: {
        ...initialState.models,
        availableInstanceModels: mockService.models,
        instanceModel: 'cpsam_polyp_v3_b_seed17',
      },
      aiAnnotation: {
        ...initialState.aiAnnotation,
        lastInstanceRun: null,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders approved Instance segmentation panel design without Experimental badge or static results note, with mapped label and scope', () => {
    render(<IntegrationHarness service={mockService} />);

    // Open card
    fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));

    // 1. Model selector exists with Cellpose-SAM selected
    const modelSelect = screen.getByLabelText(/Instance segmentation model/i);
    expect(modelSelect).toBeInTheDocument();
    expect(modelSelect.value).toBe('cpsam_polyp_v3_b_seed17');

    // 2. Experimental badge and static notice should NOT exist
    expect(screen.queryByText('Experimental')).not.toBeInTheDocument();
    expect(screen.queryByText('Results are added to Objects.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Undo run/i })).not.toBeInTheDocument();

    // 3. Mapped application label
    expect(screen.getByText('Coral Polyp')).toBeInTheDocument();

    // 4. Inference area selector (Selected coral vs Whole image)
    const scopeSelect = screen.getByLabelText(/Inference area/i);
    expect(scopeSelect).toBeInTheDocument();
    expect(screen.getByText(/Selected coral \(1\)/i)).toBeInTheDocument();

    // 5. Primary Run model button
    const runBtn = screen.getByRole('button', { name: /Run model/i });
    expect(runBtn).toBeInTheDocument();
    expect(runBtn).toBeEnabled();

    // 6. Collapsible Model info
    expect(screen.getByText('Model info')).toBeInTheDocument();
    expect(screen.getByText(/8d17682741428d0c71b93dc6112de9ff9d6595fc586fe797bf4566423b788eba/i)).toBeInTheDocument();

    // 7. Verify no duplicated preview UI exists (no "70 preview outlines", no Accept / Discard buttons)
    expect(screen.queryByText(/preview outlines/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Accept$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Discard$/i })).not.toBeInTheDocument();
  });

  it('runs model and directly saves objects without any Accept step, updating Objects panel and canvas', async () => {
    // Neither an out-of-scope polyp nor another label inside the selected coral
    // should prompt for a write mode.
    useAnnotationStore.setState((state) => {
      state.objects.list.push(
        { id: 22060, contour_id: 22060, label: 'Coral Fragment', labelId: 41, parent_id: null },
        { id: 22061, contour_id: 22061, label: 'Coral Polyp', labelId: 43, parent_id: 22060 },
        { id: 21062, contour_id: 21062, label: 'Other annotation', labelId: 44, parent_id: 21060 }
      );
    });

    // Mock inference execution
    inferenceApi.startInferenceJob.mockResolvedValue({
      id: 991,
      status: 'succeeded',
    });

    inferenceApi.getInferenceJobItems.mockResolvedValue([
      {
        image_id: 385,
        predictions: {
          contours: [
            {
              id: 'pred-1',
              x: [0.2, 0.3, 0.3, 0.2],
              y: [0.2, 0.2, 0.3, 0.3],
              label_id: 43,
              score: 0.92,
              source_instance_id: 'cpsam_polyp_v3_b_seed17:t0001:abcd',
            },
          ],
        },
      },
    ]);

    // Mock WebSocket acknowledgement when addObject is called
    annotationSession.addObject.mockImplementation(async (x, y, label, parentId, confidence, labelId, options) => {
      // Broadcast WebSocket OBJECT_ADDED
      websocketService._handleMessage({
        data: {
          id: 'ws-req-1',
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
        id: 'ws-req-1',
        type: 'object_added',
        success: true,
        data: { id: 21061, contour_id: 21061, parent_id: parentId, label_id: labelId },
      };
    });

    render(<IntegrationHarness service={mockService} />);

    // Open card
    fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));

    // Click "Run model"
    const runBtn = screen.getByRole('button', { name: /Run model/i });
    await act(async () => {
      fireEvent.click(runBtn);
    });

    expect(screen.queryByText('Choose how to apply predictions')).not.toBeInTheDocument();

    // Verify startInferenceJob was called with native ROI 21060 and result_mode: 'preview'
    await waitFor(() => {
      expect(inferenceApi.startInferenceJob).toHaveBeenCalledWith(
        expect.objectContaining({
          dataset_id: 15,
          image_ids: [385],
          result_mode: 'preview',
          steps: [
            expect.objectContaining({
              model_registry_key: 'cpsam_polyp_v3_b_seed17',
              task: 'instance-segmentation',
              label_id: 43,
              roi_contour_ids: [21060],
            }),
          ],
        })
      );
    });

    // Verify addObject was called with parentId = 21060 (attached to ancestor coral fragment)
    await waitFor(() => {
      expect(annotationSession.addObject).toHaveBeenCalledWith(
        [0.2, 0.3, 0.3, 0.2],
        [0.2, 0.2, 0.3, 0.3],
        'Coral Polyp',
        21060,
        0.92,
        43,
        expect.objectContaining({
          addedBy: 'cpsam_polyp_v3_b_seed17',
          source: 'instance_segmentation',
          modelKey: 'cpsam_polyp_v3_b_seed17',
        })
      );
    });

    // Verify object immediately appeared in ObjectsTab
    await waitFor(() => {
      const tree = screen.getByRole('tree');
      expect(within(tree).getByText(/Coral Polyp #21061/i)).toBeInTheDocument();
    });

    // Verify toast notification is displayed when objects are added
    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringMatching(/1 polyp added to Objects/i),
        })
      );
    });

    // Verify neither panel nor canvas display an 'Undo run' button
    expect(screen.queryByRole('button', { name: /Undo run/i })).not.toBeInTheDocument();
  });

  it('prompts with InstanceWarningModal on Run and dismisses cleanly when Cancel is clicked', async () => {
    useAnnotationStore.setState((state) => {
      state.objects.list.push({
        id: 21061,
        contour_id: 21061,
        label: 'Coral Polyp',
        labelId: 43,
        parent_id: 21060,
      });
    });
    render(<IntegrationHarness service={mockService} />);

    // Open card
    fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));

    // Click "Run model"
    const runBtn = screen.getByRole('button', { name: /Run model/i });
    await act(async () => {
      fireEvent.click(runBtn);
    });

    // Modal appears: "Choose how to apply predictions"
    expect(screen.getByText('Choose how to apply predictions')).toBeInTheDocument();
    expect(
      screen.getByText(/keeps existing annotations and adds only non-overlapping predictions/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/replaces all current contours with the new predictions/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Patch and run/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Override and run/i })).toBeInTheDocument();

    // Click Cancel
    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    // Modal is dismissed and no inference job started
    expect(screen.queryByText('Choose how to apply predictions')).not.toBeInTheDocument();
    expect(inferenceApi.startInferenceJob).not.toHaveBeenCalled();
  });

  it('deletes existing polyps and saves new ones when Override and run is chosen', async () => {
    // Set up existing polyp attached to parent fragment 21060
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        {
          id: 21060,
          contour_id: 21060,
          label: 'Coral Fragment',
          labelId: 41,
          parent_id: null,
          color: '#3b82f6',
          x: [0.1, 0.9, 0.9, 0.1],
          y: [0.1, 0.1, 0.9, 0.9],
        },
        {
          id: 21061,
          contour_id: 21061,
          label: 'Coral Polyp',
          labelId: 43,
          parent_id: 21060,
          color: '#f59e0b',
          x: [0.2, 0.3, 0.3, 0.2],
          y: [0.2, 0.2, 0.3, 0.3],
        },
      ];
      state.objects.selected = [21060];
    });

    inferenceApi.startInferenceJob.mockResolvedValue({
      id: 992,
      status: 'succeeded',
    });

    inferenceApi.getInferenceJobItems.mockResolvedValue([
      {
        image_id: 385,
        predictions: {
          contours: [
            {
              id: 'pred-new',
              x: [0.4, 0.5, 0.5, 0.4],
              y: [0.4, 0.4, 0.5, 0.5],
              label_id: 43,
              score: 0.95,
              source_instance_id: 'cpsam_polyp_v3_b_seed17:t0002:new',
            },
          ],
        },
      },
    ]);

    annotationSession.deleteObject.mockResolvedValue({ success: true });
    annotationSession.addObject.mockResolvedValue({
      type: 'object_added',
      success: true,
      data: { id: 21062, contour_id: 21062, parent_id: 21060, label_id: 43 },
    });

    render(<IntegrationHarness service={mockService} />);

    // Open card
    fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));

    // Click "Run model"
    const runBtn = screen.getByRole('button', { name: /Run model/i });
    await act(async () => {
      fireEvent.click(runBtn);
    });

    // Confirm with "Override and run"
    const overrideBtn = screen.getByRole('button', { name: /Override and run/i });
    await act(async () => {
      fireEvent.click(overrideBtn);
    });

    // Verify existing polyp 21061 was deleted before saving
    await waitFor(() => {
      expect(annotationSession.deleteObject).toHaveBeenCalledWith(21061);
    });

    // Verify new prediction was added
    await waitFor(() => {
      expect(annotationSession.addObject).toHaveBeenCalledWith(
        [0.4, 0.5, 0.5, 0.4],
        [0.4, 0.4, 0.5, 0.5],
        'Coral Polyp',
        21060,
        0.95,
        43,
        expect.any(Object)
      );
    });
  });

  it('does not display Undo run notice or badge even if previous run state exists', () => {
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        {
          id: 21060,
          contour_id: 21060,
          label: 'Coral Fragment',
          labelId: 41,
          parent_id: null,
          color: '#3b82f6',
          x: [0.1, 0.9, 0.9, 0.1],
          y: [0.1, 0.1, 0.9, 0.9],
        },
        {
          id: 21061,
          contour_id: 21061,
          label: 'Coral Polyp',
          labelId: 43,
          parent_id: 21060,
          color: '#f59e0b',
          x: [0.2, 0.3, 0.3, 0.2],
          y: [0.2, 0.2, 0.3, 0.3],
        },
      ];
      state.aiAnnotation.lastInstanceRun = {
        count: 1,
        objectIds: [21061],
        labelName: 'Coral Polyp',
        imageId: 385,
        datasetId: 15,
      };
    });

    render(<IntegrationHarness service={mockService} />);

    // Verify no Undo run or polyps added notice is shown
    expect(screen.queryByRole('button', { name: /Undo run/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/polyps added to Objects/i)).not.toBeInTheDocument();
  });

  it('supports editing created objects and survives simulated reload', async () => {
    useAnnotationStore.setState((state) => {
      state.objects.list = [
        {
          id: 21060,
          contour_id: 21060,
          label: 'Coral Fragment',
          labelId: 41,
          parent_id: null,
          color: '#3b82f6',
          x: [0.1, 0.9, 0.9, 0.1],
          y: [0.1, 0.1, 0.9, 0.9],
        },
        {
          id: 21061,
          contour_id: 21061,
          label: 'Coral Polyp',
          labelId: 43,
          parent_id: 21060,
          color: '#f59e0b',
          x: [0.2, 0.3, 0.3, 0.2],
          y: [0.2, 0.2, 0.3, 0.3],
        },
      ];
    });

    render(<IntegrationHarness service={mockService} />);

    // Edit object: simulate modification from backend broadcast
    act(() => {
      websocketService._handleMessage({
        data: {
          type: 'object_modified',
          success: true,
          data: {
            contour_id: 21061,
            fields_to_be_updated: {
              x: [0.22, 0.32, 0.32, 0.22],
              y: [0.22, 0.22, 0.32, 0.32],
            },
          },
        },
      });
    });

    // Object in store updated
    const updated = useAnnotationStore.getState().objects.list.find((o) => o.contour_id === 21061);
    expect(updated.x).toEqual([0.22, 0.32, 0.32, 0.22]);

    // Simulated reload (re-populating from database)
    act(() => {
      websocketService._handleMessage({
        data: {
          type: 'object_added',
          success: true,
          data: {
            root_contours: [
              {
                id: 21060,
                contour_id: 21060,
                label_id: 41,
                parent_id: null,
                x: [0.1, 0.9, 0.9, 0.1],
                y: [0.1, 0.1, 0.9, 0.9],
                children: [
                  {
                    id: 21061,
                    contour_id: 21061,
                    label_id: 43,
                    parent_id: 21060,
                    x: [0.22, 0.32, 0.32, 0.22],
                    y: [0.22, 0.22, 0.32, 0.32],
                  },
                ],
              },
            ],
          },
        },
      });
    });

    const reloaded = useAnnotationStore.getState().objects.list.find((o) => o.contour_id === 21061);
    expect(reloaded).toBeDefined();
    expect(reloaded.parent_id).toBe(21060);
    expect(reloaded.x).toEqual([0.22, 0.32, 0.32, 0.22]);
  });

  it('switching model to Mask2Former preserves compatibility and standard instance flow', () => {
    const mask2formerService = {
      ...mockService,
      selectedModel: 'mask2former',
    };

    render(<IntegrationHarness service={mask2formerService} />);

    // Open card
    fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));

    // When Mask2Former is selected:
    // Standard Run button exists (not "Run model")
    expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
    // No experimental badge
    expect(screen.queryByText('Experimental')).not.toBeInTheDocument();
    // No "Results are added to Objects" note
    expect(screen.queryByText('Results are added to Objects.')).not.toBeInTheDocument();
  });
});
