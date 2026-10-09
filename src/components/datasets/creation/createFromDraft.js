/**
 * Turn a finished draft into a dataset: one API call per configured part.
 *
 * Only creating the dataset itself is fatal. Everything after it is a separate
 * task whose failure is reported and skipped, so a bad metadata CSV or an
 * unknown username does not throw away 124 uploaded images -- the dataset page
 * can fix any of these afterwards.
 *
 * The API is injected so the sequence is testable without a server.
 */
import * as datasetsApi from '../../../api/datasets';
import * as imagesApi from '../../../api/images';
import * as metadataApi from '../../../api/image_metadata';
import * as labelSpaceApi from '../../../api/label_space';
import * as quantificationApi from '../../../api/quantifications';
import * as calibrationApi from '../../../api/calibration';
import * as scaleApi from '../../../api/scale';
import * as membersApi from '../../../api/members';
import * as stacksApi from '../../../api/stacks';
import { countLabels, splitQueuedFiles } from './wizardModel';

export const defaultApi = {
  createDataset: datasetsApi.createDataset,
  uploadImage: imagesApi.uploadImage,
  uploadStackFiles: stacksApi.uploadStackFiles,
  importDatasetMetadataCsv: metadataApi.importDatasetMetadataCsv,
  applyLabelSpace: labelSpaceApi.applyLabelSpace,
  createQuantificationProfile: quantificationApi.createQuantificationProfile,
  setDatasetCalibrationDefaults: calibrationApi.setDatasetCalibrationDefaults,
  applyScaleToDataset: scaleApi.applyScaleToDataset,
  updateDatasetSettings: membersApi.updateDatasetSettings,
  grantMemberRole: membersApi.grantMemberRole,
  createInvite: membersApi.createInvite,
};

export const TASKS = [
  { id: 'dataset', label: 'Create dataset' },
  { id: 'labels', label: 'Label space' },
  { id: 'images', label: 'Upload images' },
  { id: 'stacks', label: 'Upload OCT volumes' },
  { id: 'metadata', label: 'Image metadata' },
  { id: 'quantification', label: 'Quantification profile' },
  { id: 'calibration', label: 'Calibration profile' },
  { id: 'settings', label: 'Annotation and review settings' },
  { id: 'access', label: 'Access & roles' },
];

const message = (error) => error?.message || String(error);

/**
 * @param {Object} draft - see wizardModel.initialDraft
 * @param {Object} options
 * @param {(update: Object) => void} options.onProgress - called with
 *   `{task, status, detail, progress}`; status is running|done|failed|skipped.
 * @param {(name: string) => boolean} options.isStackFile
 * @param {string} options.inviteBaseUrl - prefix for invite links
 * @returns {Promise<{datasetId: number, inviteLinks: Array, results: Object}>}
 */
