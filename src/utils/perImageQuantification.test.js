import {
  aggregateAllMetrics,
  aggregateMetric,
  aggregateMetricEntry,
  countMeasuredObjects,
  findMetricOutliers,
  formatDelta,
  frameCoverage,
  isAdditiveMetric,
  perLabelMetric,
  pickFeaturedMetric,
  relativeToBaseline,
  perLabelMetricVector,
  standardizedColorComparison,
  standardizedMetricComparison,
} from './perImageQuantification';

/**
 * The per-image page recombines the summary's per-label aggregates into image-wide ones.
 * The cases worth pinning are the ones where a plausible shortcut gives a different (and
 * wrong) answer: unequal label counts, labels a metric is not scoped to, and an image the
 * dataset has no baseline for.
 */

/** `{unit, components: [...]}` as the summary endpoint returns it. */
const entry = (unit, count, mean, std = 0, min = mean, max = mean) => ({
  unit,
  components: [{ count, mean, std, min, max }],
});

describe('aggregateMetric', () => {
  const metrics = {
    1: { area: entry('mm²', 10, 5) },
    2: { area: entry('mm²', 2, 30) },
  };

  test('sums counts and totals across labels', () => {
    const result = aggregateMetric(metrics, 'area');
    expect(result.count).toBe(12);
    expect(result.total).toBe(10 * 5 + 2 * 30);
    expect(result.unit).toBe('mm²');
  });

  test('weights the mean by count, not by label', () => {
    // The mean of the per-label means would be 17.5, which no object on this image is
    // anywhere near — 10 of the 12 objects measure 5.
    expect(aggregateMetric(metrics, 'area').mean).toBeCloseTo(110 / 12);
  });

  test('can exclude unlabeled objects, which the export omits', () => {
    const withUnlabeled = { ...metrics, null: { area: entry('mm²', 5, 100) } };
    expect(aggregateMetric(withUnlabeled, 'area').count).toBe(17);
    expect(aggregateMetric(withUnlabeled, 'area', { includeUnlabeled: false }).count).toBe(12);
  });

  test('reports no mean rather than zero when nothing measured', () => {
    const result = aggregateMetric({ 1: { perimeter: entry('mm', 3, 9) } }, 'area');
    expect(result.count).toBe(0);
    expect(result.mean).toBeNull();
    expect(result.unit).toBeNull();
  });

  test('pools the spread across labels rather than averaging it', () => {
    // Two labels, no spread WITHIN either, but their means are far apart. Averaging the
    // per-label standard deviations gives 0, which claims the image is uniform when in
    // fact every object is either 10 or 20.
    const pooled = aggregateMetric(
      { 1: { area: entry('mm²', 1, 10) }, 2: { area: entry('mm²', 1, 20) } },
      'area'
    );
    expect(pooled.mean).toBeCloseTo(15);
    expect(pooled.std).toBeCloseTo(5); // population std of {10, 20}
  });

  test('takes the extremes from the widest label', () => {
    const result = aggregateMetric(
      {
        1: { area: entry('mm²', 4, 10, 2, 6, 14) },
        2: { area: entry('mm²', 2, 50, 1, 48, 52) },
      },
      'area'
    );
    expect(result.min).toBe(6);
    expect(result.max).toBe(52);
  });
});

describe('aggregateMetricEntry', () => {
  test('keeps every component, so a colour survives the aggregation', () => {
    const colour = (count, r, g, b) => ({
      unit: null,
      components: [
        { count, mean: r, std: 0, min: r, max: r },
        { count, mean: g, std: 0, min: g, max: g },
        { count, mean: b, std: 0, min: b, max: b },
      ],
    });
    const result = aggregateMetricEntry(
      { 1: { mean_color_rgb: colour(1, 0, 0, 0) }, 2: { mean_color_rgb: colour(3, 100, 200, 40) } },
      'mean_color_rgb'
    );

    expect(result.components).toHaveLength(3);
    // Count-weighted per channel: the label with three objects dominates.
    expect(result.components[0].mean).toBeCloseTo(75);
    expect(result.components[1].mean).toBeCloseTo(150);
    expect(result.components[2].mean).toBeCloseTo(30);
  });

  test('returns null when the metric is absent', () => {
    expect(aggregateMetricEntry({ 1: { area: entry('mm²', 1, 1) } }, 'perimeter')).toBeNull();
  });
});

