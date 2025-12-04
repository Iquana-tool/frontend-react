import React, { useEffect, useRef, useState } from 'react';
import {
  useContextMenuVisible,
  useContextMenuX,
  useContextMenuY,
  useContextMenuTargetObjectId,
  useHideContextMenu,
  useEnterFocusModeWithZoom,
  useObjectsList,
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
  const { currentDataset } = useDataset();
  const menuRef = useRef(null);
  
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });
  
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
    if (!targetObjectId) return;

    // Find the target object to get its contour_id
    const targetObject = objectsList.find(obj => obj.id === targetObjectId);
    if (!targetObject) {
      hideContextMenu();
      return;
    }

    await handleLabelSelectBase(targetObject, label);
  };

  const handleFocusMode = () => {
    // Disable focus mode when in refinement mode
    if (refinementModeActive) {
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
    if (!targetObjectId) return;

    // Find the target object to get its contour_id
    const targetObject = objectsList.find(obj => obj.id === targetObjectId);
    if (!targetObject) {
      hideContextMenu();
      return;
    }

    try {
      await deleteObject(targetObject, removeObject);
      
      // Switch to AI assisted annotation tool
      setCurrentTool('ai_annotation');
      
      hideContextMenu();
    } catch (error) {
      alert(`Failed to reject object: ${error.message || 'Unknown error'}`);
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
    if (!targetObjectId) return;

    // Find the target object to get its contour_id
    const targetObject = objectsList.find(obj => obj.id === targetObjectId);
    if (!targetObject || !targetObject.contour_id) {
      alert('Could not find contour ID for this object');
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
    
    // Use the completion hook
    await runCompletion(targetObject.contour_id, completionModel, targetObject.labelId);
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
      {/* Reject Object Option */}
      <ContextMenuItem
        onClick={handleReject}
        className="hover:bg-red-50 hover:text-red-700"
        label="Reject object"
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        }
      />

      {/* Focus Mode Option - Disabled in refinement mode */}
      <ContextMenuItem
        onClick={handleFocusMode}
        disabled={refinementModeActive}
        title={refinementModeActive ? 'Focus mode is disabled during refinement' : 'Enter focus mode'}
        label="Focus Mode"
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        }
      />

      {/* Refine Option */}
      <ContextMenuItem
        onClick={handleRefine}
        className="hover:bg-purple-50 hover:text-purple-700"
        label="Refine Object"
        icon={
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
        Label
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

