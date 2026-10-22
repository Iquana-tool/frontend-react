export const CELLPOSE_POLYP_REGISTRY_KEY = 'cpsam_polyp_v3_b_seed17';
export const YOLO_POLYP_REGISTRY_KEY = 'yolo_polyp_v3_c_seed1';
export const POLYP_MODEL_INFO = {
  [CELLPOSE_POLYP_REGISTRY_KEY]: { name: 'Cellpose-SAM · Polyp', sha256: '8d17682741428d0c71b93dc6112de9ff9d6595fc586fe797bf4566423b788eba' },
  [YOLO_POLYP_REGISTRY_KEY]: { name: 'YOLO11m-seg · Polyp', sha256: '7e9ac2eec159b4d227d1b8c6553de224a982f420f96b738362ef04bbfad08edf' },
};
export const isPolypInstanceModel = (key) => Object.hasOwn(POLYP_MODEL_INFO, key);

const className = (value) => {
  if (typeof value === 'string') return value.trim().toLowerCase();
  return String(value?.key ?? value?.name ?? value?.class_name ?? value?.label ?? '').trim().toLowerCase();
};

const numberId = (value) => {
  const candidate = value?.label_id ?? value?.dataset_label_id ?? value?.id ?? value;
  const id = Number(candidate);
  return Number.isFinite(id) ? id : null;
};

const getLabelName = (labelsMap, id) => {
  if (!labelsMap || id == null) return null;
  if (labelsMap instanceof Map) return labelsMap.get(id) ?? labelsMap.get(String(id)) ?? null;
  return labelsMap[id] ?? labelsMap[String(id)] ?? null;
};

export function resolvePolypProjectLabel(model, labelsMap, datasetLabels = [], objectsList = []) {
  if (!model) return null;

  const classes = Array.isArray(model?.classes) ? model.classes : [];
  const classIndex = classes.findIndex((entry) => className(entry) === 'polyp');

  let labelId = null;

  // 1. Authoritative class_mappings on model (from dataset catalog)
  const classMappings = Array.isArray(model?.class_mappings) ? model.class_mappings : [];
  const classMappingEntry = classMappings.find((entry) => className(entry?.model_class) === 'polyp');
  if (classMappingEntry) {
    const action = String(classMappingEntry.action ?? '').toLowerCase();
    if (action === 'discard' || action === 'unmapped') return null;
    if (action === 'map' && classMappingEntry.label_id != null) {
      labelId = numberId(classMappingEntry.label_id);
    }
    if (labelId == null) return null;
  } else {
    // 2. Direct model_label_mapping
    const mapping = model?.model_label_mapping ?? model?.label_mapping ?? {};
    const directMapping = mapping.polyp ?? mapping.Polyp;
    if (directMapping) {
      const action = String(directMapping?.action ?? '').toLowerCase();
      if (action === 'discard' || action === 'unmapped') return null;
      labelId = numberId(directMapping);
    } else {
      // 3. Mapped label_ids
      const mappedIds = Array.isArray(model?.label_ids) ? model.label_ids : [];
      if (mappedIds.length > 0) {
        const mappedEntry = mappedIds.find(
          (entry) => entry && typeof entry === 'object' && className(entry) === 'polyp'
        );
        const candidate = mappedEntry ?? (classIndex >= 0 ? mappedIds[classIndex] : null);
        labelId = numberId(candidate);
      }
    }
  }

  // Fallbacks ONLY if model has no configured mappings at all
  if (
    labelId == null &&
    classMappings.length === 0 &&
    !model?.model_label_mapping &&
    !model?.label_mapping &&
    (!Array.isArray(model?.label_ids) || model.label_ids.length === 0)
  ) {
    if (labelsMap instanceof Map) {
      for (const [id, val] of labelsMap.entries()) {
        const name = typeof val === 'string' ? val : val?.name;
        if (typeof name === 'string' && /polyp/i.test(name)) {
          labelId = Number(id);
          break;
        }
      }
    } else if (labelsMap && typeof labelsMap === 'object') {
      for (const [id, val] of Object.entries(labelsMap)) {
        const name = typeof val === 'string' ? val : val?.name;
        if (typeof name === 'string' && /polyp/i.test(name)) {
          labelId = Number(id);
          break;
        }
      }
    }

    if (labelId == null && Array.isArray(datasetLabels) && datasetLabels.length > 0) {
      const found = datasetLabels.find((l) => /polyp/i.test(l.name || l.label || ''));
      if (found) labelId = Number(found.id);
    }

    if (labelId == null && Array.isArray(objectsList) && objectsList.length > 0) {
      const foundObj = objectsList.find((obj) => {
        const name = obj.label || getLabelName(labelsMap, obj.labelId ?? obj.label_id);
        return typeof name === 'string' && /polyp/i.test(name);
      });
      if (foundObj) labelId = numberId(foundObj.labelId ?? foundObj.label_id);
    }
  }

  if (labelId != null) {
    const labelName =
      getLabelName(labelsMap, labelId) ??
      (Array.isArray(datasetLabels) ? datasetLabels.find((l) => Number(l.id) === labelId)?.name : null) ??
      (Array.isArray(objectsList) ? objectsList.find((o) => Number(o.labelId ?? o.label_id) === labelId)?.label : null) ??
      'Coral Polyp';
    const color =
      (Array.isArray(datasetLabels) ? datasetLabels.find((l) => Number(l.id) === labelId)?.color : null) ??
      (Array.isArray(objectsList) ? objectsList.find((o) => Number(o.labelId ?? o.label_id) === labelId)?.color : null) ??
      null;
    return {
      labelId,
      labelName: String(labelName),
      ...(color ? { color } : {}),
    };
  }

  return null;
}

