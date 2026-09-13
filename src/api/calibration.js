/**
 * API client functions for image calibration.
 *
 * The generalisation of api/scale.js: scale is one calibration kind among
 * several, and every kind goes through the same four endpoints. The kind is a
 * path segment rather than a per-kind function, so a kind added on the server
 * needs no change here.
 *
 * api/scale.js is still used for the draw-a-line flow, which has its own
 * endpoint (the server derives the scale from two points and a distance).
 *
 * All fetch() calls live here — never in components or stores.
 */
import { getAuthHeaders, handleApiError } from './util';
import { API_BASE_URL } from './config';

/**
 * Describe every calibration kind the server supports.
 *
 * Drives the ordering and the copy of the Calibrate tab's cards, and lets the
 * client at least name a kind it has no purpose-built card for.
 *
 * @returns {Promise<{kinds: Array<Object>}>}
 */
export const fetchCalibrationKinds = async () => {
  const response = await fetch(`${API_BASE_URL}/calibration/kinds`, {
    headers: getAuthHeaders(),
  });
  return handleApiError(response);
};

/**
 * Every kind's state for one image — one entry per kind, calibrated or not.
 *
 * @param {number} imageId
 * @returns {Promise<{image_id: number, dataset_id: number, calibrations: Array<Object>,
 *                    calibrated_count: number, total_count: number}>}
 */
export const fetchImageCalibrations = async (imageId) => {
  const response = await fetch(`${API_BASE_URL}/calibration/image/${imageId}`, {
    headers: getAuthHeaders(),
  });
  return handleApiError(response);
};

/**
 * Set (or replace) one calibration on one image.
 *
 * Parameters are validated server-side by the kind, so this passes them through
 * untouched rather than duplicating the shapes here.
 *
 * @param {number} imageId
 * @param {string} kind    Registry key, e.g. 'scale' | 'intensity' | 'color'.
 * @param {Object} params  Kind-specific parameters.
 * @param {string} source  'manual' | 'measured' | 'dataset' | 'file_metadata'.
 * @returns {Promise<{message: string, params: Object, description: string,
 *                    metrics_invalidated: number}>}
 */
export const setImageCalibration = async (imageId, kind, params, source = 'manual') => {
  const response = await fetch(`${API_BASE_URL}/calibration/image/${imageId}/${kind}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ params, source }),
  });
  return handleApiError(response);
};

/**
 * Remove one calibration, returning the image to its uncalibrated reading.
 *
 * @param {number} imageId
 * @param {string} kind
 * @returns {Promise<{message: string, cleared: boolean, metrics_invalidated: number}>}
 */
export const clearImageCalibration = async (imageId, kind) => {
  const response = await fetch(`${API_BASE_URL}/calibration/image/${imageId}/${kind}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleApiError(response);
};

/**
 * Apply one calibration to every image in a dataset.
 *
 * @param {number} datasetId
 * @param {string} kind
 * @param {Object} params
 * @returns {Promise<{message: string, images_updated: number, metrics_invalidated: number}>}
 */
export const applyCalibrationToDataset = async (datasetId, kind, params) => {
  const response = await fetch(`${API_BASE_URL}/calibration/dataset/${kind}`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ dataset_id: datasetId, params }),
  });
  return handleApiError(response);
};

/**
 * Average a disc of pixels around a point, for use as a calibration reference.
 *
 * Sampled server-side from the original file rather than in the browser from the
 * rendered <img>: the canvas shows a scaled, possibly re-encoded copy, and
 * reading a reference patch off that would calibrate the display, not the data.
 *
 * @param {number} imageId
 * @param {number} x        Sample centre x, in image pixels.
 * @param {number} y        Sample centre y, in image pixels.
 * @param {number} radius   Radius of the averaged disc, in image pixels.
 * @param {string} forKind  Kind being calibrated. Stages ordered before it are
 *                          applied first, so the sample is read in the space
 *                          that kind's parameters will act on.
 * @returns {Promise<{mean_rgb: number[], std_rgb: number[], mean_intensity: number,
 *                    n_pixels: number, stages_applied: string[]}>}
 */
export const sampleCalibrationPatch = async (imageId, x, y, radius, forKind) => {
  const response = await fetch(`${API_BASE_URL}/calibration/image/${imageId}/sample`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ x, y, radius, for_kind: forKind ?? null }),
  });
  return handleApiError(response);
};

/**
 * Read every patch of a reference card at once.
 *
 * One request rather than one per patch: the server decodes the image and applies
 * the preceding calibration stages a single time, which for a twenty-patch card is
 * the difference between one decode and twenty.
 *
 * @param {number} imageId
 * @param {Array<[number, number]>} points  Patch centres in image pixels, card order.
 * @param {number} radius
 * @param {string} forKind
 * @returns {Promise<{samples: Array<Object>, stages_applied: string[]}>}
 */
export const sampleCalibrationPatches = async (imageId, points, radius, forKind) => {
  const response = await fetch(`${API_BASE_URL}/calibration/image/${imageId}/sample_batch`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ points, radius, for_kind: forKind ?? null }),
  });
  return handleApiError(response);
};

/**
 * How a dataset calibrates each kind — the strategy new calibrations start from.
 *
 * @param {number} datasetId
 * @returns {Promise<{dataset_id: number, defaults: Object}>}
 */
export const fetchDatasetCalibrationDefaults = async (datasetId) => {
  const response = await fetch(
    `${API_BASE_URL}/calibration/dataset/${datasetId}/defaults`,
    { headers: getAuthHeaders() },
  );
  return handleApiError(response);
};

/**
 * Choose the strategy (and reference card) a dataset calibrates one kind with.
 *
 * Deliberately does not touch existing calibrations: changing the default is a
 * choice about future work, not a correction to past work.
 *
 * @param {number} datasetId
 * @param {string} kind
 * @param {Object} defaults  e.g. { strategy: 'gray_wedge', card: 'kodak_q13' }
 * @returns {Promise<{message: string, defaults: Object}>}
 */
export const setDatasetCalibrationDefaults = async (datasetId, kind, defaults) => {
  const response = await fetch(
    `${API_BASE_URL}/calibration/dataset/${datasetId}/defaults/${kind}`,
    {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ defaults }),
    },
  );
  return handleApiError(response);
};
