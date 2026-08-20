import {
  RAIL_TOOLS,
  PROMPT_ACTION_IDS,
  ADDABLE_PROMPT_TYPES,
  nextPromptAction,
  railToolFromStore,
  shapeUnavailableForAction,
  storeStateForRailTool,
  storeStateForActionChange,
} from './toolModel';

/**
 * The rail carries shapes; the prompt action says what happens once one is
 * placed. "Freedraw" and "freehand" are the same gesture, so there is no
 * manual-drawing tool.
 */
describe('the two axes', () => {
  it('keeps the rail to shapes and navigation', () => {
    expect(RAIL_TOOLS.map((tool) => tool.id)).toEqual(
      ['select', 'point', 'box', 'polygon', 'freehand', 'brush', 'pan', 'zoom']
    );
  });

  it('offers three prompt actions, cycled by A, starting at Nothing', () => {
    expect(PROMPT_ACTION_IDS).toEqual(['nothing', 'ai', 'manual']);
    expect(nextPromptAction('nothing')).toBe('ai');
    expect(nextPromptAction('ai')).toBe('manual');
    expect(nextPromptAction('manual')).toBe('nothing');
  });
});

describe('nothing — the bar offers both actions', () => {
  it('leaves every shape on the prompt canvas and every shape available', () => {
    for (const shape of ['point', 'box', 'polygon', 'freehand']) {
      expect(storeStateForRailTool(shape, 'nothing')).toEqual({
        currentTool: 'ai_annotation',
        promptMode: shape,
      });
      expect(shapeUnavailableForAction(shape, 'nothing')).toBeNull();
    }
  });

  it('counts outlines, not boxes or points, as addable', () => {
    expect(ADDABLE_PROMPT_TYPES.has('polygon')).toBe(true);
    expect(ADDABLE_PROMPT_TYPES.has('box')).toBe(false);
    expect(ADDABLE_PROMPT_TYPES.has('point')).toBe(false);
  });
});

describe('ai — a placed prompt runs the model at once', () => {
  it('still routes every shape to the prompt canvas', () => {
    for (const shape of ['point', 'box', 'polygon', 'freehand']) {
      expect(storeStateForRailTool(shape, 'ai')).toEqual({
        currentTool: 'ai_annotation',
        promptMode: shape,
      });
      expect(shapeUnavailableForAction(shape, 'ai')).toBeNull();
    }
  });
});

describe('manual — a closed outline is added at once', () => {
  it('routes polygon and freehand to the manual canvas', () => {
    expect(storeStateForRailTool('freehand', 'manual')).toEqual({
      currentTool: 'manual_drawing',
      manualDrawMode: 'freehand',
    });
    expect(storeStateForRailTool('polygon', 'manual')).toEqual({
      currentTool: 'manual_drawing',
      manualDrawMode: 'polygon',
    });
  });

  it('offers neither a point nor a box, which cannot be added', () => {
    expect(shapeUnavailableForAction('point', 'manual')).toBeTruthy();
    expect(shapeUnavailableForAction('box', 'manual')).toBeTruthy();
    expect(shapeUnavailableForAction('polygon', 'manual')).toBeNull();
    expect(shapeUnavailableForAction('freehand', 'manual')).toBeNull();
  });

  it('reads back as the shape being drawn', () => {
    expect(railToolFromStore({ currentTool: 'manual_drawing', manualDrawMode: 'freehand' }))
      .toBe('freehand');
    expect(railToolFromStore({ currentTool: 'manual_drawing', manualDrawMode: 'polygon' }))
      .toBe('polygon');
  });
});

describe('switching the action keeps the shape where it can', () => {
  it('moves the same shape between the canvases', () => {
    expect(storeStateForActionChange('freehand', 'manual')).toEqual({
      currentTool: 'manual_drawing',
      manualDrawMode: 'freehand',
    });
    expect(storeStateForActionChange('freehand', 'nothing')).toEqual({
      currentTool: 'ai_annotation',
      promptMode: 'freehand',
    });
  });

  it('falls back to freehand rather than leaving a dead rail', () => {
    expect(storeStateForActionChange('point', 'manual')).toEqual({
      currentTool: 'manual_drawing',
      manualDrawMode: 'freehand',
    });
    expect(storeStateForActionChange('box', 'manual')).toEqual({
      currentTool: 'manual_drawing',
      manualDrawMode: 'freehand',
    });
  });

  it('keeps a point armed where a point is still offered', () => {
    expect(storeStateForActionChange('point', 'ai')).toEqual({
      currentTool: 'ai_annotation',
      promptMode: 'point',
    });
  });

  it('leaves the navigation tools alone', () => {
    expect(storeStateForActionChange('pan', 'manual')).toBeNull();
    expect(storeStateForActionChange('select', 'ai')).toBeNull();
  });
});

describe('the rest of the mapping is unchanged', () => {
  it('reads navigation tools back unchanged', () => {
    expect(railToolFromStore({ currentTool: 'pan' })).toBe('pan');
    expect(railToolFromStore({ currentTool: 'zoom' })).toBe('zoom');
    expect(railToolFromStore({ currentTool: 'selection' })).toBe('select');
    expect(railToolFromStore({ currentTool: 'set_scale' })).toBe('scale');
    expect(storeStateForRailTool('select', 'ai')).toEqual({ currentTool: 'selection' });
    expect(storeStateForRailTool('pan', 'manual')).toEqual({ currentTool: 'pan' });
  });
});
