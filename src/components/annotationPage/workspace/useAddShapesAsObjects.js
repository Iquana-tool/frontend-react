import { useCallback, useMemo, useState } from 'react';
import annotationSession from '../../../services/annotationSession';
import { pixelArrayToNormalized } from '../../../utils/coordinateUtils';
import { useToast } from '../../../contexts/ToastContext';
import {
  useAIPrompts,
  useImageObject,
  useClearAllPrompts,
  useFocusedParentContourId,
} from '../../../stores/selectors/annotationSelectors';

/**
 * Converts a drawn prompt into image-space contour arrays.
 * Points cannot become a contour and are skipped.
 */
const promptToContour = (prompt) => {
  if (prompt.type === 'box') {
    const { x1, y1, x2, y2 } = prompt.coords;
    return { x: [x1, x2, x2, x1], y: [y1, y1, y2, y2] };
  }
  if (prompt.type === 'polygon') {
    const points = prompt.coords.points || [];
    if (points.length < 3) return null;
    return { x: points.map((p) => p.x), y: points.map((p) => p.y) };
  }
  return null;
};

/**
 * Commits drawn shapes straight to objects, bypassing the model — the
 * behaviour the old "Add as object" button provided, and what AI assist being
 * off now means for a box drawn on the prompt canvas.
 *
 * When a contour is focused, new objects are nested under it, which is how
 * nested labelling works everywhere else in the editor.
 */
export default function useAddShapesAsObjects() {
  const prompts = useAIPrompts();
  const imageObject = useImageObject();
  const clearAllPrompts = useClearAllPrompts();
  const parentContourId = useFocusedParentContourId();
  const { addToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const shapePrompts = useMemo(
    () => prompts.filter((prompt) => prompt.type === 'box' || prompt.type === 'polygon'),
    [prompts]
  );

  const addShapes = useCallback(async () => {
    if (!imageObject || shapePrompts.length === 0 || isAdding) return;

    setIsAdding(true);
    try {
      if (!annotationSession.isReady()) {
        throw new Error('Session is not ready yet. Please wait for the image to load.');
      }

      let added = 0;
      for (const prompt of shapePrompts) {
        const contour = promptToContour(prompt);
        if (!contour) continue;
        const normalized = pixelArrayToNormalized(
          contour.x,
          contour.y,
          imageObject.width,
          imageObject.height
        );
        // Sequential: each add is acknowledged individually over the socket.
        // eslint-disable-next-line no-await-in-loop
        await annotationSession.addObject(normalized.x, normalized.y, null, parentContourId);
        added += 1;
      }

      clearAllPrompts();
      addToast({
        type: 'success',
        message: added === 1 ? 'Added 1 annotation as an object' : `Added ${added} annotations as objects`,
      });
    } catch (error) {
      console.error('[workspace] Failed to add shapes as objects:', error);
      addToast({ type: 'error', message: error.message || 'Failed to add as object' });
    } finally {
      setIsAdding(false);
    }
  }, [imageObject, shapePrompts, isAdding, parentContourId, clearAllPrompts, addToast]);

  return { shapeCount: shapePrompts.length, isAdding, addShapes };
}
