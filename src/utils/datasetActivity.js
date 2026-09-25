/**
 * Wording for the dataset activity card: turning one user's counts into short,
 * readable phrases. Kept apart from the component so it can be tested directly.
 */

/** The time windows the card offers, first one is the default. 0 = all time. */
export const ACTIVITY_WINDOWS = [
  { days: 7, label: '7 days', empty: 'in the last 7 days' },
  { days: 30, label: '30 days', empty: 'in the last 30 days' },
  { days: 0, label: 'All time', empty: 'yet' },
];

const plural = (count, singular, pluralForm = `${singular}s`) =>
  (count === 1 ? singular : pluralForm);

/**
 * One user's non-zero activities, in a fixed order, as `{count, text, detail}`.
 * `detail` carries a qualifier shown after the phrase (the AI share).
 *
 * @param {Object} row - a `users` entry from `GET /datasets/{id}/activity`
 * @returns {Array<{key: string, count: number, text: string, detail?: string}>}
 */
export const activityPhrases = (row) => {
  const phrases = [];
  const add = (key, count, verb, noun, detail) => {
    if (count > 0) phrases.push({ key, count, text: `${verb} ${count} ${noun}`, detail });
  };
  const annotated = row?.annotated ?? 0;
  const ai = row?.annotated_ai ?? 0;
  add('annotated', annotated, 'annotated', plural(annotated, 'object'),
    ai > 0 ? `${ai === annotated ? 'all' : ai} with AI` : undefined);
  add('finished', row?.finished ?? 0, 'finished', plural(row?.finished, 'image'));
  add('reviewed', row?.reviewed ?? 0, 'reviewed', plural(row?.reviewed, 'object'));
  add('sent_back', row?.sent_back ?? 0, 'sent back', plural(row?.sent_back, 'object'));
  add('resolved', row?.resolved ?? 0, 'resolved', plural(row?.resolved, 'correction'));
  add('calibrated', row?.calibrated ?? 0, 'calibrated', plural(row?.calibrated, 'image'));
  return phrases;
};

/**
 * "just now", "5 min ago", "3 h ago", "2 days ago", or a date for anything older
 * than a month. The server sends naive UTC timestamps, so "Z" is appended before
 * parsing -- without it the string would be read as local time.
 *
 * @param {string|null} iso
 * @param {number} [now] - epoch ms, for tests
 */
export const formatLastActive = (iso, now = Date.now()) => {
  if (!iso) return null;
  const then = Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(then)) return null;
  const minutes = Math.floor(Math.max(0, now - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `${days} ${plural(days, 'day')} ago`;
  return new Date(then).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
