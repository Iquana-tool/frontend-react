import annotationSession from '../services/annotationSession';
import { getContourId } from './objectUtils';

/**
 * Deletes an object from both backend and store
 * 
 * @param {Object} object - The object to delete
 * @param {Function} removeObject - Function to remove object from store
 * @returns {Promise<void>}
 */
export async function deleteObject(object, removeObject) {
  if (!object) {
    throw new Error('Object is required');
  }

  const contourId = getContourId(object);

  // Delete from backend
  await annotationSession.deleteObject(contourId);

  // Remove from store
  removeObject(object.id);
}

