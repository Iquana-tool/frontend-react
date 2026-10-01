import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AIPromptCanvas from './AIPromptCanvas';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { imageRectOnScreen } from '../../../utils/canvasViewport';

let stageProps;
let container;
let root;
const originalResizeObserver = globalThis.ResizeObserver;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-konva', () => ({
  Stage: React.forwardRef((props, ref) => {
    stageProps = props;
    return <div ref={ref} data-testid="stage" />;
  }),
  Layer: () => null,
  Image: () => null,
  Rect: () => null,
  Circle: () => null,
  Line: () => null,
  Group: () => null,
  Text: () => null,
  Label: () => null,
  Tag: () => null,
}));

const focusedPolygon = [[10, 10], [50, 10], [50, 50], [10, 50]];

const stageEvent = (x, y) => {
  const stage = { getPointerPosition: () => ({ x, y }) };
  return { target: { getStage: () => stage }, evt: { button: 0 } };
};

const pointOnStage = (x, y, zoom) => {
  const rect = imageRectOnScreen({
    zoom,
    pan: { x: 0, y: 0 },
    containerSize: { width: 100, height: 100 },
    imageSize: { width: 100, height: 100 },
  });
  return { x: rect.x + (x / 100) * rect.width, y: rect.y + (y / 100) * rect.height };
};

const drawBox = (x1, y1, x2, y2, zoom) => {
  const start = pointOnStage(x1, y1, zoom);
  const end = pointOnStage(x2, y2, zoom);
  act(() => stageProps.onMouseDown(stageEvent(start.x, start.y)));
  act(() => stageProps.onMouseMove(stageEvent(end.x, end.y)));
  act(() => stageProps.onMouseUp(stageEvent(end.x, end.y)));
};

const renderCanvas = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<AIPromptCanvas />));
};

const setPromptState = (promptMode, zoomLevel = 1) => {
  const state = useAnnotationStore.getState();
  useAnnotationStore.setState({
    ui: { ...state.ui, currentTool: 'ai_annotation' },
    aiAnnotation: {
      ...state.aiAnnotation,
      prompts: [],
      activePreview: null,
      promptMode,
      undoStack: [],
      redoStack: [],
    },
    focusMode: { ...state.focusMode, active: true, objectMask: { points: focusedPolygon } },
    images: {
      ...state.images,
      imageObject: { width: 100, height: 100 },
      imageLoading: false,
      imageError: null,
      zoomLevel,
      panOffset: { x: 0, y: 0 },
    },
    models: {
      ...state.models,
      promptedModel: 'test-model',
      availablePromptedModels: [{ id: 'test-model', supported_prompt_types: ['box'] }],
    },
  });
};

describe('AIPromptCanvas focused box prompts', () => {
  beforeEach(() => {
    stageProps = null;
    root = null;
    container = null;
    globalThis.ResizeObserver = class {
      constructor(callback) { this.callback = callback; }
      observe() { this.callback([{ contentRect: { width: 100, height: 100 } }]); }
      disconnect() {}
    };
    setPromptState('box');
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    container?.remove();
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it.each([
    ['box', 1],
    ['box', 1.4],
    ['point', 1],
    ['point', 1.4],
  ])('accepts a box crossing the focused contour in %s mode at %sx zoom', (mode, zoom) => {
    setPromptState(mode, zoom);
    renderCanvas();

    drawBox(20, 20, 60, 40, zoom);

    const prompts = useAnnotationStore.getState().aiAnnotation.prompts;
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatchObject({
      type: 'box',
      coords: { x1: 20, y1: 20, x2: 60, y2: 40 },
    });
    expect(container.textContent).not.toContain('Box annotation is outside the focused object boundary');
  });

  it('accepts an ordinary inside-parent box and ignores a too-small box', () => {
    renderCanvas();

    drawBox(20, 20, 40, 40, 1);
    expect(useAnnotationStore.getState().aiAnnotation.prompts).toHaveLength(1);

    useAnnotationStore.setState((state) => ({
      aiAnnotation: { ...state.aiAnnotation, prompts: [] },
    }));
    drawBox(20, 20, 22, 40, 1);
    expect(useAnnotationStore.getState().aiAnnotation.prompts).toHaveLength(0);
    expect(container.textContent).not.toContain('Box annotation is outside the focused object boundary');
  });

  it('ignores a box released outside the image', () => {
    renderCanvas();

    const start = pointOnStage(20, 20, 1);
    const inside = pointOnStage(80, 40, 1);
    act(() => stageProps.onMouseDown(stageEvent(start.x, start.y)));
    act(() => stageProps.onMouseMove(stageEvent(inside.x, inside.y)));
    act(() => stageProps.onMouseUp(stageEvent(110, inside.y)));

    expect(useAnnotationStore.getState().aiAnnotation.prompts).toHaveLength(0);
  });
});