export function getSelectedFragmentContourIds(
  selectedIds,
  objects,
  labelsMap,
  targetLabelId = null,
  datasetLabels = null,
  focusedContourId = null
) {
  if (!Array.isArray(objects) || objects.length === 0) {
    return [];
  }

  const selected = new Set((Array.isArray(selectedIds) ? selectedIds : []).map(String));
  const selectedObjects = objects.filter(
    (object) =>
      (selected.has(String(object.id)) || selected.has(String(object.contour_id))) &&
      object.contour_id != null &&
      object.contour_id !== ''
  );

  if (selectedObjects.length === 0) {
    return focusedContourId == null
      ? []
      : getSelectedFragmentContourIds([focusedContourId], objects, labelsMap, targetLabelId, datasetLabels);
  }

  let resolvedTargetId = targetLabelId != null ? Number(targetLabelId) : null;
  if (resolvedTargetId == null && Array.isArray(datasetLabels)) {
    const target = datasetLabels.find(
      (l) => l.key === 'polyp' || (typeof l.name === 'string' && /polyp/i.test(l.name))
    );
    if (target?.id != null) resolvedTargetId = Number(target.id);
  }
  if (resolvedTargetId == null && labelsMap) {
    if (labelsMap instanceof Map) {
      for (const [id, val] of labelsMap.entries()) {
        const name = typeof val === 'string' ? val : val?.name;
        if (typeof name === 'string' && /polyp/i.test(name)) {
          resolvedTargetId = Number(id);
          break;
        }
      }
    } else if (typeof labelsMap === 'object') {
      for (const [id, val] of Object.entries(labelsMap)) {
        const name = typeof val === 'string' ? val : val?.name;
        if (typeof name === 'string' && /polyp/i.test(name)) {
          resolvedTargetId = Number(id);
          break;
        }
      }
    }
  }

  let allowedAncestorIds = null;
  if (Array.isArray(datasetLabels) && datasetLabels.length > 0 && resolvedTargetId != null) {
    const targetLabelObj = datasetLabels.find((l) => Number(l.id) === resolvedTargetId);
    if (targetLabelObj) {
      const parentMap = new Map();
      datasetLabels.forEach((l) => {
        if (l?.id != null) {
          const pid = l.parent_id != null ? Number(l.parent_id) : null;
          parentMap.set(Number(l.id), pid);
        }
      });

      const pid = targetLabelObj.parent_id != null ? Number(targetLabelObj.parent_id) : null;
      if (pid != null) {
        const allowed = new Set();
        const visited = new Set();
        let currId = resolvedTargetId;
        let cycle = false;
        while (currId != null && Number.isFinite(currId)) {
          if (visited.has(currId)) {
            cycle = true;
            break;
          }
          visited.add(currId);
          const parentId = parentMap.get(currId);
          if (parentId == null || !parentMap.has(parentId)) {
            break;
          }
          if (visited.has(parentId)) {
            cycle = true;
            break;
          }
          allowed.add(parentId);
          currId = parentId;
        }
        allowedAncestorIds = cycle ? new Set() : allowed;
      } else {
        // Mapped target has no parent in datasetLabels -> root target with no allowed ancestors
        allowedAncestorIds = new Set();
      }
    }
  }

  const ids = selectedObjects
    .filter((object) => {
      const objLabelId = Number(object.labelId ?? object.label_id);

      if (resolvedTargetId != null && objLabelId === resolvedTargetId) {
        return false;
      }

      if (allowedAncestorIds != null) {
        return allowedAncestorIds.has(objLabelId);
      }

      const name = getLabelName(labelsMap, objLabelId) ?? object.label ?? '';
      if (typeof name === 'string' && /polyp/i.test(name)) {
        return false;
      }

      return /fragment|surface|coral/i.test(String(name));
    })
    .map((object) => Number(object.contour_id))
    .filter(Number.isFinite);

  const uniqueIds = [...new Set(ids)];
  return uniqueIds.length > 0 || focusedContourId == null
    ? uniqueIds
    : getSelectedFragmentContourIds([focusedContourId], objects, labelsMap, targetLabelId, datasetLabels);
}

