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
} from '../../../stores/selectors/annotationSelectors';
import annotationSession from '../../../services/annotationSession';
import { useDataset } from '../../../contexts/DatasetContext';
import { fetchLabels } from '../../../api/labels';
import { editContourLabel } from '../../../api/masks';
import { extractLabelsFromResponse } from '../../../utils/labelHierarchy';

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
  const { currentDataset } = useDataset();
  const menuRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });
  const [labels, setLabels] = useState([]);
  const [labelsLoading, setLabelsLoading] = useState(false);

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
        const labelsArray = extractLabelsFromResponse(labelsData, true); // rootOnly = true
        setLabels(labelsArray);
      } catch (error) {
        console.error('Failed to fetch labels:', error);
        setLabels([]);
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
      console.error('Target object not found');
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
      
      hideContextMenu();
    } catch (error) {
      console.error('Failed to apply label:', error);
      // Show user-friendly error message
      alert(`Failed to apply label: ${error.message || 'Unknown error'}`);
      hideContextMenu();
    }
  };

  const handleFocusMode = () => {
    if (!targetObjectId || !imageObject) return;

    // Find the target object
    const targetObject = objectsList.find(obj => obj.id === targetObjectId);
    if (!targetObject || !targetObject.mask) {
      console.error('Target object not found or has no mask');
      hideContextMenu();
      return;
    }

    // Get the container element (the canvas container)
    const container = menuRef.current?.parentElement;
    if (!container) {
      console.error('Container element not found');
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

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white rounded-md shadow-xl border border-gray-200 py-1 min-w-[120px] max-w-[140px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {/* Focus Mode Option */}
      <button
        onClick={handleFocusMode}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 flex items-center border-b border-gray-100"
      >
        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
        Focus Mode
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
      ) : labels.length === 0 ? (
        <div className="px-3 py-2 text-xs text-gray-500 text-center">
          No labels available
        </div>
      ) : (
        labels.map((label) => (
          <button
            key={label.id}
            onClick={() => handleLabelSelect(label)}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 flex items-center"
          >
            <div className="w-2 h-2 rounded-full bg-gray-300 mr-2 flex-shrink-0"></div>
            {label.name}
          </button>
        ))
      )}
    </div>
  );
};

export default ObjectContextMenu;

