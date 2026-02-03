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
