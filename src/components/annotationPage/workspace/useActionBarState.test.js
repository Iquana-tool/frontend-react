import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import useAnnotationStore from '../../../stores/useAnnotationStore';
import useActionBarState from './useActionBarState';
import useInferenceProgress from './useInferenceProgress';

beforeEach(() => {
  useAnnotationStore.setState((state) => {
    state.inference.run = null;
    state.aiAnnotation.prompts = [];
    state.aiAnnotation.isSubmitting = false;
    state.models.isRunningSuggestion = false;
    state.objects.list = [];
    state.images.imageObject = { width: 100, height: 100 };
  });
});

describe('action bar while a model run is open', () => {
  test('keeps reporting a suggestion run after its ack, until the streamed objects are in', () => {
    const { result } = renderHook(() => useActionBarState());
    let id;
    act(() => {
      id = useAnnotationStore.getState().beginInferenceRun({ kind: 'suggest', modelKey: 'm' });
      // The request has returned: the hook's own running flag is already off.
      useAnnotationStore.getState().ackInferenceRun(id, { expected: 3 });
    });
    expect(result.current.state).toBe('running');
    expect(result.current.runKind).toBe('suggest');

    act(() => useAnnotationStore.getState().endInferenceRun(id, { outcome: 'success' }));
    expect(result.current.state).toBe('idle');
  });

  test('shows a percentage that holds below 100 while the run is open', () => {
    const run = { id: 1, phase: 'settling', startedAt: Date.now() - 60_000, etaS: 2 };
    const { result } = renderHook(() => useInferenceProgress(run));
    expect(result.current.percent).toBe(99);
    const { result: none } = renderHook(() => useInferenceProgress({ ...run, phase: 'ending' }));
    expect(none.current).toBeNull();
  });
});
