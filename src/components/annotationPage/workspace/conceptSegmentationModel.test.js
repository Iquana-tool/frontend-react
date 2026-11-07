import { describe, expect, it } from 'vitest';
import {
  buildConceptPreviewRequest,
  getConceptParentIds,
  isConceptModelCompatible,
  modelIdentity,
  resolveConceptSelection,
} from './conceptSegmentationModel';

const instance = { task: 'instance-segmentation', registry_key: 'instances', label_ids: [43] };
const crossImage = { task: 'cross-image-suggestion', registry_key: 'suggestions', label_ids: [] };
const suggestion = { task: 'instance-suggestion', registry_key: 'suggestions', label_ids: [] };
const threshold = (value) => ({ parameters: { threshold: value } });
const binding = (model, labelId, inputs = {}) => ({
  task: model.task, model_registry_key: model.registry_key, label_id: labelId, inputs,
});

describe('concept model selection', () => {
  it('distinguishes task surfaces on the same model registry entry', () => {
    expect(modelIdentity(crossImage)).not.toBe(modelIdentity(suggestion));
    expect(modelIdentity({ task: 'instance-suggestion', id: 'sam' })).toBe('instance-suggestion:sam');
  });

  it('checks every mapped class and treats discard/unmapped as authoritative', () => {
    const model = {
      classes: ['colony', 'polyp'],
      label_ids: [43, 44, 45],
      class_mappings: [
        { model_class: 'colony', action: 'discard', label_id: 44 },
        { model_class: 'polyp', action: 'map', label_id: '43' },
        { model_class: 'unknown', action: 'map', label_id: 45 },
      ],
    };
    expect(isConceptModelCompatible(model, 43)).toBe(true);
    expect(isConceptModelCompatible(model, 44)).toBe(false);
    expect(isConceptModelCompatible(model, 45)).toBe(false);
    expect(isConceptModelCompatible({ classes: ['polyp'], class_mappings: [{ model_class: 'polyp', action: 'unmapped' }] }, 43)).toBe(false);
  });

  it('leaves class-agnostic models unrestricted and does not infer missing class mappings from names', () => {
    expect(isConceptModelCompatible({ classes: [], label_ids: [] }, 43)).toBe(true);
    expect(isConceptModelCompatible({ label_ids: ['43'] }, 43)).toBe(true);
    expect(isConceptModelCompatible({ label_ids: [44] }, 43)).toBe(false);
    expect(isConceptModelCompatible({ classes: ['polyp'], label_ids: [] }, 43)).toBe(false);
  });

  it('gives cross-image label bindings priority over instance task defaults', () => {
    const result = resolveConceptSelection({
      models: [instance, crossImage], labelId: 43,
      policy: { bindings: [binding(instance, null, threshold(0.2)), binding(crossImage, 43, threshold(0.8))] },
    });
    expect(result).toEqual({ model: crossImage, inputs: threshold(0.8), reason: null });
  });

  it('surfaces stale and incompatible label bindings instead of silently picking a different model', () => {
    const stale = resolveConceptSelection({
      models: [instance], labelId: 43,
      policy: { bindings: [binding({ task: 'cross-image-suggestion', registry_key: 'missing' }, 43)] },
    });
    expect(stale.model).toBeNull();
    expect(stale.reason).toContain('unavailable');
    const incompatible = resolveConceptSelection({
      models: [instance, crossImage], labelId: 44,
      policy: { bindings: [binding(instance, 44)] },
    });
    expect(incompatible.model).toBeNull();
    expect(incompatible.reason).toContain('no class mapped');
  });

  it('respects a user override without importing another task or label’s inputs', () => {
    const result = resolveConceptSelection({
      models: [instance, crossImage, suggestion], labelId: 43,
      override: modelIdentity(suggestion),
      policy: { bindings: [binding(instance, 43, threshold(0.2)), binding(crossImage, 43, threshold(0.3)), binding(suggestion, 44, threshold(0.99))] },
    });
    expect(result).toEqual({ model: suggestion, inputs: {}, reason: null });
  });

  it('uses the matching model’s task default for an explicit override', () => {
    const result = resolveConceptSelection({
      models: [instance, crossImage], labelId: 43,
      override: modelIdentity(crossImage),
      policy: { bindings: [binding(instance, 43, threshold(0.2)), binding(crossImage, null, threshold(0.7))] },
    });
    expect(result).toEqual({ model: crossImage, inputs: threshold(0.7), reason: null });
  });

  it('blocks a stale manual override without replacing the selection', () => {
    expect(resolveConceptSelection({ models: [instance], labelId: 43, override: 'instance-segmentation:missing' }).model).toBeNull();
  });

  it('chooses compatible instance, cross-image, then within-image models in the absence of policy', () => {
    const models = [suggestion, crossImage, instance];
    expect(resolveConceptSelection({ models, labelId: 43 }).model).toBe(instance);
    expect(resolveConceptSelection({ models, labelId: 44 }).model).toBe(crossImage);
    expect(resolveConceptSelection({ models: [suggestion], labelId: 44 }).model).toBe(suggestion);
  });

  it('excludes not-ready and error models', () => {
    const models = [{ ...instance, model_status: 'not_ready' }, { ...crossImage, status: 'error' }, suggestion];
    expect(resolveConceptSelection({ models, labelId: 43 }).model).toBe(suggestion);
  });
});

