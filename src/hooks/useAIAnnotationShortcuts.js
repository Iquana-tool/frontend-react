import { useEffect } from 'react';
import {
  useClearAllPrompts,
  useCurrentTool,
} from '../stores/selectors/annotationSelectors';

/**
 * Custom hook to handle keyboard shortcuts for AI annotation (modifier-based).
 * Delete/Backspace and Enter/1/2/3 are handled by useAnnotationKeyboardShortcuts.
 *
 * Undo and redo used to live here too, bound to the prompt stack. They moved to
 * useAnnotationHistory, which owns the single Ctrl+Z: with the prompt stack and
 * the server-side object history both undoable, two listeners on the same key
 * would race, and the user would get whichever one happened to be mounted.
 *
 * Shortcuts:
 * - Ctrl/Cmd+Shift+C: Clear all prompts
 */
const useAIAnnotationShortcuts = () => {
  const currentTool = useCurrentTool();
  const clearAllPrompts = useClearAllPrompts();

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

      if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (window.confirm('Clear all prompts?')) {
          clearAllPrompts();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTool, clearAllPrompts]);
};

export default useAIAnnotationShortcuts;

