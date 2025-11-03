import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Edit3, Trash2, ChevronDown, CheckCircle, XCircle, X } from 'lucide-react';
import { 
  useSelectedObjects, 
  useSelectObject, 
  useDeselectObject, 
  useRemoveObject,
  useUpdateObject,
  useObjectsList,
  usePanZoomToObject,
  useImageObject,
  useSetZoomLevel,
  useSetPanOffset,
} from '../../../stores/selectors/annotationSelectors';
import annotationSession from '../../../services/annotationSession';
import { useDataset } from '../../../contexts/DatasetContext';
import { fetchLabels } from '../../../api/labels';
import { editContourLabel } from '../../../api/masks';

const ObjectItem = ({ object, isTemporary = false, variant = 'permanent' }) => {
  const selectedObjects = useSelectedObjects();
  const selectObject = useSelectObject();
  const deselectObject = useDeselectObject();
  const removeObject = useRemoveObject();
  const updateObject = useUpdateObject();
  const objectsList = useObjectsList();
  const { currentDataset } = useDataset();
  const panZoomToObject = usePanZoomToObject();
  const imageObject = useImageObject();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();
  
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labels, setLabels] = useState([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  
  const isSelected = selectedObjects.includes(object.id);
  const isVisible = true; // For now, assume all objects are visible

  const handleToggleSelection = () => {
    if (isSelected) {
      deselectObject(object.id);
    } else {
      selectObject(object.id);
    }
  };

  const performPanZoom = () => {
    if (!imageObject || !object.x || !object.y || object.x.length === 0) {
      console.warn('Cannot pan/zoom: missing image or object coordinates');
      return;
    }
    
    // Convert normalized x/y arrays (0-1) to pixel coordinates
    const points = object.x.map((x, i) => {
      return [x * imageObject.width, object.y[i] * imageObject.height];
    });

    // Construct mask with points for panZoomToObject
    const mask = { points };

    // Get image dimensions
    const imageDimensions = {
      width: imageObject.width,
      height: imageObject.height
    };

    // Find the canvas container
    const container = document.querySelector('.relative.overflow-hidden');
    if (!container) {
      console.warn('Canvas container not found');
      return;
    }

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    if (!containerWidth || !containerHeight) {
      console.warn('Container dimensions not available');
      return;
    }

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

    panZoomToObject(
      mask,
      imageDimensions,
      { width: containerWidth, height: containerHeight },
      { width: renderedWidth, height: renderedHeight, x: renderedX, y: renderedY }
    );
  };

  const resetView = () => {
    // Reset zoom and pan to default view (show entire image)
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleItemClick = (e) => {
    // Don't trigger if clicking action buttons or chevron
    if (e.target.closest('button')) {
      return;
    }
    
    // Toggle selection only - no panning or zooming
    if (isSelected) {
      // If already selected, deselect it
      deselectObject(object.id);
    } else {
      // If not selected, select it (without pan/zoom)
      selectObject(object.id);
    }
  };

  const handleEdit = (e) => {
    e?.stopPropagation();
    // TODO: Implement edit functionality
    console.log('Edit object:', object.id);
  };

  const handleDelete = async (e) => {
    e?.stopPropagation();
    // Delete from backend first
    const contourId = object.contour_id || object.id;
    
    try {
      // Delete from backend
      await annotationSession.deleteObject(contourId);
      
      // Remove from store
      removeObject(object.id);
      
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
        // Handle both array response and object response
        const labelsArray = Array.isArray(labelsData) 
          ? labelsData 
          : labelsData?.labels || [];
        
        // Filter only root-level labels (no parent_id) for selection
        const rootLabels = labelsArray.filter(label => !label.parent_id);
        setLabels(rootLabels);
      } catch (error) {
        console.error('Failed to fetch labels:', error);
        setLabels([]);
      } finally {
        setLabelsLoading(false);
      }
    };

    loadLabels();
  }, [showLabelModal, currentDataset]);

  const handleAccept = (e) => {
    e?.stopPropagation();
    // Show label selection modal instead of directly accepting
    if (!currentDataset) {
      alert('Please select a dataset first');
      return;
    }
    setShowLabelModal(true);
  };

  const handleLabelSelect = async (label) => {
    if (!label) return;

    // Use contour_id for backend calls if available, otherwise fall back to store ID
    const contourId = object.contour_id || object.id;
    
    // label is now an object with { id, name }, extract the ID
    const labelId = typeof label === 'object' ? label.id : label;
    const labelName = typeof label === 'object' ? label.name : label;

    try {
      // Update label using REST API endpoint
      await editContourLabel(contourId, labelId);
      
      // Update temporary flag to mark as reviewed (move from Reviewable to Reviewed Objects)
      await annotationSession.modifyObject(contourId, {
        temporary: false,
      });
      
      // Update the object in the store to mark it as reviewed (temporary: false)
      updateObject(object.id, {
        label: labelName, // Store label name for display
        labelId: labelId, // Store label ID for future reference
        temporary: false,
      });
      
      console.log(`Applied label "${labelName}" (ID: ${labelId}) to object ${object.id} (contour_id: ${contourId}) and moved to Reviewed Objects`);
      setShowLabelModal(false);
    } catch (error) {
      console.error('Failed to accept object with label:', error);
      alert(`Failed to accept object: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCloseModal = () => {
    setShowLabelModal(false);
  };

  const handleReject = async (e) => {
    e?.stopPropagation();
    // Reject temporary object: delete it
    const contourId = object.contour_id || object.id;
    
    try {
      // Delete from backend
      await annotationSession.deleteObject(contourId);
      
      // Remove from store
      removeObject(object.id);
      
      console.log(`Rejected and deleted object ${object.id} (contour_id: ${contourId})`);
    } catch (error) {
      console.error('Failed to reject object:', error);
      alert(`Failed to reject object: ${error.message || 'Unknown error'}`);
    }
  };

  // Variant-specific styling
  const borderColor = isTemporary 
    ? (isSelected ? 'border-purple-400' : 'border-purple-200')
    : (isSelected ? 'border-teal-400' : 'border-gray-200');
    
  const bgColor = isTemporary
    ? (isSelected ? 'bg-purple-50' : 'bg-purple-25 hover:bg-purple-50')
    : (isSelected ? 'bg-teal-50' : 'bg-white hover:bg-gray-50');

  return (
    <div 
      className={`border rounded-lg p-3 transition-colors cursor-pointer ${borderColor} ${bgColor}`}
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
            title="Click to select object"
          >
            Object #{object.id}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          {isTemporary ? (
            // Temporary object actions (Accept/Reject)
            <>
              <button
                onClick={handleAccept}
                className="p-1 hover:bg-green-100 rounded transition-colors"
                title="Accept object"
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
            // Permanent object actions (Visibility/Edit/Delete)
            <>
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
                    onClick={() => handleLabelSelect(label)}
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
