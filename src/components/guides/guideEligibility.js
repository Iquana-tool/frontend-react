import { AUTO_OFFER_COOLDOWN_MS, MAX_WELCOME_SNOOZES } from './guideStore';

/**
 * Who may see which guide, and which automatic card — if any — is due.
 *
 * All of it is pure so the visibility rules can be tested without rendering:
 * the hook that runs them (useContextualGuides) only adds timing and idleness.
 */

/**
 * Whether this user can follow a guide on this dataset at all.
 *
 * @param {object} guide
 * @param {{ can: (permission: string) => boolean, state: object }} env
 */
export const isGuideAvailable = (guide, { can, state }) => {
  if (guide.requires && !guide.requires.every((permission) => can(permission))) return false;
  if (guide.requiresAny && !guide.requiresAny.some((permission) => can(permission))) return false;
  if (guide.needsPromptedModel && !(state?.models?.availablePromptedModels?.length > 0)) {
    return false;
  }
  return true;
};

export const availableGuides = (guides, env) => guides.filter((guide) => isGuideAvailable(guide, env));

/** Automatic cards are on, and the last one was long enough ago. */
export const autoOfferAllowed = (progress, now = Date.now()) =>
  progress.tipsEnabled && now - (progress.lastAutoOfferAt || 0) >= AUTO_OFFER_COOLDOWN_MS;

/**
 * The welcome card is due: first visit (or a snoozed one from an earlier
 * session), tips on, and the guide it leads to is usable here and untouched.
 */
export const welcomeDue = ({ progress, snoozedThisSession, welcomeGuide, env }) =>
  Boolean(
    welcomeGuide
    && progress.tipsEnabled
    && progress.welcome === 'pending'
    && !snoozedThisSession
    && progress.welcomeSnoozes < MAX_WELCOME_SNOOZES
    && !progress.guides[welcomeGuide.id]
    && isGuideAvailable(welcomeGuide, env)
  );

/**
 * The first guide, in registry order, whose trigger holds and that has never
 * been shown. Registry order is the priority: when one click both selects an
 * object and enters focus mode, the guide listed first explains it.
 *
 * @param {object[]} guides
 * @param {{ progress: object, state: object, ctx: object }} env - `ctx.can` gates permissions
 */
export const pickContextualOffer = (guides, { progress, state, ctx }) =>
  guides.find(
    (guide) =>
      typeof guide.offerWhen === 'function'
      && !progress.guides[guide.id]
      && isGuideAvailable(guide, { can: ctx.can, state })
      && guide.offerWhen(state, ctx)
  ) || null;

/**
 * The guide to suggest once `finishedId` is done, if it is still worth
 * suggesting: tips on, available, and neither finished nor waved away.
 */
export const nextGuideFor = (guides, finishedId, { progress, can, state }) => {
  if (!progress.tipsEnabled) return null;
  const finished = guides.find((guide) => guide.id === finishedId);
  const next = finished?.next && guides.find((guide) => guide.id === finished.next);
  if (!next) return null;
  const status = progress.guides[next.id]?.status;
  if (status === 'completed' || status === 'dismissed') return null;
  return isGuideAvailable(next, { can, state }) ? next : null;
};
