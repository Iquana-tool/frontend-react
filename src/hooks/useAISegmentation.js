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
  useUpdateObject,
  useObjectsList,
  useRefinementModeActive,
  useRefinementModeObjectId,
  useExitRefinementMode,
  useSetCurrentTool,
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
  const updateObject = useUpdateObject();
  const refinementModeActive = useRefinementModeActive();
  const refinementModeObjectId = useRefinementModeObjectId();
  const exitRefinementMode = useExitRefinementMode();
  const setCurrentTool = useSetCurrentTool();

  /**
   * Transform API response to mask format expected by SegmentationOverlay
   * Handles object_added, object_modified, and success message formats with contour data
   */
  const transformResponseToMask = useCallback((response) => {
    let contour = null;
    
    // Handle: object_added, object_modified, or success message with contour data
    if (response && (response.type === 'object_added' || response.type === 'object_modified' || response.type === 'success') && response.data) {
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
      // Extract x and y coordinate arrays if available from backend
      x: contour.x || [],
      y: contour.y || [],
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
          
          // Backend expects a SINGLE box_prompt object
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
        // Ensure consistent ID format (convert to number if it's a string number)
        const contourId = mask.id;
        const normalizedId = typeof contourId === 'string' && !isNaN(contourId) 
          ? Number(contourId) 
          : (typeof contourId === 'number' ? contourId : contourId);
        
        // Handle message types generically: object_modified updates existing, object_added/success creates new
        // Note: 'success' type is a fallback for backward compatibility
        const isModified = response && response.type === 'object_modified';
        
        if (isModified) {
          // When in refinement mode, we know which object to update from refinementModeObjectId
          const objectToUpdate = refinementModeActive && refinementModeObjectId
            ? objectsList.find(obj => obj.id === refinementModeObjectId)
            : objectsList.find(obj => {
                const objContourId = obj.contour_id || obj.id;
                const normalizedObjContourId = typeof objContourId === 'string' && !isNaN(objContourId)
                  ? Number(objContourId)
                  : (typeof objContourId === 'number' ? objContourId : objContourId);
                return normalizedObjContourId === normalizedId;
              });
          
          if (objectToUpdate) {
            // Update the existing object - completely replace mask and path to show only the refined version
            updateObject(objectToUpdate.id, {
              mask: mask,
              contour_id: normalizedId, // Update with the NEW contour_id from backend
              pixelCount: mask.pixelCount || 0,
              // Preserve existing label if it exists, otherwise use the one from backend
              label: mask.label || objectToUpdate.label || `Object #${objectToUpdate.id}`,
              // Include x and y coordinate arrays if available from backend response
              x: mask.x || [],
              y: mask.y || [],
              // Ensure path is available for rendering - explicitly set from new refined object
              path: mask.path || null,
            });
          } else {
            console.warn(`Object not found for object_modified. Adding as new object.`);
            // Fallback: if object not found, add as new
            addObject({
              mask: mask,
              contour_id: normalizedId,
              pixelCount: mask.pixelCount || 0,
              label: mask.label || `Object #${objectsList.length + 1}`,
              reviewed_by: [], // Not reviewed yet, will appear in Unreviewed Objects
              x: mask.x || [],
              y: mask.y || [],
              path: mask.path || mask.mask?.path,
            });
          }
        } else {
          // object_added: Add as an unreviewed object
          addObject({
            mask: mask,
            contour_id: normalizedId, // Store the backend contour_id for API calls (consistent format)
            pixelCount: mask.pixelCount || 0,
            label: mask.label || `Object #${objectsList.length + 1}`,
            reviewed_by: [], // Not reviewed yet, will appear in Unreviewed Objects
            // Include x and y coordinate arrays if available from backend response
            x: mask.x || [],
            y: mask.y || [],
            // Ensure path is available for rendering
            path: mask.path || mask.mask?.path,
          });
        }
        
        // Exit refinement mode after successful segmentation so the object is clickable
        if (refinementModeActive) {
          try {
            await annotationSession.unselectRefinementObject();
            exitRefinementMode();
            // Switch back to selection tool so clicking the object can enter focus mode
            setCurrentTool('selection');
          } catch (error) {
           
            // Continue anyway - the object was updated/added successfully
          }
        } else {
          // If not in refinement mode, switch to selection tool after segmentation
          // so the newly created object can be clicked to enter focus mode
          setCurrentTool('selection');
        }
        
        clearAllPrompts();
        return { success: true, mask };
      } else {
        throw new Error('No valid mask returned from server');
      }
    } catch (err) {
      const errorMessage = err.message || 'Segmentation failed';
      setError(errorMessage);
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
    updateObject,
    refinementModeActive,
    refinementModeObjectId,
    exitRefinementMode,
    setCurrentTool,
  ]);

  return {
    runSegmentation,
    error,
    isReady: currentImage && selectedModel && prompts.length > 0,
  };
};

export default useAISegmentation;