export async function createDatasetFromDraft(draft, {
  api = defaultApi, onProgress = () => {}, isStackFile, inviteBaseUrl = '',
} = {}) {
  const results = {};
  const report = (task, status, detail = null, progress = null) => {
    results[task] = { status, detail };
    onProgress({ task, status, detail, progress });
  };

  /** Run one non-fatal task. `work` returns a detail string, or null to mark it skipped. */
  const run = async (task, work) => {
    report(task, 'running');
    try {
      const detail = await work();
      if (detail === null) report(task, 'skipped');
      else report(task, 'done', detail);
    } catch (error) {
      report(task, 'failed', message(error));
    }
  };

  // -- the dataset itself: fatal ------------------------------------------------
  report('dataset', 'running');
  const created = await api.createDataset(draft.basics.title.trim(), draft.basics.description.trim(), 'image');
  if (!created?.success) {
    const error = new Error(created?.message || 'The dataset could not be created.');
    report('dataset', 'failed', error.message);
    throw error;
  }
  const rawId = created.dataset_id;
  const datasetId = rawId != null && typeof rawId === 'object' ? rawId.id : rawId;
  report('dataset', 'done', `Dataset ${datasetId}`);

  // -- labels first, so a later profile could reference them --------------------
  await run('labels', async () => {
    const count = countLabels(draft.labels.tree);
    if (!count) return null;
    await api.applyLabelSpace(datasetId, { labels: draft.labels.tree });
    return `${count} label${count === 1 ? '' : 's'}`;
  });

  // -- files ----------------------------------------------------------------------
  const { images, stacks } = splitQueuedFiles(draft.images.files, isStackFile);
  let uploadedImages = 0;
  await run('images', async () => {
    if (!images.length) return null;
    const failed = [];
    for (const [index, file] of images.entries()) {
      try {
        const result = await api.uploadImage(file, datasetId);
        if (result && result.success === false) failed.push(file.name);
        else uploadedImages += 1;
      } catch {
        failed.push(file.name);
      }
      report('images', 'running', null, { done: index + 1, total: images.length });
    }
    if (failed.length === images.length) throw new Error(`None of the ${images.length} images could be uploaded.`);
    return failed.length
      ? `${uploadedImages} of ${images.length} uploaded; failed: ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? ' …' : ''}`
      : `${uploadedImages} image${uploadedImages === 1 ? '' : 's'}`;
  });

  let uploadedStacks = 0;
  await run('stacks', async () => {
    if (!stacks.length) return null;
    const failed = [];
    // One request per file, so the progress bar moves and one unreadable file
    // does not hold up the rest.
    for (const [index, file] of stacks.entries()) {
      try {
        const result = await api.uploadStackFiles([file], datasetId);
        uploadedStacks += result?.stack_ids?.length ?? 0;
        for (const failure of result?.failed ?? []) failed.push(`${failure.file_name}: ${failure.reason}`);
      } catch (error) {
        failed.push(`${file.name}: ${message(error)}`);
      }
      report('stacks', 'running', null, { done: index + 1, total: stacks.length });
    }
    if (!uploadedStacks) throw new Error(failed.join('; ') || 'No volume could be read.');
    const summary = `${uploadedStacks} volume${uploadedStacks === 1 ? '' : 's'} from ${stacks.length} file${stacks.length === 1 ? '' : 's'}`;
    return failed.length ? `${summary}; ${failed.join('; ')}` : summary;
  });

  await run('metadata', async () => {
    if (!draft.metadata.csvFile) return null;
    if (!uploadedImages) throw new Error('No images were uploaded, so there is nothing to attach metadata to.');
    const result = await api.importDatasetMetadataCsv(datasetId, draft.metadata.csvFile, { dryRun: false });
    const matched = result?.matched;
    const unmatched = result?.unmatched_count ? `; ${result.unmatched_count} row(s) matched no image` : '';
    return matched != null ? `${matched} image${matched === 1 ? '' : 's'} tagged${unmatched}` : 'Imported';
  });

  // -- profiles -----------------------------------------------------------------
  await run('quantification', async () => {
    const metrics = draft.quantification.metrics;
    if (!metrics.length) return null;
    await api.createQuantificationProfile(datasetId, {
      name: 'Default',
      is_default: true,
      entries: metrics.map((metricKey) => ({ metric_key: metricKey, params: {}, label_ids: null })),
    });
    return `${metrics.length} metric${metrics.length === 1 ? '' : 's'}`;
  });

  await run('calibration', async () => {
    const done = [];
    const { scale, response } = draft.calibration;
    if (response.enabled) {
      await api.setDatasetCalibrationDefaults(datasetId, 'response', {
        strategy: response.strategy,
        ...(response.card ? { card: response.card } : {}),
      });
      done.push('colour response');
    }
    if (scale.enabled && scale.mode === 'known') {
      if (!uploadedImages && !uploadedStacks) throw new Error('No images were uploaded to apply the scale to.');
      const scaleX = Number(scale.scaleX);
      const scaleY = Number(scale.scaleY || scale.scaleX);
      await api.applyScaleToDataset(datasetId, scaleX, scaleY, scale.unit);
      done.push(`scale ${scaleX} ${scale.unit}/px`);
    }
    return done.length ? done.join(', ') : null;
  });

  await run('settings', async () => {
    await api.updateDatasetSettings(datasetId, {
      requireIndependentReview: Boolean(draft.review.requireIndependentReview),
      disabledAiTools: draft.annotation.disabledAiTools,
    });
    const off = draft.annotation.disabledAiTools.length;
    return [
      draft.review.requireIndependentReview ? 'independent review' : 'any reviewer',
      off ? `${off} AI tool${off === 1 ? '' : 's'} off` : 'all AI tools on',
    ].join(', ');
  });

  // -- people -------------------------------------------------------------------
  const inviteLinks = [];
  await run('access', async () => {
    const { members, invites } = draft.access;
    if (!members.length && !invites.length) return null;
    const failed = [];
    for (const member of members) {
      try {
        await api.grantMemberRole(datasetId, member.username, member.role);
      } catch (error) {
        failed.push(`${member.username}: ${message(error)}`);
      }
    }
    for (const invite of invites) {
      try {
        const response = await api.createInvite(datasetId, {
          role: invite.role, expiresInHours: invite.expiresInHours,
        });
        inviteLinks.push({ role: invite.role, url: `${inviteBaseUrl}/invites/${response.token}` });
      } catch (error) {
        failed.push(`${invite.role} invite: ${message(error)}`);
      }
    }
    const added = members.length - failed.filter((entry) => !entry.includes(' invite:')).length;
    const summary = [added && `${added} member${added === 1 ? '' : 's'}`, inviteLinks.length && `${inviteLinks.length} invite link${inviteLinks.length === 1 ? '' : 's'}`]
      .filter(Boolean).join(', ');
    if (failed.length && !added && !inviteLinks.length) throw new Error(failed.join('; '));
    return failed.length ? `${summary}; ${failed.join('; ')}` : summary;
  });

  return { datasetId, inviteLinks, results };
}
