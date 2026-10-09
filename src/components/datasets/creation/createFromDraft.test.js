import { describe, expect, it, vi } from 'vitest';
import { createDatasetFromDraft } from './createFromDraft';
import { draftReducer, initialDraft } from './wizardModel';

const isStackFile = (name) => /\.(e2e|vol)$/i.test(name);

const makeApi = (overrides = {}) => ({
  createDataset: vi.fn().mockResolvedValue({ success: true, dataset_id: 7 }),
  uploadImage: vi.fn().mockResolvedValue({ success: true }),
  uploadStackFiles: vi.fn().mockResolvedValue({ stack_ids: [11, 12], failed: [] }),
  importDatasetMetadataCsv: vi.fn().mockResolvedValue({ matched: 2, unmatched_count: 0 }),
  applyLabelSpace: vi.fn().mockResolvedValue({ success: true }),
  createQuantificationProfile: vi.fn().mockResolvedValue({ success: true }),
  setDatasetCalibrationDefaults: vi.fn().mockResolvedValue({}),
  applyScaleToDataset: vi.fn().mockResolvedValue({}),
  updateDatasetSettings: vi.fn().mockResolvedValue({}),
  grantMemberRole: vi.fn().mockResolvedValue({}),
  createInvite: vi.fn().mockResolvedValue({ token: 'tok123' }),
  ...overrides,
});

const fullDraft = () => {
  let draft = draftReducer(initialDraft(), { type: 'applyTemplate', templateId: 'lab' });
  draft = draftReducer(draft, { type: 'setBasics', patch: { title: ' Reef B ', description: 'tank shots' } });
  draft = draftReducer(draft, { type: 'set', step: 'images', patch: { files: [{ name: 'a.png' }, { name: 'b.png' }, { name: 'eye.vol' }] } });
  draft = draftReducer(draft, { type: 'set', step: 'metadata', patch: { csvFile: { name: 'meta.csv' } } });
  draft = draftReducer(draft, { type: 'set', step: 'labels', patch: { tree: [{ name: 'Lesion', children: [] }] } });
  draft = draftReducer(draft, {
    type: 'set', step: 'calibration',
    patch: { scale: { enabled: true, mode: 'known', scaleX: '0.02', scaleY: '', unit: 'mm' } },
  });
  draft = draftReducer(draft, { type: 'set', step: 'annotation', patch: { disabledAiTools: ['training'] } });
  draft = draftReducer(draft, {
    type: 'set', step: 'access',
    patch: { members: [{ username: 'ann', role: 'annotator' }], invites: [{ role: 'reviewer', expiresInHours: 168 }] },
  });
  return draft;
};

describe('createDatasetFromDraft', () => {
  it('applies every configured part to the new dataset', async () => {
    const api = makeApi();
    const progress = [];
    const result = await createDatasetFromDraft(fullDraft(), {
      api, isStackFile, inviteBaseUrl: 'https://iquana.test', onProgress: (update) => progress.push(update),
    });

    expect(result.datasetId).toBe(7);
    expect(api.createDataset).toHaveBeenCalledWith('Reef B', 'tank shots', 'image');
    expect(api.applyLabelSpace).toHaveBeenCalledWith(7, { labels: [{ name: 'Lesion', children: [] }] });
    expect(api.uploadImage).toHaveBeenCalledTimes(2);
    expect(api.uploadStackFiles).toHaveBeenCalledWith([{ name: 'eye.vol' }], 7);
    expect(api.importDatasetMetadataCsv).toHaveBeenCalledWith(7, { name: 'meta.csv' }, { dryRun: false });
    expect(api.createQuantificationProfile).toHaveBeenCalledWith(7, expect.objectContaining({
      is_default: true,
      entries: expect.arrayContaining([{ metric_key: 'mean_color_lab', params: {}, label_ids: null }]),
    }));
    expect(api.setDatasetCalibrationDefaults).toHaveBeenCalledWith(7, 'response', { strategy: 'gray_wedge' });
    expect(api.applyScaleToDataset).toHaveBeenCalledWith(7, 0.02, 0.02, 'mm');
    expect(api.updateDatasetSettings).toHaveBeenCalledWith(7, {
      requireIndependentReview: true, disabledAiTools: ['training'],
    });
    expect(api.grantMemberRole).toHaveBeenCalledWith(7, 'ann', 'annotator');
    expect(result.inviteLinks).toEqual([{ role: 'reviewer', url: 'https://iquana.test/invites/tok123' }]);

    expect(result.results.stacks).toEqual({ status: 'done', detail: '2 volumes from 1 file' });
    expect(progress.some((u) => u.task === 'images' && u.progress?.done === 2)).toBe(true);
  });

  it('a failing part is reported and the rest still runs', async () => {
    const api = makeApi({
      importDatasetMetadataCsv: vi.fn().mockRejectedValue(new Error('bad csv')),
      grantMemberRole: vi.fn().mockRejectedValue(new Error('no such user')),
    });
    const result = await createDatasetFromDraft(fullDraft(), { api, isStackFile });
    expect(result.results.metadata).toEqual({ status: 'failed', detail: 'bad csv' });
    expect(result.results.access.status).toBe('done'); // the invite link still worked
    expect(result.results.access.detail).toMatch(/ann: no such user/);
    expect(api.updateDatasetSettings).toHaveBeenCalled();
  });

  it('only a failed dataset creation is fatal', async () => {
    const api = makeApi({ createDataset: vi.fn().mockResolvedValue({ success: false, message: 'Name taken' }) });
    await expect(createDatasetFromDraft(fullDraft(), { api, isStackFile })).rejects.toThrow('Name taken');
    expect(api.uploadImage).not.toHaveBeenCalled();
  });

  it('skips what was not configured', async () => {
    const api = makeApi();
    const draft = draftReducer(initialDraft(), { type: 'setBasics', patch: { title: 'Bare' } });
    const result = await createDatasetFromDraft(draft, { api, isStackFile });
    for (const task of ['labels', 'images', 'stacks', 'metadata', 'access']) {
      expect(result.results[task].status).toBe('skipped');
    }
    expect(api.applyScaleToDataset).not.toHaveBeenCalled();
    // The default geometry profile and the settings are still written.
    expect(api.createQuantificationProfile).toHaveBeenCalled();
    expect(api.updateDatasetSettings).toHaveBeenCalledWith(expect.any(Number), {
      requireIndependentReview: false, disabledAiTools: [],
    });
  });
});
