import { useCallback, useEffect, useRef } from 'react';
import useGuideStore from './guideStore';
import { nextGuideFor } from './guideEligibility';

/**
 * Walks the active guide.
 *
 * Each step's `doneWhen` is checked against the annotation store on every
 * change, and the guide advances the moment it holds — the user learns by doing
 * the thing on their own image, not by clicking Next. A step whose condition
 * already holds when it begins is passed straight through (the Point tool is
 * already selected, say), except when the user stepped Back onto it on purpose.
 *
 * A step can also declare what it depends on (`requiresState`): the Edit
 * contour button only exists while an object is selected, so if the selection
 * is lost — Esc clears it — the guide returns to the step that sets it up
 * (`recoverTo`) instead of pointing at a control that has gone.
 *
 * How a guide ends matters too. Finished by pressing Done, it simply closes.
 * Finished by the user's own action — Esc leaving focus mode is the common one —
 * it ends on a "Guide complete" card, because a card that vanishes in
 * response to a key press reads as having been dismissed, not completed.
 *
 * @param {object} options
 * @param {object[]} options.guides - the registry
 * @param {object} options.api - the annotation store (getState / subscribe)
 * @param {() => object} options.getCtx - builds the `ctx` conditions receive
 * @returns {{ guide: object|null, step: object|null, index: number, next: () => void, back: () => void }}
 */
export default function useGuideRunner({ guides, api, getCtx }) {
  const active = useGuideStore((state) => state.active);
  const startedRef = useRef(null);
  const guideBaselineRef = useRef(null);

  /** @param {boolean} byAction - the last step was completed by doing it, not by a button */
  const finish = useCallback(
    (byAction) => {
      const finishedId = useGuideStore.getState().completeActive();
      if (!finishedId) return;
      const next = nextGuideFor(guides, finishedId, {
        progress: useGuideStore.getState(),
        can: getCtx().can,
        state: api.getState(),
      });
      if (byAction) useGuideStore.getState().showCompletion(finishedId, next?.id ?? null);
      else if (next) useGuideStore.getState().showOffer(next.id, 'next');
    },
    [guides, getCtx, api]
  );

  /** Moves past step `from`, unless the guide has already moved on without us. */
  const advance = useCallback(
    (from, byAction) => {
      const current = useGuideStore.getState().active;
      if (!current || current.step !== from) return;
      const guide = guides.find((entry) => entry.id === current.id);
      if (!guide || from + 1 >= guide.steps.length) finish(byAction);
      else useGuideStore.getState().goToStep(from + 1, 'forward');
    },
    [guides, finish]
  );

  const back = useCallback(() => {
    const current = useGuideStore.getState().active;
    if (current && current.step > 0) useGuideStore.getState().goToStep(current.step - 1, 'back');
  }, []);

  const next = useCallback(() => {
    const current = useGuideStore.getState().active;
    if (current) advance(current.step, false);
  }, [advance]);

  useEffect(() => {
    if (!active) {
      startedRef.current = null;
      return undefined;
    }

    const guide = guides.find((entry) => entry.id === active.id);
    if (!guide) {
      useGuideStore.getState().closeActive();
      return undefined;
    }
    const step = guide.steps[active.step];
    if (!step) {
      finish(false);
      return undefined;
    }

    // Once per start or resume: put the workspace on the guide's tab, run its
    // setup, and remember what the canvas held, for "since the guide began".
    if (startedRef.current !== active.id) {
      startedRef.current = active.id;
      const state = api.getState();
      if (guide.mode && state.workspace.mode !== guide.mode) state.setWorkspaceMode(guide.mode);
      guide.onStart?.(api);
      guideBaselineRef.current = api.getState();
    }

    if (step.skipIf?.(getCtx())) {
      if (active.dir === 'back' && active.step > 0) back();
      else advance(active.step, false);
      return undefined;
    }

    step.onEnter?.(api, { guide: guideBaselineRef.current });
    if (!step.doneWhen && !step.requiresState) return undefined;

    const stepBaseline = api.getState();
    let settled = false;
    const check = (state, { entering = false } = {}) => {
      if (settled) return;
      const baselines = { step: stepBaseline, guide: guideBaselineRef.current };
      // Stepping Back onto a step means "show me this again", so a condition
      // that already holds must not bounce the user forward.
      const mayComplete = !(entering && active.dir === 'back');
      if (mayComplete && step.doneWhen?.(state, baselines, getCtx())) {
        settled = true;
        advance(active.step, true);
        return;
      }
      if (step.requiresState && !step.requiresState(state)) {
        settled = true;
        useGuideStore.getState().goToStep(step.recoverTo ?? 0, 'forward');
      }
    };

    check(stepBaseline, { entering: true });
    if (settled) return undefined;

    const unsubscribe = api.subscribe((state) => check(state));
    return () => {
      settled = true;
      unsubscribe();
    };
    // The step is identified by these three; the callbacks are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.step, active?.dir]);

  const guide = active ? guides.find((entry) => entry.id === active.id) || null : null;
  return {
    guide,
    step: guide?.steps[active.step] || null,
    index: active?.step ?? 0,
    next,
    back,
  };
}