const labels = [
  { id: 40, parent_id: null },
  { id: 41, parent_id: 40 },
  { id: 42, parent_id: 41 },
  { id: 43, parent_id: 42 },
  { id: 99, parent_id: null },
];
const objects = [
  { id: 'colony-a', contour_id: 100, labelId: 40 },
  { id: 'fragment-a', contour_id: 101, labelId: 41, parentId: 100 },
  { id: 'surface-a1', contour_id: 102, labelId: 42, parentId: 101 },
  { id: 'surface-a2', contour_id: 103, labelId: 42, parentId: 101 },
  { id: 'polyp-a', contour_id: 104, labelId: 43, parentId: 102 },
  { id: 'fragment-b', contour_id: 201, labelId: 41, parentId: 100 },
  { id: 'surface-b', contour_id: 202, labelId: 42, parentId: 201 },
  { id: 'unsaved', contour_id: null, labelId: 42, parentId: 101 },
  { id: 'unrelated', contour_id: 300, labelId: 99 },
];
const parentIds = (options = {}) => getConceptParentIds({ labelId: 43, labels, objects, ...options });

describe('concept hierarchy scope', () => {
  it('includes only saved instances of the immediate parent, using backend-only IDs too', () => {
    expect(parentIds()).toEqual([102, 103, 202]);
    expect(parentIds({ objects: [{ id: 702, label_id: 42 }] })).toEqual([702]);
  });

  it('narrows descendants through the contour parent chain', () => {
    expect(parentIds({ focusedContourId: 101 })).toEqual([102, 103]);
    expect(parentIds({ selectedIds: ['surface-a2'] })).toEqual([103]);
    expect(parentIds({ selectedIds: [100] })).toEqual([102, 103, 202]);
  });

  it('prefers explicitly selected ancestors over a different focused ancestor', () => {
    expect(parentIds({ selectedIds: ['fragment-b'], focusedContourId: 101 })).toEqual([202]);
  });

  it('does not let a selected child or unrelated label override focus', () => {
    expect(parentIds({ selectedIds: ['polyp-a', 'unrelated'], focusedContourId: 201 })).toEqual([202]);
    expect(parentIds({ selectedIds: ['polyp-a'] })).toEqual([102, 103, 202]);
  });

  it('returns an empty scope for root labels and parentless selected ancestors', () => {
    expect(parentIds({ labelId: 40 })).toEqual([]);
    expect(parentIds({ objects: [...objects, { id: 'empty-fragment', contour_id: 401, labelId: 41 }], selectedIds: [401] })).toEqual([]);
  });

  it('terminates safely on taxonomy and contour cycles', () => {
    expect(parentIds({ labels: [{ id: 43, parent_id: 42 }, { id: 42, parent_id: 43 }] })).toEqual([]);
    expect(parentIds({
      selectedIds: [101],
      objects: [...objects, { id: 501, label_id: 42, parent_id: 502 }, { id: 502, label_id: 41, parent_id: 501 }],
    })).toEqual([102, 103]);
  });
});

describe('concept preview requests', () => {
  it('carries the selected task, mapped target and normalized inputs', () => {
    const inputs = { conditioning: { mode: 'reference_instances' }, parameters: { threshold: 0.8 } };
    const request = buildConceptPreviewRequest({ datasetId: '15', imageId: '385', labelId: '43', model: crossImage, inputs, useHierarchy: true, roiContourIds: ['102', 102, 103] });
    expect(request).toEqual({
      dataset_id: 15, image_selection: 'custom', image_ids: [385], result_mode: 'preview',
      steps: [{ model_registry_key: 'suggestions', task: 'cross-image-suggestion', label_id: 43, inputs, use_hierarchy: true, roi_contour_ids: [102, 103] }],
    });
  });

  it('drops stale ROI IDs when hierarchy is off', () => {
    const step = buildConceptPreviewRequest({ datasetId: 15, imageId: 385, labelId: 43, model: instance, useHierarchy: false, roiContourIds: [102] }).steps[0];
    expect(step.use_hierarchy).toBe(false);
    expect(step).not.toHaveProperty('roi_contour_ids');
  });
});
