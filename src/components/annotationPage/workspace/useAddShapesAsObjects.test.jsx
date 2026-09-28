import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import annotationSession from '../../../services/annotationSession';
import useAddShapesAsObjects from './useAddShapesAsObjects';

const addToast = vi.hoisted(() => vi.fn());

vi.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ addToast }) }));
vi.mock('../../../services/annotationSession', () => ({
  default: { isReady: vi.fn(() => true), addObject: vi.fn() },
}));

const outline = [
  { x: 10, y: 10 },
  { x: 20, y: 10 },
  { x: 20, y: 20 },
];

beforeEach(() => {
  vi.clearAllMocks();
  useAnnotationStore.setState((state) => {
    state.images.imageObject = { width: 100, height: 100 };
    state.objects.list = [{ id: 42, contour_id: 42 }];
    state.focusMode.active = false;
    state.focusMode.objectId = null;
    state.aiAnnotation.prompts = [];
    state.aiAnnotation.undoStack = [];
    state.aiAnnotation.redoStack = [];
  });
});

test('saves focused outlines under their original parent after exit and keeps skipped outlines', async () => {
  const store = useAnnotationStore.getState();
  store.enterFocusMode(42, {});
  store.addPolygonPrompt(outline);
  store.addPolygonPrompt(outline);
  store.exitFocusMode();
  store.addPolygonPrompt(outline); // A root outline must remain a root object.

  annotationSession.addObject
    .mockResolvedValueOnce({ type: 'object_added', success: true, data: { id: 101 } })
    .mockResolvedValueOnce({ type: 'success', success: true, data: { skipped: true } })
    .mockResolvedValueOnce({ type: 'object_added', success: true, data: { id: 102 } });

  const { result } = renderHook(() => useAddShapesAsObjects());
  await act(async () => { await result.current.addShapes(); });

  expect(annotationSession.addObject.mock.calls.map((call) => call[3])).toEqual([42, 42, null]);
  expect(useAnnotationStore.getState().aiAnnotation.prompts).toHaveLength(1);
  expect(useAnnotationStore.getState().aiAnnotation.prompts[0].parentContourId).toBe(42);
  expect(addToast).toHaveBeenCalledWith({ type: 'success', message: 'Added 2 annotations as objects' });
  expect(addToast).toHaveBeenCalledWith({ type: 'error', message: '1 outline was not saved and remains on the canvas.' });
});

test('keeps failed and unattempted outlines when a later add rejects', async () => {
  const store = useAnnotationStore.getState();
  store.addPolygonPrompt(outline);
  store.addPolygonPrompt(outline);
  store.addPolygonPrompt(outline);
  const originalIds = useAnnotationStore.getState().aiAnnotation.prompts.map((prompt) => prompt.id);

  annotationSession.addObject
    .mockResolvedValueOnce({ type: 'object_added', success: true, data: { id: 101 } })
    .mockRejectedValueOnce(new Error('socket closed'));
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  const { result } = renderHook(() => useAddShapesAsObjects());
  await act(async () => { await result.current.addShapes(); });

  expect(annotationSession.addObject).toHaveBeenCalledTimes(2);
  expect(useAnnotationStore.getState().aiAnnotation.prompts.map((prompt) => prompt.id)).toEqual(originalIds.slice(1));
  expect(addToast).toHaveBeenCalledWith({ type: 'error', message: 'socket closed' });
  consoleError.mockRestore();
});
