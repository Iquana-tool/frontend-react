/**
 * The object timeline of a stack: which slices each label's objects sit on.
 *
 * Objects are per frame -- an object on slice 12 and one on slice 13 are two
 * rows in the database, with nothing saying they are the same lesion. Until
 * objects become tracks across slices (with propagation, #121), the timeline
 * groups by label: one lane per label, one cell per slice. That still answers
 * what the timeline is for -- where in the volume something was found, and where
 * the AI's suggestions still wait for a look.
 */

/** Whether an object was drawn by a person rather than suggested by a model. */
const isManual = (object) => {
  if (object.origin) return object.origin === 'manual' || object.origin === 'import';
  return !object.added_by || /^user$/i.test(object.added_by);
};

/**
 * `confirmed` once someone reviewed it, `drawn` for a person's outline,
 * `suggested` for a model's that nobody has looked at yet.
 */
export const objectKind = (object) => {
  if (object.reviewed) return 'confirmed';
  return isManual(object) ? 'drawn' : 'suggested';
};

/** What a cell shows when it holds several objects: the one that needs a look wins. */
const KIND_PRIORITY = { suggested: 3, drawn: 2, confirmed: 1 };

/**
 * Bring the current slice's live objects into the shape the stack endpoint uses,
 * so edits on the canvas show in the timeline before any refetch.
 */
export const liveObjectsAsStackObjects = (objects, frameIndex, imageId) =>
  objects.map((object) => ({
    contour_id: object.contour_id ?? object.id,
    image_id: imageId,
    frame_index: frameIndex,
    label_id: object.labelId ?? null,
    parent_id: object.parent_id ?? null,
    origin: object.origin ?? null,
    added_by: object.added_by ?? null,
    reviewed: (object.reviewed_by?.length ?? 0) > 0,
    x: object.x,
    y: object.y,
  }));

/**
 * The stack's objects with the current slice's replaced by what the canvas holds.
 *
 * The server's copy of the current slice goes stale the moment someone draws on
 * it; the store's does not.
 */
export const mergeCurrentFrame = (stackObjects, frameIndex, liveObjects, imageId) => [
  ...stackObjects.filter((object) => object.frame_index !== frameIndex),
  ...liveObjectsAsStackObjects(liveObjects, frameIndex, imageId),
];

/**
 * @param {Object} args
 * @param {number} args.frameCount
 * @param {Array<Object>} args.objects - Stack objects (`{frame_index, label_id, origin, added_by, reviewed}`).
 * @param {Array<Object>} args.labels - Dataset labels (`{id, name}`).
 * @returns {{ lanes: Array<Object>, perFrame: number[], total: number }}
 *   `lanes`: one per label in order of first appearance, each with `cells` (one per
 *   frame: `null` or `{count, kind}`), `first`/`last` (0-based) and `slices` covered.
 *   `perFrame`: object count on each frame.
 */
export const buildTimeline = ({ frameCount, objects, labels = [] }) => {
  const nameOf = new Map(labels.map((label) => [String(label.id), label.name]));
  const perFrame = new Array(frameCount).fill(0);
  const lanesByLabel = new Map();

  for (const object of objects) {
    const index = object.frame_index;
    if (index == null || index < 0 || index >= frameCount) continue;
    perFrame[index] += 1;

    const key = object.label_id == null ? 'none' : String(object.label_id);
    if (!lanesByLabel.has(key)) {
      lanesByLabel.set(key, {
        key,
        labelId: object.label_id ?? null,
        name: object.label_id == null ? 'Unlabelled' : (nameOf.get(key) || `Label ${key}`),
        cells: new Array(frameCount).fill(null),
      });
    }
    const lane = lanesByLabel.get(key);
    const kind = objectKind(object);
    const cell = lane.cells[index];
    if (!cell) {
      lane.cells[index] = { count: 1, kind };
    } else {
      cell.count += 1;
      if (KIND_PRIORITY[kind] > KIND_PRIORITY[cell.kind]) cell.kind = kind;
    }
  }

  const lanes = [...lanesByLabel.values()].map((lane) => {
    const covered = lane.cells.map((cell, index) => (cell ? index : -1)).filter((index) => index > -1);
    return {
      ...lane,
      first: covered[0],
      last: covered[covered.length - 1],
      slices: covered.length,
      toCheck: lane.cells.filter((cell) => cell?.kind === 'suggested').length,
    };
  });
  lanes.sort((a, b) => a.first - b.first || a.name.localeCompare(b.name));

  return { lanes, perFrame, total: objects.length };
};

/** "18–30" for a span of 0-based frame indices, shown 1-based. */
export const formatSpan = (first, last) =>
  first === last ? `${first + 1}` : `${first + 1}–${last + 1}`;

/** The frames with something the AI suggested that nobody has checked, in order. */
export const framesToCheck = (timeline) => {
  const frames = new Set();
  for (const lane of timeline.lanes) {
    lane.cells.forEach((cell, index) => {
      if (cell?.kind === 'suggested') frames.add(index);
    });
  }
  return [...frames].sort((a, b) => a - b);
};

/**
 * Outlines to draw dashed from the slices next to the current one.
 *
 * With an object selected, only that object's label -- "does this continue
 * above and below?". With nothing selected, everything on the neighbouring
 * slices, which is what an annotator scrolling through wants to see coming.
 *
 * @returns {Array<Object>} stack objects, each with `offset` -1 or +1.
 */
export const neighbourOutlines = (objects, frameIndex, labelId = undefined) =>
  objects
    .filter((object) => Math.abs(object.frame_index - frameIndex) === 1)
    .filter((object) => labelId === undefined || String(object.label_id) === String(labelId))
    .map((object) => ({ ...object, offset: object.frame_index - frameIndex }));
