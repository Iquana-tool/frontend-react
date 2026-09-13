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

// The recharts-shaped chart-prep helpers that used to live here
// (prepareComparisonDataFromSummary, prepareGroupedComparisonData, groupValuesWithData,
// collectScalarMetricKeys) went with ComparisonCharts. Reshaping a pre-aggregated summary
// into one-row-per-category / one-series-per-group was a workaround for charts that could
// only read that shape; Perspective pivots the raw per-contour rows itself, so the summary
// no longer needs to be re-pivoted client-side at all.

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
