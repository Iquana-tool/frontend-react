import annotationSession from '../services/annotationSession';
import { getContourId } from './objectUtils';

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

