import { useMemo } from 'react';
import {
  useAIPrompts,
  useIsSubmitting,
  useSelectedObjects,
  useObjectsList,
  useWorkspaceMode,
  useIsRunningSuggestion,
  useIsRunningInstance,
  useRefinementModeActive,
  useEditModeActive,
  useLineEditActive,
} from '../../../stores/selectors/annotationSelectors';
import { isReviewed } from './objectViewModel';
import { ADDABLE_PROMPT_TYPES } from './toolModel';

/**
 * Derives which state the action bar is in.
 *
 * Nothing here is stored — the bar is a pure function of the prompt list, the
 * selection, the running flags and the mode, exactly as the design specifies.
 *
 * A note on `draft`: the mockup shows a draft-mask state between the model
 * returning and the object being committed. This backend has no such stage —
 * `runSegmentation` persists the contour server-side and it arrives over the
 * socket already committed. The nearest real state is `prompt`, where drawn
 * shapes wait for either of the bar's two actions.
 */
export default function useActionBarState() {
  const prompts = useAIPrompts();
  const isSubmitting = useIsSubmitting();
  const isRunningSuggestion = useIsRunningSuggestion();
  const isRunningInstance = useIsRunningInstance();
  const selectedIds = useSelectedObjects();
  const objects = useObjectsList();
  const mode = useWorkspaceMode();
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

    // One prompt state, two possible actions: the bar offers Run AI always and
    // "Add this object" whenever an outline is among the prompts. There is no
    // separate `shapes` state any more — deciding for the user which of the two
    // they meant is exactly what the AI-assist switch used to get wrong.
    if (prompts.length > 0) {
      return {
        state: 'prompt',
        selection,
        reviewQueue,
        promptCount: prompts.length,
        addableCount: prompts.filter((prompt) => ADDABLE_PROMPT_TYPES.has(prompt.type)).length,
      };
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
    refinementActive,
    editActive,
    lineEditActive,
  ]);
}
