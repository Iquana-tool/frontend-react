import { useEffect } from 'react';
import useGuideStore from './guideStore';
import { autoOfferAllowed, pickContextualOffer, welcomeDue } from './guideEligibility';
import { countNewObjects, isWorkspaceBusy, isWorkspaceSettled } from './guideConditions';

/** How long the user must have been hands-off before an automatic card appears. */
export const IDLE_MS = 1500;
const CHECK_INTERVAL_MS = 1000;

/**
 * Offers guides on its own: the welcome card on a first visit, and a guide
 * whose trigger holds — first time in Review, first object selected, and so on.
 *
 * Nothing appears while another card is up, the Guides panel is open, the
 * canvas is still loading, or the user is busy (see isWorkspaceBusy), and
 * nothing until they have been idle for IDLE_MS: a trigger that fires
 * mid-gesture waits for the gesture to end, and one that stops holding in the
 * meantime is simply not shown.
 *
 * @param {object} options
 * @param {object[]} options.guides
 * @param {string} options.welcomeGuideId - the guide the welcome card leads to
 * @param {object} options.api - the annotation store
 * @param {() => object} options.getCtx
 * @param {{ current: number }} options.objectsAddedRef - objects created this session; updated here
 */
export default function useContextualGuides({ guides, welcomeGuideId, api, getCtx, objectsAddedRef }) {
  useEffect(() => {
    let lastInputAt = Date.now();
    const onInput = () => {
      lastInputAt = Date.now();
    };
    window.addEventListener('pointerdown', onInput, true);
    window.addEventListener('keydown', onInput, true);
    window.addEventListener('wheel', onInput, { capture: true, passive: true });

    const unsubscribe = api.subscribe((state, previous) => {
      objectsAddedRef.current += countNewObjects(previous, state);
    });

    const welcomeGuide = guides.find((guide) => guide.id === welcomeGuideId) || null;

    const timer = window.setInterval(() => {
      const progress = useGuideStore.getState();
      if (
        !progress.userKey
        || progress.active
        || progress.offer
        || progress.completion
        || progress.panelOpen
      ) return;

      const state = api.getState();
      if (!isWorkspaceSettled(state) || isWorkspaceBusy(state)) return;
      if (Date.now() - lastInputAt < IDLE_MS) return;

      const ctx = getCtx();
      if (
        welcomeDue({
          progress,
          snoozedThisSession: progress.welcomeSnoozedThisSession,
          welcomeGuide,
          env: { can: ctx.can, state },
        })
      ) {
        progress.showOffer(welcomeGuide.id, 'welcome');
        return;
      }

      if (!autoOfferAllowed(progress)) return;
      const guide = pickContextualOffer(guides, { progress, state, ctx });
      if (guide) progress.showOffer(guide.id, 'contextual');
    }, CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener('pointerdown', onInput, true);
      window.removeEventListener('keydown', onInput, true);
      window.removeEventListener('wheel', onInput, { capture: true });
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [guides, welcomeGuideId, api, getCtx, objectsAddedRef]);
}
