/**
 * Read an existing dataset's setup in the draft's shape, for "Copy an existing
 * dataset" / "Reuse setup from an existing dataset". Images and members are
 * never copied.
 */
import { getDataset } from '../../../api/datasets';
import { fetchLabels } from '../../../api/labels';
import { getQuantificationProfiles } from '../../../api/quantifications';
import { fetchDatasetCalibrationDefaults } from '../../../api/calibration';
import { treeFromHierarchy } from './wizardModel';

export const defaultCopyApi = {
  getDataset, fetchLabels, getQuantificationProfiles, fetchDatasetCalibrationDefaults,
};

const splitTools = (value) => String(value ?? '').split(',').map((tool) => tool.trim()).filter(Boolean);

export async function loadDatasetSetup(datasetId, { api = defaultCopyApi } = {}) {
  const [datasetResponse, labelsResponse, profilesResponse, calibrationResponse] = await Promise.all([
    api.getDataset(datasetId),
    api.fetchLabels(datasetId),
    api.getQuantificationProfiles(datasetId),
    api.fetchDatasetCalibrationDefaults(datasetId),
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
      // A dataset that stored a response strategy chose to calibrate colour.
      response: defaults.response
        ? { enabled: true, strategy: defaults.response.strategy, card: defaults.response.card ?? null }
        : { enabled: false },
    },
    annotation: { mode: 'single', disabledAiTools: splitTools(dataset.disabled_ai_tools) },
    review: { requireIndependentReview: Boolean(dataset.require_independent_review) },
  };
}
