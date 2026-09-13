import { PROMPT, SERVER, routeRedo, routeUndo } from './undoRouting';

/**
 * One key drives two independent undo stacks, and every bug in this area has been
 * a routing bug rather than a stack bug. These tests walk the sequences a user
 * actually performs.
 */
describe('undo routing', () => {
  const ai = (over = {}) => ({
    tool: 'ai_annotation',
    promptUndoDepth: 0,
    promptRedoDepth: 0,
    serverCanUndo: false,
    serverCanRedo: false,
    lastUndoSource: null,
    ...over,
  });

  test('redo restores prompts after every prompt has been undone', () => {
    // The reported bug: four prompts drawn, then undone one by one. The canvas is
    // now empty, but all four are sitting on the prompt redo stack — redo must not
    // go asking the server, which has nothing and answers with an error.
    const afterUndoingAllFour = ai({
      promptUndoDepth: 0,
      promptRedoDepth: 4,
      serverCanRedo: false,
      lastUndoSource: PROMPT,
    });

    expect(routeRedo(afterUndoingAllFour)).toBe(PROMPT);
  });

  test('prompts are undone before the annotation history', () => {
    expect(routeUndo(ai({ promptUndoDepth: 2, serverCanUndo: true }))).toBe(PROMPT);
  });

  test('undo continues into the history once the prompt stack is spent', () => {
    expect(routeUndo(ai({ promptUndoDepth: 0, serverCanUndo: true }))).toBe(SERVER);
  });

  test('prompts are ignored outside the AI tool', () => {
    const drawing = ai({ tool: 'selection', promptUndoDepth: 3, serverCanUndo: true });
    expect(routeUndo(drawing)).toBe(SERVER);
    expect(routeRedo({ ...drawing, promptRedoDepth: 3, serverCanRedo: true })).toBe(SERVER);
  });

  test('nothing to undo or redo routes nowhere', () => {
    expect(routeUndo(ai())).toBeNull();
    expect(routeRedo(ai())).toBeNull();
  });

  test('redo retraces the stack the last undo used', () => {
    // Four prompts undone, then one object action. Redo must give the object
    // action back first, not jump to a prompt.
    const bothAvailable = ai({
      promptRedoDepth: 4,
      serverCanRedo: true,
      lastUndoSource: SERVER,
    });

    expect(routeRedo(bothAvailable)).toBe(SERVER);
    expect(routeRedo({ ...bothAvailable, lastUndoSource: PROMPT })).toBe(PROMPT);
  });

  test('a memory pointing at an empty stack falls back instead of failing', () => {
    // The remembered stack was drained some other way (a new prompt cleared the
    // prompt redo stack). Preferring it would route to a guaranteed error.
    const staleMemory = ai({
      promptRedoDepth: 0,
      serverCanRedo: true,
      lastUndoSource: PROMPT,
    });

    expect(routeRedo(staleMemory)).toBe(SERVER);
  });

  test('no memory at all still routes to whichever stack can answer', () => {
    expect(routeRedo(ai({ promptRedoDepth: 2 }))).toBe(PROMPT);
    expect(routeRedo(ai({ serverCanRedo: true }))).toBe(SERVER);
  });
});
