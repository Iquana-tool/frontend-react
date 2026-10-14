import { handleApiError, getAuthHeaders } from "./util";
import { API_BASE_URL } from "./config";

// A dataset's derived measurements: formulas over the direct ones (vascularity index,
// polyp density, ...). See backend app/services/derived_metrics.py for the formula shape.

const base = (datasetId) => `${API_BASE_URL}/datasets/${datasetId}/quantification/derived-metrics`;

const send = (url, method, body) =>
  fetch(url, {
    method,
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then(handleApiError);

/** `{derived_metrics: [{id, key, name, description, label_ids, expression, unit_exponent, problems}]}` */
export const listDerivedMetrics = (datasetId) =>
  fetch(base(datasetId), { headers: getAuthHeaders() }).then(handleApiError);

export const createDerivedMetric = (datasetId, definition) => send(base(datasetId), "POST", definition);

export const updateDerivedMetric = (datasetId, metricId, definition) =>
  send(`${base(datasetId)}/${metricId}`, "PUT", definition);

export const deleteDerivedMetric = (datasetId, metricId) => send(`${base(datasetId)}/${metricId}`, "DELETE");

/**
 * Check and compute an unsaved definition. Problems come back as `{ok: false, problems}`
 * rather than as an error, since a half-built formula is the editor's normal state.
 */
export const previewDerivedMetric = (
  datasetId,
  definition,
  { id = null, excludeNotFullyAnnotated = true, excludeUnreviewed = true } = {}
) => {
  const params = new URLSearchParams({
    exclude_not_fully_annotated: excludeNotFullyAnnotated,
    exclude_unreviewed: excludeUnreviewed,
  });
  return send(`${base(datasetId)}/preview?${params}`, "POST", { definition, id });
};

/** Copy definitions from another dataset, labels matched by name. `keys` null = all. */
export const copyDerivedMetrics = (datasetId, sourceDatasetId, keys = null) =>
  send(`${base(datasetId)}/copy`, "POST", { source_dataset_id: sourceDatasetId, keys });
