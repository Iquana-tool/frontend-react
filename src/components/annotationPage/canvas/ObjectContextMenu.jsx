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
} from '../../../stores/selectors/annotationSelectors';
import { useZoomToObject } from '../../../hooks/useZoomToObject';
import annotationSession from '../../../services/annotationSession';
import { useDataset } from '../../../contexts/DatasetContext';
import { fetchLabels } from '../../../api/labels';
import { editContourLabel } from '../../../api/masks';
import { extractLabelsFromResponse, buildLabelHierarchy } from '../../../utils/labelHierarchy';

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
  const { currentDataset } = useDataset();
  const menuRef = useRef(null);
  
  // Use the zoom hook for pan/zoom functionality
  const { zoomToObject } = useZoomToObject({
    marginPct: 0.25,
    maxZoom: 4,
    minZoom: 1,
    animationDuration: 300
  });
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });
  const [labelHierarchy, setLabelHierarchy] = useState([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelMap, setLabelMap] = useState(new Map()); // Map to store all labels for parent lookup

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

  // Fetch labels when dataset changes or menu becomes visible
  useEffect(() => {
    if (!visible || !currentDataset) return;

    const loadLabels = async () => {
      setLabelsLoading(true);
      try {
        const labelsData = await fetchLabels(currentDataset.id);
        const labelsArray = extractLabelsFromResponse(labelsData, false); // Include all labels (parent and sub-labels)
        
        // Build hierarchical structure
        const hierarchy = buildLabelHierarchy(labelsArray);
        setLabelHierarchy(hierarchy);
        
        // Create a map for quick lookup
        const map = new Map();
        labelsArray.forEach(label => {
          map.set(label.id, label);
        });
        setLabelMap(map);
      } catch (error) {
        setLabelHierarchy([]);
        setLabelMap(new Map());
      } finally {
        setLabelsLoading(false);
      }
    };

    loadLabels();
  }, [visible, currentDataset]);

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

  const handleLabelSelect = async (label) => {
    if (!targetObjectId) return;

    // Find the target object to get its contour_id
    const targetObject = objectsList.find(obj => obj.id === targetObjectId);
    if (!targetObject) {
      hideContextMenu();
      return;
    }

    // Use contour_id for backend calls if available, otherwise fall back to store ID
    const contourId = targetObject.contour_id || targetObjectId;
    
    // label is now an object with { id, name }, extract the ID
    const labelId = typeof label === 'object' ? label.id : label;
    const labelName = typeof label === 'object' ? label.name : label;

    try {
      // Update label using REST API endpoint (WebSocket modifyObject doesn't support label updates)
      await editContourLabel(contourId, labelId);
      
      // Update temporary flag to mark as reviewed (move from Reviewable to Reviewed Objects)
      // The WebSocket modifyObject works for temporary field
      await annotationSession.modifyObject(contourId, {
        temporary: false,
      });
      
      // Update the object in the store to mark it as reviewed (temporary: false)
      // The store will automatically assign labelAssignmentOrder when label is assigned
      updateObject(targetObjectId, {
        label: labelName, // Store label name for display
        labelId: labelId, // Store label ID for future reference
        temporary: false,
      });
      
      // Switch to AI assisted annotation tool
      setCurrentTool('ai_annotation');
      
      hideContextMenu();
    } catch (error) {
      // Show user-friendly error message
      alert(`Failed to apply label: ${error.message || 'Unknown error'}`);
      hideContextMenu();
    }
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
    const imageAspect = imageDimensionsForCalc.width / imageDimensionsForCalc.height;
    const containerAspect = containerWidth / containerHeight;

    let renderedWidth, renderedHeight, x, y;

    if (imageAspect > containerAspect) {
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imageAspect;
      x = 0;
      y = (containerHeight - renderedHeight) / 2;
    } else {
      renderedWidth = containerHeight * imageAspect;
      renderedHeight = containerHeight;
      x = (containerWidth - renderedWidth) / 2;
      y = 0;
    }

    const renderedImageDimensions = {
      width: renderedWidth,
      height: renderedHeight,
      x,
      y
    };

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

    // Use contour_id for backend calls if available, otherwise fall back to store ID
    const contourId = targetObject.contour_id || targetObjectId;

    try {
      // Delete from backend
      await annotationSession.deleteObject(contourId);
      
      // Remove from store
      removeObject(targetObjectId);
      
      // Switch to AI assisted annotation tool
      setCurrentTool('ai_annotation');
      
      hideContextMenu();
    } catch (error) {
      alert(`Failed to reject object: ${error.message || 'Unknown error'}`);
      hideContextMenu();
    }
  };

  const handleRefine = async () => {
    if (!targetObjectId) return;

    // Find the target object to get its contour_id
    const targetObject = objectsList.find(obj => obj.id === targetObjectId);
    if (!targetObject) {
      hideContextMenu();
      return;
    }

    // Use contour_id for backend calls if available, otherwise fall back to store ID
    const contourId = targetObject.contour_id || targetObjectId;

    try {
      // Exit focus mode if active (refinement mode replaces focus mode)
      if (focusModeActive) {
        exitFocusMode();
      }
      
      // Send refinement selection to backend
      await annotationSession.selectRefinementObject(contourId);
      
      // Enter refinement mode in the store
      enterRefinementMode(targetObjectId, contourId);
      
      // Switch to AI annotation tool
      setCurrentTool('ai_annotation');
      
      // Zoom and pan to the object (similar to focus mode)
      if (imageObject && targetObject.x && targetObject.y && targetObject.x.length > 0) {
        const container = menuRef.current?.parentElement;
        if (container) {
          const containerWidth = container.offsetWidth || 800;
          const containerHeight = container.offsetHeight || 600;
          
          if (containerWidth && containerHeight) {
            const imageDimensionsForCalc = {
              width: imageObject.width,
              height: imageObject.height
            };
            
            const containerDimensions = {
              width: containerWidth,
              height: containerHeight
            };
            
            // Calculate rendered image dimensions (object-contain sizing)
            const imageAspect = imageObject.width / imageObject.height;
            const containerAspect = containerWidth / containerHeight;
            
            let renderedWidth, renderedHeight, renderedX, renderedY;
            
            if (imageAspect > containerAspect) {
              renderedWidth = containerWidth;
              renderedHeight = containerWidth / imageAspect;
              renderedX = 0;
              renderedY = (containerHeight - renderedHeight) / 2;
            } else {
              renderedWidth = containerHeight * imageAspect;
              renderedHeight = containerHeight;
              renderedX = (containerWidth - renderedWidth) / 2;
              renderedY = 0;
            }
            
            const renderedImageDimensions = {
              width: renderedWidth,
              height: renderedHeight,
              x: renderedX,
              y: renderedY
            };
            
            // Use the zoom hook to zoom/pan to the object
            zoomToObject(
              targetObject, // Object with x, y arrays
              imageDimensionsForCalc,
              containerDimensions,
              renderedImageDimensions,
              { animateMs: 300, immediate: false }
            );
          }
        }
      }
      
      hideContextMenu();
    } catch (error) {
      alert(`Failed to enter refinement mode: ${error.message || 'Unknown error'}`);
      hideContextMenu();
    }
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
      <button
        onClick={handleReject}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 flex items-center border-b border-gray-100"
      >
        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Reject object
      </button>

      {/* Focus Mode Option - Disabled in refinement mode */}
      <button
        onClick={handleFocusMode}
        disabled={refinementModeActive}
        className={`w-full text-left px-3 py-2 text-sm transition-colors duration-150 flex items-center border-b border-gray-100 ${
          refinementModeActive
            ? 'text-gray-400 cursor-not-allowed opacity-50'
            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
        }`}
        title={refinementModeActive ? 'Focus mode is disabled during refinement' : 'Enter focus mode'}
      >
        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
        Focus Mode
      </button>

      {/* Refine Option */}
      <button
        onClick={handleRefine}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors duration-150 flex items-center border-b border-gray-100"
      >
        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Refine Object
      </button>

      {/* Compact header */}
      <div className="px-3 py-1 text-xs font-medium text-gray-600 border-b border-gray-100">
        Label
      </div>
      
      {/* Label options */}
      {labelsLoading ? (
        <div className="px-3 py-2 text-xs text-gray-500 text-center">
          Loading labels...
        </div>
      ) : labelHierarchy.length === 0 ? (
        <div className="px-3 py-2 text-xs text-gray-500 text-center">
          No labels available
        </div>
      ) : (
        (() => {
          // Flatten hierarchy with proper indentation for display
          const renderLabel = (label, depth = 0) => {
            const indent = depth * 16; // 16px indent per level
            
            return (
              <React.Fragment key={label.id}>
                <button
                  onClick={() => handleLabelSelect(label)}
                  className="w-full text-left py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 flex items-center"
                  style={{ paddingLeft: `${12 + indent}px`, paddingRight: '12px' }}
                >
                  <div className="w-2 h-2 rounded-full bg-gray-300 mr-2 flex-shrink-0"></div>
                  <span className="truncate">{label.name}</span>
                </button>
                {/* Render children if any */}
                {label.children && label.children.length > 0 && 
                  label.children.map(child => renderLabel(child, depth + 1))
                }
              </React.Fragment>
            );
          };
          
          return labelHierarchy.map(label => renderLabel(label));
        })()
      )}
    </div>
  );
};

export default ObjectContextMenu;

