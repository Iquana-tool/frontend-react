import { describe, expect, it, vi } from 'vitest';
import { loadDatasetSetup } from './copySetup';

const scaleState = (overrides) => ({
  calibrations: [{ kind: 'scale', calibrated: true, ...overrides }],
});

const makeApi = (overrides = {}) => ({
  getDataset: vi.fn().mockResolvedValue({ dataset: { name: 'Source', disabled_ai_tools: 'training' } }),
  fetchLabels: vi.fn().mockResolvedValue({ labels: { root_level_labels: [] } }),
  getQuantificationProfiles: vi.fn().mockResolvedValue({ profiles: [] }),
  fetchDatasetCalibrationDefaults: vi.fn().mockResolvedValue({ defaults: {} }),
  fetchImages: vi.fn().mockResolvedValue({ image_data: [{ image_id: 13 }] }),
  fetchImageCalibrations: vi.fn().mockResolvedValue({ calibrations: [] }),
  ...overrides,
});

describe('loadDatasetSetup scale', () => {
  it('copies a scale that was applied to the whole dataset as a known value', async () => {
    const api = makeApi({
      fetchImageCalibrations: vi.fn().mockResolvedValue(
        scaleState({ source: 'dataset', params: { scale_x: 0.05, scale_y: 0.05, unit: 'mm' } })),
    });
    const setup = await loadDatasetSetup(4, { api });
    expect(api.fetchImageCalibrations).toHaveBeenCalledWith(13);
    expect(setup.calibration.scale).toEqual({ enabled: true, mode: 'known', scaleX: '0.05', scaleY: '', unit: 'mm' });
  });

  it('keeps a different pixel height', async () => {
    const api = makeApi({
      fetchImageCalibrations: vi.fn().mockResolvedValue(
        scaleState({ source: 'dataset', params: { scale_x: 2, scale_y: 3, unit: 'µm' } })),
    });
    const setup = await loadDatasetSetup(4, { api });
    expect(setup.calibration.scale).toMatchObject({ scaleX: '2', scaleY: '3', unit: 'µm' });
  });

  it('copies a scale read from scan files as "from the scan file"', async () => {
    const api = makeApi({
      fetchImageCalibrations: vi.fn().mockResolvedValue(scaleState({ source: 'file_metadata', params: {} })),
    });
    const setup = await loadDatasetSetup(4, { api });
    expect(setup.calibration.scale).toEqual({ enabled: true, mode: 'from_file' });
  });

  it('leaves the scale alone when it was measured per image, missing, or unreadable', async () => {
    for (const fetchImageCalibrations of [
      vi.fn().mockResolvedValue(scaleState({ source: 'manual', params: { scale_x: 1, scale_y: 1, unit: 'mm' } })),
      vi.fn().mockResolvedValue(scaleState({ calibrated: false })),
      vi.fn().mockRejectedValue(new Error('offline')),
    ]) {
      const setup = await loadDatasetSetup(4, { api: makeApi({ fetchImageCalibrations }) });
      expect(setup.calibration.scale).toBeUndefined();
      expect(setup.annotation.disabledAiTools).toEqual(['training']);
    }
  });

  it('copies no scale from a dataset without images', async () => {
    const api = makeApi({ fetchImages: vi.fn().mockResolvedValue({ image_data: [] }) });
    const setup = await loadDatasetSetup(4, { api });
    expect(setup.calibration.scale).toBeUndefined();
    expect(api.fetchImageCalibrations).not.toHaveBeenCalled();
  });
});
