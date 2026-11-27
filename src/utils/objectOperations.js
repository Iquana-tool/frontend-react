import annotationSession from '../services/annotationSession';
import { getContourId } from './objectUtils';

/**
 * Deletes several objects in ONE request rather than one per object: the backend
 * removes them in one transaction, records one undo step and sends one
 * OBJECT_REMOVED listing them all. One request per object took a commit and a
 * hierarchy rebuild each, which made "Discard all unreviewed" take minutes.
 *
 * @param {Array<Object>} objects - The objects to delete
 * @returns {Promise<void>}
 */
export async function deleteObjects(objects) {
  const contourIds = [...new Set((objects || []).map(getContourId).filter((id) => id != null))];
  if (contourIds.length === 0) return;
  // One object keeps the single-id form, so a backend without bulk delete still works for it.
  if (contourIds.length === 1) {
    await annotationSession.deleteObject(contourIds[0]);
    return;
  }
  await annotationSession.deleteObjects(contourIds);
}

/**
 * Sends a delete request for an object to the backend. The canvas is updated only
 * when the backend broadcasts OBJECT_REMOVED (handled by useWebSocketObjectHandler).
 *
 * @param {Object} object - The object to delete
 * @param {Function} removeObject - Unused; kept for API compatibility. Removal happens on object_removed.
 * @returns {Promise<void>}
 */
export async function deleteObject(object, removeObject) {
  if (!object) {
    throw new Error('Object is required');
  }

  const contourId = getContourId(object);

  // Delete on backend; store/canvas is updated when we receive object_removed
  await annotationSession.deleteObject(contourId);
}

