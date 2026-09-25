import { activityPhrases, formatLastActive } from './datasetActivity';

describe('activityPhrases', () => {
  test('only non-zero activities are listed, in a fixed order', () => {
    const phrases = activityPhrases({
      username: 'ann', annotated: 50, annotated_ai: 32, finished: 1, reviewed: 0,
      sent_back: 0, resolved: 2, calibrated: 0,
    });
    expect(phrases.map((p) => p.text)).toEqual([
      'annotated 50 objects', 'finished 1 image', 'resolved 2 corrections',
    ]);
    expect(phrases[0].detail).toBe('32 with AI');
  });

  test('singular nouns for a count of one', () => {
    const phrases = activityPhrases({ reviewed: 1, sent_back: 1, calibrated: 1 });
    expect(phrases.map((p) => p.text)).toEqual([
      'reviewed 1 object', 'sent back 1 object', 'calibrated 1 image',
    ]);
  });

  test('the AI share reads "all" when every object came from AI, and is absent when none did', () => {
    expect(activityPhrases({ annotated: 3, annotated_ai: 3 })[0].detail).toBe('all with AI');
    expect(activityPhrases({ annotated: 3, annotated_ai: 0 })[0].detail).toBeUndefined();
  });

  test('a user with nothing counted has no phrases', () => {
    expect(activityPhrases({ username: 'x', annotated: 0 })).toEqual([]);
  });
});

describe('formatLastActive', () => {
  const now = Date.parse('2026-09-24T12:00:00Z');

  test('reads naive timestamps as UTC', () => {
    expect(formatLastActive('2026-09-24T11:55:00', now)).toBe('5 min ago');
  });

  test('coarsens with age', () => {
    expect(formatLastActive('2026-09-24T11:59:40', now)).toBe('just now');
    expect(formatLastActive('2026-09-24T09:00:00', now)).toBe('3 h ago');
    expect(formatLastActive('2026-09-23T11:00:00', now)).toBe('1 day ago');
    expect(formatLastActive('2026-09-20T12:00:00', now)).toBe('4 days ago');
  });

  test('missing or invalid input gives null', () => {
    expect(formatLastActive(null, now)).toBeNull();
    expect(formatLastActive('not a date', now)).toBeNull();
  });
});
