import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAnnotationKeyboardShortcuts from './useAnnotationKeyboardShortcuts';
import useAnnotationStore from '../stores/useAnnotationStore';
import { initialState } from '../stores/initialState';

const mocks = vi.hoisted(() => ({ requestRun: vi.fn(), busy: false }));
vi.mock('../components/annotationPage/workspace/ConceptSegmentationContext', () => ({
  useConceptSegmentation: () => mocks,
}));
vi.mock('./useAISegmentation', () => ({ default: () => ({ runSegmentation: vi.fn() }) }));
vi.mock('./useAiTools', () => ({ default: () => ({ isEnabled: () => true }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.busy = false;
  useAnnotationStore.setState({ ...initialState, workspace: { ...initialState.workspace, mode: 'annotate' } });
});

describe('concept segmentation keyboard shortcuts', () => {
  it.each(['2', '3'])('routes key %s through the same label action as the panel', (key) => {
    renderHook(() => useAnnotationKeyboardShortcuts());
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key })));
    expect(mocks.requestRun).toHaveBeenCalledTimes(1);
    expect(useAnnotationStore.getState().ui.instanceRunRequested).toBeFalsy();
  });
  it('blocks duplicate runs while saving', () => {
    mocks.busy = true;
    renderHook(() => useAnnotationKeyboardShortcuts());
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' })));
    expect(mocks.requestRun).not.toHaveBeenCalled();
  });
  it('cannot bypass the write-mode warning', () => {
    useAnnotationStore.getState().setInstanceWarningModalOpen(true);
    renderHook(() => useAnnotationKeyboardShortcuts());
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' })));
    expect(mocks.requestRun).not.toHaveBeenCalled();
  });
  it.each(['review', 'calibrate'])('does not start a label run in %s mode', (mode) => {
    useAnnotationStore.setState((state) => { state.workspace.mode = mode; });
    renderHook(() => useAnnotationKeyboardShortcuts());
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' })));
    expect(mocks.requestRun).not.toHaveBeenCalled();
  });
});