describe('aggregateAllMetrics', () => {
  const catalog = {
    area: { tier: 'geometry' },
    perimeter: { tier: 'geometry' },
    mean_intensity: { tier: 'appearance' },
    nn_distance: { tier: 'contextual' },
  };

  test('returns every measured metric, ordered by tier then name', () => {
    const metrics = {
      1: {
        nn_distance: entry('mm', 2, 5),
        mean_intensity: entry(null, 2, 120),
        perimeter: entry('mm', 2, 40),
        area: entry('mm²', 2, 100),
      },
    };
    expect(aggregateAllMetrics(metrics, catalog).map((row) => row.metricKey)).toEqual([
      'area',
      'perimeter',
      'mean_intensity',
      'nn_distance',
    ]);
  });

  test('drops metrics with no measurements rather than emitting empty cards', () => {
    const metrics = {
      1: { area: entry('mm²', 2, 100), perimeter: { unit: 'mm', components: [] } },
    };
    expect(aggregateAllMetrics(metrics, catalog).map((row) => row.metricKey)).toEqual(['area']);
  });
});

describe('perLabelMetric', () => {
  test('orders by total contribution, not by mean', () => {
    const result = perLabelMetric(
      {
        1: { area: entry('mm²', 100, 2) },   // total 200
        2: { area: entry('mm²', 1, 50) },    // total 50, but the largest objects
      },
      'area'
    );
    expect(result.map((row) => row.labelId)).toEqual(['1', '2']);
    expect(result[0].total).toBe(200);
  });

  test('omits labels the metric is not scoped to', () => {
    const result = perLabelMetric(
      { 1: { area: entry('mm²', 4, 2) }, 2: { perimeter: entry('mm', 4, 2) } },
      'area'
    );
    expect(result).toHaveLength(1);
    expect(result[0].labelId).toBe('1');
  });
});

describe('pickFeaturedMetric', () => {
  const catalog = {
    area: { unit_kind: 'area', value_dim: 1 },
    perimeter: { unit_kind: 'length', value_dim: 1 },
    mean_color_rgb: { unit_kind: 'color', value_dim: 3 },
  };

  test('prefers area when the profile includes it', () => {
    const metrics = { 1: { perimeter: entry('mm', 1, 1), area: entry('mm²', 1, 1) } };
    expect(pickFeaturedMetric(metrics, catalog)).toBe('area');
  });

  test('prefers additive scalar metrics (like perimeter/length) over non-additive ones (like circularity)', () => {
    const extendedCatalog = {
      ...catalog,
      circularity: { unit_kind: 'ratio', value_dim: 1 },
    };
    const metrics = {
      1: {
        circularity: entry(null, 1, 0.8),
        perimeter: entry('mm', 1, 25),
      },
    };
    expect(pickFeaturedMetric(metrics, extendedCatalog)).toBe('perimeter');
  });

  test('falls back to non-additive scalar metric (like circularity) when no additive metrics exist', () => {
    const extendedCatalog = {
      circularity: { unit_kind: 'ratio', value_dim: 1 },
      mean_color_rgb: { unit_kind: 'color', value_dim: 3 },
    };
    const metrics = {
      1: {
        circularity: entry(null, 1, 0.8),
        mean_color_rgb: entry(null, 1, 1),
      },
    };
    expect(pickFeaturedMetric(metrics, extendedCatalog)).toBe('circularity');
  });

  test('falls back to a scalar metric rather than a colour', () => {
    const metrics = { 1: { mean_color_rgb: entry(null, 1, 1), perimeter: entry('mm', 1, 1) } };
    expect(pickFeaturedMetric(metrics, catalog)).toBe('perimeter');
  });

  test('returns null when nothing is measured', () => {
    expect(pickFeaturedMetric({}, catalog)).toBeNull();
  });
});

