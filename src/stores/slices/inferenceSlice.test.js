import { beforeEach, describe, expect, test } from 'vitest';

import useAnnotationStore from '../useAnnotationStore';

const run = () => useAnnotationStore.getState().inference.run;

beforeEach(() => {
  useAnnotationStore.setState((state) => {
    state.inference.run = null;
    state.aiAnnotation.prompts = [];
    state.focusMode.active = false;
    state.focusMode.objectId = null;
    state.images.imageObject = { width: 200, height: 100 };
    state.objects.list = [{ id: 1, contour_id: 11, x: [0.1, 0.2, 0.2], y: [0.1, 0.1, 0.2] }];
  });
});

describe('inference run', () => {
  test('a box prompt only moves the origin to its centre and does not limit the region', () => {
    const { addBoxPrompt, addPointPrompt, beginInferenceRun } = useAnnotationStore.getState();
    addBoxPrompt(20, 10, 60, 50);
    addPointPrompt(100, 50, 'negative');

    beginInferenceRun({ kind: 'segment', modelKey: 'sam', fromPrompts: true });

    expect(run().positives).toEqual([{ x: 0.2, y: 0.3 }]);
    expect(run().negatives).toEqual([{ x: 0.5, y: 0.5 }]);
    expect(run().scopeContourId).toBeNull();
    expect(run().knownContourIds).toEqual([11]);
  });

  test('focus mode limits a prompted run to the focused object', () => {
    useAnnotationStore.setState((state) => {
      state.focusMode.active = true;
      state.focusMode.objectId = 1;
    });
    useAnnotationStore.getState().beginInferenceRun({ kind: 'segment', modelKey: 'sam' });
    expect(run().scopeContourId).toBe(11);
  });

  test('the ack opens the settling phase with the announced count', () => {
    const { beginInferenceRun, ackInferenceRun } = useAnnotationStore.getState();
    const id = beginInferenceRun({ kind: 'suggest', modelKey: 'm' });
    ackInferenceRun(id, { expected: 3 });
    expect(run().phase).toBe('settling');
    expect(run().expected).toBe(3);
  });

  test('a failed ack ends the run as a failure', () => {
    const { beginInferenceRun, ackInferenceRun } = useAnnotationStore.getState();
    const id = beginInferenceRun({ kind: 'instance', modelKey: 'm' });
    ackInferenceRun(id, { failed: true });
    expect(run().phase).toBe('ending');
    expect(run().outcome).toBe('fail');
  });

  test('a late reply to an older run does not touch the newer one', () => {
    const { beginInferenceRun, ackInferenceRun, endInferenceRun, clearInferenceRun } = useAnnotationStore.getState();
    const old = beginInferenceRun({ kind: 'segment', modelKey: 'm' });
    const current = beginInferenceRun({ kind: 'segment', modelKey: 'm' });
    ackInferenceRun(old, { failed: true });
    endInferenceRun(old, { outcome: 'success' });
    clearInferenceRun(old);
    expect(run().id).toBe(current);
    expect(run().phase).toBe('running');
  });
});
