import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getMetricsCatalog, getQuantificationSummary } from '../../../api/quantifications';
import {
  buildMetricCatalogMap,
  createLabelIdToNameMap,
} from '../../../utils/quantificationUtils';
import {
  aggregateAllMetrics,
  aggregateMetric,
  pickFeaturedMetric,
  standardizedMetricComparison,
} from '../../../utils/perImageQuantification';
import { useCurrentImageId } from '../../../stores/selectors/annotationSelectors';

/**
 * The image's measurements and the dataset's, for the Review drawer.
 *
 * Asks the summary endpoint twice — once scoped to this image, once not — which
 * is what the per-image quantification page already does and for the same
 * reason: a number is only interesting next to the population it came from. The
 * response shape is identical either way, so both go through the same
 * aggregation helpers.
 *
 * Both requests deliberately include unreviewed and not-fully-annotated work.
 * The page's defaults exclude it, which is right for a published figure and
 * exactly wrong here: in Review the unreviewed contours *are* the subject, and
 * excluding them would measure everything except what is being looked at.
 *
 * The catalog is fetched once per mount and only supplies display names, units
 * and ordering; nothing here blocks on it.
 */
const SUMMARY_OPTIONS = {
  excludeUnreviewed: false,
  excludeNotFullyAnnotated: false,
  includeDistribution: false,
};

export default function useImageMeasurements({ enabled = true } = {}) {
  const { datasetId } = useParams();
  const imageId = useCurrentImageId();

  const [state, setState] = useState({
    image: null,
    dataset: null,
    catalog: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !datasetId || !imageId) return undefined;

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    Promise.all([
      getQuantificationSummary(Number(datasetId), { ...SUMMARY_OPTIONS, imageId: Number(imageId) }),
      getQuantificationSummary(Number(datasetId), SUMMARY_OPTIONS),
      getMetricsCatalog(),
    ])
      .then(([image, dataset, catalogResponse]) => {
        if (cancelled) return;
        // The catalog endpoint answers with an envelope, not a bare list.
        setState({
          image,
          dataset,
          catalog: catalogResponse?.metrics || [],
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error?.message || 'Could not load measurements for this image.',
        }));
      });

    return () => { cancelled = true; };
  }, [enabled, datasetId, imageId]);

  const catalogMap = useMemo(
    () => buildMetricCatalogMap(state.catalog),
    [state.catalog]
  );

  /** Label id → name, for the per-label breakdown under a row. */
  const labelNames = useMemo(
    () => (state.image?.labels ? createLabelIdToNameMap(state.image.labels) : {}),
    [state.image]
  );

  /**
   * One row per metric measured on this image, already compared.
   *
   * The comparison is standardized to the image's own label mix rather than
   * being this image's mean against the dataset's — see
   * standardizedMetricComparison for why the naive version reads several
   * hundred percent high on a hierarchy. Each row also carries the per-label
   * figures behind its headline, so the drawer can show which label is driving
   * it without a second pass over the responses.
   */
  const rows = useMemo(() => {
    if (!state.image?.metrics) return [];
    return aggregateAllMetrics(state.image.metrics, catalogMap).map(({ metricKey }) => {
      const comparison = state.dataset?.metrics
        ? standardizedMetricComparison(state.image.metrics, state.dataset.metrics, metricKey)
        : null;
      const image = aggregateMetric(state.image.metrics, metricKey);
      return {
        metricKey,
        label: catalogMap[metricKey]?.name || metricKey,
        tier: catalogMap[metricKey]?.tier || null,
        image,
        comparison,
        labels: (comparison?.labels || []).map((entry) => ({
          ...entry,
          name: labelNames[entry.labelId] || `Label ${entry.labelId}`,
        })),
      };
    });
  }, [state.image, state.dataset, catalogMap, labelNames]);

  /**
   * The metric the outlier scan runs on.
   *
   * The same one the quantification page features, so "the metric this dataset
   * is about" means one thing across the app rather than being guessed twice.
   */
  const featuredMetric = useMemo(
    () => pickFeaturedMetric(state.image?.metrics, catalogMap),
    [state.image, catalogMap]
  );

  /**
   * The dataset's distribution for the featured metric, per label and pooled.
   *
   * Per label is what the outlier scan actually wants. The summary is already
   * keyed by label id, so the per-label figures need no extra request — they are
   * the aggregate one level below the one the rows above use.
   */
  const baseline = useMemo(() => {
    if (!featuredMetric || !state.dataset?.metrics) return null;
    const pooled = aggregateMetric(state.dataset.metrics, featuredMetric);
    if (!pooled || !pooled.count) return null;

    const byLabel = {};
    for (const [labelId, metrics] of Object.entries(state.dataset.metrics)) {
      const stats = metrics?.[featuredMetric]?.components?.[0];
      // A single measured object has no spread to speak of and would make every
      // sibling on the image an infinite outlier.
      if (stats && stats.count > 1 && Number.isFinite(stats.std) && stats.std > 0) {
        byLabel[String(labelId)] = { mean: stats.mean, std: stats.std, count: stats.count };
      }
    }

    return {
      metricKey: featuredMetric,
      label: catalogMap[featuredMetric]?.name || featuredMetric,
      mean: pooled.mean,
      std: pooled.std,
      unit: pooled.unit,
      byLabel,
    };
  }, [featuredMetric, state.dataset, catalogMap]);

  return { ...state, rows, baseline, catalogMap };
}
