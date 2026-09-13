import {
  buildColumnarTable,
  defaultViewerConfig,
  perImageViewerConfig,
  detectSwatchMetrics,
  orderColumnsForDisplay,
  parseCssRgb,
  perspectiveTheme,
  readableTextColor,
} from './perspectiveQuantification';

/**
 * Shaping the per-contour export for Perspective. The cases that matter are the ones the
 * export actually produces: metrics that are null for every row of an out-of-scope label,
 * metadata keys that no exported image carries, and colours that arrive as three separate
 * numeric columns.
 */

describe('buildColumnarTable — schema', () => {
  test('maps values onto perspective types', () => {
    const { schema } = buildColumnarTable([
      { file_name: 'a.png', contour_id: 3, area: 1.5, reviewed: true },
    ]);

    expect(schema).toEqual({
      file_name: 'string',
      contour_id: 'integer',
      area: 'float',
      reviewed: 'boolean',
    });
  });

  test('types a column that is null in every row as string', () => {
    // A `meta_` key the dataset declares but no exported image carries. Inference from the
    // data alone would have nothing to go on, and an untyped column cannot be grouped.
    const { schema } = buildColumnarTable([{ meta_site: null }, { meta_site: null }]);

    expect(schema).toEqual({ meta_site: 'string' });
  });

  test('widens to float when a later row is fractional', () => {
    // A metric whose first rows happen to be whole numbers must not be typed integer, or
    // every fractional measurement below them is truncated.
    const { schema } = buildColumnarTable([{ area: 2 }, { area: 3 }, { area: 4.5 }]);

    expect(schema.area).toBe('float');
  });

  test('finds a column whose only values are far down the frame', () => {
    // Metrics are null for rows whose label is outside the metric's scope, and those rows
    // can be an arbitrarily long run at the top — sampling the first row would miss this.
    const { schema } = buildColumnarTable([
      { area: null, circularity: null },
      { area: null, circularity: null },
      { area: 9.5, circularity: null },
    ]);

    expect(schema).toEqual({ area: 'float', circularity: 'string' });
  });

  test('handles no rows', () => {
    expect(buildColumnarTable([])).toEqual({
      columns: {}, schema: {}, columnNames: [], swatchMetrics: [],
    });
  });
});

describe('buildColumnarTable — columns and swatches', () => {
  const row = (over = {}) => ({
    contour_id: 1,
    area: 4,
    mean_color_rgb_r: 10,
    mean_color_rgb_g: 20,
    mean_color_rgb_b: 30,
    ...over,
  });

  test('emits one array per column, not one object per row', () => {
    // Perspective is columnar; handing it rows makes it transpose them itself.
    const { columns } = buildColumnarTable([row(), row({ contour_id: 2, area: 9 })]);

    expect(columns.area).toEqual([4, 9]);
    expect(columns.contour_id).toEqual([1, 2]);
  });

  test('synthesizes a CSS colour column under the bare metric key', () => {
    const { columns } = buildColumnarTable([row()]);

    expect(columns.mean_color_rgb).toEqual(['rgb(10, 20, 30)']);
  });

  test('keeps the numeric component columns', () => {
    // They are what still aggregates: a group's mean R/G/B is meaningful, the swatch
    // string can only be counted.
    const { columns } = buildColumnarTable([row()]);

    expect(columns.mean_color_rgb_r).toEqual([10]);
    expect(columns.mean_color_rgb_g).toEqual([20]);
    expect(columns.mean_color_rgb_b).toEqual([30]);
  });

  test('leaves the swatch empty when a channel is missing', () => {
    const { columns } = buildColumnarTable([row({ mean_color_rgb_g: null })]);

    expect(columns.mean_color_rgb).toEqual([null]);
  });

  test('converts opencv 8-bit LAB rather than treating it as RGB', () => {
    const { columns } = buildColumnarTable([
      { mean_color_lab_l: 255, mean_color_lab_a: 128, mean_color_lab_b: 128 },
    ]);

    // L=255 is white at neutral a/b under opencv's scaling; a raw RGB reading of the same
    // triple would give a mid-grey-blue instead.
    expect(columns.mean_color_lab).toEqual(['rgb(255, 255, 255)']);
  });

  test('does not mutate the input rows', () => {
    const rows = [row()];
    buildColumnarTable(rows);

    expect('mean_color_rgb' in rows[0]).toBe(false);
  });

  test('adds no swatch column when no colour metric is present', () => {
    const { columnNames } = buildColumnarTable([{ contour_id: 1, area: 4 }]);

    expect(columnNames).toEqual(['contour_id', 'area']);
  });

  test('reports the swatch columns it added', () => {
    const { swatchMetrics, columnNames } = buildColumnarTable([row()]);

    expect(swatchMetrics.map((m) => m.key)).toEqual(['mean_color_rgb']);
    expect(columnNames).toContain('mean_color_rgb');
  });
});

describe('detectSwatchMetrics', () => {
  test('requires all three component columns', () => {
    expect(detectSwatchMetrics(['mean_color_rgb_r', 'mean_color_rgb_g'])).toEqual([]);
  });

  test('finds each colour metric that is fully present', () => {
    const found = detectSwatchMetrics([
      'area',
      'mean_color_rgb_r', 'mean_color_rgb_g', 'mean_color_rgb_b',
      'mean_color_lab_l', 'mean_color_lab_a', 'mean_color_lab_b',
    ]);

    expect(found.map((metric) => metric.key)).toEqual(['mean_color_rgb', 'mean_color_lab']);
  });
});