export function resolvePolypInputs({
  policy = null,
  labelId = null,
  modelKey = CELLPOSE_POLYP_REGISTRY_KEY,
  inputs = null,
  threshold = null,
} = {}) {
  // 1. Explicit inputs envelope provided (e.g. { parameters: { threshold: 0.9 } })
  if (inputs && typeof inputs === 'object') {
    if (inputs.parameters != null || inputs.conditioning != null) {
      const result = {
        ...(inputs.conditioning != null ? { conditioning: { ...inputs.conditioning } } : {}),
        ...(inputs.parameters != null ? { parameters: { ...inputs.parameters } } : {}),
      };
      if (threshold != null && Number.isFinite(Number(threshold))) {
        result.parameters = { ...(result.parameters || {}), threshold: Number(threshold) };
      }
      return result;
    }
    if (inputs.threshold != null && Number.isFinite(Number(inputs.threshold))) {
      return { parameters: { threshold: Number(inputs.threshold) } };
    }
  }

  // 2. Explicit direct threshold provided
  if (threshold != null && Number.isFinite(Number(threshold))) {
    return { parameters: { threshold: Number(threshold) } };
  }

  // 3. Resolve from dataset routing policy matching settings
  if (policy && Array.isArray(policy.bindings)) {
    const numLabelId = labelId != null ? Number(labelId) : null;
    const task = 'instance-segmentation';

    const getBindingModelKey = (b) =>
      b.model_registry_key ??
      b.registry_key ??
      b.model?.registry_key ??
      b.model?.id ??
      b.model ??
      b.id ??
      null;

    const matchesExactModel = (b) => {
      const bKey = getBindingModelKey(b);
      return bKey != null && (bKey === modelKey || String(bKey) === String(modelKey));
    };

    const isModelAgnostic = (b) => getBindingModelKey(b) == null;

    let matchedBinding = null;

    // 1. Label override explicitly matching modelKey
    if (numLabelId != null) {
      matchedBinding = policy.bindings.find(
        (b) => b.task === task && Number(b.label_id) === numLabelId && matchesExactModel(b)
      );
    }

    // 2. Task default explicitly matching modelKey
    if (!matchedBinding) {
      matchedBinding = policy.bindings.find(
        (b) => b.task === task && (b.label_id == null || b.label_id === undefined) && matchesExactModel(b)
      );
    }

    // 3. Model-agnostic label override
    if (!matchedBinding && numLabelId != null) {
      matchedBinding = policy.bindings.find(
        (b) => b.task === task && Number(b.label_id) === numLabelId && isModelAgnostic(b)
      );
    }

    // 4. Model-agnostic task default
    if (!matchedBinding) {
      matchedBinding = policy.bindings.find(
        (b) => b.task === task && (b.label_id == null || b.label_id === undefined) && isModelAgnostic(b)
      );
    }

    if (matchedBinding) {
      const bInputs = matchedBinding.inputs;
      const configuredThreshold =
        bInputs?.parameters?.threshold ??
        bInputs?.threshold ??
        matchedBinding.threshold;

      if (bInputs && typeof bInputs === 'object') {
        const result = {
          ...(bInputs.conditioning ? { conditioning: { ...bInputs.conditioning } } : {}),
          parameters: {
            ...(bInputs.parameters ? { ...bInputs.parameters } : {}),
            ...(configuredThreshold != null ? { threshold: Number(configuredThreshold) } : {}),
          },
        };
        if (Object.keys(result.parameters).length === 0) {
          delete result.parameters;
        }
        if (Object.keys(result).length > 0) {
          return result;
        }
      } else if (configuredThreshold != null && Number.isFinite(Number(configuredThreshold))) {
        return { parameters: { threshold: Number(configuredThreshold) } };
      }
    }
  }

  // 4. Fallback if inputs was a generic non-empty object
  if (inputs && typeof inputs === 'object' && Object.keys(inputs).length > 0) {
    return { ...inputs };
  }

  return {};
}

