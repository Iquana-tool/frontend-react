/**
 * Splitting and merging whole objects (GitHub #42, via #43 and #44).
 *
 * Both operations are expressed with the annotation session's existing messages —
 * modify, add, delete — because the backend has no split/merge endpoint. Two
 * consequences shape the order of the calls below and are worth stating plainly:
 *
 * 1. **The surviving object is one of the originals, reshaped.** Deleting a contour
 *    cascades: `Contours.parent_id` and `AnnotationRejections.contour_id` are both
 *    ON DELETE CASCADE, so delete-then-recreate would take the object's children and
 *    its rejection history with it. Reshaping the original in place keeps its id,
 *    and with it every child and every rejection that refers to it. A split
 *    therefore produces one *new* object (the smaller half) rather than two, and a
 *    merge dissolves all but the largest of the selection.
 * 2. **New geometry is added only after the old geometry is out of the way.**
 *    `ContourHierarchy.add_contour` fits an incoming contour around every other
 *    contour on its level, so an object added while it still overlaps its source
 *    would come back clipped to nothing.
 *
 * What still needs the backend, and is deliberately not faked here: dropping the
 * review approvals on changed geometry (the modify handler refuses `reviewed_by`
 * from a client), and a composite undo — the history records the modify, the add
 * and the delete as separate steps, so undo walks back through them one at a time.
 */
import annotationSession from '../services/annotationSession';
import { fetchMaskRejections, resolveRejection } from '../api/reviews';
import { splitContourByLine, polygonArea } from './contourEditing';
import { unionContours } from './contourUnion';
import { pixelArrayToNormalized } from './coordinateUtils';
import { isPointInPolygon } from './geometryUtils';
import { hasValidLabel } from '../stores/utils/labelValidation';

/** Why a split was refused, in the words the annotator needs to act on. */
const SPLIT_MESSAGES = {
  contour: 'This object has no usable outline to split.',
  line: 'Draw a line across the object to split it.',
  crossings: 'That line leaves and re-enters the object. Draw a single stroke straight across it.',
  outside: 'That line misses the object. Draw it across the outline you want to cut.',
  ends: 'Both ends of the line landed on the same part of the outline. Draw right across the object.',
  degenerate: 'That line would cut off an empty sliver. Draw it further into the object.',
};

const MERGE_MESSAGES = {
  empty: 'Those outlines have nothing to merge.',
  disjoint: 'Those objects do not touch. Merging separate parts of an occluded object needs amodal merge, which is not available yet.',
  degenerate: 'The merged outline came out empty.',
};

/** Rejections a split closes, and the ones a merge closes. */
const SPLIT_FIXES = ['merged_objects'];
const MERGE_FIXES = ['duplicate_object', 'missing_parts'];

const toPixels = (object, image) =>
  object.x.map((x, i) => ({ x: x * image.width, y: object.y[i] * image.height }));

const toNormalized = (points, image) =>
  pixelArrayToNormalized(points.map((p) => p.x), points.map((p) => p.y), image.width, image.height);

const area = (object) =>
  Math.abs(polygonArea(object.x.map((x, i) => ({ x, y: object.y[i] }))));

/** The store keys a child to its parent's object id, which is the contour id. */
const childrenOf = (objectsList, object) =>
  objectsList.filter((candidate) =>
    candidate.parent_id != null &&
    (candidate.parent_id === object.id || candidate.parent_id === object.contour_id));

/** The contour id the backend assigned to a just-added object. */
const addedContourId = (response) => {
  let data = response?.data;
  if (Array.isArray(data)) data = Object.fromEntries(data);
  const raw = data?.id ?? data?.contour_id;
  return raw != null && typeof raw === 'string' && !isNaN(raw) ? Number(raw) : raw ?? null;
};

/** How many of a child's vertices fall inside `ring` ({x,y} normalized). */
const overlapWith = (child, ring) => {
  const polygon = ring.x.map((x, i) => [x, ring.y[i]]);
  let hits = 0;
  for (let i = 0; i < child.x.length; i++) {
    if (isPointInPolygon(child.x[i], child.y[i], polygon)) hits++;
  }
  return hits;
};

/**
 * Close the rejections this edit was the answer to.
 *
 * Best effort by design: the outline is already fixed by the time this runs, and
 * failing the whole operation over its bookkeeping would be worse than a rejection
 * that stays open one more review round.
 */
