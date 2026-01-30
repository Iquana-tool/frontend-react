import { useEffect } from 'react';
import { 
  useFocusModeActive, 
  useExitFocusMode, 
  useSetZoomLevel, 
  useSetPanOffset 
} from '../stores/selectors/annotationSelectors';
import annotationSession from '../services/annotationSession';

/**
 * Custom hook to handle Escape key for exiting focus mode
 */
const useFocusModeEscape = () => {
  const focusModeActive = useFocusModeActive();
  const exitFocusMode = useExitFocusMode();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();

  useEffect(() => {
    if (!focusModeActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        exitFocusMode();
        
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
        
        if (annotationSession.isReady()) {
          annotationSession.unfocusImage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusModeActive, exitFocusMode, setZoomLevel, setPanOffset]);
};

export default useFocusModeEscape;

