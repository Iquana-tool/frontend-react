import { useEffect } from 'react';
import {
  useRemoveLastPrompt,
  useClearAllPrompts,
  useCurrentTool,
  useUndoLastAction,
  useRedoLastAction,
} from '../stores/selectors/annotationSelectors';

/**
 * Custom hook to handle keyboard shortcuts for AI annotation
 * 
 * Shortcuts:
 * - Ctrl/Cmd+Z: Undo last action
 * - Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y: Redo
 * - Backspace/Delete: Remove last prompt
 * - Ctrl/Cmd+Shift+C: Clear all prompts
 */
const useAIAnnotationShortcuts = () => {
  const currentTool = useCurrentTool();
  const removeLastPrompt = useRemoveLastPrompt();
  const clearAllPrompts = useClearAllPrompts();
  const undoLastAction = useUndoLastAction();
  const redoLastAction = useRedoLastAction();

  useEffect(() => {
    // Only enable shortcuts when AI annotation tool is active
    if (currentTool !== 'ai_annotation') return;

    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input or textarea
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Undo: Ctrl/Cmd+Z (without Shift)
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoLastAction();
      }
      // Redo: Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y
      else if (
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (isCtrlOrCmd && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        redoLastAction();
      }
      // Delete last prompt: Backspace or Delete
      else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        removeLastPrompt();
      }
      // Clear all prompts: Ctrl/Cmd+Shift+C
      else if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (window.confirm('Clear all prompts?')) {
          clearAllPrompts();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentTool, removeLastPrompt, clearAllPrompts, undoLastAction, redoLastAction]);
};

export default useAIAnnotationShortcuts;

