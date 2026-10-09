/**
 * UI choices that follow the account from machine to machine.
 *
 * They are stored in the account's `preferences` (PATCH /auth/me merges them
 * key by key) and mirrored into the workspace store, which keeps writing them
 * to localStorage too, so a signed-out page and the first paint after a
 * reload still look right.
 *
 * Only taste goes here. The workspace tab (`mode`) stays per machine: it is
 * where someone stands in their work on that screen, not how they like it.
 */
import { sanitizeOutline } from './outlineSettings';
import { isRefinementTool } from './refinementTools';

/** The outline as saved: only what a person chose, not the derived preset or the held peek key. */
const outlineForStorage = (outline) => {
  const { fillScale, strokeWidth, hoverFill, constantWidth } = sanitizeOutline(outline);
  return { fillScale, strokeWidth, hoverFill, constantWidth };
};

/**
 * Each synced preference: how to read it from the workspace store's state,
 * turn a stored value into a valid one (or null when it is not usable), and
 * apply it through the store's own action.
 */
export const SYNCED_PREFERENCES = {
  theme: {
    read: (state) => state.workspace.theme,
    normalize: (value) => (value === 'light' || value === 'dark' ? value : null),
    apply: (store, value) => store.setTheme(value),
  },
  outline: {
    read: (state) => outlineForStorage(state.workspace.outline),
    normalize: (value) => (value && typeof value === 'object' ? outlineForStorage(value) : null),
    apply: (store, value) => store.setOutline(value),
  },
  refinementTool: {
    read: (state) => state.workspace.refinementTool,
    normalize: (value) => (isRefinementTool(value) ? value : null),
    apply: (store, value) => store.setRefinementTool(value),
  },
};

export const PREFERENCE_KEYS = Object.keys(SYNCED_PREFERENCES);

/** Stable comparison for the small values stored here. */
export const samePreference = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The synced values as they currently stand in the workspace store. */
export const readLocalPreferences = (state) =>
  Object.fromEntries(PREFERENCE_KEYS.map((key) => [key, SYNCED_PREFERENCES[key].read(state)]));

/**
 * What to do when an account's preferences arrive.
 *
 * The account wins where it has a usable value: that is the point of keeping
 * them there. Where it has none (an account that predates this, or a key added
 * since), this browser's value is uploaded instead, so nobody's current setup
 * is thrown away by signing in.
 *
 * @param {Object|undefined} stored - `user.preferences`
 * @param {Object} local - from `readLocalPreferences`
 * @returns {{apply: Object, upload: Object}} values to apply locally / to save on the account
 */
export const planPreferenceAdoption = (stored, local) => {
  const apply = {};
  const upload = {};
  PREFERENCE_KEYS.forEach((key) => {
    const value = SYNCED_PREFERENCES[key].normalize(stored?.[key]);
    if (value === null) {
      upload[key] = local[key];
    } else if (!samePreference(value, local[key])) {
      apply[key] = value;
    }
  });
  return { apply, upload };
};