describe('isAdditiveMetric', () => {
  test('recognizes additive and non-additive unit kinds', () => {
    expect(isAdditiveMetric({ unit_kind: 'area' })).toBe(true);
    expect(isAdditiveMetric({ unit_kind: 'length' })).toBe(true);
    expect(isAdditiveMetric({ unit_kind: 'count' })).toBe(true);
    expect(isAdditiveMetric({ unit_kind: 'volume' })).toBe(true);
    expect(isAdditiveMetric({ unit_kind: 'ratio' })).toBe(false);
    expect(isAdditiveMetric({ unit_kind: 'intensity' })).toBe(false);
    expect(isAdditiveMetric({ unit_kind: 'color' })).toBe(false);
    expect(isAdditiveMetric(null)).toBe(false);
  });
});

describe('frameCoverage', () => {
  const image = { width: 100, height: 100, scale_x: 0.5, scale_y: 0.5 };

  test('converts the frame into the display unit', () => {
    // 100x100 px at 0.5 mm/px is a 50x50 mm frame = 2500 mm².
    expect(frameCoverage(250, image, { display_physical: true })).toBeCloseTo(0.1);
  });

  test('measures against pixels when the image is uncalibrated', () => {
    expect(frameCoverage(1000, image, { display_physical: false })).toBeCloseTo(0.1);
  });

  test('declines to report coverage above the frame', () => {
    // Overlapping objects can sum past the frame; "140 % of frame" reads as a bug.
    expect(frameCoverage(14000, image, { display_physical: false })).toBeNull();
  });
});

describe('relativeToBaseline / formatDelta', () => {
  test('reports a signed fraction against the dataset', () => {
    expect(relativeToBaseline(12, 10)).toBeCloseTo(0.2);
    expect(formatDelta(relativeToBaseline(12, 10))).toBe('+20.0 %');
    expect(formatDelta(relativeToBaseline(8, 10))).toBe('-20.0 %');
  });

  test('has no opinion without a baseline', () => {
    expect(relativeToBaseline(12, null)).toBeNull();
    expect(relativeToBaseline(12, 0)).toBeNull();
    expect(formatDelta(null)).toBeNull();
  });
});

describe('countMeasuredObjects', () => {
  test('counts objects across multiple labels with different metrics', () => {
    const metrics = {
      1: { area: entry('mm²', 5, 10) },
      2: { circularity: entry(null, 3, 0.8) },
    };
    expect(countMeasuredObjects(metrics)).toBe(8);
  });

  test('does not double count multiple metrics on the same label', () => {
    const metrics = {
      1: {
        area: entry('mm²', 5, 10),
        perimeter: entry('mm', 5, 20),
      },
    };
    expect(countMeasuredObjects(metrics)).toBe(5);
  });

  test('handles empty or missing metrics', () => {
    expect(countMeasuredObjects(null)).toBe(0);
    expect(countMeasuredObjects({})).toBe(0);
    expect(countMeasuredObjects({ 1: {} })).toBe(0);
  });

  test('can exclude unlabeled objects', () => {
    const metrics = {
      1: { area: entry('mm²', 5, 10) },
      null: { area: entry('mm²', 2, 8) },
    };
    expect(countMeasuredObjects(metrics)).toBe(7);
    expect(countMeasuredObjects(metrics, { includeUnlabeled: false })).toBe(5);
  });
});

