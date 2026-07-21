import React, { useState, useCallback } from 'react';
import { Shapes, Loader2 } from 'lucide-react';
import annotationSession from '../../../services/annotationSession';
import { pixelArrayToNormalized } from '../../../utils/coordinateUtils';
import {
  useCurrentTool,
  useAIPrompts,
  useImageObject,
  useClearAllPrompts,
  useFocusedParentContourId,
} from '../../../stores/selectors/annotationSelectors';
import { useToast } from '../../../contexts/ToastContext';

/**
 * Converts a single drawn prompt into image-space contour coordinate arrays.
 * Points are not convertible to a contour and return null.
 */
const promptToContour = (prompt) => {
  if (prompt.type === 'box') {
    const { x1, y1, x2, y2 } = prompt.coords;
    return {
      x: [x1, x2, x2, x1],
      y: [y1, y1, y2, y2],
    };
  }
  if (prompt.type === 'polygon') {
    const pts = prompt.coords.points || [];
    if (pts.length < 3) return null;
    return {
      x: pts.map((p) => p.x),
      y: pts.map((p) => p.y),
    };
  }
  return null; // points (and anything else) can't become a contour
};

/**
 * "Add as object" button.
 *
 * Saves the currently drawn shapes (box / polygon / freehand — everything
 * except points) directly as manual annotation objects, bypassing the model.
 * Each shape becomes its own contour via OBJECT_ADD_MANUAL.
 */
const AddAsObjectButton = () => {
  const currentTool = useCurrentTool();
  const prompts = useAIPrompts();
  const imageObject = useImageObject();
  const clearAllPrompts = useClearAllPrompts();
  const parentContourId = useFocusedParentContourId();
  const { addToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const contourPrompts = prompts.filter((p) => p.type === 'box' || p.type === 'polygon');
  const shapeCount = contourPrompts.length;

  const handleClick = useCallback(async () => {
    if (!imageObject || shapeCount === 0 || isAdding) return;

    setIsAdding(true);
    try {
      if (!annotationSession.isReady()) {
        throw new Error('Session is not ready yet. Please wait for the image to load.');
      }

      let added = 0;
      for (const prompt of contourPrompts) {
        const contour = promptToContour(prompt);
        if (!contour) continue;
        const normalized = pixelArrayToNormalized(
          contour.x,
          contour.y,
          imageObject.width,
          imageObject.height
        );
        // When a contour is focused, nest the new object under it (nested labelling)
        // eslint-disable-next-line no-await-in-loop
        await annotationSession.addObject(normalized.x, normalized.y, null, parentContourId);
        added += 1;
      }

      clearAllPrompts();
      addToast({
        message: added === 1 ? 'Added 1 annotation as an object' : `Added ${added} annotations as objects`,
        type: 'success',
      });
    } catch (err) {
      console.error('Failed to add annotation(s) as object(s):', err);
      addToast({ message: err.message || 'Failed to add as object', type: 'error' });
    } finally {
      setIsAdding(false);
    }
  }, [imageObject, shapeCount, isAdding, contourPrompts, parentContourId, clearAllPrompts, addToast]);

  // Only relevant in the AI annotation tool, and only when there is a shape to add
  if (currentTool !== 'ai_annotation' || shapeCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[70] pointer-events-auto">
      <button
        onClick={handleClick}
        disabled={isAdding}
        title="Save the drawn shapes (boxes, polygons, freehand) directly as objects without running a model"
        className={`flex items-center gap-2 px-5 py-2.5 rounded-full shadow-xl font-semibold text-sm transition-all duration-200 transform ${
          isAdding
            ? 'bg-gray-300 text-white cursor-not-allowed opacity-60'
            : 'bg-white text-teal-700 border border-teal-200 hover:border-teal-400 hover:shadow-2xl hover:scale-105 active:scale-95'
        }`}
      >
        {isAdding ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Adding...</span>
          </>
        ) : (
          <>
            <Shapes className="w-4 h-4" />
            <span>Add as object</span>
            <span className="ml-1 px-2 py-0.5 bg-teal-50 rounded-full text-xs">{shapeCount}</span>
          </>
        )}
      </button>
    </div>
  );
};

export default AddAsObjectButton;
