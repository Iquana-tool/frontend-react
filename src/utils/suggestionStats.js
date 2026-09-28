/**
 * Wording and arithmetic for the "Model suggestions" card.
 */

/** Tool names as the workspace labels them. */
export const SOURCE_LABELS = {
  prompted: 'Run AI',
  refine: 'AI refinement',
  instance_suggestion: 'Suggest similar',
  instance_segmentation: 'Instance segmentation',
  cross_image: 'Cross-image suggestion',
  batch_inference: 'Batch inference',
};

export const sourceLabel = (source) => SOURCE_LABELS[source] ?? source;

/**
 * Whole-number percentages that always add up to exactly 100 (largest remainder),
 * so a row never reads "33% · 33% · 33%".
 *
 * @param {number[]} counts
 * @returns {number[]}
 */
export const percentages = (counts) => {
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (!total) return counts.map(() => 0);
  const exact = counts.map((n) => (n / total) * 100);
  const floors = exact.map(Math.floor);
  let remaining = 100 - floors.reduce((sum, n) => sum + n, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of order) {
    if (remaining <= 0) break;
    floors[index] += 1;
    remaining -= 1;
  }
  return floors;
};

/**
 * One model row's three buckets with counts and percentages, in display order.
 *
 * @param {{as_is: number, edited: number, rejected: number}} row
 */
export const outcomeBreakdown = (row) => {
  const counts = [row.as_is ?? 0, row.edited ?? 0, row.rejected ?? 0];
  const pct = percentages(counts);
  return [
    { key: 'as_is', label: 'accepted as-is', count: counts[0], pct: pct[0] },
    { key: 'edited', label: 'accepted with edits', count: counts[1], pct: pct[1] },
    { key: 'rejected', label: 'rejected', count: counts[2], pct: pct[2] },
  ];
};
