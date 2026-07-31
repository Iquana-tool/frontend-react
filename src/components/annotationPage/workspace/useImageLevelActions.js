import { useCallback, useState } from 'react';
import {
  useAnnotationStatus,
  useSetAnnotationStatus,
  useClearSelection,
  useClearObjects,
  useCurrentImageId,
  useCurrentMaskId,
} from '../../../stores/selectors/annotationSelectors';
import { useToast } from '../../../contexts/ToastContext';
import * as api from '../../../api';

/**
 * Image-level annotation actions, lifted out of the old left-sidebar
 * StatusSection so the app menu, the right-panel footer and the review banner
 * can all trigger the same operations.
 *
 * Behaviour is unchanged from the original, with two deliberate differences:
 * failures surface as toasts instead of `alert()`, matching the rest of the
 * workspace, and the destructive confirm is left to the caller so it can be
 * presented in-context rather than through `window.confirm`.
 */
export default function useImageLevelActions() {
  const status = useAnnotationStatus();
  const setAnnotationStatus = useSetAnnotationStatus();
  const clearSelection = useClearSelection();
  const clearObjects = useClearObjects();
  const currentImageId = useCurrentImageId();
  const currentMaskId = useCurrentMaskId();
  const { addToast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);

  // Lightweight refresh — GET /masks/{id}/status only, never refetches contours.
  const refreshStatus = useCallback(async () => {
    if (!currentMaskId) return;
    try {
      const response = await api.getMaskAnnotationStatus(currentMaskId);
      if (response.success) setAnnotationStatus(response.status);
    } catch (error) {
      console.error('[workspace] Failed to refresh mask status:', error);
    }
  }, [currentMaskId, setAnnotationStatus]);

  const removeAllAnnotations = useCallback(async () => {
    if (!currentImageId) return;
    setIsProcessing(true);
    try {
      // The mask id is cached from SESSION_INITIALIZED, so no fetch is needed.
      if (currentMaskId) await api.deleteAllContours(currentMaskId);
      clearObjects();
      clearSelection();
      setAnnotationStatus('not_started');
      addToast({ type: 'success', message: 'All annotations removed.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: `Failed to remove annotations: ${error.message || 'Unknown error'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentImageId, currentMaskId, clearObjects, clearSelection, setAnnotationStatus, addToast]);

  const markAsFullyAnnotated = useCallback(async () => {
    if (!currentMaskId) return;
    setIsProcessing(true);
    try {
      await api.markMaskAsFinal(currentMaskId);
      await refreshStatus();
      addToast({ type: 'success', message: 'Image marked as fully annotated.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: `Failed to mark as fully annotated: ${error.message || 'Unknown error'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentMaskId, refreshStatus, addToast]);

  const unmarkAsFullyAnnotated = useCallback(async () => {
    if (!currentMaskId) return;
    setIsProcessing(true);
    try {
      await api.markMaskAsUnfinished(currentMaskId);
      await refreshStatus();
      addToast({ type: 'success', message: 'Image reopened for annotation.' });
    } catch (error) {
      addToast({
        type: 'error',
        message: `Failed to unmark: ${error.message || 'Unknown error'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentMaskId, refreshStatus, addToast]);

  return {
    status,
    isReviewable: status === 'reviewable' || status === 'finished',
    isProcessing,
    hasMask: !!currentMaskId,
    removeAllAnnotations,
    markAsFullyAnnotated,
    unmarkAsFullyAnnotated,
  };
}
