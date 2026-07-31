import { useEffect, useCallback, useMemo } from 'react';
import {
  useCurrentTool,
  useAIPrompts,
  usePromptedModel,
  useIsSubmitting,
  useSelectedObjects,
  useObjectsList,
  useRemoveObject,
  useRemoveLastPrompt,
  useClearSelection,
  useSetInstanceRunRequested,
  useInstanceWarningModalOpen,
  useRefinementModeActive,
} from '../stores/selectors/annotationSelectors';
import useAISegmentation from './useAISegmentation';
import { useSuggestionSegmentation } from './useSuggestionSegmentation';
import { deleteObject } from '../utils/objectOperations';
import { getContourId } from '../utils/objectUtils';

/**
 * Action keyboard shortcuts for the annotation page.
 *
 * Tool selection, panel toggles, zoom and image navigation live in
 * useWorkspaceShortcuts; this hook owns the keys that trigger annotation work.
 *
 * - Enter: Run primary action (AI segmentation when in AI tool with prompts)
 * - 1: Run Prompted Segmentation
 * - 2: Run Instance Suggestion (suggestion) with selected objects as seeds
 * - 3: Open Instance Segmentation (warning modal)
 * - Delete/Backspace: In refinement mode with prompts, remove last prompt; otherwise reject selected objects, or remove last prompt when in AI tool with no selection
 */
export default function useAnnotationKeyboardShortcuts() {
  const currentTool = useCurrentTool();
  const prompts = useAIPrompts();
  const promptedModel = usePromptedModel();
  const isSubmitting = useIsSubmitting();
  const selectedIds = useSelectedObjects(); // store holds selected object IDs
  const objectsList = useObjectsList();
  const selectedObjects = useMemo(
    () => objectsList.filter((obj) => selectedIds.includes(obj.id)),
    [objectsList, selectedIds]
  );
  const removeObject = useRemoveObject();
  const removeLastPrompt = useRemoveLastPrompt();
  const clearSelection = useClearSelection();
  const setInstanceRunRequested = useSetInstanceRunRequested();
  const instanceWarningModalOpen = useInstanceWarningModalOpen();
  const refinementModeActive = useRefinementModeActive();

  const { runSegmentation } = useAISegmentation();
  const { runSuggestion, isRunning: isRunningSuggestion } = useSuggestionSegmentation();
  const runInstanceRequest = setInstanceRunRequested;

  const canRunPrompted =
    currentTool === 'ai_annotation' &&
    promptedModel &&
    !isSubmitting &&
    prompts.length > 0 &&
    !instanceWarningModalOpen;

  const handleRejectSelected = useCallback(async () => {
    if (selectedObjects.length === 0) return;
    for (const obj of selectedObjects) {
      try {
        await deleteObject(obj, removeObject);
      } catch (err) {
        console.error('Reject object failed:', err);
        alert(`Failed to reject object: ${err.message || 'Unknown error'}`);
        break;
      }
    }
    clearSelection();
  }, [selectedObjects, removeObject, clearSelection]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey || e.altKey;

      switch (e.key) {
        case 'Enter': {
          if (canRunPrompted) {
            e.preventDefault();
            runSegmentation();
          }
          break;
        }
        case '1': {
          if (!isModifier && canRunPrompted) {
            e.preventDefault();
            runSegmentation();
          }
          break;
        }
        case '2': {
          if (isModifier) break;
          if (selectedObjects.length === 0) break;
          if (isRunningSuggestion) break;
          e.preventDefault();
          const contourIds = selectedObjects.map((o) => getContourId(o)).filter(Boolean);
          const labelId = selectedObjects[0]?.labelId ?? null;
          if (contourIds.length > 0) {
            runSuggestion(
              contourIds.length === 1 ? contourIds[0] : contourIds,
              labelId
            );
          }
          break;
        }
        case '3': {
          if (!isModifier) {
            e.preventDefault();
            runInstanceRequest(true);
          }
          break;
        }
        case 'Delete':
        case 'Backspace': {
          // In refinement mode with prompts: erase last prompt (don't reject the contour being refined)
          if (
            currentTool === 'ai_annotation' &&
            refinementModeActive &&
            prompts.length > 0
          ) {
            e.preventDefault();
            removeLastPrompt();
          } else if (selectedObjects.length > 0) {
            e.preventDefault();
            handleRejectSelected();
          } else if (currentTool === 'ai_annotation') {
            e.preventDefault();
            removeLastPrompt();
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    canRunPrompted,
    runSegmentation,
    selectedObjects,
    runSuggestion,
    isRunningSuggestion,
    runInstanceRequest,
    handleRejectSelected,
    currentTool,
    refinementModeActive,
    prompts.length,
    removeLastPrompt,
  ]);
}
