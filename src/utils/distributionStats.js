/**
 * Box-plot and violin statistics.
 *
 * These deliberately reproduce the backend's `_distribution_stats`
 * (backend/app/services/database_access/datasets.py) rather than picking whatever
 * convention is convenient. The same dataset is summarised in two places — server-side for
 * the aggregated summary, and here for the in-viewer plots — and a median that disagrees
 * between the two is worse than no median at all. Every choice below is made to match:
 *
 *   - quartiles by linear interpolation, which is `numpy.percentile`'s default (type 7),
 *   - Tukey fences at 1.5 x IQR, with whiskers stopping at the most extreme value *inside*
 *     the fence so a whisker never reaches an outlier,
 *   - a Gaussian KDE on a 128-point grid using Scott's bandwidth, which is what
 *     `scipy.stats.gaussian_kde` does by default,
 *   - no curve at all for a distribution with no spread, where a KDE is singular.
 *
 * If the backend's constants change, these have to change with them.
 */

/** Tukey's fence multiplier — `_WHISKER_IQR_FACTOR`. */
const WHISKER_IQR_FACTOR = 1.5;
/** Points in the violin's density curve — `_KDE_GRID_POINTS`. */
const KDE_GRID_POINTS = 128;
/** Cap on plotted outliers — `_MAX_OUTLIER_SAMPLES`. */
const MAX_OUTLIER_SAMPLES = 50;

/**
 * Quantile by linear interpolation between order statistics.
 *
 * Matches `numpy.percentile`'s default. R calls this type 7; the difference from the
 * alternatives is a fraction of an order statistic, which is invisible on a plot but not
 * invisible when someone checks a median against the exported summary.
 *
 * @param {number[]} sorted - Ascending, non-empty.
 * @param {number} p - 0..1
 */
export const quantile = (sorted, p) => {
    if (sorted.length === 1) return sorted[0];
    const h = (sorted.length - 1) * p;
    const lo = Math.floor(h);
    const hi = Math.ceil(h);
    return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
};

/**
 * Gaussian kernel density estimate on an evenly spaced grid.
 *
 * Scott's rule for the bandwidth (`n^(-1/5)` times the sample standard deviation, sample
 * variance with one degree of freedom), matching scipy's default for one-dimensional data.
 *
 * Returns `null` when there is nothing to draw: fewer than two points, or no spread, where
 * the kernel would be a spike of zero width and scipy would raise on a singular covariance.
 *
 * @returns {{x: number[], density: number[]}|null}
 */
export const gaussianKde = (sorted, gridPoints = KDE_GRID_POINTS) => {
    const n = sorted.length;
    const low = sorted[0];
    const high = sorted[n - 1];
    if (n < 2 || high <= low) return null;

    const mean = sorted.reduce((sum, v) => sum + v, 0) / n;
    const variance = sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
    const bandwidth = Math.sqrt(variance) * Math.pow(n, -1 / 5);
    if (!(bandwidth > 0)) return null;

    const step = (high - low) / (gridPoints - 1);
    const norm = 1 / (n * bandwidth * Math.sqrt(2 * Math.PI));
    const x = new Array(gridPoints);
    const density = new Array(gridPoints);

    for (let g = 0; g < gridPoints; g++) {
        const at = low + step * g;
        let sum = 0;
        for (let i = 0; i < n; i++) {
            const z = (at - sorted[i]) / bandwidth;
            sum += Math.exp(-0.5 * z * z);
        }
        x[g] = at;
        // Clamped for the same reason the backend clamps: a coarse grid can evaluate
        // fractionally below zero, and a negative density draws a violin inside out.
        density[g] = Math.max(sum * norm, 0);
    }
    return { x, density };
};

/**
 * The five-number summary, whiskers, outliers, mean and density curve for one group.
 *
 * Non-finite values are dropped first, matching the backend — a null metric on a contour
 * outside the metric's scope is an absent measurement, not a zero.
 *
 * @param {number[]} values
 * @param {boolean} [withDensity] - Compute the KDE. Skipped for box plots, which do not
 *   draw one and would otherwise pay for it on every redraw.
 */
export const distributionStats = (values, withDensity = false) => {
    const clean = [];
    for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value)) clean.push(value);
    }
    if (clean.length === 0) return null;

    clean.sort((a, b) => a - b);
    const q1 = quantile(clean, 0.25);
    const median = quantile(clean, 0.5);
    const q3 = quantile(clean, 0.75);
    const iqr = q3 - q1;
    const lowerFence = q1 - WHISKER_IQR_FACTOR * iqr;
    const upperFence = q3 + WHISKER_IQR_FACTOR * iqr;

    const outliers = [];
    let whiskerLow = null;
    let whiskerHigh = null;
    for (const value of clean) {
        if (value < lowerFence || value > upperFence) {
            outliers.push(value);
        } else {
            if (whiskerLow === null) whiskerLow = value;
            whiskerHigh = value;
        }
    }
    // Guard the degenerate case the backend also guards: if nothing survives the fences,
    // fall back to the full range rather than producing whiskers from nothing.
    if (whiskerLow === null) {
        whiskerLow = clean[0];
        whiskerHigh = clean[clean.length - 1];
    }

    // Evenly spaced picks over the already-sorted outliers, so the sample keeps both
    // extremes, stays representative of the tail, and is deterministic.
    let outlierSample = outliers;
    if (outliers.length > MAX_OUTLIER_SAMPLES) {
        const picked = new Set();
        for (let i = 0; i < MAX_OUTLIER_SAMPLES; i++) {
            picked.add(Math.round((i * (outliers.length - 1)) / (MAX_OUTLIER_SAMPLES - 1)));
        }
        outlierSample = [...picked].sort((a, b) => a - b).map((i) => outliers[i]);
    }

    return {
        count: clean.length,
        min: clean[0],
        max: clean[clean.length - 1],
        mean: clean.reduce((sum, v) => sum + v, 0) / clean.length,
        q1,
        median,
        q3,
        whiskerLow,
        whiskerHigh,
        outlierCount: outliers.length,
        outliers: outlierSample,
        kde: withDensity ? gaussianKde(clean) : null,
    };
};

/**
 * Split a value column by a category column and summarise each group.
 *
 * Groups come back in first-seen order, which is the order Perspective hands the rows in —
 * so a sort applied in the viewer carries through to the order of the boxes.
 *
 * @param {Array} groupValues - Category per row; `null` becomes its own "(none)" group.
 * @param {Array} values - Measurement per row.
 * @param {boolean} [withDensity]
 * @returns {Array<{group: string, stats: Object}>}
 */
export const groupedDistributions = (groupValues, values, withDensity = false) => {
    const buckets = new Map();
    const total = Math.min(groupValues.length, values.length);

    for (let i = 0; i < total; i++) {
        const raw = groupValues[i];
        const key = raw === null || raw === undefined ? "(none)" : String(raw);
        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = [];
            buckets.set(key, bucket);
        }
        bucket.push(values[i]);
    }

    const result = [];
    for (const [group, groupValuesList] of buckets) {
        const stats = distributionStats(groupValuesList, withDensity);
        if (stats) result.push({ group, stats });
    }
    return result;
};