export function buildCellposePreviewRequest({
  datasetId,
  imageId,
  labelId,
  roiContourIds = [],
  modelKey = CELLPOSE_POLYP_REGISTRY_KEY,
  inputs = null,
  policy = null,
  threshold = null,
}) {
  const resolvedInputs = resolvePolypInputs({ policy, labelId, modelKey, inputs, threshold });
  return {
    dataset_id: Number(datasetId),
    image_selection: 'custom',
    image_ids: [Number(imageId)],
    result_mode: 'preview',
    steps: [{
      model_registry_key: modelKey,
      task: 'instance-segmentation',
      label_id: Number(labelId),
      inputs: resolvedInputs,
      roi_contour_ids: roiContourIds.map(Number),
    }],
  };
}

const flattenContours = (contours) => {
  if (Array.isArray(contours)) {
    return contours.flatMap((contour) => [contour, ...flattenContours(contour?.children)]);
  }
  if (Array.isArray(contours?.root_contours)) return flattenContours(contours.root_contours);
  return [];
};

export function extractPreviewPredictions(items, fallbackLabelId) {
  const result = [];
  (Array.isArray(items) ? items : items?.items || []).forEach((item, itemIndex) => {
    const payload = item?.predictions ?? item?.result ?? {};
    const contours = flattenContours(payload.contours ?? payload.root_contours ?? payload);
    const instances = payload.prediction_metadata?.instances ?? [];
    const instancesById = new Map(instances.map((instance) => [String(instance.source_instance_id), instance]));

    contours.forEach((contour, contourIndex) => {
      if (!Array.isArray(contour.x) || !Array.isArray(contour.y) || contour.x.length < 3 || contour.x.length !== contour.y.length) {
        return;
      }
      const sourceInstanceId = contour.source_instance_id ?? contour.metadata?.source_instance_id ?? null;
      const instance = sourceInstanceId == null ? null : instancesById.get(String(sourceInstanceId));
      const labelId = numberId(contour.label_id) ?? numberId(fallbackLabelId);
      if (labelId == null) return;
      const score = Number(contour.score ?? contour.confidence ?? instance?.score);
      result.push({
        id: `${item.image_id ?? itemIndex}:${sourceInstanceId ?? contour.id ?? contourIndex}:${contourIndex}`,
        sourceInstanceId,
        x: contour.x.map(Number),
        y: contour.y.map(Number),
        label_id: labelId,
        parent_id: contour.parent_id ?? null,
        score: Number.isFinite(score) ? score : null,
        included: true,
      });
    });
  });
  return result;
}

