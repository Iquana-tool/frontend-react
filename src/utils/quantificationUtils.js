// Helper function to calculate statistics from an array
export const calculateStats = (values) => {
  if (!values || values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
    };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;

  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    mean,
  };
};

// Helper function to create label ID to name mapping
export const createLabelIdToNameMap = (labelsData) => {
  const labelIdToName = {};
  if (labelsData?.id_to_label_object) {
    Object.entries(labelsData.id_to_label_object).forEach(([id, label]) => {
      labelIdToName[id] = label.name;
      labelIdToName[Number(id)] = label.name; // Support both string and number keys
    });
  }
  return labelIdToName;
};

// Helper function to prepare comparison chart data
export const prepareComparisonData = (metricsPerLabelId, labelIdToName) => {
  if (!metricsPerLabelId) return [];
  
  const chartData = [];
  
  // Get all labels with metrics
  Object.entries(metricsPerLabelId).forEach(([labelId, labelMetrics]) => {
    if (labelId === 'null') return; // Skip null label for comparison
    
    const labelName = labelIdToName[labelId] || labelIdToName[String(labelId)] || `Label ${labelId}`;
    const labelData = { label: labelName, labelId };
    
    // Process each metric
    Object.entries(labelMetrics).forEach(([metricKey, metricValues]) => {
      if (metricValues && Array.isArray(metricValues) && metricValues.length > 0) {
        const stats = calculateStats(metricValues);
        labelData[metricKey] = stats.mean;
        labelData[`${metricKey}_count`] = stats.count;
      }
    });
    
    // Only add if it has at least one metric
    if (Object.keys(labelData).length > 2) {
      chartData.push(labelData);
    }
  });
  
  return chartData;
};

// Helper function to get labels with metrics
export const getLabelsWithMetrics = (metricsPerLabelId) => {
  return metricsPerLabelId
    ? Object.keys(metricsPerLabelId).filter((id) => id !== "null")
    : [];
};

// Helper function to collect all label IDs from hierarchy
export const collectAllLabelIds = (rootLevelLabels) => {
  const allLabelIds = new Set();
  const collectIds = (labels) => {
    labels.forEach((label) => {
      allLabelIds.add(label.id);
      if (label.children) {
        collectIds(label.children);
      }
    });
  };
  
  if (rootLevelLabels) {
    collectIds(rootLevelLabels);
  }
  
  return allLabelIds;
};

// Helper function to get labels to auto-expand based on metrics/child counts
export const getLabelsToAutoExpand = (metricsPerLabelId, childCountsPerLabelId) => {
  const labelsToExpand = new Set();
  
  if (metricsPerLabelId) {
    Object.keys(metricsPerLabelId)
      .filter(key => key !== "null")
      .forEach(key => {
        const num = Number(key);
        labelsToExpand.add(isNaN(num) ? key : num);
      });
  }
  
  if (childCountsPerLabelId) {
    Object.keys(childCountsPerLabelId).forEach(key => {
      const num = Number(key);
      labelsToExpand.add(isNaN(num) ? key : num);
    });
  }
  
  return labelsToExpand;
};

// Compute structural insights about the label space (hierarchy shape).
// Derived purely from the label hierarchy the backend already returns, so this
// needs no extra backend data.
export const computeLabelSpaceInsights = (labelsData) => {
  const roots = labelsData?.root_level_labels || [];

  let totalLabels = 0;
  let parentLabels = 0; // labels that have at least one sublabel
  let totalDirectChildren = 0; // == number of non-root labels
  let maxDepth = 0;

  const visit = (label, depth) => {
    totalLabels += 1;
    maxDepth = Math.max(maxDepth, depth);
    const children = label.children || [];
    if (children.length > 0) {
      parentLabels += 1;
      totalDirectChildren += children.length;
    }
    children.forEach((child) => visit(child, depth + 1));
  };
  roots.forEach((root) => visit(root, 1));

  const rootLabels = roots.length;
  const leafLabels = totalLabels - parentLabels;

  return {
    totalLabels,
    rootLabels,
    parentLabels,
    leafLabels,
    maxDepth,
    // The headline researcher metric: how many sublabels a parent has on average.
    avgSublabelsPerParent: parentLabels > 0 ? totalDirectChildren / parentLabels : 0,
    // Averaged over every label (leaves included) — a branching factor.
    avgChildrenPerLabel: totalLabels > 0 ? totalDirectChildren / totalLabels : 0,
  };
};

