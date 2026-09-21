import {
  RAIL_TOOLS,
  PROMPT_ACTION_IDS,
  ADDABLE_PROMPT_TYPES,
  nextPromptAction,
  railToolFromStore,
  railToolsForMode,
  railToolAllowedInMode,
  DEFAULT_RAIL_TOOL_BY_MODE,
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

/**
 * Each mode's rail is a claim about what that mode is for, so these assert the
 * claim rather than the list: Review judges what exists, Calibrate measures the
 * image, and only Annotate makes new objects.
 */
describe('the rail per mode', () => {
  const idsFor = (mode) => railToolsForMode(mode).map((tool) => tool.id);

  it('offers every tool while annotating', () => {
    expect(idsFor('annotate')).toEqual(RAIL_TOOLS.map((tool) => tool.id));
  });

  it('offers no shape tool while reviewing or calibrating', () => {
    const shapes = ['point', 'box', 'polygon', 'freehand', 'brush'];
    for (const mode of ['review', 'calibrate']) {
      expect(idsFor(mode).filter((id) => shapes.includes(id))).toEqual([]);
    }
  });

  it('keeps selection in Review, where every action starts from an object', () => {
    expect(idsFor('review')).toContain('select');
  });

  it('drops selection in Calibrate, where there is nothing to select', () => {
    expect(idsFor('calibrate')).not.toContain('select');
  });

  it('keeps a way to navigate in every mode', () => {
    for (const mode of ['annotate', 'review', 'calibrate']) {
      expect(idsFor(mode)).toEqual(expect.arrayContaining(['pan', 'zoom']));
    }
  });

  it('treats an unknown mode as the full rail rather than an empty one', () => {
    expect(idsFor('something-else')).toEqual(RAIL_TOOLS.map((tool) => tool.id));
  });

  it('agrees with railToolAllowedInMode', () => {
    for (const mode of ['annotate', 'review', 'calibrate']) {
      for (const tool of RAIL_TOOLS) {
        expect(railToolAllowedInMode(tool.id, mode)).toBe(idsFor(mode).includes(tool.id));
      }
    }
  });

  // The fallback is what the shell arms when the incoming tool is not on the
  // new rail; one that is itself absent would leave the rail with nothing lit.
  it('has a fallback that its own rail offers', () => {
    for (const [mode, fallback] of Object.entries(DEFAULT_RAIL_TOOL_BY_MODE)) {
      expect(railToolAllowedInMode(fallback, mode)).toBe(true);
    }
  });

  it('needs no fallback for Annotate, which offers everything', () => {
    expect(DEFAULT_RAIL_TOOL_BY_MODE.annotate).toBeUndefined();
  });
});
