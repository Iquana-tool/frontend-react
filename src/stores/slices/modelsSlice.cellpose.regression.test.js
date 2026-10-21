import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAnnotationStore from '../useAnnotationStore';
import { initialState } from '../initialState';
import { getInstanceModels } from '../../api/instance_segmentation';
import { getInferenceModelCatalog } from '../../api/inference';
import { getSelectedFragmentContourIds, resolvePolypProjectLabel } from '../../components/annotationPage/workspace/cellposePreviewModel';

vi.mock('../../api/instance_segmentation', () => ({ getInstanceModels: vi.fn() }));
vi.mock('../../api/inference', () => ({ getInferenceModelCatalog: vi.fn() }));
const key = 'cpsam_polyp_v3_b_seed17';
const provider = { registry_key: key, name: 'Cellpose', classes: [{ key: 'polyp' }], tags: { maturity: 'provisional' } };
const catalog = (labelId, action = 'map') => ({ models: [{ ...provider, task: 'instance-segmentation', label_ids: action === 'map' ? [labelId] : [], class_mappings: [{ model_class: { key: 'polyp' }, action, label_id: labelId }] }] });
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { resolve, promise }; };

beforeEach(() => {
  vi.clearAllMocks();
  useAnnotationStore.setState({ ...initialState, models: { ...initialState.models, favoritesLoaded: true }, objects: { ...initialState.objects, labelDatasetId: 15 } });
  getInstanceModels.mockResolvedValue({ success: true, result: [provider] });
  getInferenceModelCatalog.mockResolvedValue(catalog(43));
});

describe('Cellpose discovery and label regressions', () => {
  it('merges an authoritative mapping into an already advertised provider with a renamed dataset label', async () => {
    await useAnnotationStore.getState().fetchAvailableInstanceModels(15);
    const loaded = useAnnotationStore.getState().models.availableInstanceModels.find((model) => model.id === key);
    expect(loaded.class_mappings[0].label_id).toBe(43);
    expect(loaded.tags.maturity).toBe('provisional');
    expect(resolvePolypProjectLabel(loaded, new Map([[43, 'Budding unit']]))).toMatchObject({ labelId: 43, labelName: 'Budding unit' });
  });

  it.each(['discard', 'unmapped'])('honors an explicit %s mapping instead of guessing from label names', async (action) => {
    getInferenceModelCatalog.mockResolvedValue(catalog(null, action));
    await useAnnotationStore.getState().fetchAvailableInstanceModels(15);
    const loaded = useAnnotationStore.getState().models.availableInstanceModels.find((model) => model.id === key);
    expect(resolvePolypProjectLabel(loaded, new Map([[43, 'Coral Polyp']]))).toBeNull();
  });

  it('never invents a ready provider when neither endpoint advertises one', async () => {
    getInstanceModels.mockResolvedValue({ success: true, result: [] });
    getInferenceModelCatalog.mockResolvedValue({ models: [] });
    await useAnnotationStore.getState().fetchAvailableInstanceModels(15);
    expect(useAnnotationStore.getState().models.availableInstanceModels).toEqual([]);
  });

  it('does not restore an old dataset mapping when its slower request finishes last', async () => {
    const older = deferred();
    getInferenceModelCatalog.mockImplementation((datasetId) => datasetId === 15 ? older.promise : Promise.resolve(catalog(63)));
    const first = useAnnotationStore.getState().fetchAvailableInstanceModels(15);
    await vi.waitFor(() => expect(getInferenceModelCatalog).toHaveBeenCalledWith(15));
    useAnnotationStore.setState((state) => { state.objects.labelDatasetId = 16; });
    await useAnnotationStore.getState().fetchAvailableInstanceModels(16);
    older.resolve(catalog(43));
    await first;
    const loaded = useAnnotationStore.getState().models.availableInstanceModels.find((model) => model.id === key);
    expect(loaded.class_mappings[0].label_id).toBe(63);
  });

  it('selects ancestors by label IDs, including renamed ancestors, and excludes the polyp itself', () => {
    const labels = [{ id: 41, name: 'Colonia', parent_id: null }, { id: 42, name: 'Polyp colony surface', parent_id: 41 }, { id: 43, name: 'Coral Polyp', parent_id: 42 }, { id: 44, name: 'Coral unrelated', parent_id: null }];
    const objects = labels.map((label) => ({ id: label.id + 100, contour_id: label.id + 100, labelId: label.id }));
    const map = new Map(labels.map((label) => [label.id, label.name]));
    expect(getSelectedFragmentContourIds(objects.map((object) => object.id), objects, map, 43, labels)).toEqual([141, 142]);
  });

  it('fails closed for a cycle in the target label ancestry', () => {
    const labels = [{ id: 41, name: 'Fragment', parent_id: 42 }, { id: 42, name: 'Surface', parent_id: 41 }, { id: 43, name: 'Polyp', parent_id: 42 }];
    expect(getSelectedFragmentContourIds([141, 142], [{ id: 141, contour_id: 141, labelId: 41 }, { id: 142, contour_id: 142, labelId: 42 }], new Map(), 43, labels)).toEqual([]);
  });

  it('does not fall back to coral names when the mapped target has no ancestors', () => {
    const labels = [{ id: 41, name: 'Coral Fragment', parent_id: null }, { id: 43, name: 'Coral Polyp', parent_id: null }];
    expect(getSelectedFragmentContourIds([141], [{ id: 141, contour_id: 141, labelId: 41 }], new Map([[41, 'Coral Fragment']]), 43, labels)).toEqual([]);
  });
});


it('discovers YOLO C seed 1 with the dataset mapping and verified artifact identity', async () => {
  const yoloKey = 'yolo_polyp_v3_c_seed1';
  getInstanceModels.mockResolvedValue({ success: true, result: [{ ...provider, registry_key: yoloKey }] });
  getInferenceModelCatalog.mockResolvedValue({ models: [{ ...catalog(43).models[0], registry_key: yoloKey }] });
  await useAnnotationStore.getState().fetchAvailableInstanceModels(15);
  const loaded = useAnnotationStore.getState().models.availableInstanceModels.find((m) => m.id === yoloKey);
  expect(loaded.name).toContain('YOLO11m-seg');
  expect(loaded.checkpoint_sha256).toBe('7e9ac2eec159b4d227d1b8c6553de224a982f420f96b738362ef04bbfad08edf');
  expect(resolvePolypProjectLabel(loaded, new Map([[43, 'Coral Polyp']]))?.labelId).toBe(43);
});
