import { useState, useCallback } from 'react';
import annotationSession from '../services/annotationSession';
import { pixelToNormalized } from '../utils/coordinateUtils';
import {
  useAIPrompts,
  useSelectedModel,
  useCurrentImage,
  useClearAllPrompts,
  useSetIsSubmittingAI,
  useImageObject,
  useAddObject,
  useObjectsList,
} from '../stores/selectors/annotationSelectors';

/**
 * Custom hook to handle AI segmentation via WebSocket
 * Converts prompts to API format and processes the response
 */
const useAISegmentation = () => {
  const [error, setError] = useState(null);

  // Store state
  const prompts = useAIPrompts();
  const selectedModel = useSelectedModel();
  const currentImage = useCurrentImage();
  const imageObject = useImageObject();
  const objectsList = useObjectsList();

  // Store actions
  const clearAllPrompts = useClearAllPrompts();
  const setIsSubmitting = useSetIsSubmittingAI();
  const addObject = useAddObject();

  /**
   * Transform API response to mask format expected by SegmentationOverlay
   * Handles object_added message format with contour data
   */
  const transformResponseToMask = useCallback((response) => {
    let contour = null;
    
    // Handle backend format: object_added message with contour data
    if (response && response.type === 'object_added' && response.data) {
      contour = response.data;
    }
    // Handle direct contour data
    else if (response && response.path) {
      contour = response;
    }
    
    // Backend should always provide path - if missing, it's an error
    if (!contour || !contour.path) {
      console.warn('No valid contour with path found in response:', response);
      return null;
    }

    const mask = {
      id: contour.id || Date.now(),
      path: contour.path, // Backend-computed SVG path
      pixelCount: contour.quantification?.area || contour.pixel_count || 0,
      label: contour.label || 'AI Generated',
      confidence: contour.confidence,
    };
    
    return mask;
  }, []);

  /**
   * Run AI segmentation via WebSocket
   */
  const runSegmentation = useCallback(async () => {
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
      // Verify session is ready
      if (!annotationSession.isReady()) {
        throw new Error('WebSocket session is not ready. Please wait for the connection to be established or try refreshing the page.');
      }

      // Check if prompted_segmentation service is available
      if (!annotationSession.isServiceAvailable('prompted_segmentation')) {
        throw new Error('AI segmentation service is not available. Please check your connection and try again.');
      }

      // Convert prompts to WebSocket format (convert pixel coordinates to normalized)
      const wsPrompts = {
        point_prompts: [],
        box_prompt: null,
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
          
          wsPrompts.point_prompts.push({
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
          
          // Backend expects a SINGLE box_prompt object, not an array of boxes
          // If we have multiple boxes, only use the last one
          wsPrompts.box_prompt = {
            min_x: minNormalized.x,
            min_y: minNormalized.y,
            max_x: maxNormalized.x,
            max_y: maxNormalized.y,
          };
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
      const mask = transformResponseToMask(response);

      if (mask) {
        // Extract contour_id from the mask (it comes from backend as mask.id)
        const contourId = mask.id;
        
        // Add as a temporary object (will appear in Reviewable Objects)
        // User can assign a label via context menu or click Accept to move it to Reviewed Objects
        addObject({
          mask: mask,
          contour_id: contourId, // Store the backend contour_id for API calls
          pixelCount: mask.pixelCount || 0,
          label: mask.label || `Object #${objectsList.length + 1}`,
          temporary: true // Mark as temporary so it appears in Reviewable Objects
        });
        
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
    objectsList,
    setIsSubmitting,
    transformResponseToMask,
    clearAllPrompts,
    addObject,
  ]);

  return {
    runSegmentation,
    error,
    isReady: currentImage && selectedModel && prompts.length > 0,
  };
};

export default useAISegmentation;
