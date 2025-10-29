import { useEffect } from 'react';
import { useFocusModeActive, useExitFocusMode } from '../stores/selectors/annotationSelectors';
import annotationSession from '../services/annotationSession';

/**
 * Custom hook to handle Escape key for exiting focus mode
 */
const useFocusModeEscape = () => {
  const focusModeActive = useFocusModeActive();
  const exitFocusMode = useExitFocusMode();

  useEffect(() => {
    if (!focusModeActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Exit focus mode
        exitFocusMode();
        
        // Also send unfocus message to backend
        if (annotationSession.isReady()) {
          annotationSession.unfocusImage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusModeActive, exitFocusMode]);
};

export default useFocusModeEscape;

