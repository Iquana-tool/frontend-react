import React, { useEffect, useRef, useState } from 'react';
import {
  useContextMenuVisible,
  useContextMenuX,
  useContextMenuY,
  useContextMenuTargetObjectId,
  useHideContextMenu,
  useEnterFocusModeWithZoom,
  useObjectsList,
  useSelectedObjects,
  useImageObject,
  useUpdateObject,
  useRemoveObject,
  useEnterRefinementMode,
  useSetCurrentTool,
  useRefinementModeActive,
  useFocusModeActive,
  useExitFocusMode,
  useCompletionModel,
  useWebSocketIsReady,
  useEnterEditMode,
} from '../../../stores/selectors/annotationSelectors';
import { useRefinementMode } from '../../../hooks/useRefinementMode';
import { useLabelSelection } from '../../../hooks/useLabelSelection';
import { useLabelsHierarchy } from '../../../hooks/useLabelsHierarchy';
import { useCompletionSegmentation } from '../../../hooks/useCompletionSegmentation';
import { useDataset } from '../../../contexts/DatasetContext';
import { calculateRenderedImageDimensions } from '../../../utils/canvasUtils';
import { deleteObject } from '../../../utils/objectOperations';
import ContextMenuItem from './ContextMenuItem';
import HierarchicalLabelList from './HierarchicalLabelList';

