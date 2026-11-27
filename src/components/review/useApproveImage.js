import { useCallback } from 'react';
import { approveMask } from '../../api/reviews';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getContourId } from '../../utils/objectUtils';
import {
  useCurrentMaskId,
  useObjectsList,
  useUpdateObject,
} from '../../stores/selectors/annotationSelectors';

/**
 * Approve every pending object of the image open in the editor.
 *
 * The one image-level "approve" for both the plain Review tab and a review
 * session, so the two cannot drift apart again. The approval is a REST call, so
 * the store is patched from its response rather than waiting for a socket echo.
 *
 * @returns {(options?: {includeReviewed?: boolean}) => Promise<Object|null>} Resolves
 *   with the server response, or null when no mask is open. Rejects on failure.
 */
export default function useApproveImage() {
  const maskId = useCurrentMaskId();
  const objects = useObjectsList();
  const updateObject = useUpdateObject();
  const { user } = useAuth();
  const { addToast } = useToast();

  return useCallback(
    async ({ includeReviewed = false } = {}) => {
      if (!maskId) return null;
      const response = await approveMask(maskId, { includeReviewed });

      const approved = new Set((response?.approved || []).map(Number));
      const reviewer = user?.username;
      objects.forEach((object) => {
        if (!approved.has(Number(getContourId(object)))) return;
        const reviewers = new Set(object.reviewed_by || []);
        if (reviewer) reviewers.add(reviewer);
        updateObject(object.id, { reviewed_by: [...reviewers] });
      });

      if (response?.skipped?.length) {
        // Separation of duties: the caller's own objects need another reviewer.
        addToast({
          type: 'error',
          message: `${response.skipped.length} of your own annotations were not self-approved; another reviewer has to look at those.`,
        });
      }
      return response;
    },
    [maskId, objects, updateObject, user, addToast]
  );
}
