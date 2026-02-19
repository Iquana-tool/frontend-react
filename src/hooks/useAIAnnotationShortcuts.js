import { useEffect } from 'react';
import {
  useClearAllPrompts,
  useCurrentTool,
  useUndoLastAction,
  useRedoLastAction,
} from '../stores/selectors/annotationSelectors';

/**
 * Custom hook to handle keyboard shortcuts for AI annotation (modifier-based).
 * Delete/Backspace and Enter/1/2/3 are handled by useAnnotationKeyboardShortcuts.
 *
 * Shortcuts:
 * - Ctrl/Cmd+Z: Undo last action
 * - Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y: Redo
 * - Ctrl/Cmd+Shift+C: Clear all prompts
 */
const useAIAnnotationShortcuts = () => {
  const currentTool = useCurrentTool();
  const clearAllPrompts = useClearAllPrompts();
  const undoLastAction = useUndoLastAction();
  const redoLastAction = useRedoLastAction();

  useEffect(() => {
    if (currentTool !== 'ai_annotation') return;

    const handleKeyDown = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoLastAction();
      } else if (
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (isCtrlOrCmd && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        redoLastAction();
      } else if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (window.confirm('Clear all prompts?')) {
          clearAllPrompts();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTool, clearAllPrompts, undoLastAction, redoLastAction]);
};

export default useAIAnnotationShortcuts;

