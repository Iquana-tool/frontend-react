// The task is an input-conditioning detail, rather than a separate annotation action.
export const CONCEPT_TASKS = [
  'instance-segmentation',
  'cross-image-suggestion',
  'instance-suggestion',
];

const numericId = (value) => {
  if (value == null || value === '') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
};

const modelKey = (model) => model?.registry_key ?? model?.id ?? null;

export const modelIdentity = (model) => model?.task && modelKey(model) != null
  ? `${model.task}:${modelKey(model)}`
  : '';

const classKey = (entry) => typeof entry === 'string'
  ? entry
  : entry?.key ?? entry?.name ?? entry?.model_class ?? entry?.class_name;

/** Declared class mappings are authoritative, including discard/unmapped entries. */
export function isConceptModelCompatible(model, labelId) {
  const targetId = numericId(labelId);
  if (!model || targetId == null) return false;
  const classes = Array.isArray(model.classes) ? model.classes : [];
  const mappings = Array.isArray(model.class_mappings) ? model.class_mappings : [];
  if (mappings.length > 0) {
    const declared = new Set(classes.map(classKey).filter(Boolean));
    return mappings.some((entry) => {
      const action = String(entry.action ?? 'map').toLowerCase();
      return action === 'map'
        && (declared.size === 0 || declared.has(classKey(entry.model_class)))
        && numericId(entry.label_id) === targetId;
    });
  }
  const ids = Array.isArray(model.label_ids) ? model.label_ids : [];
  if (ids.length > 0) return ids.some((id) => numericId(id) === targetId);
  // A class-aware model with no mapped outputs must first have its classes mapped.
  return classes.length === 0;
}

export const isConceptModelAvailable = (model) => CONCEPT_TASKS.includes(model?.task) && ![
  'not_ready', 'error', 'unavailable', 'disabled',
].includes(String(model?.model_status ?? model?.status ?? '').toLowerCase());

const inputsFrom = (binding) => {
  const inputs = binding?.inputs;
  return {
    ...(inputs?.conditioning != null ? { conditioning: { ...inputs.conditioning } } : {}),
    ...(inputs?.parameters != null ? { parameters: { ...inputs.parameters } } : {}),
  };
};

const bindingKey = (binding) => binding.model_registry_key ?? null;
const matchesKey = (model, key) => key != null
  && [model.registry_key, model.id].some((candidate) => candidate != null && String(candidate) === String(key));

/** Resolve one concept action without borrowing another label, model or task's inputs. */
export function resolveConceptSelection({ models = [], policy = null, labelId, override = null } = {}) {
  const targetId = numericId(labelId);
  const catalog = models.filter(isConceptModelAvailable);
  const bindings = Array.isArray(policy?.bindings) ? policy.bindings : [];
  const failed = (reason) => ({ model: null, inputs: {}, reason });
  const success = (model, binding = null) => ({ model, inputs: inputsFrom(binding), reason: null });
  const labelMatches = (binding) => binding.label_id != null && numericId(binding.label_id) === targetId;
  if (targetId == null) return failed('Select a label before running segmentation.');

  if (override) {
    const model = catalog.find((candidate) => modelIdentity(candidate) === override);
    if (!model) return failed('The selected model is unavailable. Choose another model.');
    if (!isConceptModelCompatible(model, targetId)) {
      return failed('The selected model has no class mapped to this label.');
    }
    const scoped = bindings.filter((binding) => binding.task === model.task);
    const exactModel = (binding) => matchesKey(model, bindingKey(binding));
    const defaultBinding = (binding) => binding.label_id == null;
    const agnostic = (binding) => bindingKey(binding) == null;
    const binding = scoped.find((entry) => labelMatches(entry) && exactModel(entry))
      ?? scoped.find((entry) => defaultBinding(entry) && exactModel(entry))
      ?? scoped.find((entry) => labelMatches(entry) && agnostic(entry))
      ?? scoped.find((entry) => defaultBinding(entry) && agnostic(entry));
    return success(model, binding);
  }

  const fromBinding = (binding) => {
    const key = bindingKey(binding);
    const model = catalog.find((candidate) => candidate.task === binding.task
      && (key == null ? isConceptModelCompatible(candidate, targetId) : matchesKey(candidate, key)));
    if (!model) return failed('The configured model is unavailable. Update this label’s model settings.');
    if (!isConceptModelCompatible(model, targetId)) {
      return failed('The configured model has no class mapped to this label. Update its class mapping.');
    }
    return success(model, binding);
  };

  // Label-specific choices across every task outrank every task-level default.
  for (const task of CONCEPT_TASKS) {
    const binding = bindings.find((entry) => entry.task === task && labelMatches(entry));
    if (binding) return fromBinding(binding);
  }
  for (const task of CONCEPT_TASKS) {
    const binding = bindings.find((entry) => entry.task === task && entry.label_id == null);
    if (binding) return fromBinding(binding);
  }
  for (const task of CONCEPT_TASKS) {
    const model = catalog.find((candidate) => candidate.task === task && isConceptModelCompatible(candidate, targetId));
    if (model) return success(model);
  }
  return failed('No available model is mapped to this label.');
}

