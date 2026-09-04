import { beforeEach, describe, expect, test } from 'vitest';

import useAnnotationStore from '../useAnnotationStore';
import { PROMPT, SERVER, routeUndo } from '../../hooks/undoRouting';

/**
 * `consumePrompts` takes an optional predicate so that "Add this object" can commit the
 * drawn outlines while leaving a box or point on the canvas, which is still a prompt
 * waiting for Run AI.
 *
 * Ctrl+Z routes on the prompt undo stack rather than on what is drawn (see undoRouting.js),
 * so whenever prompts survive a consume, their history has to survive with them. Dropping
 * the stack while prompts remain sends the next Ctrl+Z to the annotation history and
 * deletes an object the user was not undoing.
 */
const OUTLINE = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
];

const isOutline = (prompt) => prompt.type === 'polygon';

const promptState = () => useAnnotationStore.getState().aiAnnotation;

beforeEach(() => {
  useAnnotationStore.setState((state) => {
    state.aiAnnotation.prompts = [];
    state.aiAnnotation.undoStack = [];
    state.aiAnnotation.redoStack = [];
    state.aiAnnotation.activePreview = null;
  });
});

describe('consumePrompts and the prompt undo stack', () => {
  test('a prompt left on the canvas is still undoable once the outlines are committed', () => {
    const { addPointPrompt, addPolygonPrompt, consumePrompts } = useAnnotationStore.getState();

    addPointPrompt(5, 5, 'positive');
    addPolygonPrompt(OUTLINE);

    // "Add this object": the outline becomes an object, the point stays on the canvas.
    consumePrompts(isOutline);

    expect(promptState().prompts).toHaveLength(1);
    expect(promptState().prompts[0].type).toBe('point');

    // The point is still there to be taken back, so Ctrl+Z belongs to the prompt stack.
    expect(promptState().undoStack.length).toBeGreaterThan(0);
    expect(
      routeUndo({
        tool: 'ai_annotation',
        promptUndoDepth: promptState().undoStack.length,
        serverCanUndo: true,
      })
    ).toBe(PROMPT);
  });

  test('undoing after a partial consume removes the surviving prompt', () => {
    const { addPointPrompt, addPolygonPrompt, consumePrompts, undoLastAction } =
      useAnnotationStore.getState();

    addPointPrompt(5, 5, 'positive');
    addPolygonPrompt(OUTLINE);
    consumePrompts(isOutline);

    undoLastAction();

    expect(promptState().prompts).toHaveLength(0);
  });

  test('undo cannot bring back an outline that was already committed', () => {
    const { addPolygonPrompt, addPointPrompt, consumePrompts, undoLastAction } =
      useAnnotationStore.getState();

    addPolygonPrompt(OUTLINE);
    addPointPrompt(5, 5, 'positive');
    consumePrompts(isOutline);

    // Walk the whole stack back; no step may resurrect the committed outline.
    for (let i = 0; i < 5; i += 1) undoLastAction();

    expect(promptState().prompts.some(isOutline)).toBe(false);
  });

  test('consuming every prompt hands the next undo to the annotation history', () => {
    const { addPointPrompt, addPolygonPrompt, consumePrompts } = useAnnotationStore.getState();

    addPointPrompt(5, 5, 'positive');
    addPolygonPrompt(OUTLINE);

    // Run AI consumes everything: the object is now the thing to undo, not the prompts.
    consumePrompts();

    expect(promptState().prompts).toHaveLength(0);
    expect(promptState().undoStack).toHaveLength(0);
    expect(promptState().redoStack).toHaveLength(0);
    expect(
      routeUndo({ tool: 'ai_annotation', promptUndoDepth: 0, serverCanUndo: true })
    ).toBe(SERVER);
  });

  test('a consume that matches nothing leaves the history untouched', () => {
    const { addPointPrompt, consumePrompts, undoLastAction } = useAnnotationStore.getState();

    addPointPrompt(5, 5, 'positive');
    addPointPrompt(6, 6, 'positive');
    consumePrompts(isOutline);

    expect(promptState().prompts).toHaveLength(2);

    undoLastAction();
    expect(promptState().prompts).toHaveLength(1);
    undoLastAction();
    expect(promptState().prompts).toHaveLength(0);
  });
});
