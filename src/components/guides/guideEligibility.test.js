import { describe, expect, test } from 'vitest';
import {
  autoOfferAllowed,
  isGuideAvailable,
  nextGuideFor,
  pickContextualOffer,
  welcomeDue,
} from './guideEligibility';
import { AUTO_OFFER_COOLDOWN_MS, emptyProgress } from './guideStore';

const allow = () => true;
const deny = () => false;
const withModels = { models: { availablePromptedModels: [{ id: 'sam2' }] } };
const noModels = { models: { availablePromptedModels: [] } };

const progress = (overrides = {}) => ({ ...emptyProgress(), ...overrides });

describe('isGuideAvailable', () => {
  test('needs every permission in requires', () => {
    const guide = { requires: ['a', 'b'] };
    expect(isGuideAvailable(guide, { can: (p) => p === 'a', state: withModels })).toBe(false);
    expect(isGuideAvailable(guide, { can: allow, state: withModels })).toBe(true);
  });

  test('needs one permission in requiresAny', () => {
    const guide = { requiresAny: ['a', 'b'] };
    expect(isGuideAvailable(guide, { can: (p) => p === 'b', state: withModels })).toBe(true);
    expect(isGuideAvailable(guide, { can: deny, state: withModels })).toBe(false);
  });

  test('an AI guide is hidden when no prompted model exists', () => {
    const guide = { needsPromptedModel: true };
    expect(isGuideAvailable(guide, { can: allow, state: noModels })).toBe(false);
    expect(isGuideAvailable(guide, { can: allow, state: withModels })).toBe(true);
  });
});

describe('welcomeDue', () => {
  const welcomeGuide = { id: 'first', needsPromptedModel: true };
  const env = { can: allow, state: withModels };

  test('on a first visit', () => {
    expect(welcomeDue({ progress: progress(), snoozedThisSession: false, welcomeGuide, env })).toBe(true);
  });

  test('not once snoozed this session, dismissed, or with tips off', () => {
    expect(welcomeDue({ progress: progress(), snoozedThisSession: true, welcomeGuide, env })).toBe(false);
    expect(
      welcomeDue({ progress: progress({ welcome: 'dismissed' }), snoozedThisSession: false, welcomeGuide, env })
    ).toBe(false);
    expect(
      welcomeDue({ progress: progress({ tipsEnabled: false }), snoozedThisSession: false, welcomeGuide, env })
    ).toBe(false);
  });

  test('not when the guide was already started from the panel', () => {
    const started = progress({ guides: { first: { status: 'in_progress', step: 1 } } });
    expect(welcomeDue({ progress: started, snoozedThisSession: false, welcomeGuide, env })).toBe(false);
  });

  test('not for someone who could not follow the guide', () => {
    expect(
      welcomeDue({ progress: progress(), snoozedThisSession: false, welcomeGuide, env: { can: allow, state: noModels } })
    ).toBe(false);
  });
});

describe('autoOfferAllowed', () => {
  test('waits out the cooldown and respects the tips switch', () => {
    const now = 10 * AUTO_OFFER_COOLDOWN_MS;
    expect(autoOfferAllowed(progress({ lastAutoOfferAt: now - 1000 }), now)).toBe(false);
    expect(autoOfferAllowed(progress({ lastAutoOfferAt: now - AUTO_OFFER_COOLDOWN_MS }), now)).toBe(true);
    expect(autoOfferAllowed(progress({ tipsEnabled: false }), now)).toBe(false);
  });
});

describe('pickContextualOffer', () => {
  const guides = [
    { id: 'focus', offerWhen: (state) => state.focus },
    { id: 'select', offerWhen: (state) => state.selected },
    { id: 'panelOnly' },
    { id: 'locked', requires: ['x'], offerWhen: () => true },
  ];
  const ctx = { can: (p) => p !== 'x' };

  test('registry order breaks ties between triggers that fire together', () => {
    const state = { focus: true, selected: true };
    expect(pickContextualOffer(guides, { progress: progress(), state, ctx }).id).toBe('focus');
  });

  test('a guide that was ever shown is never offered again', () => {
    const state = { focus: true, selected: true };
    const seen = progress({ guides: { focus: { status: 'offered', step: 0 } } });
    expect(pickContextualOffer(guides, { progress: seen, state, ctx }).id).toBe('select');
  });

  test('skips panel-only guides and ones the user lacks permission for', () => {
    expect(pickContextualOffer(guides, { progress: progress(), state: {}, ctx })).toBeNull();
  });
});

describe('nextGuideFor', () => {
  const guides = [
    { id: 'one', next: 'two' },
    { id: 'two' },
  ];

  test('suggests the next guide while it is untouched', () => {
    expect(nextGuideFor(guides, 'one', { progress: progress(), can: allow, state: withModels }).id).toBe('two');
  });

  test('stays quiet if the next guide is done, waved away, or tips are off', () => {
    const done = progress({ guides: { two: { status: 'completed', step: 0 } } });
    expect(nextGuideFor(guides, 'one', { progress: done, can: allow, state: withModels })).toBeNull();
    expect(
      nextGuideFor(guides, 'one', { progress: progress({ tipsEnabled: false }), can: allow, state: withModels })
    ).toBeNull();
  });
});