// Compute annotation-coverage and class-balance insights from the aggregated
// per-label metrics. Object counts use the `area` array length as the number
// of measured objects for a label.
export const computeAnnotationInsights = (metricsPerLabelId, labelIdToName = {}, totalLabels = 0) => {
  const entries = Object.entries(metricsPerLabelId || {});

  let totalObjects = 0;
  let unlabeledObjects = 0;
  const perLabelCounts = [];

  entries.forEach(([labelId, metrics]) => {
    const count = metrics?.area?.length || 0;
    if (labelId === "null") {
      unlabeledObjects += count;
      return;
    }
    totalObjects += count;
    if (count > 0) {
      perLabelCounts.push({
        labelId,
        name: labelIdToName[labelId] || labelIdToName[String(labelId)] || `Label ${labelId}`,
        count,
      });
    }
  });

  const annotatedLabels = perLabelCounts.length;

  let mostCommon = null;
  let leastCommon = null;
  perLabelCounts.forEach((entry) => {
    if (!mostCommon || entry.count > mostCommon.count) mostCommon = entry;
    if (!leastCommon || entry.count < leastCommon.count) leastCommon = entry;
  });

  return {
    totalObjects,
    unlabeledObjects,
    annotatedLabels,
    avgObjectsPerLabel: annotatedLabels > 0 ? totalObjects / annotatedLabels : 0,
    mostCommon,
    leastCommon,
    // Class imbalance: how many times more frequent the largest class is than the smallest.
    imbalanceRatio:
      leastCommon && leastCommon.count > 0 ? mostCommon.count / leastCommon.count : null,
    coverage: totalLabels > 0 ? annotatedLabels / totalLabels : 0,
  };
};

// --- Step 5: helpers for the pre-aggregated /summary shape -------------------
// The summary endpoint returns metrics[labelId][metricKey] =
//   { unit, components: [{ count, mean, std, min, max }, ...] }
// so no JS-side aggregation over raw arrays is needed anymore.

// Build a lookup: metric_key -> catalog entry (name, unit_kind, value_dim, components...).
export const buildMetricCatalogMap = (catalog) => {
  const map = {};
  (catalog || []).forEach((m) => {
    map[m.key] = m;
  });
  return map;
};

// Auto-expand labels that have aggregated metrics or child counts (new summary shape).
export const getLabelsToAutoExpandFromSummary = (metricsByLabelId, childCountsPerLabelId) => {
  const labelsToExpand = new Set();
  const addKeys = (obj) => {
    if (!obj) return;
    Object.keys(obj).forEach((key) => {
      if (key === "null") return;
      const num = Number(key);
      labelsToExpand.add(isNaN(num) ? key : num);
    });
  };
  addKeys(metricsByLabelId);
  addKeys(childCountsPerLabelId);
  return labelsToExpand;
};

// Prepare comparison-chart rows generically from the aggregated summary. For each label,
// emits one field per single-component (value_dim 1) metric holding its mean, plus a
// `${key}_count`. Multi-component metrics (e.g. color) are skipped in the bar charts.
export const prepareComparisonDataFromSummary = (metricsByLabelId, labelIdToName, catalogMap = {}) => {
  if (!metricsByLabelId) return [];
  const chartData = [];
  Object.entries(metricsByLabelId).forEach(([labelId, labelMetrics]) => {
    if (labelId === "null") return;
    const labelName =
      labelIdToName[labelId] || labelIdToName[String(labelId)] || `Label ${labelId}`;
    const row = { label: labelName, labelId };
    Object.entries(labelMetrics).forEach(([metricKey, metric]) => {
      const catalog = catalogMap[metricKey];
      const valueDim = catalog?.value_dim ?? metric.components?.length ?? 1;
      if (valueDim !== 1) return; // charts are for scalar metrics only
      const comp = metric.components?.[0];
      if (comp && typeof comp.mean === "number") {
        row[metricKey] = comp.mean;
        row[`${metricKey}_count`] = comp.count;
      }
    });
    if (Object.keys(row).length > 2) chartData.push(row);
  });
  return chartData;
};

