import { useCallback, useEffect, useRef } from 'react';
import useAISegmentation from '../../../hooks/useAISegmentation';
import {
  useCurrentTool,
  usePromptAction,
  useAIPrompts,
  usePromptedModel,
  useIsSubmitting,
  useRefinementModeActive,
  useAvailablePromptedModels,
  useIsLoadingPromptedModels,
  useFetchAvailablePromptedModels,
  useSetPromptedModel,
} from '../../../stores/selectors/annotationSelectors';

/** Backend needs a moment to register a refinement target before it accepts prompts. */
const REFINEMENT_READY_MS = 200;

/**
 * Run segmentation as soon as a prompt is placed — the rail's "Run AI
 * immediately" prompt action, which replaced the instant-mode switch.
 *
 * Lifted out of CanvasContainer, where it sat as two effects tangled into the
 * render tree. Behaviour is unchanged, including the delay: a plain run waits
 * 100 ms to let the prompt settle, and a run just after entering refinement mode
 * waits longer, because the backend has only just been told which contour is
 * being refined and rejects prompts that arrive first.
 *
 * Also keeps a prompted model selected — the canvas is usable without ever
 * opening the options drawer, so the default cannot depend on it.
 */
export default function useInstantSegmentationRunner() {
  const currentTool = useCurrentTool();
  const instant = usePromptAction() === 'ai';
  const prompts = useAIPrompts();
  const promptedModel = usePromptedModel();
  const isSubmitting = useIsSubmitting();
  const refinementActive = useRefinementModeActive();
  const availableModels = useAvailablePromptedModels();
  const isLoadingModels = useIsLoadingPromptedModels();
  const fetchModels = useFetchAvailablePromptedModels();
  const setPromptedModel = useSetPromptedModel();

  const { runSegmentation } = useAISegmentation();

  const previousPromptCount = useRef(0);
  const previousRefinement = useRef(false);
  const refinementEnteredAt = useRef(0);

  const run = useCallback(async () => {
    const result = await runSegmentation();
    if (!result.success) console.error('[workspace] Segmentation failed:', result.error);
  }, [runSegmentation]);

  useEffect(() => {
    if (previousRefinement.current === refinementActive) return;
    previousPromptCount.current = 0;
    previousRefinement.current = refinementActive;
    if (refinementActive) refinementEnteredAt.current = Date.now();
  }, [refinementActive]);

  useEffect(() => {
    if (currentTool !== 'ai_annotation') return;

    if (!isLoadingModels && availableModels.length === 0) {
      fetchModels();
      return;
    }
    if (!promptedModel && availableModels.length > 0) {
      const firstId = availableModels.find((model) => model?.id)?.id;
      if (firstId) setPromptedModel(firstId);
    }
  }, [
    currentTool,
    promptedModel,
    availableModels,
    isLoadingModels,
    fetchModels,
    setPromptedModel,
  ]);

  useEffect(() => {
    const shouldRun =
      instant &&
      currentTool === 'ai_annotation' &&
      promptedModel &&
      !isSubmitting &&
      prompts.length > 0 &&
      prompts.length > previousPromptCount.current;

    if (!shouldRun) {
      previousPromptCount.current = prompts.length;
      return undefined;
    }

    let delay = 100;
    if (refinementActive) {
      const sinceEntered = Date.now() - refinementEnteredAt.current;
      delay = sinceEntered < REFINEMENT_READY_MS
        ? REFINEMENT_READY_MS - sinceEntered + 150
        : 150;
    }

    const timeout = setTimeout(run, delay);
    return () => clearTimeout(timeout);
  }, [instant, currentTool, promptedModel, isSubmitting, prompts.length, refinementActive, run]);
}
