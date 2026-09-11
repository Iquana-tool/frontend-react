import { describe, expect, test } from 'vitest';
import { initialState } from '../../stores/initialState';
import {
  countNewObjects,
  hasNewLabelledObject,
  isWorkspaceBusy,
  newObjectsSince,
  railTool,
  reviewDecisionSince,
  scaleChangedSince,
} from './guideConditions';

/** A store state on image 7 holding the given objects, with overrides merged per slice. */
const makeState = (objects = [], overrides = {}) => {
  const state = structuredClone(initialState);
  state.images.currentImageId = 7;
  state.objects.list = objects;
  for (const [slice, patch] of Object.entries(overrides)) {
    state[slice] = { ...state[slice], ...patch };
  }
  return state;
};

const obj = (id, extra = {}) => ({ id, ...extra });

describe('newObjectsSince', () => {
  test('lists objects that were not there before', () => {
    const before = makeState([obj(1)]);
    const after = makeState([obj(1), obj(2)]);
    expect(newObjectsSince(after, before).map((o) => o.id)).toEqual([2]);
  });

  test('an image switch is not the user annotating', () => {
    const before = makeState([obj(1)]);
    const after = makeState([obj(5), obj(6)], { images: { currentImageId: 8 } });
    expect(newObjectsSince(after, before)).toEqual([]);
  });

  test('hasNewLabelledObject needs one of the new objects to carry a label', () => {
    const before = makeState([obj(1, { label: 'coral' })]);
    expect(hasNewLabelledObject(makeState([obj(1, { label: 'coral' }), obj(2)]), before)).toBe(false);
    expect(hasNewLabelledObject(makeState([obj(1), obj(2, { label: 'polyp' })]), before)).toBe(true);
  });
});

describe('countNewObjects', () => {
  test('counts what the user added between two states', () => {
    expect(countNewObjects(makeState([obj(1)]), makeState([obj(1), obj(2), obj(3)]))).toBe(2);
  });

  test('ignores contours arriving for a freshly opened image', () => {
    const loading = makeState([], { objects: { loading: true } });
    const loaded = makeState([obj(1), obj(2)]);
    expect(countNewObjects(loading, loaded)).toBe(0);
  });
});

describe('reviewDecisionSince', () => {
  test('an accept marks an object reviewed', () => {
    const before = makeState([obj(1), obj(2)]);
    const after = makeState([obj(1, { reviewed_by: ['rev'] }), obj(2)]);
    expect(reviewDecisionSince(after, before)).toBe(true);
  });

  test('a reject removes one', () => {
    expect(reviewDecisionSince(makeState([obj(2)]), makeState([obj(1), obj(2)]))).toBe(true);
  });

  test('nothing happening is not a decision', () => {
    expect(reviewDecisionSince(makeState([obj(1)]), makeState([obj(1)]))).toBe(false);
  });
});

describe('scaleChangedSince', () => {
  test('a saved measurement changes the scale', () => {
    const before = makeState();
    const after = makeState([], { images: { ...before.images, scale: { ...before.images.scale, scaleX: 0.02, scaleY: 0.02, unit: 'mm' } } });
    expect(scaleChangedSince(after, before)).toBe(true);
    expect(scaleChangedSince(before, before)).toBe(false);
  });
});

describe('isWorkspaceBusy', () => {
  test('an idle workspace', () => {
    expect(isWorkspaceBusy(makeState())).toBe(false);
  });

  test.each([
    ['a model call', { aiAnnotation: { ...initialState.aiAnnotation, isSubmitting: true } }],
    ['prompts waiting', { aiAnnotation: { ...initialState.aiAnnotation, prompts: [{ type: 'point' }] } }],
    ['an outline edit', { editMode: { ...initialState.editMode, active: true } }],
    ['an open picker', { workspace: { ...initialState.workspace, picker: 'label' } }],
    ['the context menu', { contextMenu: { ...initialState.contextMenu, visible: true } }],
  ])('%s', (_, overrides) => {
    expect(isWorkspaceBusy(makeState([], overrides))).toBe(true);
  });
});

describe('railTool', () => {
  test('reads the rail selection off the store', () => {
    expect(railTool(makeState())).toBe('point');
    expect(railTool(makeState([], { ui: { ...initialState.ui, currentTool: 'selection' } }))).toBe('select');
  });
});
