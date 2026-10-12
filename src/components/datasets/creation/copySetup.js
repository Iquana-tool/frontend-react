/**
 * Read an existing dataset's setup in the draft's shape, for "Copy an existing
 * dataset" / "Reuse setup from an existing dataset". Images and members are
 * never copied.
 */
import { getDataset } from '../../../api/datasets';
import { fetchLabels } from '../../../api/labels';
import { getQuantificationProfiles } from '../../../api/quantifications';
import { fetchDatasetCalibrationDefaults, fetchImageCalibrations } from '../../../api/calibration';
import { fetchImages } from '../../../api/images';
import { treeFromHierarchy } from './wizardModel';

export const defaultCopyApi = {
  getDataset, fetchLabels, getQuantificationProfiles, fetchDatasetCalibrationDefaults,
  fetchImages, fetchImageCalibrations,
};

const splitTools = (value) => String(value ?? '').split(',').map((tool) => tool.trim()).filter(Boolean);

/**
 * How the source dataset sets its scale, read from one of its images.
 *
 * Scale has no dataset-level default on the server: a scale applied to the
 * whole dataset is written onto every image with `source: 'dataset'`, and a
 * scale read from a scan file with `source: 'file_metadata'`. One image is
 * enough to tell those apart. Anything else (measured per image, or nothing
 * yet) returns undefined so the draft keeps its own scale setting.
 */
async function loadScaleSetup(datasetId, api) {
  try {
    const imagesResponse = await api.fetchImages(datasetId);
    const firstImage = imagesResponse?.image_data?.[0];
    if (!firstImage) return undefined;
    const state = await api.fetchImageCalibrations(firstImage.image_id);
    const scale = state?.calibrations?.find((entry) => entry.kind === 'scale');
    if (!scale?.calibrated) return undefined;
    if (scale.source === 'file_metadata') return { enabled: true, mode: 'from_file' };
    if (scale.source !== 'dataset' || !scale.params) return undefined;
    const { scale_x: scaleX, scale_y: scaleY, unit } = scale.params;
    return {
      enabled: true,
      mode: 'known',
      scaleX: String(scaleX),
      // The wizard leaves the height empty when it equals the width.
      scaleY: scaleY != null && scaleY !== scaleX ? String(scaleY) : '',
      unit: unit || 'mm',
    };
  } catch {
    // The scale is a convenience on top of the copy; the rest still applies.
    return undefined;
  }
}

export async function loadDatasetSetup(datasetId, { api = defaultCopyApi } = {}) {
  const [datasetResponse, labelsResponse, profilesResponse, calibrationResponse, scale] = await Promise.all([
    api.getDataset(datasetId),
    api.fetchLabels(datasetId),
    api.getQuantificationProfiles(datasetId),
    api.fetchDatasetCalibrationDefaults(datasetId),
    loadScaleSetup(datasetId, api),
  ]);
  const dataset = datasetResponse?.dataset ?? {};
  const profiles = profilesResponse?.profiles ?? [];
  const profile = profiles.find((entry) => entry.is_default) ?? profiles[0];
  const defaults = calibrationResponse?.defaults ?? {};

  return {
    datasetId,
    name: dataset.name,
    labels: { tree: treeFromHierarchy(labelsResponse?.labels?.root_level_labels) },
    quantification: profile ? { metrics: profile.entries.map((entry) => entry.metric_key) } : undefined,
    calibration: {
      ...(scale ? { scale } : {}),
      // A dataset that stored a response strategy chose to calibrate colour.
      response: defaults.response
        ? { enabled: true, strategy: defaults.response.strategy, card: defaults.response.card ?? null }
        : { enabled: false },
    },
    annotation: { mode: 'single', disabledAiTools: splitTools(dataset.disabled_ai_tools) },
    review: { requireIndependentReview: Boolean(dataset.require_independent_review) },
  };
}
