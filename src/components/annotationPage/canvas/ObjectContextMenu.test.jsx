import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ObjectContextMenu from './ObjectContextMenu';
import { deleteObject } from '../../../utils/objectOperations';

const { state, actions } = vi.hoisted(() => ({
  state: {},
  actions: {
    hide: vi.fn(), requestRun: vi.fn(), getLabelState: vi.fn(), update: vi.fn(), remove: vi.fn(),
    setTool: vi.fn(), enterFocus: vi.fn(), exitFocus: vi.fn(), lineEdit: vi.fn(), select: vi.fn(),
  },
}));
vi.mock('../../../stores/selectors/annotationSelectors', () => ({
  useContextMenuVisible: () => state.visible,
  useContextMenuX: () => 20,
  useContextMenuY: () => 20,
  useContextMenuTargetObjectId: () => state.targetId,
  useHideContextMenu: () => actions.hide,
  useEnterFocusMode: () => actions.enterFocus,
  useObjectsList: () => state.objects,
  useSelectedObjects: () => state.selected,
  useImageObject: () => ({ width: 800, height: 600 }),
  useUpdateObject: () => actions.update,
  useRemoveObject: () => actions.remove,
  useCurrentTool: () => 'selection',
  useSetCurrentTool: () => actions.setTool,
  useRefinementModeActive: () => false,
  useFocusModeActive: () => false,
  useFocusModeObjectId: () => null,
  useExitFocusMode: () => actions.exitFocus,
  useStartLineEdit: () => actions.lineEdit,
  useSelectObject: () => actions.select,
  useCurrentMaskId: () => 9,
  useArmedRelationshipName: () => null,
  useOpenSceneGraphPopover: () => vi.fn(),
}));
vi.mock('../workspace/ConceptSegmentationContext', () => ({
  useConceptSegmentation: () => state.contextEnabled ? {
    busy: state.busy, requestRun: actions.requestRun, getLabelState: actions.getLabelState,
  } : null,
}));
vi.mock('../../../contexts/DatasetContext', () => ({ useDataset: () => ({ currentDataset: { id: 15 } }) }));
vi.mock('../../../hooks/usePermissions', () => ({ usePermissions: () => ({ can: () => false }) }));
vi.mock('../../../hooks/useSceneGraphActions', () => ({ default: () => ({ addRelationships: vi.fn() }) }));
vi.mock('../../../hooks/useRefinementSession', () => ({ default: () => ({ enterRefinement: vi.fn() }) }));
vi.mock('../../../hooks/useZoomToObject', () => ({ useZoomToObject: () => ({ zoomToObject: vi.fn() }) }));
vi.mock('../../../hooks/useLabelSelection', () => ({ useLabelSelection: () => vi.fn() }));
vi.mock('../../../hooks/useLabelsHierarchy', () => ({ useLabelsHierarchy: () => ({ labelMap: new Map(), labelsLoading: false }) }));
vi.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../../../utils/objectOperations', () => ({ deleteObject: vi.fn() }));
vi.mock('../../../utils/contourOperations', () => ({ mergeObjects: vi.fn() }));
vi.mock('../../../services/annotationSession', () => ({ default: { focusImage: vi.fn(), isReady: () => false } }));
vi.mock('./HierarchicalLabelList', () => ({ default: () => null }));

const polyp = { id: 'polyp', contour_id: 104, labelId: 43, label: 'Coral Polyp', x: [0.2, 0.3, 0.3], y: [0.2, 0.2, 0.3] };

describe('object menu unified concept segmentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(state, { visible: true, contextEnabled: true, busy: false, targetId: 'polyp', selected: ['polyp'], objects: [polyp] });
    actions.requestRun.mockReturnValue(true);
    actions.getLabelState.mockReturnValue({ model: { registry_key: 'configured-model' }, reason: null });
    deleteObject.mockResolvedValue(undefined);
  });

  it('routes the target object’s label to the shared action and closes the menu', () => {
    render(<ObjectContextMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Segment label' }));
    expect(actions.getLabelState).toHaveBeenCalledWith(43);
    expect(actions.requestRun).toHaveBeenCalledExactlyOnceWith(43);
    expect(actions.hide).toHaveBeenCalledOnce();
    expect(screen.queryByText('Suggest Similar Instances')).not.toBeInTheDocument();
  });

  it('shows the shared hierarchy or model reason and prevents an unavailable run', () => {
    actions.getLabelState.mockReturnValue({ model: null, reason: 'Annotate an eligible parent first, or turn off Use hierarchy.' });
    render(<ObjectContextMenu />);
    const button = screen.getByRole('button', { name: 'Segment label' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Annotate an eligible parent first, or turn off Use hierarchy.');
    fireEvent.click(button);
    expect(actions.requestRun).not.toHaveBeenCalled();
  });

  it('blocks duplicate dispatch while the shared runner is busy', () => {
    state.busy = true;
    render(<ObjectContextMenu />);
    expect(screen.getByRole('button', { name: 'Segmenting…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Segmenting…' }));
    expect(actions.requestRun).not.toHaveBeenCalled();
  });

  it('does not guess a concept for an unlabeled object or mixed-label selection', () => {
    state.objects = [{ ...polyp, labelId: null, label: '' }];
    const { unmount } = render(<ObjectContextMenu />);
    expect(screen.getByRole('button', { name: 'Segment label' })).toBeDisabled();
    unmount();
    state.objects = [polyp, { id: 'fragment', contour_id: 101, labelId: 41, label: 'Coral Fragment' }];
    state.selected = ['polyp', 'fragment'];
    render(<ObjectContextMenu />);
    expect(screen.getByRole('button', { name: 'Segment label' })).toHaveAttribute('title', 'Select objects of one label to segment that label.');
  });

  it('allows several selected objects of the same label to use one concept action', () => {
    state.objects = [polyp, { ...polyp, id: 'polyp-2', contour_id: 105 }];
    state.selected = ['polyp', 'polyp-2'];
    render(<ObjectContextMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Segment label' }));
    expect(actions.requestRun).toHaveBeenCalledExactlyOnceWith(43);
  });

  it('preserves the existing object rejection action', async () => {
    render(<ObjectContextMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject object' }));
    await waitFor(() => expect(deleteObject).toHaveBeenCalledWith(polyp, actions.remove));
    expect(actions.requestRun).not.toHaveBeenCalled();
    expect(actions.hide).toHaveBeenCalledOnce();
  });
});
