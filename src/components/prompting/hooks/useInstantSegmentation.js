import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for instant segmentation functionality
 * Handles automatic segmentation when prompts change with debouncing
 */
export const useInstantSegmentation = (
  prompts,
  getFormattedPrompts,
  onPromptingComplete,
  promptType,
  currentLabel,
  isEnabled = false,
  debounceMs = 1000
) => {
  const [isInstantSegmentationEnabled, setIsInstantSegmentationEnabled] = useState(isEnabled);
  const [isInstantSegmenting, setIsInstantSegmenting] = useState(false);
  const debounceTimerRef = useRef(null);
  const lastPromptsLengthRef = useRef(0);

  // Debounced instant segmentation function
  const triggerInstantSegmentation = useCallback(async () => {
    if (!isInstantSegmentationEnabled || prompts.length === 0 || !onPromptingComplete) {
      return;
    }

    if (!currentLabel) {
      console.warn("No label selected. Instant segmentation requires a label to be selected.");
      return;
    }

    setIsInstantSegmenting(true);
    
    try {
      const formattedPrompts = getFormattedPrompts();
      await onPromptingComplete(formattedPrompts, promptType);
    } catch (error) {
      console.error('Instant segmentation failed:', error);
    } finally {
      setIsInstantSegmenting(false);
    }
  }, [isInstantSegmentationEnabled, prompts.length, onPromptingComplete, getFormattedPrompts, promptType, currentLabel]);

  // Effect to handle prompt changes and trigger instant segmentation
  useEffect(() => {
    if (!isInstantSegmentationEnabled) {
      return;
    }

    // Only trigger on new prompts (when length increases)
    if (prompts.length > lastPromptsLengthRef.current && prompts.length > 0) {
      // Clear any existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounced timer
      debounceTimerRef.current = setTimeout(() => {
        triggerInstantSegmentation();
      }, debounceMs);
    }

    // Update last prompts length
    lastPromptsLengthRef.current = prompts.length;

    // Cleanup timer on unmount or dependency change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [prompts.length, isInstantSegmentationEnabled, triggerInstantSegmentation, debounceMs]);

  // Toggle instant segmentation
  const toggleInstantSegmentation = useCallback(() => {
    setIsInstantSegmentationEnabled(prev => {
      const newValue = !prev;
      console.log('Instant segmentation toggled:', newValue);
      
      // Clear timer when disabling
      if (!newValue && debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      return newValue;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    isInstantSegmentationEnabled,
    isInstantSegmenting,
    toggleInstantSegmentation,
    setIsInstantSegmentationEnabled,
    // Helper to determine if we should suppress loading modals
    shouldSuppressLoadingModal: isInstantSegmentationEnabled && isInstantSegmenting
  };
}; 