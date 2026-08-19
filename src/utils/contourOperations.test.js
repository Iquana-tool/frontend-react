import { splitObjectByLine, mergeObjects } from './contourOperations';

const { calls, session, reviews } = vi.hoisted(() => {
  const calls = [];
  return {
    calls,
    session: {
      ready: true,
      isReady: () => session.ready,
      modifyObject: async (contourId, fields) => {
        calls.push(['modify', contourId, fields]);
        return { success: true };
      },
      addObject: async (x, y, label, parentId, confidence, labelId) => {
        calls.push(['add', { parentId, labelId, points: x.length }]);
        return { success: true, data: { id: 99 } };
      },
      deleteObject: async (contourId) => {
        calls.push(['delete', contourId]);
      },
    },
    reviews: {
      open: [],
      fetchMaskRejections: async () => ({ rejections: reviews.open }),
      resolveRejection: async (id, resolution) => {
        calls.push(['resolve', id, resolution]);
        return {};
      },
    },
  };
});

vi.mock('./../services/annotationSession', () => ({ default: session }));
vi.mock('./../api/reviews', () => reviews);

const image = { width: 100, height: 100 };

/** A dense normalized rectangle, as the store holds one. */
const box = (x0, y0, x1, y1, step = 0.02) => {
  const x = [];
  const y = [];
  const push = (px, py) => { x.push(px); y.push(py); };
  for (let px = x0; px < x1; px += step) push(px, y0);
  for (let py = y0; py < y1; py += step) push(x1, py);
  for (let px = x1; px > x0; px -= step) push(px, y1);
  for (let py = y1; py > y0; py -= step) push(x0, py);
  return { x, y };
};

const objectAt = (id, x0, y0, x1, y1, extra = {}) => ({
  id,
  contour_id: id,
  label: 'Coral',
  labelId: 7,
  parent_id: null,
  ...box(x0, y0, x1, y1),
  ...extra,
});

const kinds = () => calls.map((call) => call[0]);

beforeEach(() => {
  calls.length = 0;
  session.ready = true;
  reviews.open = [];
});

describe('splitObjectByLine', () => {
  test('reshapes the original into the larger half and adds the smaller one', async () => {
    const object = objectAt(1, 0.1, 0.1, 0.9, 0.9);
    const result = await splitObjectByLine({
      object,
      objectsList: [object],
      imageObject: image,
      // Off-centre, so the left half is unambiguously the larger one.
      linePixel: [{ x: 70, y: 5 }, { x: 70, y: 95 }],
    });

    expect(result.success).toBe(true);
    expect(kinds()).toEqual(['modify', 'add']);
    expect(calls[0][1]).toBe(1); // the original contour, reshaped in place
    // The new half inherits the label and the level rather than arriving unlabelled.
    expect(calls[1][1]).toMatchObject({ parentId: null, labelId: 7 });
  });

  test('moves a nested object onto the half that now contains it', async () => {
    const object = objectAt(1, 0.1, 0.1, 0.9, 0.9);
    const child = objectAt(2, 0.75, 0.4, 0.85, 0.6, { parent_id: 1 });

    await splitObjectByLine({
      object,
      objectsList: [object, child],
      imageObject: image,
      linePixel: [{ x: 70, y: 5 }, { x: 70, y: 95 }],
    });

    expect(kinds()).toEqual(['modify', 'add', 'modify']);
    expect(calls[2]).toEqual(['modify', 2, { parent_id: 99 }]);
  });

  test('leaves a nested object where it is when the kept half still holds it', async () => {
    const object = objectAt(1, 0.1, 0.1, 0.9, 0.9);
    const child = objectAt(2, 0.2, 0.4, 0.3, 0.6, { parent_id: 1 });

    await splitObjectByLine({
      object,
      objectsList: [object, child],
      imageObject: image,
      linePixel: [{ x: 70, y: 5 }, { x: 70, y: 95 }],
    });

    expect(kinds()).toEqual(['modify', 'add']);
  });

  test('closes the merged-objects rejection that asked for the split', async () => {
    const object = objectAt(1, 0.1, 0.1, 0.9, 0.9);
    reviews.open = [
      { id: 5, contour_id: 1, reason: 'merged_objects' },
      { id: 6, contour_id: 1, reason: 'bad_outline' },
      { id: 7, contour_id: 2, reason: 'merged_objects' },
    ];

    await splitObjectByLine({
      object,
      objectsList: [object],
      imageObject: image,
      linePixel: [{ x: 70, y: 5 }, { x: 70, y: 95 }],
      maskId: 3,
    });

    expect(calls.filter((call) => call[0] === 'resolve')).toEqual([['resolve', 5, 'fixed']]);
  });

  test('refuses a bad line without touching the session', async () => {
    const object = objectAt(1, 0.1, 0.1, 0.9, 0.9);
    const result = await splitObjectByLine({
      object,
      objectsList: [object],
      imageObject: image,
      linePixel: [{ x: 500, y: 5 }, { x: 500, y: 95 }],
    });

    expect(result.success).toBe(false);
    expect(result.refused).toBe(true);
    expect(calls).toEqual([]);
  });
});

describe('mergeObjects', () => {
  const bigger = () => objectAt(1, 0.1, 0.1, 0.6, 0.9);
  const smaller = () => objectAt(2, 0.5, 0.3, 0.8, 0.7);

  test('gives the union to the largest object and deletes the rest', async () => {
    const objects = [smaller(), bigger()];
    const result = await mergeObjects({ objects, objectsList: objects, imageObject: image });

    expect(result.success).toBe(true);
    expect(kinds()).toEqual(['modify', 'delete']);
    expect(calls[0][1]).toBe(1); // the larger object survives
    expect(calls[1]).toEqual(['delete', 2]);
  });

  test('moves nested objects onto the survivor before the cascade can eat them', async () => {
    const objects = [smaller(), bigger()];
    const child = objectAt(3, 0.7, 0.4, 0.75, 0.5, { parent_id: 2 });
    const result = await mergeObjects({
      objects,
      objectsList: [...objects, child],
      imageObject: image,
    });

    expect(result.success).toBe(true);
    expect(kinds()).toEqual(['modify', 'modify', 'delete']);
    expect(calls[0]).toEqual(['modify', 3, { parent_id: 1 }]);
  });

  test('refuses a disjoint selection and names the route that would work', async () => {
    const objects = [objectAt(1, 0.1, 0.1, 0.2, 0.2), objectAt(2, 0.7, 0.7, 0.9, 0.9)];
    const result = await mergeObjects({ objects, objectsList: objects, imageObject: image });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/amodal/i);
    expect(calls).toEqual([]);
  });

  test('refuses a selection whose labels or parents disagree', async () => {
    const mismatchedLabel = [bigger(), objectAt(2, 0.5, 0.3, 0.8, 0.7, { labelId: 8 })];
    expect((await mergeObjects({
      objects: mismatchedLabel, objectsList: mismatchedLabel, imageObject: image,
    })).message).toMatch(/different labels/i);

    const mismatchedParent = [bigger(), objectAt(2, 0.5, 0.3, 0.8, 0.7, { parent_id: 4 })];
    expect((await mergeObjects({
      objects: mismatchedParent, objectsList: mismatchedParent, imageObject: image,
    })).message).toMatch(/different parents/i);

    expect(calls).toEqual([]);
  });

  test('refuses a selection of one', async () => {
    const objects = [bigger()];
    expect((await mergeObjects({ objects, objectsList: objects, imageObject: image })).success)
      .toBe(false);
    expect(calls).toEqual([]);
  });
});
