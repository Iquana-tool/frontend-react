import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import useGuideRunner from './useGuideRunner';
import useGuideStore from './guideStore';
import { ANNOTATION_GUIDES, WELCOME_GUIDE_ID } from './annotationGuides';
import useAnnotationStore from '../../stores/useAnnotationStore';
import { initialState } from '../../stores/initialState';

const getCtx = () => ({ can: () => true, isCompleted: () => false, objectsAddedThisSession: 0 });

const renderRunner = () =>
  renderHook(() => useGuideRunner({ guides: ANNOTATION_GUIDES, api: useAnnotationStore, getCtx }));

const annotate = (recipe) => act(() => useAnnotationStore.setState(recipe));

describe('useGuideRunner', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAnnotationStore.setState((state) => {
      state.aiAnnotation = structuredClone(initialState.aiAnnotation);
      state.objects.list = [];
      state.objects.selected = [];
      state.focusMode = structuredClone(initialState.focusMode);
      state.editMode = structuredClone(initialState.editMode);
      state.contextMenu = structuredClone(initialState.contextMenu);
      state.ui.currentTool = 'ai_annotation';
      state.workspace.mode = 'annotate';
      state.workspace.promptAction = 'nothing';
      state.models.availablePromptedModels = [{ id: 'sam2', name: 'SAM 2' }];
    });
    useGuideStore.setState({ userKey: null, active: null, offer: null, completion: null });
    useGuideStore.getState().hydrate('tester');
  });

  test('walks the first guide as the user acts, then suggests the next one', () => {
    const { result } = renderRunner();
    act(() => useGuideStore.getState().startGuide(WELCOME_GUIDE_ID));

    // The Point tool is the default, so "pick the Point tool" passes straight through.
    expect(result.current.index).toBe(1);

    annotate((state) => {
      state.aiAnnotation.prompts = [{ type: 'point', coords: { x: 1, y: 1 } }];
    });
    expect(result.current.step.anchor).toBe('action-run-ai');

    annotate((state) => {
      state.aiAnnotation.prompts = [];
      state.objects.list = [{ id: 'new-1', label: null }];
    });
    expect(result.current.step.anchor).toBe('action-assign-label');

    annotate((state) => {
      state.objects.list[0].label = 'coral';
    });
    // The last step is explanation only: it waits for Done.
    expect(result.current.step.anchor).toBe('right-panel');

    act(() => result.current.next());
    expect(useGuideStore.getState().active).toBeNull();
    expect(useGuideStore.getState().guides[WELCOME_GUIDE_ID].status).toBe('completed');
    // Ended by Done: no completion card on top of the click, just the next guide.
    expect(useGuideStore.getState().completion).toBeNull();
    expect(useGuideStore.getState().offer).toEqual({ id: 'prompt-actions', kind: 'next' });
  });

  test('Esc out of focus mode ends the focus guide on a completion card, not silently', () => {
    const { result } = renderRunner();
    annotate((state) => {
      state.focusMode.active = true;
      state.focusMode.objectId = 'parent';
    });
    act(() => useGuideStore.getState().startGuide('focus-mode'));
    // Already focused, so "click a labelled object" passes through.
    expect(result.current.step.title).toBe('Everything you add now goes inside it');

    // Esc, pressed while the explanation is still on screen.
    annotate((state) => {
      state.focusMode.active = false;
      state.focusMode.objectId = null;
    });
    expect(useGuideStore.getState().active).toBeNull();
    expect(useGuideStore.getState().guides['focus-mode'].status).toBe('completed');
    // …and offers the object menu next, which is where Focus Mode also lives.
    expect(useGuideStore.getState().completion).toEqual({ id: 'focus-mode', nextId: 'object-menu' });
  });

  test('losing the selection mid-guide returns to the step that makes one', () => {
    const { result } = renderRunner();
    annotate((state) => {
      state.objects.list = [{ id: 'a', label: 'coral' }];
      state.objects.selected = ['a'];
    });
    act(() => useGuideStore.getState().startGuide('fix-outline'));
    act(() => result.current.next()); // past "three ways", onto "Try Edit contour"
    expect(result.current.step.anchor).toBe('action-edit-contour');

    // Esc clears the selection; the Edit contour button goes with it.
    annotate((state) => {
      state.objects.selected = [];
    });
    expect(result.current.index).toBe(0);
    expect(result.current.step.title).toBe('Select an object');
  });

  test('the object-menu guide follows the right-click menu opening and closing', () => {
    const { result } = renderRunner();
    act(() => useGuideStore.getState().startGuide('object-menu'));
    expect(result.current.step.anchor).toBe('rail-tool-select');

    annotate((state) => {
      state.ui.currentTool = 'selection';
    });
    expect(result.current.step.title).toBe('Right-click an object');

    annotate((state) => {
      state.contextMenu.visible = true;
      state.contextMenu.targetObjectId = 'a';
    });
    expect(result.current.step.anchor).toBe('object-menu');

    // Any click closes the menu; the guide ends on its completion card.
    annotate((state) => {
      state.contextMenu.visible = false;
    });
    expect(useGuideStore.getState().completion).toEqual({ id: 'object-menu', nextId: null });
  });

  test('a right-click on an Objects-panel row skips the Select-tool step', () => {
    const { result } = renderRunner();
    act(() => useGuideStore.getState().startGuide('object-menu'));
    annotate((state) => {
      state.contextMenu.visible = true;
    });
    expect(result.current.step.anchor).toBe('object-menu');
  });

  test('the label step selects the new object so its label button is on screen', () => {
    const { result } = renderRunner();
    act(() => useGuideStore.getState().startGuide(WELCOME_GUIDE_ID));
    annotate((state) => {
      state.objects.list = [{ id: 'fresh', label: null }];
    });
    expect(result.current.step.anchor).toBe('action-assign-label');
    expect(useAnnotationStore.getState().objects.selected).toEqual(['fresh']);
  });

  test('stepping back onto a step that already holds does not bounce forward again', () => {
    const { result } = renderRunner();
    act(() => useGuideStore.getState().startGuide(WELCOME_GUIDE_ID));
    expect(result.current.index).toBe(1);

    act(() => result.current.back());
    expect(result.current.index).toBe(0);
  });

  test('starting a guide puts the workspace on its tab', () => {
    renderRunner();
    act(() => useGuideStore.getState().startGuide('review'));
    expect(useAnnotationStore.getState().workspace.mode).toBe('review');
  });

  test('a condition that was already true when a guide began does not count', () => {
    const { result } = renderRunner();
    annotate((state) => {
      state.objects.list = [{ id: 'old', label: 'coral' }];
    });
    act(() => useGuideStore.getState().startGuide(WELCOME_GUIDE_ID));
    annotate((state) => {
      state.aiAnnotation.prompts = [{ type: 'point', coords: { x: 1, y: 1 } }];
    });
    // An object that existed before the guide is not "the new object".
    expect(result.current.step.anchor).toBe('action-run-ai');
  });
});
