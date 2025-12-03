import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Edit3, Trash2, ChevronDown, CheckCircle, XCircle, X, UserCheck } from 'lucide-react';
import { 
  useSelectedObjects, 
  useSelectObject, 
  useDeselectObject, 
  useRemoveObject,
  useUpdateObject,
  useImageObject,
  useSetZoomLevel,
  useSetPanOffset,
  useEnterRefinementMode,
  useSetCurrentTool,
  useFocusModeActive,
  useExitFocusMode,
  useCurrentTool,
  useEnterFocusMode,
  useRefinementModeActive,
  useAnnotationStatus,
} from '../../../stores/selectors/annotationSelectors';
import { useZoomToObject } from '../../../hooks/useZoomToObject';
import { useRefinementMode } from '../../../hooks/useRefinementMode';
import { useLabelSelection } from '../../../hooks/useLabelSelection';
import { useDataset } from '../../../contexts/DatasetContext';
import { fetchLabels } from '../../../api/labels';
import { markContourAsReviewed } from '../../../api/contours';
import { extractLabelsFromResponse } from '../../../utils/labelHierarchy';
import { hexToRgba } from '../../../utils/labelColors';
import { calculateRenderedImageDimensions, getCanvasContainer } from '../../../utils/canvasUtils';
import { getContourId, extractLabelInfo } from '../../../utils/objectUtils';
import { deleteObject } from '../../../utils/objectOperations';

