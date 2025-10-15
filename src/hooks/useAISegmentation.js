import { useState, useCallback } from 'react';
import { segmentImage } from '../api/segmentation';
import {
  useAIPrompts,
  useSelectedModel,
  useCurrentImage,
  useSetCurrentMask,
  useClearAllPrompts,
  useSetIsSubmittingAI,
} from '../stores/selectors/annotationSelectors';

/**
 * Custom hook to handle AI segmentation API calls
 * Converts prompts to API format and processes the response
 */
const useAISegmentation = () => {
  const [error, setError] = useState(null);

  // Store state
  const prompts = useAIPrompts();
  const selectedModel = useSelectedModel();
  const currentImage = useCurrentImage();

  // Store actions
  const setCurrentMask = useSetCurrentMask();
  const clearAllPrompts = useClearAllPrompts();
  const setIsSubmitting = useSetIsSubmittingAI();

  /**
   * Transform API response to mask format expected by SegmentationOverlay
   */
  const transformResponseToMask = useCallback((response) => {
    if (!response || !response.contours || response.contours.length === 0) {
      return null;
    }

    // Get the first contour (as SAM typically returns one mask per prompt)
    const contour = response.contours[0];

    // Convert contour points to SVG path
    let pathData = '';
    if (contour.points && contour.points.length > 0) {
      pathData = `M ${contour.points[0][0]} ${contour.points[0][1]}`;
      for (let i = 1; i < contour.points.length; i++) {
        pathData += ` L ${contour.points[i][0]} ${contour.points[i][1]}`;
      }
      pathData += ' Z'; // Close path
    }

    return {
      id: contour.id || Date.now(),
      path: pathData,
      points: contour.points || [],
      pixelCount: contour.pixel_count || 0,
      label: contour.label || 'AI Generated',
    };
  }, []);

  /**
   * Run AI segmentation with current prompts
   */
  const runSegmentation = useCallback(async () => {
    if (!currentImage || !selectedModel || prompts.length === 0) {
      setError('Missing required data: image, model, or prompts');
      return { success: false, error: 'Missing required data' };
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert prompts to API format
      const apiPrompts = prompts.map((prompt) => {
        if (prompt.type === 'point') {
          return {
            type: 'point',
            coordinates: {
              x: prompt.coords.x,
              y: prompt.coords.y,
            },
            label: prompt.label === 'positive', // Convert to boolean for API
          };
        } else if (prompt.type === 'box') {
          return {
            type: 'box',
            coordinates: {
              startX: prompt.coords.x1,
              startY: prompt.coords.y1,
              endX: prompt.coords.x2,
              endY: prompt.coords.y2,
            },
          };
        }
        return null;
      }).filter(Boolean);

      // Call segmentation API
      const response = await segmentImage(
        currentImage.id,
        selectedModel,
        apiPrompts,
        { min_x: 0, min_y: 0, max_x: 1, max_y: 1 }, // Full image crop
        'temporary_label', // Will be assigned later by user
        null, // No mask_id
        null  // No parent_contour_id
      );

      // Transform response to mask format
      const mask = transformResponseToMask(response);

      if (mask) {
        setCurrentMask(mask);
        clearAllPrompts(); // Clear prompts after successful segmentation
        return { success: true, mask };
      } else {
        throw new Error('No valid mask returned from API');
      }
    } catch (err) {
      const errorMessage = err.message || 'Segmentation failed';
      setError(errorMessage);
      console.error('AI Segmentation error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentImage,
    selectedModel,
    prompts,
    setIsSubmitting,
    transformResponseToMask,
    setCurrentMask,
    clearAllPrompts,
  ]);

  return {
    runSegmentation,
    error,
    isReady: currentImage && selectedModel && prompts.length > 0,
  };
};

export default useAISegmentation;

