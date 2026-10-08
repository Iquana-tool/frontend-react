import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useAnnotationStore from '../../stores/useAnnotationStore';
import {
  PREFERENCE_KEYS,
  SYNCED_PREFERENCES,
  planPreferenceAdoption,
  readLocalPreferences,
  samePreference,
} from '../../utils/accountPreferences';

/** Long enough that dragging an outline slider is one save, not fifty. */
const SAVE_DELAY_MS = 800;

/**
 * Keeps the account's saved UI preferences and the workspace store in step.
 *
 * When an account's preferences arrive (sign-in, or the `/auth/me` refresh on
 * load), what the account holds is applied here, and what it lacks is taken
 * from this browser and saved. After that, a change made here is saved to the
 * account a moment later. Renders nothing.
 */
const PreferenceSync = () => {
  const { isAuthenticated, user, updateProfile } = useAuth();
  // What the account is known to hold, per key, so a change that only echoes
  // it (applying a stored value, or the response to a save) is not saved again.
  const synced = useRef({});
  const pending = useRef({});
  const timer = useRef(null);

  const username = isAuthenticated ? user?.username : null;
  const storedJson = JSON.stringify(user?.preferences || {});

  // Adopt the account's preferences whenever they change.
  useEffect(() => {
    if (!username) {
      synced.current = {};
      return;
    }
    const stored = JSON.parse(storedJson);
    const store = useAnnotationStore.getState();
    const { apply, upload } = planPreferenceAdoption(stored, readLocalPreferences(store));

    PREFERENCE_KEYS.forEach((key) => {
      // A change made here and not yet saved is newer than what the account holds.
      if (key in pending.current) return;
      if (key in apply) {
        synced.current[key] = apply[key];
        SYNCED_PREFERENCES[key].apply(store, apply[key]);
      } else if (!(key in upload)) {
        synced.current[key] = SYNCED_PREFERENCES[key].normalize(stored[key]);
      }
    });

    // Skips what is already on its way up: until that save answers, the account
    // still reads as lacking it, so this effect running again would resend it.
    const toUpload = Object.fromEntries(
      Object.entries(upload).filter(
        ([key, value]) => !(key in pending.current) && !samePreference(synced.current[key], value)
      )
    );
    if (Object.keys(toUpload).length > 0) {
      Object.assign(synced.current, toUpload);
      updateProfile({ preferences: toUpload }).catch((error) =>
        console.warn('Could not save preferences to the account:', error)
      );
    }
  }, [username, storedJson, updateProfile]);

  // Save local changes to the account, a moment after they settle.
  useEffect(() => {
    if (!username) return undefined;

    const flush = () => {
      timer.current = null;
      const changes = pending.current;
      pending.current = {};
      if (Object.keys(changes).length === 0) return;
      Object.assign(synced.current, changes);
      updateProfile({ preferences: changes }).catch((error) =>
        console.warn('Could not save preferences to the account:', error)
      );
    };

    const unsubscribe = useAnnotationStore.subscribe((state) => {
      const local = readLocalPreferences(state);
      let changed = false;
      PREFERENCE_KEYS.forEach((key) => {
        const known = key in pending.current ? pending.current[key] : synced.current[key];
        if (!samePreference(local[key], known)) {
          pending.current[key] = local[key];
          changed = true;
        }
      });
      if (changed) {
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, SAVE_DELAY_MS);
      }
    });

    return () => {
      unsubscribe();
      // Dropped rather than saved: this runs on sign-out, when the token is
      // already gone and a save would 401, which reads as a session expiry.
      clearTimeout(timer.current);
      timer.current = null;
      pending.current = {};
    };
  }, [username, updateProfile]);

  return null;
};

export default PreferenceSync;
