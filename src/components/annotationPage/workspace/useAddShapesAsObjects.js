import { useCallback, useMemo, useState } from 'react';
import annotationSession from '../../../services/annotationSession';
import { pixelArrayToNormalized } from '../../../utils/coordinateUtils';
import { useToast } from '../../../contexts/ToastContext';
import { ADDABLE_PROMPT_TYPES } from './toolModel';
import {
  useAIPrompts,
  useImageObject,
  useConsumePrompts,
} from '../../../stores/selectors/annotationSelectors';

/**
 * Converts a drawn outline into image-space contour arrays.
 *
 * Freehand strokes are stored as polygon prompts, so this covers both. Points
 * and boxes are not outlines and never reach here — see ADDABLE_PROMPT_TYPES.
 */
const promptToContour = (prompt) => {
  const points = prompt.coords.points || [];
  if (points.length < 3) return null;
  return { x: points.map((p) => p.x), y: points.map((p) => p.y) };
};

/**
 * Commits drawn outlines straight to objects, bypassing the model.
 *
 * This backs the action bar's "Add this object", which stands beside "Run AI"
 * whenever an outline is on the canvas: the two are alternatives offered at the
 * same time rather than modes chosen in advance.
 *
 * When a contour is focused, new objects are nested under it, which is how
 * nested labelling works everywhere else in the editor.
 */
export default function useAddShapesAsObjects() {
  const prompts = useAIPrompts();
  const imageObject = useImageObject();
  // These shapes just became objects, so they are spent rather than discarded:
  // the next Ctrl+Z should remove the object, not redraw the outline.
  const consumePrompts = useConsumePrompts();
  const { addToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const shapePrompts = useMemo(
    () => prompts.filter((prompt) => ADDABLE_PROMPT_TYPES.has(prompt.type)),
    [prompts]
  );

  const addShapes = useCallback(async () => {
    if (!imageObject || shapePrompts.length === 0 || isAdding) return;

    setIsAdding(true);
    const savedIds = new Set();
    let skipped = 0;
    try {
      if (!annotationSession.isReady()) {
        throw new Error('Session is not ready yet. Please wait for the image to load.');
      }

      for (const prompt of shapePrompts) {
        const contour = promptToContour(prompt);
        if (!contour) {
          skipped += 1;
          continue;
        }
        const normalized = pixelArrayToNormalized(
          contour.x,
          contour.y,
          imageObject.width,
          imageObject.height
        );
        // Sequential: each add is acknowledged individually over the socket.
        // eslint-disable-next-line no-await-in-loop
        const response = await annotationSession.addObject(
          normalized.x, normalized.y, null, prompt.parentContourId ?? null
        );
        if (response?.data?.skipped) {
          skipped += 1;
          continue;
        }
        if (response?.type !== 'object_added' || response.success !== true || !response.data) {
          throw new Error(response?.message || 'Failed to add as object');
        }
        savedIds.add(prompt.id);
      }

      if (savedIds.size) {
        addToast({
          type: 'success',
          message: savedIds.size === 1 ? 'Added 1 annotation as an object' : `Added ${savedIds.size} annotations as objects`,
        });
      }
      if (skipped) {
        addToast({ type: 'error', message: `${skipped} ${skipped === 1 ? 'outline was not saved and remains' : 'outlines were not saved and remain'} on the canvas.` });
      }
    } catch (error) {
      console.error('[workspace] Failed to add shapes as objects:', error);
      addToast({ type: 'error', message: error.message || 'Failed to add as object' });
    } finally {
      // Consume only confirmed saves, including when a later request fails.
      if (savedIds.size) consumePrompts((prompt) => savedIds.has(prompt.id));
      setIsAdding(false);
    }
  }, [imageObject, shapePrompts, isAdding, consumePrompts, addToast]);

  return { shapeCount: shapePrompts.length, isAdding, addShapes };
}
