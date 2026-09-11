import { describe, expect, test } from 'vitest';
import { ANNOTATION_GUIDES, GUIDE_GROUPS, WELCOME_GUIDE_ID } from './annotationGuides';
import { RAIL_TOOLS } from '../annotationPage/workspace/toolModel';

/**
 * Every component under src/components, as source text. A guide step points at
 * a control by its `data-guide` name; if the control is renamed or removed the
 * card silently falls back to the canvas, so the suite checks the names instead.
 */
const SOURCES = Object.values(
  import.meta.glob('../**/*.jsx', { query: '?raw', import: 'default', eager: true })
).join('\n');

/** `data-guide="name"`, or the BarButton prop `guide="name"`. */
const hasLiteralAnchor = (name) =>
  new RegExp(`(?:data-guide|\\bguide)=["']${name}["']`).test(SOURCES);

/** `data-guide={`prefix-${…}`}` — the rail, calibration rail and panel tabs. */
const DYNAMIC_PREFIXES = [...SOURCES.matchAll(/data-guide=\{`([a-z-]+)\$\{/g)].map((match) => match[1]);

const DYNAMIC_VALUES = {
  'rail-tool-': RAIL_TOOLS.map((tool) => tool.id),
  'rail-calibration-': ['scale', 'response'],
  'right-tab-': ['objects', 'labels'],
};

const anchorExists = (name) => {
  if (hasLiteralAnchor(name)) return true;
  return DYNAMIC_PREFIXES.some(
    (prefix) => name.startsWith(prefix) && (DYNAMIC_VALUES[prefix] || []).includes(name.slice(prefix.length))
  );
};

describe('annotation guide registry', () => {
  test('ids are unique and the welcome guide exists', () => {
    const ids = ANNOTATION_GUIDES.map((guide) => guide.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(WELCOME_GUIDE_ID);
  });

  test('every guide is complete enough to list and run', () => {
    for (const guide of ANNOTATION_GUIDES) {
      expect(GUIDE_GROUPS, guide.id).toContain(guide.group);
      expect(guide.title && guide.summary, guide.id).toBeTruthy();
      expect(guide.steps.length, guide.id).toBeGreaterThan(0);
      for (const step of guide.steps) {
        expect(step.anchor && step.title, `${guide.id}: ${step.title}`).toBeTruthy();
      }
    }
  });

  test('"next" always names a real guide', () => {
    const ids = new Set(ANNOTATION_GUIDES.map((guide) => guide.id));
    for (const guide of ANNOTATION_GUIDES.filter((entry) => entry.next)) {
      expect(ids.has(guide.next), guide.id).toBe(true);
    }
  });

  test('every step anchor, and every spotlight target, exists on a control in the source', () => {
    const missing = ANNOTATION_GUIDES.flatMap((guide) =>
      guide.steps
        .flatMap((step) => [step.anchor, ...(Array.isArray(step.spotlight) ? step.spotlight : [])])
        .filter((anchor) => !anchorExists(anchor))
    );
    expect(missing).toEqual([]);
  });

  test('focus mode is offered ahead of fixing an outline', () => {
    // One canvas click both selects an object and focuses on it; registry order
    // decides which of the two triggered guides is offered.
    const ids = ANNOTATION_GUIDES.map((guide) => guide.id);
    expect(ids.indexOf('focus-mode')).toBeLessThan(ids.indexOf('fix-outline'));
  });
});
