import { useMemo } from 'react';
import {
  useAIPrompts,
  useIsSubmitting,
  useSelectedObjects,
  useObjectsList,
  useWorkspaceMode,
  useAiAssist,
  useIsRunningSuggestion,
  useIsRunningInstance,
  useRefinementModeActive,
  useEditModeActive,
  useLineEditActive,
} from '../../../stores/selectors/annotationSelectors';
import { isReviewed } from './objectViewModel';

/**
 * Derives which state the action bar is in.
 *
 * Nothing here is stored — the bar is a pure function of the prompt list, the
 * selection, the running flags and the mode, exactly as the design specifies.
 *
 * A note on `draft`: the mockup shows a draft-mask state between the model
 * returning and the object being committed. This backend has no such stage —
 * `runSegmentation` persists the contour server-side and it arrives over the
 * socket already committed. The equivalent real state is drawing with AI assist
 * off, where shapes wait to be committed by "Add as object"; that is what
 * `shapes` represents here.
 */
export default function useActionBarState() {
  const prompts = useAIPrompts();
  const isSubmitting = useIsSubmitting();
  const isRunningSuggestion = useIsRunningSuggestion();
  const isRunningInstance = useIsRunningInstance();
  const selectedIds = useSelectedObjects();
  const objects = useObjectsList();
  const mode = useWorkspaceMode();
  const aiAssist = useAiAssist();
  const refinementActive = useRefinementModeActive();
  const editActive = useEditModeActive();
  const lineEditActive = useLineEditActive();

  return useMemo(() => {
    const selection = objects.filter((object) => selectedIds.includes(object.id));
    const reviewQueue = objects.filter((object) => !isReviewed(object));

    // Contour editing owns the canvas; its own banner carries the Done action.
    if (editActive || lineEditActive) {
      return { state: 'editing', selection, reviewQueue };
    }

    if (isSubmitting || isRunningSuggestion || isRunningInstance) {
      return {
        state: 'running',
        selection,
        reviewQueue,
        runKind: isSubmitting
          ? refinementActive
            ? 'refine'
            : 'segment'
          : isRunningSuggestion
            ? 'suggest'
            : 'instance',
      };
    }

    if (mode === 'review') {
      return { state: 'review', selection, reviewQueue };
    }

    const shapePrompts = prompts.filter(
      (prompt) => prompt.type === 'box' || prompt.type === 'polygon'
    );

    if (prompts.length > 0) {
      // With assist off only committable shapes matter; a stray point prompt
      // cannot be saved as an object, so it still counts as a model prompt.
      if (!aiAssist && shapePrompts.length === prompts.length) {
        return { state: 'shapes', selection, reviewQueue, shapeCount: shapePrompts.length };
      }
      return { state: 'prompt', selection, reviewQueue, promptCount: prompts.length };
    }

    if (selection.length === 1) return { state: 'object', selection, reviewQueue };
    if (selection.length > 1) return { state: 'multi', selection, reviewQueue };

    return { state: 'idle', selection, reviewQueue };
  }, [
    prompts,
    isSubmitting,
    isRunningSuggestion,
    isRunningInstance,
    selectedIds,
    objects,
    mode,
    aiAssist,
    refinementActive,
    editActive,
    lineEditActive,
  ]);
}
