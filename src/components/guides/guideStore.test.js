import { beforeEach, describe, expect, test } from 'vitest';
import useGuideStore, {
  GUIDE_STORAGE_KEY,
  MAX_WELCOME_SNOOZES,
  loadProgress,
} from './guideStore';

const store = () => useGuideStore.getState();

const signIn = (user) => {
  useGuideStore.setState({ userKey: null, active: null, offer: null, panelOpen: false });
  store().hydrate(user);
};

describe('guide progress store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    useGuideStore.setState({ welcomeSnoozedThisSession: false });
    signIn('alice');
  });

  test('progress is saved per user, so two people on one browser keep their own', () => {
    store().startGuide('first-ai-annotation');
    store().completeActive();

    signIn('bob');
    expect(store().guides['first-ai-annotation']).toBeUndefined();

    signIn('alice');
    expect(store().guides['first-ai-annotation'].status).toBe('completed');
    expect(Object.keys(JSON.parse(window.localStorage.getItem(GUIDE_STORAGE_KEY)))).toEqual(
      expect.arrayContaining(['alice'])
    );
  });

  test('a closed guide resumes at the step it was left on', () => {
    store().startGuide('review');
    store().goToStep(2);
    store().closeActive();
    expect(store().active).toBeNull();
    expect(loadProgress('alice').guides.review).toEqual({ status: 'in_progress', step: 2 });

    store().startGuide('review');
    expect(store().active).toMatchObject({ id: 'review', step: 2 });
  });

  test('replaying a finished guide starts it from the first step', () => {
    store().startGuide('review');
    store().goToStep(2);
    store().completeActive();

    store().startGuide('review', { restart: true });
    expect(store().active).toMatchObject({ id: 'review', step: 0 });
  });

  test('Not now on an automatic card dismisses that guide for good', () => {
    store().showOffer('focus-mode', 'contextual');
    expect(store().guides['focus-mode'].status).toBe('offered');

    store().declineOffer();
    expect(store().offer).toBeNull();
    expect(store().guides['focus-mode'].status).toBe('dismissed');
  });

  test('declining an Up next card never downgrades a finished guide', () => {
    store().startGuide('manual-outline');
    store().completeActive();
    store().showOffer('manual-outline', 'next');
    store().declineOffer();
    expect(store().guides['manual-outline'].status).toBe('completed');
  });

  test('automatic offers start the cooldown; Up next offers do not', () => {
    store().showOffer('review', 'next');
    expect(store().lastAutoOfferAt).toBe(0);
    store().declineOffer();

    store().showOffer('review', 'contextual');
    expect(store().lastAutoOfferAt).toBeGreaterThan(0);
  });

  test('Later hides the welcome card for this session only, and gives up after the limit', () => {
    store().showOffer('first-ai-annotation', 'welcome');
    store().snoozeWelcome();
    expect(store().welcomeSnoozedThisSession).toBe(true);
    expect(store().welcome).toBe('pending');

    for (let i = 1; i < MAX_WELCOME_SNOOZES; i += 1) store().snoozeWelcome();
    expect(store().welcome).toBe('dismissed');
  });

  test('accepting the welcome card starts the guide it names', () => {
    store().showOffer('first-ai-annotation', 'welcome');
    store().acceptOffer();
    expect(store().welcome).toBe('accepted');
    expect(store().active).toMatchObject({ id: 'first-ai-annotation', step: 0 });
    expect(store().offer).toBeNull();
  });

  test('turning tips off withdraws the card on screen', () => {
    store().showOffer('review', 'contextual');
    store().setTipsEnabled(false);
    expect(store().offer).toBeNull();
    expect(loadProgress('alice').tipsEnabled).toBe(false);
  });

  test('reset forgets everything, tips and welcome included', () => {
    store().setTipsEnabled(false);
    store().startGuide('review');
    store().snoozeWelcome();

    store().resetGuides();
    expect(store()).toMatchObject({
      tipsEnabled: true,
      welcome: 'pending',
      welcomeSnoozes: 0,
      guides: {},
      active: null,
      welcomeSnoozedThisSession: false,
    });
  });

  test('unreadable storage falls back to fresh progress', () => {
    window.localStorage.setItem(GUIDE_STORAGE_KEY, '{not json');
    expect(loadProgress('alice').tipsEnabled).toBe(true);
    expect(loadProgress('alice').guides).toEqual({});
  });
});
