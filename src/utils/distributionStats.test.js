import { distributionStats, gaussianKde, groupedDistributions, quantile } from './distributionStats';

/**
 * These expectations are not hand-derived — they were produced by running the backend's
 * own `_compute_distribution_stats` (numpy + scipy) over the same inputs and pasting the
 * results. That is the whole point of the file: the same dataset gets summarised in two
 * places, and the two must not drift. If one of these fails after a change here, the
 * change is wrong; if it fails after a backend change, both sides need updating together.
 */

const closeTo = (actual, expected, digits = 6) => expect(actual).toBeCloseTo(expected, digits);

describe('quantile — numpy.percentile linear interpolation', () => {
  test('interpolates between order statistics', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    closeTo(quantile(sorted, 0.25), 3.25);
    closeTo(quantile(sorted, 0.5), 5.5);
    closeTo(quantile(sorted, 0.75), 7.75);
  });

  test('handles a single value', () => {
    expect(quantile([42], 0.5)).toBe(42);
  });
});

describe('distributionStats — matches the backend', () => {
  test('simple range', () => {
    const s = distributionStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    expect(s.count).toBe(10);
    closeTo(s.q1, 3.25);
    closeTo(s.median, 5.5);
    closeTo(s.q3, 7.75);
    closeTo(s.mean, 5.5);
    expect(s.whiskerLow).toBe(1);
    expect(s.whiskerHigh).toBe(10);
    expect(s.outlierCount).toBe(0);
  });

  test('Tukey fences pull the whiskers in and name the outliers', () => {
    const s = distributionStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100, -50]);

    expect(s.count).toBe(11);
    closeTo(s.q1, 2.5);
    closeTo(s.median, 5.0);
    closeTo(s.q3, 7.5);
    closeTo(s.mean, 8.636363636363637);
    // The whiskers stop at the most extreme value inside the fence, never at an outlier.
    expect(s.whiskerLow).toBe(1);
    expect(s.whiskerHigh).toBe(9);
    expect(s.outlierCount).toBe(2);
    expect(s.outliers).toEqual([-50, 100]);
  });

  test('skewed sample', () => {
    const s = distributionStats([1, 1, 1, 2, 2, 3, 5, 8, 13, 21, 34, 55]);

    closeTo(s.q3, 15.0);
    expect(s.whiskerLow).toBe(1);
    expect(s.whiskerHigh).toBe(34);
    expect(s.outliers).toEqual([55]);
  });

  test('a single value has a summary but no spread', () => {
    const s = distributionStats([42]);

    expect(s).toMatchObject({ count: 1, min: 42, max: 42, q1: 42, median: 42, q3: 42 });
    expect(s.outlierCount).toBe(0);
  });

  test('two values', () => {
    const s = distributionStats([1, 5]);

    closeTo(s.q1, 2.0);
    closeTo(s.median, 3.0);
    closeTo(s.q3, 4.0);
  });

  test('drops non-finite values rather than reading them as zero', () => {
    // A metric is null on contours outside its scope; that is an absent measurement.
    const s = distributionStats([1, null, 2, undefined, 3, NaN, Infinity]);

    expect(s.count).toBe(3);
    closeTo(s.median, 2);
  });

  test('returns nothing when there is nothing to summarise', () => {
    expect(distributionStats([])).toBeNull();
    expect(distributionStats([null, NaN])).toBeNull();
  });

  test('caps the plotted outliers but keeps both extremes', () => {
    // A tight bulk with a long tail: the quartiles both sit inside the bulk, so the fences
    // are narrow and every tail value falls outside them.
    const values = [...Array(300).keys()].map((i) => i / 1000);
    values.push(...[...Array(60).keys()].map((i) => 1000 + i));
    const s = distributionStats(values);

    expect(s.outlierCount).toBe(60);
    expect(s.outliers).toHaveLength(50);
    // Evenly spaced picks over the sorted outliers keep both ends of the tail.
    expect(s.outliers[0]).toBe(1000);
    expect(s.outliers[s.outliers.length - 1]).toBe(1059);
  });
});

describe('gaussianKde — matches scipy defaults', () => {
  test('Scott bandwidth over a 128-point grid', () => {
    const kde = gaussianKde([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    expect(kde.x).toHaveLength(128);
    expect(kde.x[0]).toBe(1);
    expect(kde.x[127]).toBe(10);
    closeTo(kde.density[0], 0.0604417507);
    closeTo(kde.density[1], 0.0618799105);
    closeTo(kde.density[2], 0.0633018424);
  });

  test('matches scipy on a two-point sample', () => {
    const kde = gaussianKde([1, 5]);

    closeTo(kde.density[0], 0.1026618602);
    closeTo(kde.density[1], 0.1031080403);
  });

  test('no curve for a distribution with no spread', () => {
    // scipy raises on a singular covariance here; there is no shape to draw either way.
    expect(gaussianKde([7, 7, 7, 7, 7])).toBeNull();
    expect(gaussianKde([42])).toBeNull();
  });

  test('density is never negative', () => {
    gaussianKde([1, 1, 2, 40]).density.forEach((d) => expect(d).toBeGreaterThanOrEqual(0));
  });

  test('only computed when asked for', () => {
    // Box plots do not draw a curve and should not pay for one on every redraw.
    expect(distributionStats([1, 2, 3]).kde).toBeNull();
    expect(distributionStats([1, 2, 3], true).kde).not.toBeNull();
  });
});

describe('groupedDistributions', () => {
  test('summarises each category separately', () => {
    const groups = ['coral', 'sponge', 'coral', 'sponge'];
    const values = [1, 10, 3, 30];
    const result = groupedDistributions(groups, values);

    expect(result.map((r) => r.group)).toEqual(['coral', 'sponge']);
    closeTo(result[0].stats.median, 2);
    closeTo(result[1].stats.median, 20);
  });

  test('keeps first-seen order so a sort in the viewer carries through', () => {
    const result = groupedDistributions(['b', 'a', 'b'], [1, 2, 3]);

    expect(result.map((r) => r.group)).toEqual(['b', 'a']);
  });

  test('gives unlabelled rows their own group rather than dropping them', () => {
    const result = groupedDistributions(['coral', null], [1, 2]);

    expect(result.map((r) => r.group)).toEqual(['coral', '(none)']);
  });

  test('drops a group whose values are all absent', () => {
    const result = groupedDistributions(['coral', 'sponge'], [1, null]);

    expect(result.map((r) => r.group)).toEqual(['coral']);
  });
});