async function resolveFixedRejections(maskId, contourIds, reasons) {
  if (!maskId || contourIds.length === 0) return 0;
  try {
    const response = await fetchMaskRejections(maskId, true);
    const open = (response?.rejections || []).filter(
      (rejection) => contourIds.includes(rejection.contour_id) && reasons.includes(rejection.reason)
    );
    await Promise.all(open.map((rejection) => resolveRejection(rejection.id, 'fixed')));
    return open.length;
  } catch (error) {
    console.warn('[contourOperations] Could not resolve rejections for this edit:', error);
    return 0;
  }
}

/**
 * Split one object in two along a drawn line.
 *
 * The larger half stays on the original contour; the smaller becomes a new object
 * at the same level, with the same label. Children move to whichever half holds
 * most of them.
 *
 * @param {Object} params
 * @param {Object} params.object - the store object being split
 * @param {Array<Object>} params.objectsList - every object on the image (for children)
 * @param {Object} params.imageObject - the loaded image, for pixel conversion
 * @param {Array<{x:number,y:number}>} params.linePixel - the drawn line, in image pixels
 * @param {number|null} [params.maskId] - current mask, for closing its rejections
 * @param {Function} [params.updateObject] - store setter, for the optimistic redraw
 * @returns {Promise<{success: boolean, message: string, refused?: boolean}>}
 *   `refused` marks a rejection made before anything was saved, so the caller can
 *   keep the user in the drawing tool and let them try the stroke again.
 */
export async function splitObjectByLine({
  object,
  objectsList = [],
  imageObject,
  linePixel,
  maskId = null,
  updateObject = null,
}) {
  const contourId = object?.contour_id;
  if (contourId == null || !object?.x?.length || !imageObject) {
    return { success: false, refused: true, message: 'This object cannot be split.' };
  }
  if (!annotationSession.isReady()) {
    return { success: false, refused: true, message: 'Session is not ready yet. Please wait for the image to load.' };
  }

  const original = { x: [...object.x], y: [...object.y] };
  const result = splitContourByLine(toPixels(object, imageObject), linePixel);
  if (result.error) {
    // Refused before anything was sent: the caller can leave the user drawing.
    return { success: false, refused: true, message: SPLIT_MESSAGES[result.error] || 'That line cannot split this object.' };
  }

  const [keptHalf, newHalf] = result.halves.map((half) => toNormalized(half, imageObject));

  // 1. The original becomes the larger half — it keeps its id, children and history.
  if (updateObject) updateObject(object.id, { x: keptHalf.x, y: keptHalf.y, path: null });
  try {
    const response = await annotationSession.modifyObject(contourId, { x: keptHalf.x, y: keptHalf.y });
    if (response && response.success === false) throw new Error(response.message || 'Save rejected');
  } catch (error) {
    if (updateObject) updateObject(object.id, { ...original, path: null });
    return { success: false, message: error.message || 'Could not split this object.' };
  }

  // 2. The smaller half becomes a new object beside it, inheriting label and level.
  let newContourId = null;
  try {
    const response = await annotationSession.addObject(
      newHalf.x, newHalf.y, null, object.parent_id ?? null, 1.0, object.labelId ?? null
    );
    if (response && response.success === false) throw new Error(response.message || 'Save rejected');
    newContourId = addedContourId(response);
  } catch (error) {
    // Put the original outline back rather than leaving the object half-cut.
    if (updateObject) updateObject(object.id, { ...original, path: null });
    await annotationSession.modifyObject(contourId, original).catch(() => {});
    return { success: false, message: error.message || 'Could not add the second half. The object was left as it was.' };
  }

  // The object comes back over object_added carrying `label_id` but no label *name* —
  // the backend contour has no such field — so the new half would read as "Object"
  // until the next reload. It is the same label; say so.
  if (updateObject && newContourId != null && hasValidLabel(object.label)) {
    updateObject(newContourId, { label: object.label, labelId: object.labelId ?? null });
  }

  // 3. Children follow their geometry. Those still inside the kept half need no move.
  let moved = 0;
  if (newContourId != null) {
    for (const child of childrenOf(objectsList, object)) {
      if (!child.x?.length || child.contour_id == null) continue;
      if (overlapWith(child, newHalf) > overlapWith(child, keptHalf)) {
        try {
          await annotationSession.modifyObject(child.contour_id, { parent_id: newContourId });
          moved++;
        } catch (error) {
          console.warn('[contourOperations] Could not re-parent a child after the split:', error);
        }
      }
    }
  }

  const closed = await resolveFixedRejections(maskId, [contourId], SPLIT_FIXES);

  const notes = [];
  if (moved > 0) notes.push(`${moved} nested object${moved === 1 ? '' : 's'} moved`);
  if (closed > 0) notes.push('review feedback closed');
  return {
    success: true,
    newContourId,
    message: `Object split in two${notes.length ? ` (${notes.join(', ')})` : ''}.`,
  };
}