const ObjectItem = ({ object, isTemporary = false, variant = 'permanent' }) => {
  const selectedObjects = useSelectedObjects();
  const selectObject = useSelectObject();
  const deselectObject = useDeselectObject();
  const removeObject = useRemoveObject();
  const updateObject = useUpdateObject();
  const enterRefinementMode = useEnterRefinementMode();
  const setCurrentTool = useSetCurrentTool();
  const focusModeActive = useFocusModeActive();
  const exitFocusMode = useExitFocusMode();
  const currentTool = useCurrentTool();
  const enterFocusMode = useEnterFocusMode();
  const refinementModeActive = useRefinementModeActive();
  const annotationStatus = useAnnotationStatus();
  const { currentDataset } = useDataset();
  const imageObject = useImageObject();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();
  
  // Use the modular zoom hook
  const { zoomToObject: zoomToObjectFn } = useZoomToObject({
    marginPct: 0.2,
    maxZoom: 4, // Cap at 400% (max zoom)
    minZoom: 1
  });
  
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labels, setLabels] = useState([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const singleClickTimeoutRef = useRef(null);
  
  const isSelected = selectedObjects.includes(object.id);
  const isVisible = true; // For now, assume all objects are visible
  // Determine if reviewed based on reviewed_by field (ignore prop, use actual data)
  const isReviewed = object.reviewed_by && object.reviewed_by.length > 0;
  // An object is "temporary" (unreviewed) if it hasn't been reviewed yet
  const isUnreviewed = !isReviewed;
  const isReviewable = annotationStatus === 'reviewable' || annotationStatus === 'finished';

  // Helper function to check if an object has a valid label
  const hasValidLabel = (obj) => {
    if (!obj.label) return false;
    // Convert to string and trim
    const labelStr = String(obj.label || '').trim();
    if (!labelStr || labelStr === 'Object') return false;
    // Check if label is just a number (like "2") - these are not valid labels
    if (/^\d+$/.test(labelStr)) return false;
    return true;
  };

  // Compute display name: if labeled, show "{label} #{id}", otherwise "Object #{id}"
  const displayName = React.useMemo(() => {
    // Only compute label-based name for reviewed objects with valid labels
    if (isReviewed && hasValidLabel(object)) {
      return `${object.label} #${object.id}`;
    }
    
    // For unlabeled objects or unreviewed objects, show default format
    return `Object #${object.id}`;
  }, [object.id, object.label, isReviewed]);

  const handleToggleSelection = () => {
    if (isSelected) {
      deselectObject(object.id);
    } else {
      selectObject(object.id);
    }
  };

  const performPanZoom = () => {
    if (!imageObject || !object.x || !object.y || object.x.length === 0) {
      return;
    }

    // Get image dimensions
    const imageDimensions = {
      width: imageObject.width,
      height: imageObject.height
    };

    // Find the canvas container
    const container = getCanvasContainer(null);
    if (!container) {
      return;
    }

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    if (!containerWidth || !containerHeight) {
      return;
    }

    // Calculate rendered image dimensions (object-contain sizing)
    const renderedImageDimensions = calculateRenderedImageDimensions(
      imageObject,
      containerWidth,
      containerHeight
    );

    // Use the modular zoom hook
    zoomToObjectFn(
      object, // Object with x, y arrays
      imageDimensions,
      { width: containerWidth, height: containerHeight },
      renderedImageDimensions,
      {
        animateMs: 320, // Smooth animation
        immediate: false
      }
    );
  };

  const resetView = () => {
    // Reset zoom and pan to default view (show entire image)
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Use shared refinement mode hook
  const enterRefinementModeForObject = useRefinementMode({
    enterRefinementMode,
    setCurrentTool,
    exitFocusMode,
    focusModeActive,
    imageObject,
    containerRef: null, // Will use getCanvasContainer fallback
    zoomOptions: {
      marginPct: 0.2,
      maxZoom: 4,
      minZoom: 1,
    },
  });

  const handleDoubleClick = async () => {
    // Double-click enters refinement mode
    try {
      await enterRefinementModeForObject(object);
    } catch (error) {
      alert(`Failed to enter refinement mode: ${error.message || 'Unknown error'}`);
    }
  };

  const handleItemClick = (e) => {
    // Don't trigger if clicking action buttons or chevron
    if (e.target.closest('button')) {
      return;
    }
    
    // Detect double-click
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;
    
    if (timeDiff < 300 && lastClickTime > 0) {
      // Double-click detected - cancel pending single-click action
      if (singleClickTimeoutRef.current) {
        clearTimeout(singleClickTimeoutRef.current);
        singleClickTimeoutRef.current = null;
      }
      handleDoubleClick();
      setLastClickTime(0); // Reset to prevent triple-clicks
      return;
    }
    
    setLastClickTime(currentTime);
    
    // Clear any existing timeout
    if (singleClickTimeoutRef.current) {
      clearTimeout(singleClickTimeoutRef.current);
    }
    
    // Delay single-click action to allow double-click detection
    singleClickTimeoutRef.current = setTimeout(() => {
      singleClickTimeoutRef.current = null;
      
      // Single click: Toggle selection, enter focus mode (if appropriate), and zoom/pan to object
      if (isSelected) {
        // If already selected, deselect it
        deselectObject(object.id);
        // Exit focus mode if active
        if (focusModeActive) {
          exitFocusMode();
        }
        // If this was the only selected object, reset view
        if (selectedObjects.length === 1) {
          resetView();
        }
      } else {
        // If not selected, select it
        selectObject(object.id);
        
        // Enter focus mode if:
        // 1. Not in refinement mode
        // 2. Using selection tool (not AI annotation tool)
        // 3. Object has valid coordinates
        if (!refinementModeActive && currentTool === 'selection' && 
            imageObject && object.x && object.y && object.x.length > 0) {
          const mask = object.mask || (object.path ? { path: object.path } : null);
          if (mask) {
            enterFocusMode(object.id, mask);
          }
        }
        
        // Pan/zoom to the object
        performPanZoom();
      }
    }, 200); // Wait 200ms to see if a second click comes
  };

  const handleEdit = (e) => {
    e?.stopPropagation();
    // TODO: Implement edit functionality
  };

  const handleDelete = async (e) => {
    e?.stopPropagation();
    
    try {
      await deleteObject(object, removeObject);
    } catch (error) {
      alert(`Failed to delete object: ${error.message || 'Unknown error'}`);
    }
  };

  // Fetch labels when modal opens
  useEffect(() => {
    if (!showLabelModal || !currentDataset) return;

    const loadLabels = async () => {
      setLabelsLoading(true);
      try {
        const labelsData = await fetchLabels(currentDataset.id);
        const labelsArray = extractLabelsFromResponse(labelsData, true); // rootOnly = true
        setLabels(labelsArray);
      } catch (error) {
        setLabels([]);
      } finally {
        setLabelsLoading(false);
      }
    };

    loadLabels();
  }, [showLabelModal, currentDataset]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (singleClickTimeoutRef.current) {
        clearTimeout(singleClickTimeoutRef.current);
      }
    };
  }, []);

  const handleAccept = (e) => {
    e?.stopPropagation();
    // Show label selection modal instead of directly accepting
    if (!currentDataset) {
      alert('Please select a dataset first');
      return;
    }
    setShowLabelModal(true);
  };

  // Use shared label selection hook
  const handleLabelSelect = useLabelSelection(
    updateObject,
    () => setShowLabelModal(false), // onSuccess: close modal
    (error) => alert(`Failed to accept object: ${error.message || 'Unknown error'}`) // onError
  );

  const handleLabelSelectWrapper = async (label) => {
    if (!label) return;
    await handleLabelSelect(object, label);
  };

  const handleCloseModal = () => {
    setShowLabelModal(false);
  };

  const handleReject = async (e) => {
    e?.stopPropagation();
    // Reject temporary object: delete it
    try {
      await deleteObject(object, removeObject);
    } catch (error) {
      alert(`Failed to reject object: ${error.message || 'Unknown error'}`);
    }
  };

  const handleMarkAsReviewed = async (e) => {
    e?.stopPropagation();
    const contourId = getContourId(object);
    
    try {
      // Mark contour as reviewed
      const response = await markContourAsReviewed(contourId);
      
      // Update the object in the store to mark it as reviewed
      // Use actual reviewer data from response if available
      updateObject(object.id, {
        reviewed_by: response.reviewed_by || ['current_user'],
      });
    } catch (error) {
      alert(`Failed to mark as reviewed: ${error.message || 'Unknown error'}`);
    }
  };

  // Use object's color for styling
  const objectColor = object.color || '#3b82f6'; // Default to blue if no color
  const borderColorStyle = isSelected 
    ? objectColor 
    : hexToRgba(objectColor, 0.3); // Lighter border when not selected
  const bgColorStyle = isSelected
    ? hexToRgba(objectColor, 0.15) // More visible when selected
    : hexToRgba(objectColor, 0.08); // Subtle background

  return (
    <div 
      className="border rounded-lg p-3 transition-all cursor-pointer hover:shadow-sm"
      style={{
        borderColor: borderColorStyle,
        backgroundColor: bgColorStyle,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = hexToRgba(objectColor, 0.12);
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = hexToRgba(objectColor, 0.08);
        }
      }}
      onClick={handleItemClick}
    >
      {/* Object Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSelection();
              // Don't pan/zoom when clicking chevron - only expand/collapse
            }}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${
              isSelected ? 'rotate-0' : '-rotate-90'
            }`} />
          </button>
          <span 
            className="font-medium text-sm text-gray-800"
            title="Click to select and zoom to object"
          >
            {displayName}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          {isUnreviewed ? (
            // Unreviewed object actions (Accept/Reject - accepting assigns label which auto-reviews)
            <>
              <button
                onClick={handleAccept}
                className="p-1 hover:bg-green-100 rounded transition-colors"
                title="Assign label (auto-reviews)"
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
              </button>
              
              <button
                onClick={handleReject}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Reject object"
              >
                <XCircle className="w-4 h-4 text-red-600" />
              </button>
            </>
          ) : (
            // Reviewed object actions (Visibility/Review/Edit/Delete)
            <>
              {/* Show review button for reviewable objects that could have additional reviewers */}
              {isReviewable && (
                <button
                  onClick={handleMarkAsReviewed}
                  className="p-1 hover:bg-blue-100 rounded transition-colors"
                  title="Add yourself as reviewer"
                >
                  <UserCheck className="w-4 h-4 text-blue-600" />
                </button>
              )}
              
              {/* Show reviewed badge for reviewed objects */}
              {isReviewed && (
                <div className="p-1" title={`Reviewed by: ${object.reviewed_by?.join(', ')}`}>
                  <UserCheck className="w-4 h-4 text-green-600" />
                </div>
              )}
              
              <button
                onClick={() => {/* TODO: Toggle visibility */}}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={isVisible ? 'Hide object' : 'Show object'}
              >
                {isVisible ? (
                  <Eye className="w-4 h-4 text-gray-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              <button
                onClick={handleEdit}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Edit object"
              >
                <Edit3 className="w-4 h-4 text-gray-600" />
              </button>
              
              <button
                onClick={handleDelete}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Delete object"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Object Details (shown when selected) */}
      {isSelected && (
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded border border-gray-300" 
              style={{ backgroundColor: object.color }}
            />
            <span>{object.pixelCount || 0} pixels</span>
          </div>
          
          {object.label && (
            <div className="bg-gray-100 px-2 py-1 rounded text-xs">
              {object.label}
            </div>
          )}
        </div>
      )}

      {/* Label Selection Modal */}
      {showLabelModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Select Label</h3>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Please select a label for this object before accepting it.
            </p>

            {labelsLoading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">Loading labels...</div>
              </div>
            ) : labels.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm font-medium mb-2">No labels available</div>
                <div className="text-xs">Please create labels for this dataset first.</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => handleLabelSelectWrapper(label)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 flex items-center border border-gray-200 rounded-lg"
                  >
                    <div className="w-2 h-2 rounded-full bg-gray-300 mr-3 flex-shrink-0"></div>
                    {label.name}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObjectItem;