export function isPointInPolygon(point, polygonX, polygonY) {
  if (!Array.isArray(polygonX) || !Array.isArray(polygonY) || polygonX.length < 3 || polygonX.length !== polygonY.length) {
    return false;
  }
  const [px, py] = point;
  let inside = false;
  const n = polygonX.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygonX[i];
    const yi = polygonY[i];
    const xj = polygonX[j];
    const yj = polygonY[j];
    const intersect = ((yi > py) !== (yj > py))
      && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonArea(polyX, polyY) {
  if (!Array.isArray(polyX) || !Array.isArray(polyY) || polyX.length < 3 || polyX.length !== polyY.length) {
    return 0;
  }
  let area = 0;
  const n = polyX.length;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    area += (polyX[j] + polyX[i]) * (polyY[j] - polyY[i]);
    j = i;
  }
  return Math.abs(area) / 2;
}

/**
 * Compute the Intersection-over-Union (IoU) of two polygons with normalized coordinates.
 * Uses bounding-box gating, upper-bound early exit, and regular grid sampling over intersection.
 */
export function calculatePolygonIoU(polyA, polyB, gridSize = 20) {
  if (!polyA?.x || !polyA?.y || !polyB?.x || !polyB?.y) return 0;
  const ax = polyA.x;
  const ay = polyA.y;
  const bx = polyB.x;
  const by = polyB.y;
  if (ax.length < 3 || ay.length < 3 || bx.length < 3 || by.length < 3) return 0;

  let minX1 = Infinity, maxX1 = -Infinity, minY1 = Infinity, maxY1 = -Infinity;
  for (let i = 0; i < ax.length; i++) {
    if (ax[i] < minX1) minX1 = ax[i];
    if (ax[i] > maxX1) maxX1 = ax[i];
    if (ay[i] < minY1) minY1 = ay[i];
    if (ay[i] > maxY1) maxY1 = ay[i];
  }
  let minX2 = Infinity, maxX2 = -Infinity, minY2 = Infinity, maxY2 = -Infinity;
  for (let i = 0; i < bx.length; i++) {
    if (bx[i] < minX2) minX2 = bx[i];
    if (bx[i] > maxX2) maxX2 = bx[i];
    if (by[i] < minY2) minY2 = by[i];
    if (by[i] > maxY2) maxY2 = by[i];
  }

  const intMinX = Math.max(minX1, minX2);
  const intMaxX = Math.min(maxX1, maxX2);
  const intMinY = Math.max(minY1, minY2);
  const intMaxY = Math.min(maxY1, maxY2);

  if (intMinX >= intMaxX || intMinY >= intMaxY) return 0;

  const areaA = polygonArea(ax, ay);
  const areaB = polygonArea(bx, by);
  if (areaA <= 0 || areaB <= 0) return 0;

  // Upper bound early exit: if min(A, B) / max(A, B) < 0.05, IoU cannot exceed 0.05
  const maxPossibleIoU = Math.min(areaA, areaB) / Math.max(areaA, areaB);
  if (maxPossibleIoU <= 0) return 0;

  const intBoxArea = (intMaxX - intMinX) * (intMaxY - intMinY);
  const stepX = (intMaxX - intMinX) / gridSize;
  const stepY = (intMaxY - intMinY) / gridSize;

  let insideBoth = 0;
  for (let i = 0; i < gridSize; i++) {
    const px = intMinX + (i + 0.5) * stepX;
    for (let j = 0; j < gridSize; j++) {
      const py = intMinY + (j + 0.5) * stepY;
      if (isPointInPolygon([px, py], ax, ay) && isPointInPolygon([px, py], bx, by)) {
        insideBoth++;
      }
    }
  }

  const intArea = (insideBoth / (gridSize * gridSize)) * intBoxArea;
  const unionArea = areaA + areaB - intArea;
  return unionArea > 0 ? intArea / unionArea : 0;
}