/**
 * Bar-chart rows for one metric when the summary is grouped by an image-metadata key.
 *
 * Recharts draws a grouped bar chart from one row per category with one dataKey per
 * series, so the shape flips relative to the ungrouped case: label on the x axis, one
 * field per group value. A label/group pair with no data simply has no field, and
 * recharts leaves a gap rather than drawing a zero — which is the honest rendering,
 * since "no objects of this label at this site" is not "an area of zero".
 *
 * @param {Object} groups - `{groupValue: {labelId: {metricKey: {components: [...]}}}}`
 * @param {string} metricKey
 * @param {Object} labelIdToName
 * @param {string[]} groupValues - Display order, from the server.
 * @returns {Array} One row per label: `{label, labelId, [groupValue]: mean, ...}`.
 */
export const prepareGroupedComparisonData = (
  groups,
  metricKey,
  labelIdToName,
  groupValues = []
) => {
  if (!groups) return [];
  const rowsByLabel = new Map();

  groupValues.forEach((groupValue) => {
    const labelMetrics = groups[groupValue] || {};
    Object.entries(labelMetrics).forEach(([labelId, metrics]) => {
      if (labelId === "null") return;
      const component = metrics?.[metricKey]?.components?.[0];
      if (!component || typeof component.mean !== "number") return;

      if (!rowsByLabel.has(labelId)) {
        rowsByLabel.set(labelId, {
          labelId,
          label: labelIdToName[labelId] || labelIdToName[String(labelId)] || `Label ${labelId}`,
        });
      }
      const row = rowsByLabel.get(labelId);
      row[groupValue] = component.mean;
      row[`${groupValue}__count`] = component.count;
    });
  });

  return [...rowsByLabel.values()];
};

/** Which group values actually carry data for a metric, in the server's display order. */
export const groupValuesWithData = (groups, metricKey, groupValues = []) =>
  groupValues.filter((groupValue) =>
    Object.values(groups?.[groupValue] || {}).some(
      (metrics) => typeof metrics?.[metricKey]?.components?.[0]?.mean === "number"
    )
  );

// Which scalar metric keys are present anywhere in the summary (for generic chart series).
export const collectScalarMetricKeys = (metricsByLabelId, catalogMap = {}) => {
  const keys = new Set();
  Object.values(metricsByLabelId || {}).forEach((labelMetrics) => {
    Object.entries(labelMetrics).forEach(([metricKey, metric]) => {
      const valueDim = catalogMap[metricKey]?.value_dim ?? metric.components?.length ?? 1;
      if (valueDim === 1) keys.add(metricKey);
    });
  });
  return Array.from(keys);
};

