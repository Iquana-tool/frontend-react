import { beforeEach, describe, expect, test } from 'vitest';

import { MODE_STORAGE_KEY, readStoredMode } from './workspaceSlice';
import useAnnotationStore from '../useAnnotationStore';

/**
 * The workspace tab has to survive a reload. Everything else in the workspace slice is
 * throwaway view state, but the mode is where the user is in the workflow: a reviewer who
 * refreshes mid-review was being dropped back into Annotate, which both lost their place
 * and quietly changed what the canvas was showing them.
 */
describe('workspace mode persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('defaults to annotate when nothing has been stored', () => {
    expect(readStoredMode()).toBe('annotate');
  });

  test('restores a previously stored mode', () => {
    window.localStorage.setItem(MODE_STORAGE_KEY, 'review');
    expect(readStoredMode()).toBe('review');
  });

  test('falls back to annotate on an unrecognised stored value', () => {
    window.localStorage.setItem(MODE_STORAGE_KEY, 'not-a-mode');
    expect(readStoredMode()).toBe('annotate');
  });

  test('setWorkspaceMode persists the choice', () => {
    useAnnotationStore.getState().setWorkspaceMode('review');
    expect(window.localStorage.getItem(MODE_STORAGE_KEY)).toBe('review');
  });

  test('the store starts on the stored mode', async () => {
    // The store reads storage once, as it is created, so the value has to be in place
    // before the module is imported for the first time in this test's registry.
    window.localStorage.setItem(MODE_STORAGE_KEY, 'review');
    const { default: store } = await import('../useAnnotationStore?fresh-mode');
    expect(store.getState().workspace.mode).toBe('review');
  });
});
