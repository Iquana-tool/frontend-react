import { describe, it, expect } from 'vitest';
import {
  PHASES,
  PHASE_KEYS,
  PHASE_STATES,
  phaseFill,
  phaseIconClass,
  statesOfPhase,
} from './imageStatus';

describe('phaseIconClass', () => {
  it('pairs the phase hue with the state ramp', () => {
    expect(phaseIconClass('calibrate', 'finished')).toBe('text-cal opacity-100');
    expect(phaseIconClass('annotate', 'in_progress')).toBe('text-ann opacity-75');
    expect(phaseIconClass('review', 'not_started')).toBe('text-rev opacity-45');
  });

  // Blocked is work that does not exist yet, not a step of the phase's
  // progress — the same reason its fill is neutral.
  it('keeps blocked neutral rather than tinting it in-hue', () => {
    expect(phaseIconClass('review', 'blocked')).toBe('text-t3');
  });

  it('falls back to the neutral state tone without a phase', () => {
    expect(phaseIconClass(null, 'in_progress')).toBe('text-warn');
    expect(phaseIconClass(undefined, 'finished')).toBe('text-ok');
  });

  it('folds legacy state names like the rest of the module does', () => {
    expect(phaseIconClass('annotate', 'reviewable')).toBe(phaseIconClass('annotate', 'in_progress'));
    expect(phaseIconClass('annotate', 'completed')).toBe(phaseIconClass('annotate', 'finished'));
  });

  // The fill tones are background colours — in the light theme `cal3` is a
  // near-white that vanishes the moment it is used as ink, which is why this
  // helper exists at all instead of reusing phaseFill.
  it('never returns a background class', () => {
    for (const phase of PHASE_KEYS) {
      for (const state of statesOfPhase(phase)) {
        const classes = phaseIconClass(phase, state.key);
        expect(classes).toBeTruthy();
        expect(classes).not.toMatch(/(^|\s)bg-/);
        expect(classes).toMatch(/(^|\s)text-/);
      }
    }
  });

  it('stays distinct from the fill a bar would use for the same state', () => {
    for (const phase of PHASE_KEYS) {
      for (const state of statesOfPhase(phase)) {
        expect(phaseIconClass(phase, state.key)).not.toBe(phaseFill(phase, state.key));
      }
    }
  });
});

describe('state glyph vocabulary', () => {
  // Shape is what carries the state wherever there is no room for a label; a
  // state without its own glyph would silently fall back to whatever rendered
  // last and read as a different state entirely.
  it('gives every state a distinct small glyph', () => {
    const glyphs = PHASE_STATES.map((state) => state.smallIcon);
    expect(glyphs.every(Boolean)).toBe(true);
    expect(new Set(glyphs).size).toBe(PHASE_STATES.length);
  });

  it('gives every progress state a strength, and blocked none', () => {
    for (const state of PHASE_STATES) {
      if (state.key === 'blocked') expect(state.strength).toBeUndefined();
      else expect(state.strength).toMatch(/^opacity-\d+$/);
    }
  });

  it('ramps strength upward from not started to finished', () => {
    const value = (key) =>
      Number(PHASE_STATES.find((s) => s.key === key).strength.replace('opacity-', ''));
    expect(value('not_started')).toBeLessThan(value('in_progress'));
    expect(value('in_progress')).toBeLessThan(value('finished'));
  });

  it('keeps a hue for every phase the glyphs are tinted with', () => {
    for (const phase of PHASES) expect(phase.text).toMatch(/^text-/);
  });
});