const objectLabelId = (object) => numericId(object?.labelId ?? object?.label_id);
const parentId = (object) => numericId(object?.parent_id ?? object?.parentId);
const contourId = (object) => {
  // An explicit empty contour_id denotes a drawing which has not been saved yet.
  const value = Object.hasOwn(object, 'contour_id') ? object.contour_id : object.id;
  const id = numericId(value);
  return id != null && Number.isInteger(id) && id > 0 ? id : null;
};

/** Saved immediate-parent instances, optionally narrowed by selected/focused ancestors. */
export function getConceptParentIds({
  labelId, labels = [], objects = [], selectedIds = [], focusedContourId = null,
} = {}) {
  const labelList = labels instanceof Map ? [...labels.values()] : Array.isArray(labels) ? labels : Object.values(labels);
  const labelsById = new Map(labelList.map((label) => [numericId(label.id), label]));
  const targetId = numericId(labelId);
  const immediateParentId = parentId(labelsById.get(targetId));
  if (immediateParentId == null) return [];

  const ancestorLabels = new Set();
  const visitedLabels = new Set([targetId]);
  let current = immediateParentId;
  while (current != null) {
    if (visitedLabels.has(current)) return [];
    visitedLabels.add(current);
    ancestorLabels.add(current);
    current = parentId(labelsById.get(current));
  }

  const saved = objects.filter((object) => contourId(object) != null);
  const byId = new Map(saved.map((object) => [contourId(object), object]));
  const selected = new Set(selectedIds.map(String));
  const isAncestor = (object) => ancestorLabels.has(objectLabelId(object));
  const selection = saved.filter((object) => isAncestor(object)
    && (selected.has(String(object.id)) || selected.has(String(contourId(object)))));
  const focused = saved.find((object) => isAncestor(object)
    && (String(object.id) === String(focusedContourId) || contourId(object) === numericId(focusedContourId)));
  const scopes = new Set((selection.length > 0 ? selection : focused ? [focused] : []).map(contourId));
  const isInScope = (object) => {
    if (scopes.size === 0) return true;
    const visited = new Set();
    let id = contourId(object);
    while (id != null && !visited.has(id)) {
      if (scopes.has(id)) return true;
      visited.add(id);
      id = parentId(byId.get(id));
    }
    return false;
  };
  return [...new Set(saved.filter((object) => objectLabelId(object) === immediateParentId && isInScope(object)).map(contourId))];
}

export function buildConceptPreviewRequest({
  datasetId, imageId, labelId, model, inputs = {}, useHierarchy = false, roiContourIds = [],
}) {
  return {
    dataset_id: Number(datasetId),
    image_selection: 'custom',
    image_ids: [Number(imageId)],
    result_mode: 'preview',
    steps: [{
      model_registry_key: modelKey(model),
      task: model.task,
      label_id: Number(labelId),
      inputs,
      use_hierarchy: Boolean(useHierarchy),
      ...(useHierarchy ? { roi_contour_ids: [...new Set(roiContourIds.map(Number))] } : {}),
    }],
  };
}
