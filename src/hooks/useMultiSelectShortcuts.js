import { useEffect } from 'react';
import { 
  useSelectedObjects, 
  useClearSelection 
} from '../stores/selectors/annotationSelectors';

/**
 * Custom hook to handle keyboard shortcuts for multi-select operations
 * 
 * Shortcuts:
 * - Escape: Clear selection when multiple objects are selected
 */
const useMultiSelectShortcuts = () => {
  const selectedObjects = useSelectedObjects();
  const clearSelection = useClearSelection();

  useEffect(() => {
    // Only enable shortcuts when multiple objects are selected
    if (selectedObjects.length <= 1) return;

    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input or textarea
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Clear selection with Escape key
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedObjects, clearSelection]);
};

export default useMultiSelectShortcuts;
