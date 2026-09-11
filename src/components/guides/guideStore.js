import { create } from 'zustand';

/**
 * Guide progress — which guides a user has seen, finished or waved away, and
 * whether automatic tips are on at all.
 *
 * Kept out of the annotation store on purpose: that store is rebuilt around one
 * image and one session, while this outlives both, and the engine is meant to
 * serve pages other than the annotation workspace later.
 *
 * Progress lives in localStorage, keyed by username, so two people sharing a
 * browser each keep their own. There is no backend copy yet, so a new browser
 * starts from scratch — the one cost of that is seeing the welcome card again.
 *
 * Per-guide status:
 *   (absent)      never shown — the only state a guide can be offered from
 *   'offered'     an automatic card named it; it will not be offered again
 *   'in_progress' started and left part-way; the panel offers Resume
 *   'completed'   finished
 *   'dismissed'   the user said Not now to its automatic card
 */

export const GUIDE_STORAGE_KEY = 'iquana.guides.v1';
export const WELCOME_SNOOZE_SESSION_KEY = 'iquana.guides.welcomeSnoozed';

/** "Later" on the welcome card brings it back next session, this many times. */
export const MAX_WELCOME_SNOOZES = 3;

/** Minimum gap between two automatic cards. "Up next" cards are exempt. */
export const AUTO_OFFER_COOLDOWN_MS = 3 * 60 * 1000;

export const emptyProgress = () => ({
  tipsEnabled: true,
  /** 'pending' | 'accepted' | 'dismissed' */
  welcome: 'pending',
  welcomeSnoozes: 0,
  /** { [guideId]: { status, step } } */
  guides: {},
  lastAutoOfferAt: 0,
});

const PROGRESS_KEYS = Object.keys(emptyProgress());

const readAll = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUIDE_STORAGE_KEY));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const loadProgress = (userKey) => {
  const stored = readAll()[userKey];
  return { ...emptyProgress(), ...(stored && typeof stored === 'object' ? stored : {}) };
};

const saveProgress = (userKey, progress) => {
  if (!userKey) return;
  try {
    const all = readAll();
    all[userKey] = progress;
    window.localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Private browsing / full storage: progress simply won't survive a reload.
  }
};

const readSessionSnooze = () => {
  try {
    return window.sessionStorage.getItem(WELCOME_SNOOZE_SESSION_KEY) === '1';
  } catch {
    return false;
  }
};

const writeSessionSnooze = (snoozed) => {
  try {
    if (snoozed) window.sessionStorage.setItem(WELCOME_SNOOZE_SESSION_KEY, '1');
    else window.sessionStorage.removeItem(WELCOME_SNOOZE_SESSION_KEY);
  } catch {
    // Non-fatal: the welcome card may reappear this session.
  }
};

const pickProgress = (state) =>
  PROGRESS_KEYS.reduce((acc, key) => {
    acc[key] = state[key];
    return acc;
  }, {});

const useGuideStore = create((set, get) => {
  /** Applies a patch and writes the persisted half of the result. */
  const commit = (patch) => {
    set(patch);
    const state = get();
    saveProgress(state.userKey, pickProgress(state));
  };

  const withGuide = (id, entry) => ({ ...get().guides, [id]: entry });

  return {
    userKey: null,
    ...emptyProgress(),
    welcomeSnoozedThisSession: readSessionSnooze(),

    // Runtime only — none of this is persisted.
    /** The guide being walked through: { id, step, dir: 'forward' | 'back' }. */
    active: null,
    /** A card offering a guide: { id, kind: 'welcome' | 'contextual' | 'next' }. */
    offer: null,
    /**
     * The "Guide complete" card: { id, nextId }. Shown when the user's own
     * action finished a guide — pressing Esc to leave focus mode, say — so the
     * guide ends on a confirmation rather than by vanishing mid-task.
     */
    completion: null,
    panelOpen: false,

    /** Loads the progress that belongs to this user. */
    hydrate: (userKey) => {
      if (get().userKey === userKey) return;
      set({ userKey, ...loadProgress(userKey), active: null, offer: null, completion: null });
    },

    /**
     * Starts a guide, or resumes it at the step it was left on.
     * `restart` begins at the first step even when progress exists (Replay).
     */
    startGuide: (id, { restart = false } = {}) => {
      const previous = get().guides[id];
      const step = !restart && previous?.status === 'in_progress' ? previous.step || 0 : 0;
      commit({
        active: { id, step, dir: 'forward' },
        offer: null,
        completion: null,
        panelOpen: false,
        guides: withGuide(id, { status: 'in_progress', step }),
      });
    },

    goToStep: (step, dir = 'forward') => {
      const { active } = get();
      if (!active) return;
      commit({
        active: { ...active, step, dir },
        guides: withGuide(active.id, { status: 'in_progress', step }),
      });
    },

    /** Marks the active guide finished. Returns its id. */
    completeActive: () => {
      const { active } = get();
      if (!active) return null;
      commit({ active: null, guides: withGuide(active.id, { status: 'completed', step: 0 }) });
      return active.id;
    },

    /** Closes the card but keeps the step, so the panel can resume it. */
    closeActive: () => set({ active: null }),

    showCompletion: (id, nextId = null) => set({ completion: { id, nextId } }),
    closeCompletion: () => set({ completion: null }),

    showOffer: (id, kind) => {
      const patch = { offer: { id, kind } };
      if (kind !== 'next') patch.lastAutoOfferAt = Date.now();
      if (kind === 'contextual' && !get().guides[id]) {
        patch.guides = withGuide(id, { status: 'offered', step: 0 });
      }
      commit(patch);
    },

    acceptOffer: () => {
      const { offer } = get();
      if (!offer) return;
      if (offer.kind === 'welcome') commit({ welcome: 'accepted' });
      get().startGuide(offer.id);
    },

    /** "Not now" / "No thanks": the offered guide is never offered automatically again. */
    declineOffer: () => {
      const { offer, guides } = get();
      if (!offer) return;
      if (offer.kind === 'welcome') {
        commit({ offer: null, welcome: 'dismissed' });
        return;
      }
      const status = guides[offer.id]?.status;
      const keep = status === 'completed' || status === 'in_progress';
      commit({
        offer: null,
        ...(keep ? {} : { guides: withGuide(offer.id, { status: 'dismissed', step: 0 }) }),
      });
    },

    /** "Later" on the welcome card: gone for this session, back in the next one. */
    snoozeWelcome: () => {
      const snoozes = get().welcomeSnoozes + 1;
      writeSessionSnooze(true);
      commit({
        offer: null,
        welcomeSnoozes: snoozes,
        welcomeSnoozedThisSession: true,
        ...(snoozes >= MAX_WELCOME_SNOOZES ? { welcome: 'dismissed' } : {}),
      });
    },

    setTipsEnabled: (enabled) => {
      const { offer } = get();
      commit({ tipsEnabled: !!enabled, ...(enabled || !offer ? {} : { offer: null }) });
    },

    /** Forgets all progress for this user: tips back on, welcome card pending. */
    resetGuides: () => {
      writeSessionSnooze(false);
      commit({
        ...emptyProgress(),
        welcomeSnoozedThisSession: false,
        active: null,
        offer: null,
        completion: null,
      });
    },

    setPanelOpen: (open) => set({ panelOpen: !!open }),
    togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  };
});

export default useGuideStore;