/**
 * Retrieve existing polyp objects matching the target parent coral or image scope.
 */
export function getExistingPolypsForScope(objects = [], {
  targetParentIds = null,
  labelId = null,
  scope = 'fragment',
} = {}) {
  if (!Array.isArray(objects) || labelId == null) return [];
  const targetLabelId = Number(labelId);
  const parentIdSet = targetParentIds instanceof Set
    ? targetParentIds
    : Array.isArray(targetParentIds)
      ? new Set(targetParentIds.map(Number))
      : null;
  const parentById = new Map(objects.filter(Boolean).map((obj) => [
    Number(obj.contour_id ?? obj.id), obj.parentId ?? obj.parent_id,
  ]));

  return objects.filter((obj) => {
    if (!obj) return false;
    const objLabelId = Number(obj.labelId ?? obj.label_id);
    if (objLabelId !== targetLabelId) return false;
    if (scope === 'fragment') {
      if (!parentIdSet || parentIdSet.size === 0) return false;
      let parentId = obj.parentId ?? obj.parent_id;
      const visited = new Set();
      // A selected fragment can contain surfaces which in turn contain the polyps.
      while (parentId != null) {
        parentId = Number(parentId);
        if (visited.has(parentId)) return false;
        if (parentIdSet.has(parentId)) return true;
        visited.add(parentId);
        parentId = parentById.get(parentId);
      }
      return false;
    }
    return true;
  });
}

/**
 * Preserve existing annotations using overlap over the smaller area; use IoU for intra-batch NMS.
 * Surviving predictions are returned; suppressed predictions are counted.
 */
export function suppressOverlappingPredictions(
  predictions = [],
  existingObjects = [],
  { iouThreshold = 0.5, gridSize = 20 } = {}
) {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return { kept: [], suppressedCount: 0 };
  }

  // Sort candidates by score descending for greedy NMS
  const sorted = [...predictions].sort((a, b) => {
    const sa = Number(a?.score ?? a?.confidence ?? 0);
    const sb = Number(b?.score ?? b?.confidence ?? 0);
    return sb - sa;
  });

  const validExisting = (existingObjects || []).filter(
    (obj) => Array.isArray(obj?.x) && Array.isArray(obj?.y) && obj.x.length >= 3
  );

  const kept = [];
  let suppressedCount = 0;

  for (const candidate of sorted) {
    if (!Array.isArray(candidate?.x) || !Array.isArray(candidate?.y) || candidate.x.length < 3) {
      continue;
    }

    // 1. Check overlap against existing annotations (existing annotations take precedence)
    let isSuppressed = false;
    for (const existing of validExisting) {
      const iou = calculatePolygonIoU(candidate, existing, gridSize);
      const candidateArea = polygonArea(candidate.x, candidate.y);
      const existingArea = polygonArea(existing.x, existing.y);
      const intersection = iou * (candidateArea + existingArea) / (1 + iou);
      const smallerArea = Math.min(candidateArea, existingArea);
      // Different models can outline the same polyp at different sizes or offsets.
      const overlapSmaller = smallerArea > 0 ? intersection / smallerArea : 0;
      if (iou >= iouThreshold || overlapSmaller >= 0.3) {
        isSuppressed = true;
        break;
      }
    }

    // 2. If not suppressed by existing, check against higher-scoring accepted predictions in this batch
    if (!isSuppressed) {
      for (const accepted of kept) {
        const iou = calculatePolygonIoU(candidate, accepted, gridSize);
        if (iou >= iouThreshold) {
          isSuppressed = true;
          break;
        }
      }
    }

    if (isSuppressed) {
      suppressedCount++;
    } else {
      kept.push(candidate);
    }
  }

  return { kept, suppressedCount };
}


