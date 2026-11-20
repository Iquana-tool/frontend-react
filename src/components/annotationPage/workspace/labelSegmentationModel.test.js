import { describe, expect, it } from 'vitest';
import {
  buildLabelPreviewRequest,
  getLabelConditioningReason,
  getLabelModelDisplayName,
  getLabelParentIds,
  isLabelModelCompatible,
  modelIdentity,
  resolveLabelSelection,
} from './labelSegmentationModel';

const instance = { task: 'instance-segmentation', registry_key: 'instances', label_ids: [43] };
const crossImage = { task: 'cross-image-suggestion', registry_key: 'suggestions', label_ids: [] };
const suggestion = { task: 'instance-suggestion', registry_key: 'suggestions', label_ids: [] };
const threshold = (value) => ({ parameters: { threshold: value } });
const binding = (model, labelId, inputs = {}) => ({
  task: model.task, model_registry_key: model.registry_key, label_id: labelId, inputs,
});

describe('label segmentation model selection', () => {
  it('distinguishes task surfaces on the same model registry entry', () => {
    expect(modelIdentity(crossImage)).not.toBe(modelIdentity(suggestion));
    expect(modelIdentity({ task: 'instance-suggestion', id: 'sam' })).toBe('instance-suggestion:sam');
  });

  it('distinguishes matching model names by task without changing routing identities', () => {
    const sameImage = { ...suggestion, name: 'SAM 3' };
    const otherImages = { ...crossImage, name: 'SAM 3' };
    const candidates = [sameImage, otherImages];
    expect(getLabelModelDisplayName(sameImage, candidates)).toBe('SAM 3 · This image');
    expect(getLabelModelDisplayName(otherImages, candidates)).toBe('SAM 3 · Other images');
    expect(getLabelModelDisplayName(sameImage, [sameImage])).toBe('SAM 3');
    expect(modelIdentity(sameImage)).toBe('instance-suggestion:suggestions');
    expect(modelIdentity(otherImages)).toBe('cross-image-suggestion:suggestions');
    const hierarchy = { ...suggestion, name: 'SAM 3 (hierarchy-aware)' };
    expect(getLabelModelDisplayName(hierarchy, [...candidates, hierarchy])).toBe(hierarchy.name);
    expect(getLabelModelDisplayName(null, candidates)).toBe('');
  });

  it('checks every mapped class and treats discard/unmapped as authoritative', () => {
    const model = {
      task: 'instance-segmentation', registry_key: 'cpsam',
      classes: [{ key: 'polyp' }, { key: 'surface' }],
      class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 43 }, { model_class: 'surface', action: 'discard' }],
    };
    expect(isLabelModelCompatible(model, 43)).toBe(true);
    expect(isLabelModelCompatible(model, 42)).toBe(false);
  });

  it('resolves explicit overrides and preserves matching binding inputs', () => {
    const models = [instance, suggestion, crossImage];
    const policy = { bindings: [binding(suggestion, 43, threshold(0.7)), binding(suggestion, null, threshold(0.5))] };
    const resolved = resolveLabelSelection({ models, policy, labelId: 43, override: 'instance-suggestion:suggestions' });
    expect(resolved.model).toEqual(suggestion);
    expect(resolved.inputs).toEqual(threshold(0.7));
  });

  it('prefers label-specific bindings across tasks over dataset-level defaults', () => {
    const models = [instance, suggestion, crossImage];
    const policy = { bindings: [binding(instance, null, threshold(0.4)), binding(crossImage, 43, threshold(0.8))] };
    const resolved = resolveLabelSelection({ models, policy, labelId: 43 });
    expect(resolved.model).toEqual(crossImage);
    expect(resolved.inputs).toEqual(threshold(0.8));
  });

  it('falls back across task priority order when no policy matches', () => {
    const models = [suggestion, crossImage];
    const resolved = resolveLabelSelection({ models, policy: { bindings: [] }, labelId: 43 });
    expect(resolved.model).toEqual(crossImage);
  });

  it('returns clean error states for missing and unmapped labels', () => {
    expect(resolveLabelSelection({ models: [instance], labelId: null })).toEqual({
      model: null, inputs: {}, reason: 'Select a label before running segmentation.',
    });
    expect(resolveLabelSelection({ models: [instance], labelId: 99 })).toEqual({
      model: null, inputs: {}, reason: 'No available model is mapped to this label.',
    });
  });

  it('matches bindings with or without an explicit registry key', () => {
    const models = [suggestion];
    const policy = { bindings: [{ task: 'instance-suggestion', label_id: 43, inputs: threshold(0.9) }] };
    expect(resolveLabelSelection({ models, policy, labelId: 43 }).inputs).toEqual(threshold(0.9));
  });

  it('resolves useHierarchy correctly: legacy defaults to ON, explicit false stays OFF', () => {
    const models = [instance, suggestion];
    // 1. Legacy binding without use_hierarchy -> true
    const legacyPolicy = { bindings: [{ ...binding(instance, 43) }] };
    expect(resolveLabelSelection({ models, policy: legacyPolicy, labelId: 43 }).useHierarchy).toBe(true);

    // 2. Explicit use_hierarchy: false -> false
    const offPolicy = { bindings: [{ ...binding(instance, 43), use_hierarchy: false }] };
    expect(resolveLabelSelection({ models, policy: offPolicy, labelId: 43 }).useHierarchy).toBe(false);

    // 3. Explicit use_hierarchy: true -> true
    const onPolicy = { bindings: [{ ...binding(instance, 43), use_hierarchy: true }] };
    expect(resolveLabelSelection({ models, policy: onPolicy, labelId: 43 }).useHierarchy).toBe(true);

    // 4. Catalog fallback without any bindings -> true
    expect(resolveLabelSelection({ models, policy: { bindings: [] }, labelId: 43 }).useHierarchy).toBe(true);

    // 5. Panel model override resolves hierarchy from matching override binding
    const overridePolicy = {
      bindings: [
        { ...binding(instance, 43), use_hierarchy: true },
        { ...binding(suggestion, 43), use_hierarchy: false },
      ],
    };
    const overridden = resolveLabelSelection({
      models,
      policy: overridePolicy,
      labelId: 43,
      override: 'instance-suggestion:suggestions',
    });
    expect(overridden.model).toEqual(suggestion);
    expect(overridden.useHierarchy).toBe(false);
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
const parentIds = (options = {}) => getLabelParentIds({ labelId: 43, labels, objects, ...options });

describe('label hierarchy scope', () => {
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

describe('label preview requests', () => {
  it('carries the selected task, mapped target and normalized inputs', () => {
    const inputs = { conditioning: { mode: 'reference_instances' }, parameters: { threshold: 0.8 } };
    const request = buildLabelPreviewRequest({ datasetId: '15', imageId: '385', labelId: '43', model: crossImage, inputs, useHierarchy: true, roiContourIds: ['102', 102, 103] });
    expect(request).toEqual({
      dataset_id: 15, image_selection: 'custom', image_ids: [385], result_mode: 'preview',
      steps: [{ model_registry_key: 'suggestions', task: 'cross-image-suggestion', label_id: 43, inputs, use_hierarchy: true, roi_contour_ids: [102, 103] }],
    });
  });

  it('drops stale ROI IDs when hierarchy is off', () => {
    const step = buildLabelPreviewRequest({ datasetId: 15, imageId: 385, labelId: 43, model: instance, useHierarchy: false, roiContourIds: [102] }).steps[0];
    expect(step.use_hierarchy).toBe(false);
    expect(step).not.toHaveProperty('roi_contour_ids');
  });
});

describe('within-image exemplar requirements', () => {
  const label = { id: 45, name: 'Polyp' };
  const model = {
    task: 'instance-suggestion', name: 'SAM 3 (hierarchy-aware)',
    input_contract: { conditioning: { kind: 'instances', min_units: 1 } },
  };
  it('counts only saved, non-temporary target-label examples', () => {
    const objects = [
      { id: 100, contour_id: 100, labelId: 41 },
      { id: 101, contour_id: null, labelId: 45 },
      { id: 102, contour_id: 102, labelId: 45, temporary: true },
      { id: Date.now(), labelId: 45 },
    ];
    expect(getLabelConditioningReason({ model, label, objects })).toBe(
      'Annotate and save at least 1 Polyp example on this image before using SAM 3 (hierarchy-aware).',
    );
    expect(getLabelConditioningReason({ model, label, objects: [...objects, { id: 103, contour_id: '103', label_id: '45' }] })).toBeNull();
  });
  it('honors the contract minimum without counting duplicate objects twice', () => {
    const needsTwo = { ...model, input_contract: { conditioning: { kind: 'instances', min_units: 2 } } };
    const object = { id: 100, contour_id: 100, labelId: 45 };
    expect(getLabelConditioningReason({ model: needsTwo, label, objects: [object, object] })).toContain('at least 2 Polyp examples');
    expect(getLabelConditioningReason({ model: needsTwo, label, objects: [object, { id: 101, contour_id: 101, labelId: 45 }] })).toBeNull();
  });
  it('leaves zero-example and other task contracts available', () => {
    expect(getLabelConditioningReason({ model: { ...model, input_contract: { conditioning: { kind: 'instances', min_units: 0 } } }, label })).toBeNull();
    expect(getLabelConditioningReason({ model: { ...model, task: 'cross-image-suggestion' }, label })).toBeNull();
    expect(getLabelConditioningReason({ model: { ...model, task: 'instance-segmentation' }, label })).toBeNull();
  });
});
