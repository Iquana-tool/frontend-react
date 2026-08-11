import {
  groupValuesWithData,
  prepareGroupedComparisonData,
} from './quantificationUtils';

/**
 * The grouped-chart data prep. Metadata is an image-wide label every object inherits, so
 * a grouped chart is the same numbers split one level deeper — these cover the reshaping
 * from the server's `{group: {labelId: {metric}}}` into recharts' one-row-per-category,
 * one-series-per-group form, where the axes are effectively transposed.
 */
const labelIdToName = { 3: 'coral', 4: 'sponge' };

const metrics = (mean, count = 1) => ({
  area: { unit: 'px²', components: [{ mean, count, std: 0, min: mean, max: mean }] },
});

const groups = {
  reef_a: { 3: metrics(15, 2), 4: metrics(5) },
  reef_b: { 3: metrics(60) },
};

describe('prepareGroupedComparisonData', () => {
  test('emits one row per label with a field per group', () => {
    const rows = prepareGroupedComparisonData(groups, 'area', labelIdToName,
      ['reef_a', 'reef_b']);

    expect(rows).toEqual([
      { labelId: '3', label: 'coral', reef_a: 15, reef_a__count: 2, reef_b: 60, reef_b__count: 1 },
      { labelId: '4', label: 'sponge', reef_a: 5, reef_a__count: 1 },
    ]);
  });

  test('a label missing from a group has no field rather than a zero', () => {
    // "No sponges recorded at reef B" is not "sponges of area zero" — recharts draws a
    // gap for the missing key, which is the honest rendering.
    const rows = prepareGroupedComparisonData(groups, 'area', labelIdToName,
      ['reef_a', 'reef_b']);
    const sponge = rows.find((row) => row.labelId === '4');
    expect('reef_b' in sponge).toBe(false);
  });

  test('the server ordering of groups is preserved', () => {
    const rows = prepareGroupedComparisonData(groups, 'area', labelIdToName,
      ['reef_b', 'reef_a']);
    // Field insertion order follows the group order it was handed.
    expect(Object.keys(rows[0]).filter((k) => k.startsWith('reef') && !k.endsWith('__count')))
      .toEqual(['reef_b', 'reef_a']);
  });

  test('the unlabeled bucket is skipped, as in the ungrouped charts', () => {
    const withNull = { reef_a: { ...groups.reef_a, null: metrics(99) } };
    const rows = prepareGroupedComparisonData(withNull, 'area', labelIdToName, ['reef_a']);
    expect(rows.map((row) => row.labelId)).toEqual(['3', '4']);
  });

  test('a metric absent everywhere yields no rows', () => {
    expect(prepareGroupedComparisonData(groups, 'perimeter', labelIdToName,
      ['reef_a', 'reef_b'])).toEqual([]);
  });

  test('no groups at all is not an error', () => {
    expect(prepareGroupedComparisonData(null, 'area', labelIdToName, [])).toEqual([]);
  });
});

describe('groupValuesWithData', () => {
  test('drops groups that carry nothing for this metric', () => {
    const sparse = { reef_a: { 3: metrics(15) }, reef_b: {} };
    expect(groupValuesWithData(sparse, 'area', ['reef_a', 'reef_b'])).toEqual(['reef_a']);
  });

  test('keeps the server ordering', () => {
    expect(groupValuesWithData(groups, 'area', ['reef_b', 'reef_a']))
      .toEqual(['reef_b', 'reef_a']);
  });
});
