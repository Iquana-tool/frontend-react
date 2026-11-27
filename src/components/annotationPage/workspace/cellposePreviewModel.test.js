import { describe, expect, it } from 'vitest';
import {
  extractPreviewPredictions,
  toAcceptedContour,
  calculatePolygonIoU,
  getExistingObjectsForScope,
  suppressOverlappingPredictions,
} from './cellposePreviewModel';

describe('Concept prediction geometry and persistence', () => {
  it('prioritizes explicit surface ROI over containing focused fragment in resolveParentContourId', () => {
    const { resolveParentContourId } = require('./cellposePreviewModel');
    const objects = [
      { id: 21060, contour_id: 21060, labelId: 41, x: [0.1, 0.9, 0.9, 0.1], y: [0.1, 0.1, 0.9, 0.9] },
      { id: 21062, contour_id: 21062, labelId: 42, parent_id: 21060, x: [0.2, 0.5, 0.5, 0.2], y: [0.2, 0.2, 0.5, 0.5] },
      { id: 21063, contour_id: 21063, labelId: 42, parent_id: 21060, x: [0.6, 0.8, 0.8, 0.6], y: [0.6, 0.6, 0.8, 0.8] },
    ];
    const datasetLabels = [
      { id: 41, name: 'Coral Fragment', parent_id: null },
      { id: 42, name: 'Coral Surface', parent_id: 41 },
      { id: 43, name: 'Coral Polyp', parent_id: 42 },
    ];
    const pred = {
      label_id: 43,
      x: [0.3, 0.4, 0.4, 0.3],
      y: [0.3, 0.3, 0.4, 0.4],
      parent_id: null,
    };

    const parentId = resolveParentContourId(pred, {
      focusedContourId: 21060,
      roiContourIds: [21062],
      scope: 'hierarchy',
      objects,
      datasetLabels,
    });
    expect(parentId).toBe(21062);
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

  it('preserves model_class and maps it through extractPreviewPredictions and toAcceptedContour', () => {
    const predictions = extractPreviewPredictions([{
      image_id: 385,
      predictions: {
        contours: [{
          x: [0.1, 0.8, 0.6],
          y: [0.2, 0.3, 0.9],
          label_id: 47,
          model_class: 'acropora',
          source_instance_id: 'mask-species-1',
        }],
      },
    }], 9);

    expect(predictions).toHaveLength(1);
    expect(predictions[0].model_class).toBe('acropora');
    const accepted = toAcceptedContour(predictions[0], 100, 50);
    expect(accepted.modelClass).toBe('acropora');
    expect(accepted.model_class).toBe('acropora');
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
    const fragmentPolyps = getExistingObjectsForScope(objects, {
      targetParentIds: [21060],
      labelId: 43,
      scope: 'hierarchy',
    });
    expect(fragmentPolyps.map((o) => o.id)).toEqual([101]);

    // Whole image scope: returns all polyps with labelId 43 regardless of parent
    const wholePolyps = getExistingObjectsForScope(objects, {
      labelId: 43,
      scope: 'image',
    });
    expect(wholePolyps.map((o) => o.id)).toEqual([101, 102, 104]);
  });

  it('includes polyps nested below surfaces of the selected fragment', () => {
    const objects = [
      { id: 10, labelId: 41, parent_id: null },
      { id: 20, labelId: 42, parent_id: 10 },
      { id: 30, labelId: 43, parent_id: 20 },
      { id: 40, labelId: 41, parent_id: null },
      { id: 50, labelId: 43, parent_id: 40 },
    ];
    expect(getExistingObjectsForScope(objects, {
      targetParentIds: new Set([10]), labelId: 43, scope: 'hierarchy',
    }).map((object) => object.id)).toEqual([30]);
  });

  it('terminates safely when an object parent chain cycles', () => {
    const objects = [
      { id: 20, labelId: 42, parent_id: 30 },
      { id: 30, labelId: 43, parent_id: 20 },
    ];
    expect(getExistingObjectsForScope(objects, {
      targetParentIds: new Set([10]), labelId: 43, scope: 'hierarchy',
    })).toEqual([]);
  });

  it.each([
    ['smaller contained outline', [0.15, 0.2, 0.2, 0.15], [0.15, 0.15, 0.2, 0.2]],
    ['larger containing outline', [0.05, 0.4, 0.4, 0.05], [0.05, 0.05, 0.4, 0.4]],
    ['shifted outline', [0.22, 0.42, 0.42, 0.22], [0.1, 0.1, 0.3, 0.3]],
  ])('suppresses a %s from a second model despite low IoU', (_name, x, y) => {
    const existing = { x: [0.1, 0.3, 0.3, 0.1], y: [0.1, 0.1, 0.3, 0.3] };
    const prediction = { x, y, confidence: 0.9 };
    const before = JSON.stringify(existing);
    expect(calculatePolygonIoU(prediction, existing)).toBeLessThan(0.5);
    expect(suppressOverlappingPredictions([prediction], [existing])).toEqual({
      kept: [], suppressedCount: 1,
    });
    expect(JSON.stringify(existing)).toBe(before);
  });

  it('preserves distinct nearby polyps with only slight edge overlap', () => {
    const existing = { x: [0.1, 0.3, 0.3, 0.1], y: [0.1, 0.1, 0.3, 0.3] };
    const adjacent = { x: [0.28, 0.48, 0.48, 0.28], y: [0.1, 0.1, 0.3, 0.3] };
    expect(suppressOverlappingPredictions([adjacent], [existing])).toEqual({
      kept: [adjacent], suppressedCount: 0,
    });
    // The stricter existing-annotation policy must not alter normal intra-batch NMS.
    const shifted = { x: [0.22, 0.42, 0.42, 0.22], y: [0.1, 0.1, 0.3, 0.3] };
    expect(suppressOverlappingPredictions([existing, shifted], []).kept).toHaveLength(2);
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