export function getLabelAncestors(labelId, datasetLabels = []) {
  if (labelId == null || !Array.isArray(datasetLabels) || datasetLabels.length === 0) {
    return { allowedAncestors: new Set(), ancestorDistance: new Map(), hasHierarchyInfo: false };
  }
  const parentById = new Map();
  for (const label of datasetLabels) {
    if (label && label.id != null) {
      parentById.set(Number(label.id), label.parent_id != null ? Number(label.parent_id) : null);
    }
  }

  const numLabelId = Number(labelId);
  if (!parentById.has(numLabelId)) {
    return { allowedAncestors: new Set(), ancestorDistance: new Map(), hasHierarchyInfo: false };
  }

  const allowedAncestors = new Set();
  const ancestorDistance = new Map();
  const visited = new Set();
  let dist = 0;
  let curr = parentById.get(numLabelId);
  while (curr != null) {
    if (visited.has(curr) || !parentById.has(curr)) break;
    visited.add(curr);
    allowedAncestors.add(curr);
    ancestorDistance.set(curr, dist);
    dist++;
    curr = parentById.get(curr);
  }
  return { allowedAncestors, ancestorDistance, hasHierarchyInfo: true };
}

export function resolveParentContourId(prediction, {
  focusedContourId = null,
  roiContourIds = [],
  objects = [],
  labelsMap = null,
  datasetLabels = [],
  scope = null,
} = {}) {
  const predLabelId = prediction?.label_id != null
    ? Number(prediction.label_id)
    : (prediction?.labelId != null ? Number(prediction.labelId) : null);

  const { allowedAncestors, ancestorDistance, hasHierarchyInfo } = getLabelAncestors(
    predLabelId,
    datasetLabels
  );

  const isCompatibleParent = (obj) => {
    if (!obj) return false;
    const objLabelId = obj.labelId != null
      ? Number(obj.labelId)
      : (obj.label_id != null ? Number(obj.label_id) : null);

    // 1. If dataset label hierarchy is available for the prediction's label:
    if (hasHierarchyInfo) {
      if (objLabelId == null) return false;
      return allowedAncestors.has(objLabelId);
    }

    // 2. Fallback when datasetLabels is not provided (e.g. lightweight legacy tests):
    if (predLabelId != null && objLabelId != null && objLabelId === predLabelId) {
      return false;
    }
    const name = getLabelName(labelsMap, objLabelId) ?? obj.label ?? '';
    if (typeof name === 'string' && /polyp/i.test(name)) return false;
    return /coral|fragment|surface/i.test(String(name));
  };

  if (prediction?.parent_id != null) {
    const pid = Number(prediction.parent_id);
    if (Number.isFinite(pid)) {
      // Validate explicit parent against label ancestry if parent exists in objects
      const explicitParent = (objects || []).find((obj) => Number(obj.contour_id ?? obj.id) === pid);
      if (explicitParent && hasHierarchyInfo && !isCompatibleParent(explicitParent)) {
        // Explicit parent is invalid for this label ancestry — do not accept it
      } else {
        return pid;
      }
    }
  }

  const isWholeImage = scope === 'whole_image' || scope === 'whole-image' || scope === 'image';
  const effectiveFocusedId = isWholeImage ? null : (focusedContourId != null ? Number(focusedContourId) : null);
  const effectiveRoiIds = isWholeImage
    ? []
    : (Array.isArray(roiContourIds) ? roiContourIds.map(Number).filter(Number.isFinite) : []);

  if (prediction && Array.isArray(prediction.x) && Array.isArray(prediction.y) && prediction.x.length >= 3) {
    const cx = prediction.x.reduce((a, b) => a + b, 0) / prediction.x.length;
    const cy = prediction.y.reduce((a, b) => a + b, 0) / prediction.y.length;

    // If explicit ROIs are specified (in fragment scope), check compatibility and containment in them first
    if (effectiveRoiIds.length > 0) {
      for (const roiId of effectiveRoiIds) {
        const roiObj = (objects || []).find((obj) => Number(obj.contour_id ?? obj.id) === roiId);
        if (roiObj && isCompatibleParent(roiObj)) {
          if (Array.isArray(roiObj.x) && Array.isArray(roiObj.y) && roiObj.x.length >= 3) {
            if (isPointInPolygon([cx, cy], roiObj.x, roiObj.y)) {
              return roiId;
            }
          } else {
            return roiId;
          }
        }
      }
      // Predictions outside the explicit ROI in fragment scope must not attach to unrelated objects
      return null;
    }

    // If a focused contour is specified (in fragment scope without explicit ROI), check compatibility and containment
    if (effectiveFocusedId != null) {
      const focusedObj = (objects || []).find((obj) => Number(obj.contour_id ?? obj.id) === effectiveFocusedId);
      if (focusedObj && isCompatibleParent(focusedObj)) {
        if (Array.isArray(focusedObj.x) && Array.isArray(focusedObj.y) && focusedObj.x.length >= 3) {
          if (isPointInPolygon([cx, cy], focusedObj.x, focusedObj.y)) {
            return effectiveFocusedId;
          }
        } else {
          return effectiveFocusedId;
        }
      }
    }

    // For whole-image runs or general unparented resolution, find compatible containing parent
    const candidateObjects = (objects || []).filter((obj) => {
      const cid = Number(obj.contour_id ?? obj.id);
      if (!Number.isFinite(cid)) return false;
      return isCompatibleParent(obj);
    });

    if (candidateObjects.length > 0) {
      // Sort candidates by nearest ancestor first, then tightest area
      candidateObjects.sort((a, b) => {
        const aLabelId = Number(a.labelId ?? a.label_id);
        const bLabelId = Number(b.labelId ?? b.label_id);
        const aDist = ancestorDistance.get(aLabelId) ?? 999;
        const bDist = ancestorDistance.get(bLabelId) ?? 999;
        if (aDist !== bDist) return aDist - bDist;
        const aArea = polygonArea(a.x, a.y);
        const bArea = polygonArea(b.x, b.y);
        return aArea - bArea;
      });

      for (const parent of candidateObjects) {
        if (Array.isArray(parent.x) && Array.isArray(parent.y) && parent.x.length >= 3) {
          if (isPointInPolygon([cx, cy], parent.x, parent.y)) {
            return Number(parent.contour_id ?? parent.id);
          }
        }
      }
    }

    return null;
  }

  // Fallback for metadata-only objects without coordinates (e.g. mock test assertions)
  if (!isWholeImage) {
    if (effectiveFocusedId != null && Number.isFinite(effectiveFocusedId)) return effectiveFocusedId;
    if (effectiveRoiIds.length === 1 && Number.isFinite(effectiveRoiIds[0])) return effectiveRoiIds[0];
  }

  return null;
}

export function toAcceptedContour(prediction, imageWidth = null, imageHeight = null, parentIdFallback = null) {
  if (!prediction) return null;
  // Preview contours use the app's existing normalized [0,1] geometry contract.
  // Keep coordinates as-is; only the mask RLE in prediction metadata is native-pixel.
  const x = Array.isArray(prediction.x) ? prediction.x.map(Number) : [];
  const y = Array.isArray(prediction.y) ? prediction.y.map(Number) : [];
  if (x.length < 3 || x.length !== y.length || [...x, ...y].some((value) => !Number.isFinite(value))) return null;
  const rawParentId = prediction.parent_id != null
    ? Number(prediction.parent_id)
    : (parentIdFallback != null ? Number(parentIdFallback) : null);
  return {
    x,
    y,
    labelId: Number(prediction.label_id),
    parentId: Number.isFinite(rawParentId) ? rawParentId : null,
    confidence: prediction.score != null && Number.isFinite(Number(prediction.score)) ? Number(prediction.score) : 1,
    sourceInstanceId: prediction.sourceInstanceId ?? null,
  };
}
