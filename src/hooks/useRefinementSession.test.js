import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useRefinementSession from './useRefinementSession';
import useAnnotationStore from '../stores/useAnnotationStore';
import annotationSession from '../services/annotationSession';

vi.mock('../services/annotationSession', () => ({
  default: {
    isReady: vi.fn(() => true),
    selectRefinementObject: vi.fn().mockResolvedValue({ success: true }),
    unselectRefinementObject: vi.fn().mockResolvedValue({ success: true }),
    unfocusImage: vi.fn().mockResolvedValue({ success: true }),
    modifyObject: vi.fn().mockResolvedValue({ success: true }),
  },
}));

const square = (offset = 0) => ({
  x: [0.1 + offset, 0.5 + offset, 0.5 + offset, 0.1 + offset],
  y: [0.1, 0.1, 0.5, 0.5],
});

const OBJECTS = [
  { id: 1, contour_id: 101, label: 'Coral', ...square() },
  { id: 2, contour_id: 202, label: 'Sponge', ...square(0.2) },
  // Drawn but not yet acknowledged by the backend, so nothing to modify.
  { id: 3, contour_id: null, label: 'Fresh', ...square(0.4) },
];

const state = () => useAnnotationStore.getState();

/**
 * The three ways of fixing an outline are one mode with three tools. What that
 * has to hold true is: one backend selection for the whole session, an edit
 * saved when the user reaches for another tool rather than dropped, and the
 * armed tool remembered for the next object.
 */
describe('useRefinementSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useAnnotationStore.setState((draft) => {
      draft.objects.list = OBJECTS.map((object) => ({ ...object }));
      draft.objects.selected = [];
      draft.workspace.refinementTool = 'ai';
      draft.ui.currentTool = 'ai_annotation';
    });
    state().exitRefinementMode();
    state().exitEditMode();
    state().stopLineEdit();
  });

  it('opens on the armed tool, announcing the object once', async () => {
    const { result } = renderHook(() => useRefinementSession());

    await act(async () => { await result.current.enterRefinement(OBJECTS[0]); });

    expect(annotationSession.selectRefinementObject).toHaveBeenCalledTimes(1);
    expect(annotationSession.selectRefinementObject).toHaveBeenCalledWith(101);
    expect(state().aiAnnotation.refinementMode.active).toBe(true);
    expect(state().aiAnnotation.refinementMode.objectId).toBe(1);
    expect(state().objects.selected).toContain(1);
    // The AI tool draws on the prompt canvas.
    expect(state().ui.currentTool).toBe('ai_annotation');
    expect(state().editMode.active).toBe(false);
    expect(state().lineEdit.active).toBe(false);
  });

  it('switches tools without re-announcing the object', async () => {
    const { result } = renderHook(() => useRefinementSession());
    await act(async () => { await result.current.enterRefinement(OBJECTS[0]); });

    act(() => { result.current.switchRefinementTool('points'); });
    expect(state().editMode.active).toBe(true);
    expect(state().editMode.objectId).toBe(1);
    // The control-point overlay owns the canvas, so the prompt canvas steps off.
    expect(state().ui.currentTool).toBe('selection');

    act(() => { result.current.switchRefinementTool('draw'); });
    expect(state().editMode.active).toBe(false);
    expect(state().lineEdit.active).toBe(true);
    expect(state().lineEdit.mode).toBe('reshape');
    expect(state().lineEdit.contourId).toBe(101);

    // One selection for the whole session, whichever tool is in front.
    expect(annotationSession.selectRefinementObject).toHaveBeenCalledTimes(1);
    expect(annotationSession.unselectRefinementObject).not.toHaveBeenCalled();
    expect(state().aiAnnotation.refinementMode.active).toBe(true);
  });

  it('saves a point edit when the user reaches for another tool', async () => {
    const { result } = renderHook(() => useRefinementSession());
    await act(async () => { await result.current.enterRefinement(OBJECTS[0], { tool: 'points' }); });

    act(() => { state().moveVertex(0, 0.42, 0.44); });
    expect(state().editMode.isDirty).toBe(true);
    const draft = state().editMode.draftCoordinates;

    act(() => { result.current.switchRefinementTool('draw'); });

    expect(annotationSession.modifyObject).toHaveBeenCalledWith(101, {
      x: draft.x,
      y: draft.y,
    });
    const saved = state().objects.list.find((object) => object.id === 1);
    expect(saved.x).toEqual(draft.x);
  });

  it('remembers the tool across objects and reloads', async () => {
    const { result, rerender } = renderHook(() => useRefinementSession());
    await act(async () => { await result.current.enterRefinement(OBJECTS[0]); });

    act(() => { result.current.switchRefinementTool('draw'); });
    rerender();
    await act(async () => { await result.current.exitRefinement(); });

    expect(state().workspace.refinementTool).toBe('draw');
    expect(window.localStorage.getItem('iquana.workspace.refinementTool')).toBe('draw');

    rerender();
    await act(async () => { await result.current.enterRefinement(OBJECTS[1]); });
    expect(state().lineEdit.active).toBe(true);
    expect(state().lineEdit.objectId).toBe(2);
  });

  it('falls back to the AI tool on an object with no saved contour', async () => {
    const { result } = renderHook(() => useRefinementSession());

    await act(async () => { await result.current.enterRefinement(OBJECTS[2], { tool: 'points' }); });

    expect(state().editMode.active).toBe(false);
    expect(state().workspace.refinementTool).toBe('ai');
    expect(state().ui.currentTool).toBe('ai_annotation');
  });

  it('releases the selection and every tool on exit', async () => {
    const { result, rerender } = renderHook(() => useRefinementSession());
    await act(async () => { await result.current.enterRefinement(OBJECTS[0], { tool: 'points' }); });
    rerender();

    await act(async () => { await result.current.exitRefinement(); });

    expect(annotationSession.unselectRefinementObject).toHaveBeenCalledTimes(1);
    expect(state().aiAnnotation.refinementMode.active).toBe(false);
    expect(state().editMode.active).toBe(false);
    expect(state().lineEdit.active).toBe(false);
    expect(state().images.zoomLevel).toBe(1);
  });

  it('is a no-op when asked to exit a mode that is not open', async () => {
    const { result } = renderHook(() => useRefinementSession());

    await act(async () => { await result.current.exitRefinement(); });

    expect(annotationSession.unselectRefinementObject).not.toHaveBeenCalled();
  });
});