/**
 * Merge two or more touching or overlapping objects into one.
 *
 * The largest object survives and takes the union outline; the rest are deleted
 * after their children have been moved onto the survivor.
 *
 * @param {Object} params
 * @param {Array<Object>} params.objects - the selected store objects
 * @param {Array<Object>} params.objectsList - every object on the image (for children)
 * @param {Object} params.imageObject - the loaded image, for pixel conversion
 * @param {number|null} [params.maskId] - current mask, for closing its rejections
 * @param {Function} [params.updateObject] - store setter, for the optimistic redraw
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function mergeObjects({
  objects,
  objectsList = [],
  imageObject,
  maskId = null,
  updateObject = null,
}) {
  if (!Array.isArray(objects) || objects.length < 2) {
    return { success: false, message: 'Select at least two objects to merge.' };
  }
  if (!imageObject) {
    return { success: false, message: 'The image is not loaded yet.' };
  }
  if (objects.some((object) => object.contour_id == null || !(object.x?.length >= 3))) {
    return { success: false, message: 'One of the selected objects has no usable outline.' };
  }
  // Labels and parents have to agree: picking a winner for the annotator would be
  // guessing at which of two disagreeing answers was the right one.
  if (new Set(objects.map((object) => object.labelId ?? null)).size > 1) {
    return { success: false, message: 'Those objects have different labels. Give them the same label first, then merge.' };
  }
  if (new Set(objects.map((object) => object.parent_id ?? null)).size > 1) {
    return { success: false, message: 'Those objects sit under different parents. Only objects on the same branch can be merged.' };
  }
  if (!annotationSession.isReady()) {
    return { success: false, message: 'Session is not ready yet. Please wait for the image to load.' };
  }

  const union = unionContours(objects.map((object) => toPixels(object, imageObject)));
  if (union.error) {
    return { success: false, message: MERGE_MESSAGES[union.error] || 'Those objects could not be merged.' };
  }
  const merged = toNormalized(union.ring, imageObject);

  const ranked = [...objects].sort((a, b) => area(b) - area(a));
  const survivor = ranked[0];
  const dissolved = ranked.slice(1);
  const original = { x: [...survivor.x], y: [...survivor.y] };

  // 1. Children first: the delete below cascades through parent_id.
  let moved = 0;
  for (const object of dissolved) {
    for (const child of childrenOf(objectsList, object)) {
      if (child.contour_id == null) continue;
      try {
        await annotationSession.modifyObject(child.contour_id, { parent_id: survivor.contour_id });
        moved++;
      } catch (error) {
        return {
          success: false,
          message: 'Could not move a nested object onto the merged outline, so nothing was merged.',
        };
      }
    }
  }

  // 2. The survivor takes the union outline.
  if (updateObject) updateObject(survivor.id, { x: merged.x, y: merged.y, path: null });
  try {
    const response = await annotationSession.modifyObject(survivor.contour_id, { x: merged.x, y: merged.y });
    if (response && response.success === false) throw new Error(response.message || 'Save rejected');
  } catch (error) {
    if (updateObject) updateObject(survivor.id, { ...original, path: null });
    return { success: false, message: error.message || 'Could not merge those objects.' };
  }

  // 3. The rest are gone; the canvas drops them when object_removed comes back.
  for (const object of dissolved) {
    try {
      await annotationSession.deleteObject(object.contour_id);
    } catch (error) {
      console.warn('[contourOperations] Could not delete a merged object:', error);
    }
  }

  const closed = await resolveFixedRejections(
    maskId, objects.map((object) => object.contour_id), MERGE_FIXES
  );

  const notes = [];
  if (moved > 0) notes.push(`${moved} nested object${moved === 1 ? '' : 's'} moved`);
  if (closed > 0) notes.push('review feedback closed');
  return {
    success: true,
    survivorContourId: survivor.contour_id,
    message: `${objects.length} objects merged into one${notes.length ? ` (${notes.join(', ')})` : ''}.`,
  };
}
