import { describe, expect, it } from 'vitest';
import {
  buildCellposePreviewRequest,
  extractPreviewPredictions,
  getSelectedFragmentContourIds,
  resolvePolypProjectLabel,
  toAcceptedContour,
  calculatePolygonIoU,
  getExistingPolypsForScope,
  suppressOverlappingPredictions,
  CELLPOSE_POLYP_REGISTRY_KEY,
} from './cellposePreviewModel';

describe('Cellpose polyp preview contract', () => {
  it('uses the mapped project polyp label instead of a category constant', () => {
    const projectLabel = resolvePolypProjectLabel({
      registry_key: CELLPOSE_POLYP_REGISTRY_KEY,
      classes: ['polyp'],
      label_ids: [2],
      class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 47, source: 'dataset' }],
    }, new Map([[2, 'wrong label'], [47, 'Project Polyp']]));

    expect(projectLabel).toEqual({ labelId: 47, labelName: 'Project Polyp' });
    expect(resolvePolypProjectLabel({
      classes: ['polyp'],
      class_mappings: [{ model_class: 'polyp', action: 'discard', label_id: 47 }],
      label_ids: [47],
    }, new Map([[47, 'Project Polyp']]))).toBeNull();
  });

  it('falls back to finding polyp labels via labelsMap, datasetLabels, or canvas objectsList', () => {
    const rawModel = {
      registry_key: CELLPOSE_POLYP_REGISTRY_KEY,
      classes: [{ key: 'polyp', name: 'Polyp' }],
    };

    // 1. Fallback via labelsMap
    const fromMap = resolvePolypProjectLabel(rawModel, new Map([[43, 'Coral Polyp']]));
    expect(fromMap).toEqual({ labelId: 43, labelName: 'Coral Polyp' });

    // 2. Fallback via datasetLabels array when labelsMap is null
    const fromDataset = resolvePolypProjectLabel(rawModel, null, [
      { id: 41, name: 'Coral Fragment' },
      { id: 43, name: 'Coral Polyp', color: '#f59e0b' },
    ]);
    expect(fromDataset).toEqual({ labelId: 43, labelName: 'Coral Polyp', color: '#f59e0b' });

    // 3. Fallback via objectsList when labels are not loaded yet
    const fromObjects = resolvePolypProjectLabel(rawModel, null, [], [
      { id: 'surf-1', contour_id: 19748, label: 'Coral Surface', labelId: 42 },
      { id: 'poly-1', contour_id: 19749, label: 'Coral Polyp', labelId: 43, color: '#38bdf8' },
    ]);
    expect(fromObjects).toEqual({ labelId: 43, labelName: 'Coral Polyp', color: '#38bdf8' });

    // 4. Safe resolution when model has labelId but labelsMap is not loaded
    const withDirectId = resolvePolypProjectLabel({
      registry_key: CELLPOSE_POLYP_REGISTRY_KEY,
      class_mappings: [{ model_class: 'polyp', action: 'map', label_id: 43 }],
    }, null);
    expect(withDirectId).toEqual({ labelId: 43, labelName: 'Coral Polyp' });
  });

  it('sends only selected, saved coral or fragment contours as the ROI', () => {
    const selectedContourIds = getSelectedFragmentContourIds(
      ['object-a', 'not-selected'],
      [
        { id: 'object-a', contour_id: 88, labelId: 11 },
        { id: 'object-surface', contour_id: 19748, labelId: 13 },
        { id: 'object-b', contour_id: 99, labelId: 12 },
        { id: 'not-selected', contour_id: null, labelId: 11 },
      ],
      new Map([[11, 'coral fragment'], [12, 'polyp'], [13, 'Coral Surface']])
    );
    expect(selectedContourIds).toEqual([88]);

    const surfaceIds = getSelectedFragmentContourIds(
      ['object-surface'],
      [{ id: 'object-surface', contour_id: 19748, labelId: 13 }],
      new Map([[13, 'Coral Surface']])
    );
    expect(surfaceIds).toEqual([19748]);
    expect(buildCellposePreviewRequest({
      datasetId: '5', imageId: '100', labelId: 47, roiContourIds: selectedContourIds,
    })).toEqual({
      dataset_id: 5,
      image_selection: 'custom',
      image_ids: [100],
      result_mode: 'preview',
      steps: [{
        model_registry_key: CELLPOSE_POLYP_REGISTRY_KEY,
        task: 'instance-segmentation',
        label_id: 47,
        inputs: {},
        roi_contour_ids: [88],
      }],
    });
  });

  it('keeps response contours in normalized editor coordinates and associates mask scores', () => {
    const predictions = extractPreviewPredictions([{
      image_id: 100,
      predictions: {
        contours: [{
          id: 'outline-1',
          source_instance_id: 'mask-1',
          x: [0.1, 0.8, 0.6],
          y: [0.2, 0.3, 0.9],
          label_id: 47,
        }],
        prediction_metadata: {
          instances: [{ source_instance_id: 'mask-1', score: 0.91, rle: { size: [50, 100], counts: 'x' } }],
        },
      },
    }], 9);

    expect(predictions).toHaveLength(1);
    expect(predictions[0]).toMatchObject({
      sourceInstanceId: 'mask-1',
      x: [0.1, 0.8, 0.6],
      y: [0.2, 0.3, 0.9],
      label_id: 47,
      score: 0.91,
      included: true,
    });
    expect(toAcceptedContour(predictions[0], 100, 50)).toEqual({
      x: [0.1, 0.8, 0.6],
      y: [0.2, 0.3, 0.9],
      labelId: 47,
      parentId: null,
      confidence: 0.91,
      sourceInstanceId: 'mask-1',
    });
  });

  it('resolves parent contour id via explicit parent_id, focus mode, single ROI, or containment', () => {
    const { resolveParentContourId, isPointInPolygon } = require('./cellposePreviewModel');

    // 1. Explicit parent_id takes precedence
    expect(resolveParentContourId({ parent_id: 21060 }, { focusedContourId: 999 })).toBe(21060);

    // 2. Focused parent takes priority if unparented
    expect(resolveParentContourId({ parent_id: null }, { focusedContourId: 21060 })).toBe(21060);

    // 3. Single ROI contour ID takes priority if unparented and not focused
    expect(resolveParentContourId({ parent_id: null }, { roiContourIds: [21060] })).toBe(21060);

    // 4. Point in polygon containment check against candidate fragment objects
    const polygonX = [0.0, 1.0, 1.0, 0.0];
    const polygonY = [0.0, 0.0, 1.0, 1.0];
    expect(isPointInPolygon([0.5, 0.5], polygonX, polygonY)).toBe(true);
    expect(isPointInPolygon([1.5, 1.5], polygonX, polygonY)).toBe(false);

    const prediction = {
      x: [0.4, 0.6, 0.5],
      y: [0.4, 0.4, 0.6],
      parent_id: null,
    };
    const fragmentObject = {
      id: 'frag-1',
      contour_id: 21060,
      labelId: 41,
      label: 'Coral Fragment',
      x: polygonX,
      y: polygonY,
    };
    expect(resolveParentContourId(prediction, {
      objects: [fragmentObject],
      labelsMap: new Map([[41, 'Coral Fragment']]),
    })).toBe(21060);
  });

  it('prevents whole-image predictions from inheriting an unrelated focused fragment', () => {
    const { resolveParentContourId } = require('./cellposePreviewModel');

    const fragment1 = {
      id: 'frag-1',
      contour_id: 21060,
      labelId: 41,
      label: 'Coral Fragment',
      x: [0.1, 0.4, 0.4, 0.1],
      y: [0.1, 0.1, 0.4, 0.4],
    };
    const fragment2 = {
      id: 'frag-2',
      contour_id: 21061,
      labelId: 41,
      label: 'Coral Fragment',
      x: [0.6, 0.9, 0.9, 0.6],
      y: [0.6, 0.6, 0.9, 0.9],
    };
    const objects = [fragment1, fragment2];
    const labelsMap = new Map([[41, 'Coral Fragment']]);

    // Focused on fragment1 (21060), running whole_image scope
    const insidePred = {
      x: [0.2, 0.3, 0.25],
      y: [0.2, 0.2, 0.3],
      parent_id: null,
    };
    const outsidePred = {
      x: [0.7, 0.8, 0.75],
      y: [0.1, 0.1, 0.2], // outside both fragments
      parent_id: null,
    };
    const otherFragPred = {
      x: [0.7, 0.8, 0.75],
      y: [0.7, 0.7, 0.8], // inside fragment2
      parent_id: null,
    };
    const explicitParentPred = {
      x: [0.7, 0.8, 0.75],
      y: [0.1, 0.1, 0.2],
      parent_id: 9999, // explicit parent preserved
    };

    // 1. Prediction inside focused fragment resolves to 21060
    expect(resolveParentContourId(insidePred, {
      focusedContourId: 21060,
      scope: 'whole_image',
      objects,
      labelsMap,
    })).toBe(21060);

    // 2. Prediction outside focused fragment must NOT be attached to 21060
    expect(resolveParentContourId(outsidePred, {
      focusedContourId: 21060,
      scope: 'whole_image',
      objects,
      labelsMap,
    })).toBe(null);

    // 3. Prediction inside another fragment attaches to that containing fragment
    expect(resolveParentContourId(otherFragPred, {
      focusedContourId: 21060,
      scope: 'whole_image',
      objects,
      labelsMap,
    })).toBe(21061);

    // 4. Valid explicit prediction parent is honored when no conflicting hierarchy is present
    expect(resolveParentContourId(explicitParentPred, {
      focusedContourId: 21060,
      scope: 'whole_image',
      objects,
      labelsMap,
    })).toBe(9999);
  });

  it('validates frontend-inferred parents against dataset label ancestry and rejects unrelated containing fragments', () => {
    const { resolveParentContourId } = require('./cellposePreviewModel');

    const fragment = {
      id: 'frag-1',
      contour_id: 21060,
      labelId: 10,
      label: 'Coral Fragment',
      x: [0.0, 1.0, 1.0, 0.0],
      y: [0.0, 0.0, 1.0, 1.0],
    };
    const debris = {
      id: 'deb-1',
      contour_id: 21070,
      labelId: 99,
      label: 'Debris',
      x: [0.1, 0.9, 0.9, 0.1],
      y: [0.1, 0.1, 0.9, 0.9],
    };
    const objects = [fragment, debris];

    // Case 1: Root-level polyp (parent_id is null in dataset)
    // Even though it is physically inside "Coral Fragment", it must NOT be assigned to it!
    const rootPolypDatasetLabels = [
      { id: 43, name: 'Coral Polyp', parent_id: null },
      { id: 10, name: 'Coral Fragment', parent_id: null },
      { id: 99, name: 'Debris', parent_id: null },
    ];
    const rootPolypPred = {
      label_id: 43,
      x: [0.4, 0.6, 0.5],
      y: [0.4, 0.4, 0.6],
      parent_id: null,
    };
    expect(resolveParentContourId(rootPolypPred, {
      objects,
      datasetLabels: rootPolypDatasetLabels,
      scope: 'whole_image',
    })).toBe(null);

    // Case 2: Explicit parent on root-level polyp is invalidated and rejected
    const invalidExplicitPred = {
      label_id: 43,
      parent_id: 21060, // Coral Fragment
      x: [0.4, 0.6, 0.5],
      y: [0.4, 0.4, 0.6],
    };
    expect(resolveParentContourId(invalidExplicitPred, {
      objects,
      datasetLabels: rootPolypDatasetLabels,
      scope: 'whole_image',
    })).toBe(null);

    // Case 3: Nested polyp (parent_id is 10, Coral Fragment)
    // Successfully adopts the containing fragment based on valid ancestry
    const nestedPolypDatasetLabels = [
      { id: 43, name: 'Coral Polyp', parent_id: 10 },
      { id: 10, name: 'Coral Fragment', parent_id: null },
      { id: 99, name: 'Debris', parent_id: null },
    ];
    const nestedPolypPred = {
      label_id: 43,
      x: [0.4, 0.6, 0.5],
      y: [0.4, 0.4, 0.6],
      parent_id: null,
    };
    expect(resolveParentContourId(nestedPolypPred, {
      objects,
      datasetLabels: nestedPolypDatasetLabels,
      scope: 'whole_image',
    })).toBe(21060);

    // Case 4: Explicit valid parent is honored
    const validExplicitPred = {
      label_id: 43,
      parent_id: 21060,
      x: [0.4, 0.6, 0.5],
      y: [0.4, 0.4, 0.6],
    };
    expect(resolveParentContourId(validExplicitPred, {
      objects,
      datasetLabels: nestedPolypDatasetLabels,
      scope: 'whole_image',
    })).toBe(21060);
  });

  it('calculates polygon IoU with bounding box gating and grid sampling', () => {
    // Identical unit squares
    const a = { x: [0.1, 0.3, 0.3, 0.1], y: [0.1, 0.1, 0.3, 0.3] };
    const b = { x: [0.1, 0.3, 0.3, 0.1], y: [0.1, 0.1, 0.3, 0.3] };
    expect(calculatePolygonIoU(a, b)).toBe(1);

    // Completely disjoint
    const c = { x: [0.5, 0.7, 0.7, 0.5], y: [0.5, 0.5, 0.7, 0.7] };
    expect(calculatePolygonIoU(a, c)).toBe(0);

    // Adjacent / touching (shared edge x = 0.3)
    const d = { x: [0.3, 0.5, 0.5, 0.3], y: [0.1, 0.1, 0.3, 0.3] };
    expect(calculatePolygonIoU(a, d)).toBe(0);

    // Substantial overlap (>0.5 IoU): shift x from [0.1, 0.3] to [0.15, 0.35]
    // Width overlap = 0.15, Height overlap = 0.2, Intersection = 0.03, Union = 0.04 + 0.04 - 0.03 = 0.05, IoU = 0.6
    const e = { x: [0.15, 0.35, 0.35, 0.15], y: [0.1, 0.1, 0.3, 0.3] };
    const iou = calculatePolygonIoU(a, e);
    expect(iou).toBeGreaterThan(0.55);
    expect(iou).toBeLessThan(0.65);
  });

  it('filters existing polyps by labelId and scope parent matching', () => {
    const objects = [
      { id: 101, labelId: 43, parentId: 21060, x: [0.1, 0.2, 0.2], y: [0.1, 0.1, 0.2] }, // Polyp on coral 21060
      { id: 102, labelId: 43, parentId: 21061, x: [0.5, 0.6, 0.6], y: [0.5, 0.5, 0.6] }, // Polyp on coral 21061
      { id: 103, labelId: 41, parentId: null, x: [0.1, 0.9, 0.9], y: [0.1, 0.1, 0.9] },  // Coral outline (not a polyp)
      { id: 104, labelId: 43, parentId: null, x: [0.8, 0.9, 0.9], y: [0.8, 0.8, 0.9] },  // Root polyp
    ];

    // Fragment scope: only returns polyps belonging to target coral 21060
    const fragmentPolyps = getExistingPolypsForScope(objects, {
      targetParentIds: [21060],
      labelId: 43,
      scope: 'fragment',
    });
    expect(fragmentPolyps.map((o) => o.id)).toEqual([101]);

    // Whole image scope: returns all polyps with labelId 43 regardless of parent
    const wholePolyps = getExistingPolypsForScope(objects, {
      labelId: 43,
      scope: 'whole',
    });
    expect(wholePolyps.map((o) => o.id)).toEqual([101, 102, 104]);
  });

  it('suppresses overlapping predictions against existing annotations and intra-batch candidates', () => {
    // Existing polyp at [0.1..0.3, 0.1..0.3]
    const existing = [
      { id: 1, labelId: 43, x: [0.1, 0.3, 0.3, 0.1], y: [0.1, 0.1, 0.3, 0.3] },
    ];

    const predictions = [
      // Pred 1: near-duplicate of existing polyp (IoU ~ 0.8), score 0.9
      { id: 'p1', score: 0.9, x: [0.11, 0.3, 0.3, 0.11], y: [0.1, 0.1, 0.3, 0.3] },
      // Pred 2: fresh polyp in a new location, score 0.85
      { id: 'p2', score: 0.85, x: [0.5, 0.7, 0.7, 0.5], y: [0.5, 0.5, 0.7, 0.7] },
      // Pred 3: near-duplicate of Pred 2 with lower score 0.7 (IoU ~ 0.9 with p2)
      { id: 'p3', score: 0.7, x: [0.51, 0.7, 0.7, 0.51], y: [0.5, 0.5, 0.7, 0.7] },
      // Pred 4: adjacent to Pred 2 (touching at x = 0.7, IoU = 0), score 0.65
      { id: 'p4', score: 0.65, x: [0.7, 0.9, 0.9, 0.7], y: [0.5, 0.5, 0.7, 0.7] },
    ];

    const result = suppressOverlappingPredictions(predictions, existing, { iouThreshold: 0.5 });
    // p1 suppressed by existing (IoU > 0.5)
    // p2 kept (no overlap)
    // p3 suppressed by p2 (intra-batch IoU > 0.5, p2 has higher score)
    // p4 kept (adjacent, IoU = 0 < 0.5)
    expect(result.kept.map((p) => p.id)).toEqual(['p2', 'p4']);
    expect(result.suppressedCount).toBe(2);
  });
});