describe('readableTextColor', () => {
  test('picks dark text on a light swatch and light text on a dark one', () => {
    expect(readableTextColor('rgb(255, 255, 255)')).toBe('#000000');
    expect(readableTextColor('rgb(0, 0, 0)')).toBe('#ffffff');
  });

  test('weights green over blue rather than averaging channels', () => {
    // Pure green and pure blue have the same channel average; only a luminance-weighted
    // reading gets the text colour right on both.
    expect(readableTextColor('rgb(0, 255, 0)')).toBe('#000000');
    expect(readableTextColor('rgb(0, 0, 255)')).toBe('#ffffff');
  });

  test('returns null for anything that is not an rgb() string', () => {
    expect(readableTextColor(null)).toBeNull();
    expect(readableTextColor('')).toBeNull();
    expect(parseCssRgb('#ffffff')).toBeNull();
  });
});

describe('orderColumnsForDisplay', () => {
  test('moves a swatch in front of the components it was built from', () => {
    // buildColumnarTable appends it; left there it sits past the right edge of a table
    // this wide and the grid never renders it.
    const ordered = orderColumnsForDisplay([
      'area', 'mean_color_rgb_r', 'mean_color_rgb_g', 'mean_color_rgb_b', 'mean_color_rgb',
    ]);

    expect(ordered).toEqual([
      'area', 'mean_color_rgb', 'mean_color_rgb_r', 'mean_color_rgb_g', 'mean_color_rgb_b',
    ]);
  });

  test('places each colour metric independently', () => {
    const ordered = orderColumnsForDisplay([
      'mean_color_rgb_r', 'mean_color_rgb_g', 'mean_color_rgb_b',
      'mean_color_lab_l', 'mean_color_lab_a', 'mean_color_lab_b',
      'mean_color_rgb', 'mean_color_lab',
    ]);

    expect(ordered.indexOf('mean_color_rgb')).toBe(0);
    expect(ordered.indexOf('mean_color_lab')).toBe(4);
  });

  test('leaves columns alone when there is no swatch', () => {
    const columns = ['file_name', 'label', 'area'];

    expect(orderColumnsForDisplay(columns)).toEqual(columns);
  });
});

describe('defaultViewerConfig', () => {
  test('opens on the plain table — every column, no grouping, no filters', () => {
    const columns = ['file_name', 'label', 'area'];
    const config = defaultViewerConfig(columns, 'Pro Light');

    expect(config.columns).toEqual(columns);
    expect(config.group_by).toEqual([]);
    expect(config.split_by).toEqual([]);
    expect(config.filter).toEqual([]);
    expect(config.plugin).toBe('Datagrid');
  });

  test('opens with the config panel showing', () => {
    // Without this the group-by, filter and plot-type controls are all hidden behind a
    // toggle, and the page reads as a grid with no charting in it at all.
    expect(defaultViewerConfig(['area'], 'Pro Light').settings).toBe(true);
  });

  test('keeps every column it was given', () => {
    const columns = ['area', 'mean_color_rgb_r', 'mean_color_rgb_g', 'mean_color_rgb_b',
      'mean_color_rgb'];

    expect(defaultViewerConfig(columns, 'Pro Light').columns.sort())
      .toEqual([...columns].sort());
  });
});

describe('perspectiveTheme', () => {
  test('is one theme for both modes', () => {
    // The Iquana theme is written against the app's design tokens, and those already swap
    // on [data-theme] — so there is no second theme to pick between.
    expect(perspectiveTheme('dark')).toBe('Iquana');
    expect(perspectiveTheme('light')).toBe('Iquana');
  });
});

describe('perImageViewerConfig', () => {
  const columns = [
    'file_name', 'meta_site', 'label', 'label_id', 'contour_id',
    'parent_id', 'parent_label', 'area', 'perimeter',
  ];

  test('opens grouped by the parent, so children sit under what contains them', () => {
    // Label before id: the id alone is not something a person can read a group header from.
    expect(perImageViewerConfig(columns, 'Iquana').group_by).toEqual(['parent_label', 'parent_id']);
  });

  test('drops the columns that are constant on a single image', () => {
    const { columns: shown } = perImageViewerConfig(columns, 'Iquana');
    expect(shown).not.toContain('file_name');
    expect(shown).not.toContain('meta_site');
    // The grouping columns are the row headers, so listing them again is pure width.
    expect(shown).not.toContain('parent_id');
    expect(shown).not.toContain('parent_label');
    // The measurements and the object's own identity stay.
    expect(shown).toEqual(expect.arrayContaining(['contour_id', 'label', 'area', 'perimeter']));
  });

  test('does not group by a hierarchy column the table lacks', () => {
    // An export taken before parent_id existed would otherwise restore a config naming a
    // column that is not there, and fall back to the plain table.
    const legacy = ['label', 'contour_id', 'area'];
    expect(perImageViewerConfig(legacy, 'Iquana').group_by).toEqual([]);
  });

  test('is otherwise the plain table', () => {
    const config = perImageViewerConfig(columns, 'Iquana');
    expect(config.plugin).toBe(defaultViewerConfig(columns, 'Iquana').plugin);
    expect(config.filter).toEqual([]);
    expect(config.settings).toBe(true);
  });
});