describe("findMetricOutliers", () => {
  const object = (id, area) => ({ id, quantification: { area } });
  const baseline = { metricKey: "area", mean: 100, std: 10 };

  it("flags objects beyond the threshold in either direction", () => {
    const found = findMetricOutliers(
      [object(1, 100), object(2, 130), object(3, 70), object(4, 105)],
      baseline
    );
    expect(found.map((row) => row.object.id)).toEqual([2, 3]);
    expect(found[0].z).toBeCloseTo(3);
    expect(found[1].z).toBeCloseTo(-3);
  });

  it("orders by distance, worst first, regardless of sign", () => {
    const found = findMetricOutliers([object(1, 125), object(2, 60)], baseline);
    expect(found.map((row) => row.object.id)).toEqual([2, 1]);
  });

  it("honours a custom threshold", () => {
    const objects = [object(1, 115)];
    expect(findMetricOutliers(objects, baseline)).toHaveLength(0);
    expect(findMetricOutliers(objects, baseline, { threshold: 1 })).toHaveLength(1);
  });

  // One distinct value across the dataset makes every deviation infinite; that
  // is a statement about the dataset, not about these objects.
  it("flags nothing when the dataset has no spread", () => {
    expect(findMetricOutliers([object(1, 999)], { ...baseline, std: 0 })).toEqual([]);
    expect(findMetricOutliers([object(1, 999)], { ...baseline, std: null })).toEqual([]);
  });

  it("returns nothing without a usable baseline", () => {
    expect(findMetricOutliers([object(1, 999)], null)).toEqual([]);
    expect(findMetricOutliers([object(1, 999)], { metricKey: "area", std: 10 })).toEqual([]);
  });

  it("skips objects that never measured the metric", () => {
    const found = findMetricOutliers(
      [{ id: 1 }, { id: 2, quantification: {} }, object(3, 200)],
      baseline
    );
    expect(found.map((row) => row.object.id)).toEqual([3]);
  });

  // Area predates the quantification payload on some objects; the pixel count is
  // the same measurement under an older name.
  it("falls back to pixelCount for area", () => {
    const found = findMetricOutliers([{ id: 7, pixelCount: 200 }], baseline);
    expect(found).toHaveLength(1);
    expect(found[0].value).toBe(200);
  });

  it("does not use pixelCount for any other metric", () => {
    const found = findMetricOutliers([{ id: 7, pixelCount: 200 }], {
      metricKey: "perimeter",
      mean: 100,
      std: 10,
    });
    expect(found).toEqual([]);
  });

  it("tolerates an empty or missing object list", () => {
    expect(findMetricOutliers([], baseline)).toEqual([]);
    expect(findMetricOutliers(undefined, baseline)).toEqual([]);
  });

  /**
   * The hierarchy case this exists for: a parent contour pooled with the dozens
   * of small children inside it reads as an outlier on every image, which flags
   * everything and therefore says nothing.
   */
  describe("per-label baselines", () => {
    const labelled = (id, labelId, area) => ({ id, labelId, quantification: { area } });
    // Parents average 100, children 10; pooling them puts the mean between.
    const nested = {
      metricKey: "area",
      mean: 20,
      std: 5,
      byLabel: {
        1: { mean: 100, std: 10 },
        2: { mean: 10, std: 2 },
      },
    };

    it("clears an object that is normal for its own label", () => {
      // 105 is +17 sigma against the pooled mean and +0.5 against its label's.
      expect(findMetricOutliers([labelled(1, 1, 105)], nested)).toEqual([]);
    });

    it("still catches one that is abnormal for its own label", () => {
      const found = findMetricOutliers([labelled(1, 1, 140)], nested);
      expect(found).toHaveLength(1);
      expect(found[0].z).toBeCloseTo(4);
      expect(found[0].scope).toBe("1");
    });

    it("judges each label against its own distribution", () => {
      const found = findMetricOutliers(
        [labelled(1, 1, 100), labelled(2, 2, 10), labelled(3, 2, 30)],
        nested
      );
      expect(found.map((row) => row.object.id)).toEqual([3]);
    });

    it("falls back to the pooled figures for a label with no baseline", () => {
      const found = findMetricOutliers([labelled(1, 99, 100)], nested);
      expect(found).toHaveLength(1);
      expect(found[0].scope).toBe("dataset");
    });

    it("matches label ids across number and string forms", () => {
      expect(findMetricOutliers([labelled(1, "1", 105)], nested)).toEqual([]);
    });

    it("falls back for an unlabelled object", () => {
      const found = findMetricOutliers([{ id: 1, quantification: { area: 100 } }], nested);
      expect(found[0].scope).toBe("dataset");
    });

    it("ignores a label baseline with no spread", () => {
      const flat = { ...nested, byLabel: { 1: { mean: 100, std: 0 } } };
      const found = findMetricOutliers([labelled(1, 1, 100)], flat);
      // Falls through to the pooled figures rather than dividing by zero.
      expect(found).toHaveLength(1);
      expect(found[0].scope).toBe("dataset");
    });

    it("skips an object entirely when neither baseline is usable", () => {
      const unusable = { metricKey: "area", mean: 20, std: 0, byLabel: {} };
      expect(findMetricOutliers([labelled(1, 1, 100)], unusable)).toEqual([]);
    });
  });
});

/**
 * The correction that makes a per-image comparison mean anything on a
 * hierarchy. Labels here: 1 is a parent class, 2 the small children inside it.
 */
