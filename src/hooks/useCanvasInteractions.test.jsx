import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useCanvasInteractions } from './useCanvasInteractions';
import { MAX_ZOOM } from '../components/annotationPage/workspace/constants';
import useAnnotationStore from '../stores/useAnnotationStore';

/**
 * In Annotate mode a Konva stage (the AI-prompt or manual-draw canvas) sits inside this
 * container and drives zoom and pan from the same store values. Konva's `onWheel` does not
 * stop the native event, so without a guard a single wheel notch reaches both handlers and
 * applies two zoom steps and two conflicting pan writes. Calibrate mode mounts no stage.
 */
const CONTAINER = { width: 1000, height: 600 };
const IMAGE = { width: 2000, height: 1000 };

const stubRect = (el, rect) => {
  el.getBoundingClientRect = () => ({
    left: 0, top: 0, right: rect.width, bottom: rect.height,
    width: rect.width, height: rect.height, x: 0, y: 0, toJSON() {},
  });
};

let container;

const wheelAt = (target, deltaY = -100) =>
  act(() => {
    target.dispatchEvent(new WheelEvent('wheel', {
      deltaY, clientX: 800, clientY: 300, bubbles: true, cancelable: true,
    }));
  });

beforeEach(() => {
  container = document.createElement('div');
  stubRect(container, CONTAINER);
  document.body.appendChild(container);

  useAnnotationStore.setState((state) => {
    state.images.zoomLevel = 1;
    state.images.panOffset = { x: 0, y: 0 };
    state.ui.currentTool = 'ai_annotation';
  });
});

afterEach(() => {
  container.remove();
});

describe('useCanvasInteractions wheel ownership', () => {
  test('zooms when the wheel happens over the plain canvas', () => {
    renderHook(() => useCanvasInteractions({ current: container }, IMAGE));

    wheelAt(container);

    expect(useAnnotationStore.getState().images.zoomLevel).toBeCloseTo(1.1, 6);
  });

  test('leaves the wheel to the Konva stage when one owns the pointer', () => {
    const konvaContent = document.createElement('div');
    konvaContent.className = 'konvajs-content';
    const canvas = document.createElement('canvas');
    konvaContent.appendChild(canvas);
    container.appendChild(konvaContent);

    renderHook(() => useCanvasInteractions({ current: container }, IMAGE));

    wheelAt(canvas);

    // The stage's own handler owns this event; this hook must not apply a second step.
    expect(useAnnotationStore.getState().images.zoomLevel).toBe(1);
    expect(useAnnotationStore.getState().images.panOffset).toEqual({ x: 0, y: 0 });
  });

  test('zooming out from the container still works', () => {
    renderHook(() => useCanvasInteractions({ current: container }, IMAGE));

    wheelAt(container, 100);

    expect(useAnnotationStore.getState().images.zoomLevel).toBeCloseTo(1 / 1.1, 6);
  });

  // Reads the constant rather than a literal: what matters is that the wheel honours the
  // configured ceiling, not what that ceiling currently is.
  test('does not zoom past the shared limit', () => {
    useAnnotationStore.setState((state) => { state.images.zoomLevel = MAX_ZOOM; });
    renderHook(() => useCanvasInteractions({ current: container }, IMAGE));

    wheelAt(container);

    expect(useAnnotationStore.getState().images.zoomLevel).toBe(MAX_ZOOM);
  });

  test('zooms in past the old 400% ceiling', () => {
    useAnnotationStore.setState((state) => { state.images.zoomLevel = 4; });
    renderHook(() => useCanvasInteractions({ current: container }, IMAGE));

    wheelAt(container);

    expect(useAnnotationStore.getState().images.zoomLevel).toBeCloseTo(4.4, 6);
  });
});
