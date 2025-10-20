import { useState, useCallback, useEffect } from 'react';
import { segmentImage } from '../api/segmentation';
import annotationSession from '../services/annotationSession';
import { SERVER_MESSAGE_TYPES } from '../utils/messageTypes';
import { pixelToNormalized, normalizedToPixel } from '../utils/coordinateUtils';
import {
  useAIPrompts,
  useSelectedModel,
  useCurrentImage,
  useSetCurrentMask,
  useClearAllPrompts,
  useSetIsSubmittingAI,
  useWebSocketIsReady,
  useImageObject,
} from '../stores/selectors/annotationSelectors';

/**
 * Custom hook to handle AI segmentation via WebSocket
 * Falls back to REST API if WebSocket is not available
 * Converts prompts to API format and processes the response
 */
const useAISegmentation = () => {
  const [error, setError] = useState(null);
  const [useWebSocket, setUseWebSocket] = useState(true);

  // Store state
  const prompts = useAIPrompts();
  const selectedModel = useSelectedModel();
  const currentImage = useCurrentImage();
  const imageObject = useImageObject();
  const isWebSocketReady = useWebSocketIsReady();

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
   * Run AI segmentation via WebSocket
   */
  const runWebSocketSegmentation = useCallback(async () => {
    if (!currentImage || !selectedModel || prompts.length === 0) {
      setError('Missing required data: image, model, or prompts');
      return { success: false, error: 'Missing required data' };
    }

    if (!imageObject) {
      setError('Image not loaded');
      return { success: false, error: 'Image not loaded' };
    }

    setIsSubmitting(true);
    setError(null);

    try {
      

      // Convert prompts to WebSocket format (convert pixel coordinates to normalized)
      const wsPrompts = {
        points: [],
        boxes: [],
        masks: [],
      };

      prompts.forEach((prompt) => {
        if (prompt.type === 'point') {
          // Convert pixel coordinates to normalized
          const normalized = pixelToNormalized(
            prompt.coords.x, 
            prompt.coords.y, 
            imageObject.width, 
            imageObject.height
          );
          
          wsPrompts.points.push({
            x: normalized.x,
            y: normalized.y,
            label: prompt.label === 'positive', // Convert to boolean
          });
        } else if (prompt.type === 'box') {
          // Convert pixel coordinates to normalized
          const minNormalized = pixelToNormalized(
            prompt.coords.x1, 
            prompt.coords.y1, 
            imageObject.width, 
            imageObject.height
          );
          const maxNormalized = pixelToNormalized(
            prompt.coords.x2, 
            prompt.coords.y2, 
            imageObject.width, 
            imageObject.height
          );
          
          wsPrompts.boxes.push({
            min_x: minNormalized.x,
            min_y: minNormalized.y,
            max_x: maxNormalized.x,
            max_y: maxNormalized.y,
          });
        }
      });

      // Map model names to backend identifiers
      const modelMap = {
        'SAM2': 'sam2_tiny',
        'SAM2Tiny': 'sam2_tiny',
        'SAM2Small': 'sam2_small',
        'SAM2Base': 'sam2_base',
        'SAM2Large': 'sam2_large',
      };
      const modelIdentifier = modelMap[selectedModel] || 'sam2_tiny';

      // Send segmentation request via WebSocket
      const response = await annotationSession.runSegmentation(modelIdentifier, wsPrompts);

      

      // Transform response to mask format
      const mask = transformResponseToMask(response.data || response);

      if (mask) {
        setCurrentMask(mask);
        clearAllPrompts();
        return { success: true, mask };
      } else {
        throw new Error('No valid mask returned from server');
      }
    } catch (err) {
      const errorMessage = err.message || 'Segmentation failed';
      setError(errorMessage);
      console.error('[useAISegmentation] WebSocket segmentation error:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentImage,
    selectedModel,
    prompts,
    imageObject,
    setIsSubmitting,
    transformResponseToMask,
    setCurrentMask,
    clearAllPrompts,
  ]);

  /**
   * Run AI segmentation via REST API (fallback)
   */
  const runRestSegmentation = useCallback(async () => {
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
      console.error('[useAISegmentation] REST segmentation error:', err);
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

  /**
   * Run AI segmentation - automatically chooses WebSocket or REST
   */
  const runSegmentation = useCallback(async () => {
    // Use WebSocket if available and enabled
    if (useWebSocket && isWebSocketReady) {
      return runWebSocketSegmentation();
    } else {
      // Fallback to REST API
      
      return runRestSegmentation();
    }
  }, [useWebSocket, isWebSocketReady, runWebSocketSegmentation, runRestSegmentation]);

  return {
    runSegmentation,
    error,
    isReady: currentImage && selectedModel && prompts.length > 0,
    isWebSocketMode: useWebSocket && isWebSocketReady,
    setUseWebSocket, // Allow manual override
  };
};

export default useAISegmentation;