const ObjectContextMenu = () => {
  const visible = useContextMenuVisible();
  const x = useContextMenuX();
  const y = useContextMenuY();
  const targetObjectId = useContextMenuTargetObjectId();
  const hideContextMenu = useHideContextMenu();
  const enterFocusModeWithZoom = useEnterFocusModeWithZoom();
  const objectsList = useObjectsList();
  const selectedObjects = useSelectedObjects();
  const imageObject = useImageObject();
  const updateObject = useUpdateObject();
  const removeObject = useRemoveObject();
  const enterRefinementMode = useEnterRefinementMode();
  const setCurrentTool = useSetCurrentTool();
  const refinementModeActive = useRefinementModeActive();
  const focusModeActive = useFocusModeActive();
  const exitFocusMode = useExitFocusMode();
  const completionModel = useCompletionModel();
  const wsIsReady = useWebSocketIsReady();
  const enterEditMode = useEnterEditMode();
  const { currentDataset } = useDataset();
  const menuRef = useRef(null);
  
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });
  
  // Get all selected objects (targets for batch operations)
  const targetObjects = React.useMemo(() => {
    return objectsList.filter(obj => selectedObjects.includes(obj.id));
  }, [objectsList, selectedObjects]);
  
  const isMultiSelect = targetObjects.length > 1;
  
  // Use labels hierarchy hook
  const { labelHierarchy, labelMap, labelsLoading } = useLabelsHierarchy(visible, currentDataset);
  
  // Use completion segmentation hook
  const { runCompletion, isRunning: isRunningCompletion } = useCompletionSegmentation(
    null, // onSuccess: objects are automatically added via WebSocket
    (error) => alert(`Failed to suggest similar instances: ${error.message || 'Unknown error'}`)
  );

  // Adjust position to keep menu within container bounds and place it intuitively next to the object
  useEffect(() => {
    if (!visible || !menuRef.current) return;

    const menu = menuRef.current;
    const menuRect = menu.getBoundingClientRect();
    
    // Get the container bounds (the canvas container)
    const container = menu.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    const offset = 10; // Small offset from cursor
    let adjustedX = x + offset;
    let adjustedY = y + offset;

    // Horizontal positioning: prefer right, flip to left if needed
    if (adjustedX + menuRect.width > containerWidth - 10) {
      adjustedX = x - menuRect.width - offset;
    }
    
    // Keep within horizontal bounds
    adjustedX = Math.max(10, Math.min(adjustedX, containerWidth - menuRect.width - 10));

    // Vertical positioning: prefer below, flip above if needed
    if (adjustedY + menuRect.height > containerHeight - 10) {
      adjustedY = y - menuRect.height - offset;
    }
    
    // Keep within vertical bounds
    adjustedY = Math.max(10, Math.min(adjustedY, containerHeight - menuRect.height - 10));

    setAdjustedPosition({ x: adjustedX, y: adjustedY });
  }, [visible, x, y]);

  // Close menu on outside click
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        hideContextMenu();
      }
    };

    // Add small delay to prevent immediate close on the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Use shared label selection hook
  const handleLabelSelectBase = useLabelSelection(
    updateObject,
    () => {
      // onSuccess: switch tool and hide menu
      setCurrentTool('ai_annotation');
      hideContextMenu();
    },
    (error) => {
      // onError: show error and hide menu
      alert(`Failed to apply label: ${error.message || 'Unknown error'}`);
      hideContextMenu();
    }
  );

  const handleLabelSelect = async (label) => {
    if (targetObjects.length === 0) {
      hideContextMenu();
      return;
    }

    // Apply label to all selected objects
    try {
      for (const targetObject of targetObjects) {
        await handleLabelSelectBase(targetObject, label);
      }
      
      // Success: menu is already hidden by handleLabelSelectBase
    } catch (error) {
      // Error is already handled by handleLabelSelectBase
      hideContextMenu();
    }
  };

  const handleFocusMode = () => {
    // Disable focus mode when in refinement mode or multiple objects selected
    if (refinementModeActive || isMultiSelect) {
      return;
    }
    
    if (!targetObjectId || !imageObject) return;

    // Find the target object
    const targetObject = objectsList.find(obj => obj.id === targetObjectId);
    if (!targetObject || !targetObject.mask) {
      hideContextMenu();
      return;
    }

    // Get the container element (the canvas container)
    const container = menuRef.current?.parentElement;
    if (!container) {
      hideContextMenu();
      return;
    }

    const containerWidth = container.offsetWidth || 800;
    const containerHeight = container.offsetHeight || 600;

    // Calculate container dimensions
    const containerDimensions = {
      width: containerWidth,
      height: containerHeight
    };

    // Calculate image dimensions (actual image size)
    const imageDimensionsForCalc = {
      width: imageObject.width || 800,
      height: imageObject.height || 600
    };

    // Calculate rendered image dimensions (how the image is displayed in the container)
    const renderedImageDimensions = calculateRenderedImageDimensions(
      imageObject,
      containerWidth,
      containerHeight
    );

    // Enter focus mode with zoom and center - pass all required parameters
    enterFocusModeWithZoom(
      targetObjectId, 
      targetObject.mask, 
      imageDimensionsForCalc, 
      containerDimensions, 
      renderedImageDimensions
    );
    hideContextMenu();
  };

  const handleReject = async () => {
    if (targetObjects.length === 0) {
      hideContextMenu();
      return;
    }

    try {
      // Delete all selected objects
      for (const targetObject of targetObjects) {
        await deleteObject(targetObject, removeObject);
      }
      
      // Switch to AI assisted annotation tool
      setCurrentTool('ai_annotation');
      
      hideContextMenu();
    } catch (error) {
      alert(`Failed to reject object(s): ${error.message || 'Unknown error'}`);
      hideContextMenu();
    }
  };

  // Use shared refinement mode hook
  const enterRefinementModeForObject = useRefinementMode({
    enterRefinementMode,
    setCurrentTool,
    exitFocusMode,
    focusModeActive,
    imageObject,
    containerRef: menuRef,
    zoomOptions: {
      marginPct: 0.25,
      maxZoom: 4,
      minZoom: 1,
    },
  });

  const handleRefine = async () => {
    // Disable refinement mode for multiple objects
    if (isMultiSelect) {
      return;
    }
    
    if (!targetObjectId) return;

    // Find the target object to get its contour_id
    const targetObject = objectsList.find(obj => obj.id === targetObjectId);
    if (!targetObject) {
      hideContextMenu();
      return;
    }

    try {
      await enterRefinementModeForObject(targetObject);
      hideContextMenu();
    } catch (error) {
      alert(`Failed to enter refinement mode: ${error.message || 'Unknown error'}`);
      hideContextMenu();
    }
  };

  const handleSuggestSimilar = async () => {
    if (targetObjects.length === 0) {
      hideContextMenu();
      return;
    }

    // Get all contour IDs from selected objects
    const contourIds = targetObjects
      .map(obj => obj.contour_id)
      .filter(id => id !== null && id !== undefined);
    
    if (contourIds.length === 0) {
      alert('Could not find contour IDs for selected objects');
      hideContextMenu();
      return;
    }

    // Check if WebSocket is ready
    if (!wsIsReady) {
      alert('WebSocket connection is not ready. Please wait or refresh the page.');
      hideContextMenu();
      return;
    }

    hideContextMenu();
    
    // Use the completion hook with all selected contour IDs as seeds
    // For multiple seeds, we'll use the first object's labelId as the default
    const labelId = targetObjects[0]?.labelId;
    
    // Pass contour IDs (hook handles both single and array)
    await runCompletion(contourIds.length === 1 ? contourIds[0] : contourIds, labelId);
  };

  const handleEditContour = () => {
    // Disable edit mode for multiple objects
    if (isMultiSelect) {
      return;
    }
    
    if (!targetObjectId) {
      hideContextMenu();
      return;
    }

    // Find the target object
    const targetObject = objectsList.find(obj => obj.id === targetObjectId);
    if (!targetObject) {
      hideContextMenu();
      return;
    }

    // Ensure object has valid coordinates
    if (!targetObject.x || !targetObject.y || targetObject.x.length === 0 || targetObject.y.length === 0) {
      alert('Cannot edit object: missing or invalid coordinates');
      hideContextMenu();
      return;
    }
    
    // Ensure contour_id exists for backend communication
    if (!targetObject.contour_id && targetObject.contour_id !== 0) {
      alert('Cannot edit object: missing contour_id');
      hideContextMenu();
      return;
    }

    // Exit focus mode if active
    if (focusModeActive) {
      exitFocusMode();
    }

    // Enter edit mode
    enterEditMode(targetObject.id, targetObject.contour_id, targetObject.x, targetObject.y);
    
    hideContextMenu();
  };

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white rounded-md shadow-xl border border-gray-200 py-1 min-w-[120px] max-w-[220px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {/* Header showing selection count */}
      {isMultiSelect && (
        <div className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border-b border-blue-100">
          {targetObjects.length} objects selected
        </div>
      )}
      
      {/* Reject Object Option */}
      <ContextMenuItem
        onClick={handleReject}
        className="hover:bg-red-50 hover:text-red-700"
        label={isMultiSelect ? `Reject ${targetObjects.length} objects` : "Reject object"}
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        }
      />

      {/* Focus Mode Option - Disabled in refinement mode or multi-select */}
      <ContextMenuItem
        onClick={handleFocusMode}
        disabled={refinementModeActive || isMultiSelect}
        title={
          isMultiSelect 
            ? 'Focus mode is disabled for multiple selections' 
            : refinementModeActive 
              ? 'Focus mode is disabled during refinement' 
              : 'Enter focus mode'
        }
        label="Focus Mode"
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        }
      />

      {/* Refine Option - Disabled for multi-select */}
      <ContextMenuItem
        onClick={handleRefine}
        disabled={isMultiSelect}
        title={isMultiSelect ? 'Refinement mode is disabled for multiple selections' : 'Refine object'}
        className="hover:bg-purple-50 hover:text-purple-700"
        label="Refine Object"
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        }
      />

      {/* Edit Contour Option - Disabled for multi-select */}
      <ContextMenuItem
        onClick={handleEditContour}
        disabled={isMultiSelect}
        title={isMultiSelect ? 'Edit contour is disabled for multiple selections' : 'Edit contour shape'}
        className="hover:bg-blue-50 hover:text-blue-700"
        label="Edit Contour"
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        }
      />

      {/* Suggest Similar Instances Option */}
      <ContextMenuItem
        onClick={handleSuggestSimilar}
        disabled={isRunningCompletion || !completionModel || !wsIsReady}
        className="hover:bg-green-50 hover:text-green-700"
        title={
          !completionModel 
            ? 'Select a completion model first' 
            : !wsIsReady 
              ? 'WebSocket not ready' 
              : isMultiSelect
                ? `Use ${targetObjects.length} objects as seeds for completion segmentation`
                : 'Find similar instances using completion segmentation'
        }
        label={isRunningCompletion ? 'Finding similar...' : 'Suggest Similar Instances'}
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        }
      />

      {/* Label section header */}
      <div className="px-3 py-1 text-xs font-medium text-gray-600 border-b border-gray-100">
        {isMultiSelect ? `Assign label to ${targetObjects.length} objects` : 'Label'}
      </div>
      
      {/* Hierarchical label list */}
      <HierarchicalLabelList
        labelHierarchy={labelHierarchy}
        labelsLoading={labelsLoading}
        onLabelSelect={handleLabelSelect}
      />
    </div>
  );
};

export default ObjectContextMenu;

