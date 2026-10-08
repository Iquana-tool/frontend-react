import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTLINE } from './outlineSettings';
import { planPreferenceAdoption, readLocalPreferences } from './accountPreferences';

const state = (workspace) => ({
  workspace: { theme: 'dark', outline: { ...DEFAULT_OUTLINE }, refinementTool: 'ai', ...workspace },
});

describe('readLocalPreferences', () => {
  it('drops the derived preset and the held peek key from the outline', () => {
    const local = readLocalPreferences(state({ outline: { ...DEFAULT_OUTLINE, peek: true } }));
    expect(local.outline).not.toHaveProperty('peek');
    expect(local.outline).not.toHaveProperty('preset');
    expect(local.theme).toBe('dark');
  });
});

describe('planPreferenceAdoption', () => {
  const local = readLocalPreferences(state());

  it('uploads everything for an account that has no preferences yet', () => {
    const plan = planPreferenceAdoption({}, local);
    expect(plan.apply).toEqual({});
    expect(plan.upload).toEqual(local);
  });

  it('applies what the account holds and uploads nothing it already has', () => {
    const plan = planPreferenceAdoption(
      { theme: 'light', outline: local.outline, refinementTool: 'ai' },
      local
    );
    expect(plan.apply).toEqual({ theme: 'light' });
    expect(plan.upload).toEqual({});
  });

  it('treats an unusable stored value as missing', () => {
    const plan = planPreferenceAdoption(
      { theme: 'sepia', outline: local.outline, refinementTool: 'no-such-tool' },
      local
    );
    expect(plan.apply).toEqual({});
    expect(plan.upload).toEqual({ theme: 'dark', refinementTool: 'ai' });
  });

  it('sanitizes a stored outline before comparing it', () => {
    const plan = planPreferenceAdoption(
      { theme: 'dark', refinementTool: 'ai', outline: { ...local.outline, fillScale: 'lots' } },
      local
    );
    // Not a number falls back to the default, which is what is local already.
    expect(plan.apply).toEqual({});
  });
});
