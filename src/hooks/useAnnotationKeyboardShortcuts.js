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
  useWorkspaceMode,
} from '../stores/selectors/annotationSelectors';
import useAISegmentation from './useAISegmentation';
import { useSuggestionSegmentation } from './useSuggestionSegmentation';
import { deleteObject } from '../utils/objectOperations';
import { getContourId } from '../utils/objectUtils';
import { PROMPT as DELETE_PROMPT, SELECTION as DELETE_SELECTION, routeDelete } from './deleteRouting';

/**
 * Action keyboard shortcuts for the annotation page.
 *
 * Tool selection, panel toggles, zoom and image navigation live in
 * useWorkspaceShortcuts; this hook owns the keys that trigger annotation work.
 *
 * - Enter: Run primary action (AI segmentation when in AI tool with prompts).
 *   Not in review mode — there the primary action is approving the instance
 *   under review, which the action bar owns along with the review cursor.
 * - 1: Run Prompted Segmentation
 * - 2: Run Instance Suggestion (suggestion) with selected objects as seeds
 * - 3: Open Instance Segmentation (warning modal)
 * - Delete/Backspace: Remove the last prompt while any are on the AI canvas, otherwise
 *   reject the selected objects. See deleteRouting.js for why prompts come first.
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
  const mode = useWorkspaceMode();

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
          // Shift+Enter belongs to the action bar's "Add this object"; running
          // the model here as well would do both at once.
          if (canRunPrompted && mode !== 'review' && !e.shiftKey) {
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
          // Prompts before the selection, always — see deleteRouting.js. This used to hold
          // only inside refinement mode, which left a segmentation run's auto-selected
          // object outranking a prompt placed after it.
          const target = routeDelete({
            tool: currentTool,
            promptCount: prompts.length,
            selectionCount: selectedObjects.length,
          });
          if (target === DELETE_PROMPT) {
            e.preventDefault();
            removeLastPrompt();
          } else if (target === DELETE_SELECTION) {
            e.preventDefault();
            handleRejectSelected();
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
    mode,
    runSegmentation,
    selectedObjects,
    runSuggestion,
    isRunningSuggestion,
    runInstanceRequest,
    handleRejectSelected,
    currentTool,
    prompts.length,
    removeLastPrompt,
  ]);
}