// Annotation insights from the aggregated summary. Object count per label uses the count
// of the first present metric's first component (all geometry metrics share the same
// contour set, so any of them gives the object count).
export const computeAnnotationInsightsFromSummary = (
  metricsByLabelId,
  labelIdToName = {},
  totalLabels = 0
) => {
  const entries = Object.entries(metricsByLabelId || {});
  let totalObjects = 0;
  let unlabeledObjects = 0;
  const perLabelCounts = [];

  const objectCountFor = (labelMetrics) => {
    const first = Object.values(labelMetrics || {})[0];
    return first?.components?.[0]?.count || 0;
  };

  entries.forEach(([labelId, labelMetrics]) => {
    const count = objectCountFor(labelMetrics);
    if (labelId === "null") {
      unlabeledObjects += count;
      return;
    }
    totalObjects += count;
    if (count > 0) {
      perLabelCounts.push({
        labelId,
        name: labelIdToName[labelId] || labelIdToName[String(labelId)] || `Label ${labelId}`,
        count,
      });
    }
  });

  const annotatedLabels = perLabelCounts.length;
  let mostCommon = null;
  let leastCommon = null;
  perLabelCounts.forEach((entry) => {
    if (!mostCommon || entry.count > mostCommon.count) mostCommon = entry;
    if (!leastCommon || entry.count < leastCommon.count) leastCommon = entry;
  });

  return {
    totalObjects,
    unlabeledObjects,
    annotatedLabels,
    avgObjectsPerLabel: annotatedLabels > 0 ? totalObjects / annotatedLabels : 0,
    mostCommon,
    leastCommon,
    imbalanceRatio:
      leastCommon && leastCommon.count > 0 ? mostCommon.count / leastCommon.count : null,
    coverage: totalLabels > 0 ? annotatedLabels / totalLabels : 0,
  };
};

// Convert an opencv-8bit LAB triple (all channels 0-255) to a CSS sRGB string for a
// swatch. Kept dependency-free: opencv scales L:0-255->0-100 and a,b:0-255->-128..127,
// then standard CIELAB->XYZ (D65)->linear sRGB->gamma. Only used for display.
export const opencvLabToRgbCss = ([L8, a8, b8]) => {
  const L = (L8 / 255) * 100;
  const a = a8 - 128;
  const b = b8 - 128;

  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const delta = 6 / 29;
  const finv = (t) => (t > delta ? t * t * t : 3 * delta * delta * (t - 4 / 29));

  // D65 reference white.
  const Xn = 95.047, Yn = 100.0, Zn = 108.883;
  const X = Xn * finv(fx) / 100;
  const Y = Yn * finv(fy) / 100;
  const Z = Zn * finv(fz) / 100;

  let r = X * 3.2406 - Y * 1.5372 - Z * 0.4986;
  let g = -X * 0.9689 + Y * 1.8758 + Z * 0.0415;
  let bl = X * 0.0557 - Y * 0.204 + Z * 1.057;

  const gamma = (c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(v * 255)));
  };
  return `rgb(${gamma(r)}, ${gamma(g)}, ${gamma(bl)})`;
};

// Transform flat contour data to hierarchical aggregated format
export const transformFlatDataToHierarchical = (flatDataResponse) => {
  if (!flatDataResponse || !flatDataResponse.data) {
    return null;
  }

  // Parse the JSON string data
  const contours = JSON.parse(flatDataResponse.data);
  
  // Aggregate metrics per label
  const metricsPerLabelId = {};
  
  contours.forEach(contour => {
    const labelId = contour.label_id || 'null';
    
    if (!metricsPerLabelId[labelId]) {
      metricsPerLabelId[labelId] = {
        area: [],
        perimeter: [],
        circularity: [],
        max_diameter: []
      };
    }
    
    // Add metrics
    if (contour.area !== null && contour.area !== undefined) {
      metricsPerLabelId[labelId].area.push(contour.area);
    }
    if (contour.perimeter !== null && contour.perimeter !== undefined) {
      metricsPerLabelId[labelId].perimeter.push(contour.perimeter);
    }
    if (contour.circularity !== null && contour.circularity !== undefined) {
      metricsPerLabelId[labelId].circularity.push(contour.circularity);
    }
    if (contour.diameter_avg !== null && contour.diameter_avg !== undefined) {
      const diameter = parseFloat(contour.diameter_avg);
      if (!isNaN(diameter)) {
        metricsPerLabelId[labelId].max_diameter.push(diameter);
      }
    }
  });

  // For now, return a simplified structure without full label hierarchy
  // We'll fetch labels separately if needed
  return {
    success: true,
    message: "Successfully transformed quantification data.",
    metrics_per_label_id: metricsPerLabelId,
    child_counts_per_label_id: {},
    labels: null // Will need to be fetched separately
  };
};