describe("standardizedMetricComparison", () => {
  const entry = (count, mean) => ({ area: { unit: "cm", components: [{ count, mean }] } });

  // Dataset: 10 parents averaging 100, 200 children averaging 5. Pooled mean is
  // about 9.5, because children dominate the population.
  const dataset = { 1: entry(10, 100), 2: entry(200, 5) };

  it("does not punish an image for carrying only the larger class", () => {
    // Three perfectly typical parents. Naively this is +950 % against the pooled
    // mean; standardized it is zero, which is the true answer.
    const image = { 1: entry(3, 100) };
    const result = standardizedMetricComparison(image, dataset, "area");
    expect(result.observed).toBe(100);
    expect(result.expected).toBe(100);
    expect(result.delta).toBe(0);
  });

  it("still reports an image whose objects are atypical for their own class", () => {
    const image = { 1: entry(3, 150) };
    const result = standardizedMetricComparison(image, dataset, "area");
    expect(result.expected).toBe(100);
    expect(result.delta).toBeCloseTo(0.5);
  });

  it("weights the expectation by the image's own mix", () => {
    // One parent and one child: expected is the mean of 100 and 5.
    const image = { 1: entry(1, 100), 2: entry(1, 5) };
    const result = standardizedMetricComparison(image, dataset, "area");
    expect(result.expected).toBeCloseTo(52.5);
    expect(result.observed).toBeCloseTo(52.5);
    expect(result.delta).toBeCloseTo(0);
  });

  it("counts objects, not labels, when weighting", () => {
    // Nine children and one parent should sit near the child mean.
    const image = { 1: entry(1, 100), 2: entry(9, 5) };
    const result = standardizedMetricComparison(image, dataset, "area");
    expect(result.expected).toBeCloseTo(14.5);
    expect(result.count).toBe(10);
  });

  // Including a label on one side only is exactly the bias this corrects.
  it("drops a label the dataset cannot price, from both sides", () => {
    const image = { 1: entry(2, 100), 99: entry(2, 9999) };
    const result = standardizedMetricComparison(image, dataset, "area");
    expect(result.droppedLabels).toBe(1);
    expect(result.observed).toBe(100);
    expect(result.expected).toBe(100);
    expect(result.labels.map((row) => row.labelId)).toEqual(["1"]);
  });

  it("keeps the value but withholds the comparison when nothing is shared", () => {
    const result = standardizedMetricComparison({ 99: entry(2, 40) }, dataset, "area");
    expect(result.observed).toBe(40);
    expect(result.expected).toBeNull();
    expect(result.delta).toBeNull();
    expect(result.droppedLabels).toBe(1);
  });

  it("reports each label's own comparison, busiest first", () => {
    const image = { 1: entry(2, 120), 2: entry(8, 4) };
    const result = standardizedMetricComparison(image, dataset, "area");
    expect(result.labels.map((row) => row.labelId)).toEqual(["2", "1"]);
    expect(result.labels[0].delta).toBeCloseTo(-0.2);
    expect(result.labels[1].delta).toBeCloseTo(0.2);
  });

  it("carries the unit through", () => {
    expect(standardizedMetricComparison({ 1: entry(1, 100) }, dataset, "area").unit).toBe("cm");
  });

  it("returns null when the metric is not measured on the image", () => {
    expect(standardizedMetricComparison({ 1: entry(1, 100) }, dataset, "perimeter")).toBeNull();
    expect(standardizedMetricComparison({}, dataset, "area")).toBeNull();
  });
});

describe("perLabelMetricVector", () => {
  const colour = (count, means) => ({
    mean_color_lab: { unit: null, components: means.map((mean) => ({ count, mean })) },
  });

  // The scalar helpers take components[0], which on a colour is the L channel
  // alone — "mean colour" silently reduced to "mean lightness".
  it("keeps every channel, not just the first", () => {
    expect(perLabelMetricVector({ 1: colour(4, [120, 130, 140]) }, "mean_color_lab")).toEqual([
      { labelId: "1", count: 4, means: [120, 130, 140] },
    ]);
  });

  it("skips labels that measured nothing", () => {
    expect(perLabelMetricVector({ 1: colour(0, [1, 2, 3]) }, "mean_color_lab")).toEqual([]);
    expect(perLabelMetricVector({ 1: {} }, "mean_color_lab")).toEqual([]);
    expect(perLabelMetricVector(null, "mean_color_lab")).toEqual([]);
  });
});

/**
 * A colour is compared perceptually, not proportionally: see colorDifference for
 * why a percentage on a channel is not a quantity at all.
 */
describe("standardizedColorComparison", () => {
  const colour = (count, means) => ({
    mean_color_lab: { components: means.map((mean) => ({ count, mean })) },
  });
  // Mid grey in OpenCV's packing: L 128 of 255, a and b at the 128 origin.
  const grey = [128, 128, 128];

  it("reports no difference when the image matches the dataset", () => {
    const metrics = { 1: colour(3, grey) };
    const result = standardizedColorComparison(metrics, metrics, "mean_color_lab", "opencv_lab");
    expect(result.deltaE).toBeCloseTo(0, 10);
    expect(result.kind).toBe("color");
  });

  it("measures a real shift in CIEDE2000 units", () => {
    const image = { 1: colour(3, [128, 160, 100]) };
    const dataset = { 1: colour(30, grey) };
    const result = standardizedColorComparison(image, dataset, "mean_color_lab", "opencv_lab");
    expect(result.deltaE).toBeGreaterThan(10);
    // Both sides converted, not compared in the packed encoding.
    expect(result.observed.a).toBe(32);
    expect(result.expected.a).toBe(0);
  });

  it("weights the expected colour by the image's own label mix", () => {
    const image = { 1: colour(1, grey), 2: colour(3, grey) };
    const dataset = { 1: colour(50, [255, 128, 128]), 2: colour(50, [0, 128, 128]) };
    const result = standardizedColorComparison(image, dataset, "mean_color_lab", "opencv_lab");
    // Three parts black to one part white, in the packed L: 255/4 = 63.75.
    expect(result.expected.L).toBeCloseTo((63.75 / 255) * 100, 6);
  });

  it("gives each label its own difference, busiest first", () => {
    const image = { 1: colour(1, grey), 2: colour(5, [128, 190, 128]) };
    const dataset = { 1: colour(9, grey), 2: colour(9, grey) };
    const result = standardizedColorComparison(image, dataset, "mean_color_lab", "opencv_lab");
    expect(result.labels.map((row) => row.labelId)).toEqual(["2", "1"]);
    expect(result.labels[0].deltaE).toBeGreaterThan(5);
    expect(result.labels[1].deltaE).toBeCloseTo(0, 10);
  });

  it("drops a label the dataset has no colour for", () => {
    const image = { 1: colour(2, grey), 99: colour(2, [255, 200, 40]) };
    const dataset = { 1: colour(9, grey) };
    const result = standardizedColorComparison(image, dataset, "mean_color_lab", "opencv_lab");
    expect(result.droppedLabels).toBe(1);
    expect(result.deltaE).toBeCloseTo(0, 10);
  });

  it("keeps the measured colour but withholds the difference when nothing is shared", () => {
    const result = standardizedColorComparison(
      { 99: colour(2, grey) }, { 1: colour(9, grey) }, "mean_color_lab", "opencv_lab"
    );
    expect(result.observed).not.toBeNull();
    expect(result.expected).toBeNull();
    expect(result.deltaE).toBeNull();
  });

  it("converts sRGB through its own path", () => {
    const image = { 1: { mean_color_rgb: { components: [255, 255, 255].map((mean) => ({ count: 1, mean })) } } };
    const dataset = { 1: { mean_color_rgb: { components: [0, 0, 0].map((mean) => ({ count: 9, mean })) } } };
    const result = standardizedColorComparison(image, dataset, "mean_color_rgb", "srgb");
    expect(result.observed.L).toBeCloseTo(100, 4);
    expect(result.expected.L).toBeCloseTo(0, 4);
    expect(result.deltaE).toBeGreaterThan(90);
  });

  it("refuses to guess at a space it was not given", () => {
    const metrics = { 1: colour(1, grey) };
    expect(standardizedColorComparison(metrics, metrics, "mean_color_lab", null)).toBeNull();
  });

  it("returns null when the metric is not on the image", () => {
    expect(standardizedColorComparison({}, {}, "mean_color_lab", "opencv_lab")).toBeNull();
  });
});
