import React, { useState, useRef, useEffect, useCallback } from "react";
import { Edit, Save, Trash2, Plus, X, CheckCircle, Tag, AlertTriangle } from "lucide-react";
import * as api from "../../api";
import { useDataset } from '../../contexts/DatasetContext';

// Add these styles for the toast notification
const toastStyles = `
  .toast-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 350px;
    background-color: white;
    color: #111827;
    padding: 0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    overflow: hidden;
    animation: slide-in 0.3s ease-out forwards;
  }
  
  .toast-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #f3f4f6;
    background-color: #f9fafb;
  }
  
  .toast-content {
    padding: 12px 16px;
  }
  
  .toast-progress {
    height: 3px;
    background: linear-gradient(to right, #34d399, #10b981);
    width: 100%;
    animation: shrink 5s linear forwards;
  }
  
  @keyframes slide-in {
    0% {
      transform: translateX(400px);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slide-out {
    0% {
      transform: translateX(0);
      opacity: 1;
    }
    100% {
      transform: translateX(400px);
      opacity: 0;
    }
  }
  
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
  
  .toast-exit {
    animation: slide-out 0.3s ease-in forwards;
  }
`;

const ContourEditor = ({
  mask,
  image,
  onMaskUpdated,
  onCancel
}) => {
  const { currentDataset } = useDataset();
  const [selectedContourIndex, setSelectedContourIndex] = useState(null);
  const [editedContours, setEditedContours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [, setScale] = useState(1);
  const [availableLabels, setAvailableLabels] = useState([]);
  const [showLabelSelector, setShowLabelSelector] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [showDeleteLabelModal, setShowDeleteLabelModal] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState(null);

  // Add effect for toast animations
  useEffect(() => {
    // Create a style element for toast animations
    const styleEl = document.createElement('style');
    styleEl.textContent = toastStyles;
    document.head.appendChild(styleEl);
    
    // Clean up
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Update setSuccessMessage to include timeout and animation
  const setSuccessMessageWithTimeout = (message, timeout = 5000) => {
    setSuccessMessage(message);
    
    // Clear any existing timers
    if (window.successMessageTimer) {
      clearTimeout(window.successMessageTimer);
    }
    
    // Set a timer to clear the message
    window.successMessageTimer = setTimeout(() => {
      // Add exit animation class
      const toastElement = document.querySelector('.toast-notification');
      if (toastElement) {
        toastElement.classList.add('toast-exit');
        
        // Clear message after animation completes
        setTimeout(() => {
          setSuccessMessage(null);
        }, 300); // Match animation duration
      } else {
        setSuccessMessage(null);
      }
    }, timeout);
  };

  // Fetch all available labels when component mounts
  useEffect(() => {
    const fetchLabels = async () => {
      if (!currentDataset) {
        setAvailableLabels([]);
        return;
      }

      try {
        const labels = await api.fetchLabels(currentDataset.id);
        setAvailableLabels(labels || []);
      } catch (err) {
        console.error("Error fetching labels:", err);
        // Fallback to empty array if API fails
        setAvailableLabels([]);
      }
    };
    
    fetchLabels();
  }, [currentDataset]);

  // Helper to get default label id
  const getDefaultLabelId = useCallback(() => {
    const generic = availableLabels.find(label => label.name === "New class 1");
    if (generic) return generic.id;
    return availableLabels.length > 0 ? availableLabels[0].id : null;
  }, [availableLabels]);

  // Handle polygon editing with different backend data formats
  const normalizeContour = useCallback((contour) => {
    // If the contour is already in the correct format, return it
    if (contour.x && contour.y && Array.isArray(contour.x) && Array.isArray(contour.y)) {
      return {
        ...contour,
        label: contour.label || getDefaultLabelId() // Default to 'New class 1' or first label
      };
    }
    // If the contour has points in an array of objects format, convert to x/y arrays
    if (contour.points && Array.isArray(contour.points)) {
      return {
        x: contour.points.map(p => p.x),
        y: contour.points.map(p => p.y),
        label: contour.label || getDefaultLabelId(),
        type: "polygon"
      };
    }
    // If we can't interpret the format, return a placeholder
    console.warn("Unrecognized contour format:", contour);
    return {
      x: [],
      y: [],
      label: contour.label || getDefaultLabelId(),
      type: "polygon"
    };
  }, [getDefaultLabelId]);

  // Draw the canvas with image and contours
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Draw all contours
      editedContours.forEach((contour, index) => {
        const isSelected = index === selectedContourIndex;
        
        // Set styles based on selection state
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = isSelected ? "#2563eb" : "#10b981";
        ctx.fillStyle = isSelected ? "rgba(37, 99, 235, 0.2)" : "rgba(16, 185, 129, 0.1)";
        
        ctx.beginPath();
        
        // Handle both data formats: points array (old) or x/y arrays (new)
        if (contour.x && contour.y && contour.x.length > 0) {
          // New format: separate x and y arrays
          ctx.moveTo(contour.x[0] * canvas.width, contour.y[0] * canvas.height);
          
          for (let i = 1; i < contour.x.length; i++) {
            ctx.lineTo(contour.x[i] * canvas.width, contour.y[i] * canvas.height);
          }
        } else if (contour.points && contour.points.length > 0) {
          // Old format: array of points with x/y properties
          const firstPoint = contour.points[0];
          ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
          
          for (let i = 1; i < contour.points.length; i++) {
            const point = contour.points[i];
            ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
          }
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw vertices for selected contour
        if (isSelected) {
          if (contour.x && contour.y) {
            // New format
            for (let i = 0; i < contour.x.length; i++) {
              ctx.fillStyle = "#2563eb";
              ctx.beginPath();
              ctx.arc(
                contour.x[i] * canvas.width,
                contour.y[i] * canvas.height,
                4,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          } else if (contour.points) {
            // Old format
            contour.points.forEach(point => {
              ctx.fillStyle = "#2563eb";
              ctx.beginPath();
              ctx.arc(
                point.x * canvas.width,
                point.y * canvas.height,
                4,
                0,
                Math.PI * 2
              );
              ctx.fill();
            });
          }
        }
      });
      
      // Draw the current polygon being created
      if (currentPolygon.length > 0) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#f59e0b";
        ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
        
        ctx.beginPath();
        
        const firstPoint = currentPolygon[0];
        ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
        
        for (let i = 1; i < currentPolygon.length; i++) {
          const point = currentPolygon[i];
          ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
        }
        
        // If we're still drawing, connect to mouse position
        if (isDrawing && currentPolygon.length > 0) {
          // This would connect to current mouse position if we tracked it
        }
        
        // Close the polygon if we have at least 3 points
        if (currentPolygon.length >= 3) {
          ctx.closePath();
        }
        
        ctx.stroke();
        ctx.fill();
        
        // Draw vertices
        currentPolygon.forEach(point => {
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(
            point.x * canvas.width,
            point.y * canvas.height,
            4,
            0,
            Math.PI * 2
          );
          ctx.fill();
        });
      }
    };
    
    img.src = image.url || `data:image/jpeg;base64,${image.data}`;
  }, [image, editedContours, selectedContourIndex, currentPolygon, isDrawing]);

  // Initialize editor with mask contours
  useEffect(() => {
    if (mask) {
      try {
        // Handle empty or missing contours gracefully
        const contours = mask.contours || [];
        
        // Convert any existing contours to ensure they have the correct format
        const normalizedContours = contours.map(normalizeContour);
        
        setEditedContours([...normalizedContours]);
      } catch (err) {
        console.error("Error processing mask contours:", err);
        setError("There was an error processing the mask data. The backend may be sending data in an unexpected format.");
        setEditedContours([]);
      }
    } else {
      setEditedContours([]);
    }
  }, [mask, normalizeContour]);

  // Set up canvas when component mounts or image/contours change
  useEffect(() => {
    if (!canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match image
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Calculate canvas position for coordinate conversion
    const rect = canvas.getBoundingClientRect();
    setCanvasOffset({
      x: rect.left,
      y: rect.top
    });
    
    // Calculate scale factor if canvas is displayed at different size than its internal dimensions
    setScale(canvas.clientWidth / canvas.width);
    
    // Draw the image and contours
    drawCanvas();
  }, [image, editedContours, selectedContourIndex, currentPolygon, drawCanvas]);

  // Convert screen coordinates to canvas coordinates (normalized 0-1)
  const screenToCanvasCoords = (screenX, screenY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Convert to canvas pixel coordinates
    const canvasX = (screenX - rect.left) / rect.width;
    const canvasY = (screenY - rect.top) / rect.height;
    
    // Ensure coordinates are within bounds
    return {
      x: Math.max(0, Math.min(1, canvasX)),
      y: Math.max(0, Math.min(1, canvasY))
    };
  };

  // Handle mouse down on canvas
  const handleCanvasMouseDown = (e) => {
    if (!image) return;
    
    // Get normalized canvas coordinates
    const coords = screenToCanvasCoords(e.clientX, e.clientY);
    
    // If we're not currently drawing a polygon, add the first point
    if (!isDrawing) {
      setIsDrawing(true);
      setCurrentPolygon([coords]);
    } else {
      // Add another point to the current polygon
      setCurrentPolygon(prev => [...prev, coords]);
    }
  };

  // Handle mouse move on canvas
  const handleCanvasMouseMove = (e) => {
    // We could track mouse position here for drawing preview lines
  };

  // Handle mouse up on canvas
  const handleCanvasMouseUp = (e) => {
    // No action needed, we add points on mouse down
  };

  // Complete the current polygon
  const handleCompletePolygon = () => {
    if (currentPolygon.length < 3) {
      setError("Please add at least 3 points to create a valid polygon.");
      return;
    }
    // Convert screen coordinates to normalized canvas coordinates
    const x = currentPolygon.map(p => p.x / canvasRef.current.width);
    const y = currentPolygon.map(p => p.y / canvasRef.current.height);
    // Add new contour
    const newContour = {
      x,
      y,
      label: getDefaultLabelId(), // Default to 'New class 1' or first label
      type: "polygon"
    };
    // Add to edited contours
    setEditedContours([...editedContours, newContour]);
    // Select the newly created contour
    setSelectedContourIndex(editedContours.length);
    // Reset the current drawing state
    setCurrentPolygon([]);
    setIsDrawing(false);
    // Show success message
    setSuccessMessageWithTimeout(`New contour created with label: ${getLabelName(newContour.label)}`);
  };

  // Cancel the current polygon
  const handleCancelPolygon = () => {
    setCurrentPolygon([]);
    setIsDrawing(false);
  };

  // Delete the selected contour
  const handleDeleteContour = () => {
    if (selectedContourIndex === null) return;
    
    setEditedContours(prev => 
      prev.filter((_, index) => index !== selectedContourIndex)
    );
    
    setSelectedContourIndex(null);
  };

  // Handle updating contour label
  const handleUpdateContourLabel = (labelId) => {
    if (selectedContourIndex === null) return;
    
    // Check if the label has children - if so, it can't be selected directly
    if (availableLabels.some(label => label.parent_id === labelId)) {
      setSelectedLabel(labelId); // Just navigate to the children instead
      return;
    }
    
    // Update the contour with the selected label
    setEditedContours(prev => 
      prev.map((contour, index) => 
        index === selectedContourIndex
          ? { ...contour, label: labelId }
          : contour
      )
    );
    
    // Close the label selector
    setShowLabelSelector(false);
    setSelectedLabel(null);
  };

  // Get label name from id
  const getLabelName = (labelId) => {
    if (!labelId) return 'Unlabeled';
    
    const label = availableLabels.find(label => label.id === labelId);
    if (!label) return `Unknown (${labelId})`;
    
    return label.name;
  };

  // Save changes to the mask
  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare the updated mask data
      const updatedMask = {
        ...mask,
        contours: editedContours.map(contour => ({
          ...contour,
          // Ensure there's a valid label
          label: contour.label || getDefaultLabelId()
        }))
      };
      
      // Make API call to update the mask
      await api.updateMask(updatedMask);
      
      // Show success message
      setSuccessMessageWithTimeout("Mask updated successfully!");
      
      // Notify parent component about the update
      if (onMaskUpdated) {
        onMaskUpdated(updatedMask);
      }
    } catch (err) {
      console.error("Error saving mask:", err);
      setError("There was an error saving the mask. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle creating a new label
  const handleCreateNewLabel = async (parentId = null) => {
    if (!newLabelName.trim()) return;
    
    if (!currentDataset) {
      setError("No dataset selected. Please select a dataset first.");
      return;
    }

    try {
      setLoading(true);
      
      // Create new label through API with dataset_id
      const newLabel = await api.createLabel({
        name: newLabelName.trim(),
        parent_id: parentId || null
      }, currentDataset.id);
      
      // Add to available labels
      setAvailableLabels([...availableLabels, newLabel]);
      
      // Reset state
      setNewLabelName('');
      setIsAddingLabel(false);
      
      // If contour is selected, set this label
      if (selectedContourIndex !== null) {
        handleUpdateContourLabel(newLabel.id);
      }
      
      // Show success message
      setSuccessMessageWithTimeout("Label created successfully!");
      
    } catch (err) {
      console.error("Error creating label:", err);
      setError("There was an error creating the label. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a label
  const handleDeleteLabel = async () => {
    if (!labelToDelete || !currentDataset) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check if label is being used by any contours in the current mask
      const isLabelInUse = editedContours.some(contour => contour.label === labelToDelete.id);
      
      if (isLabelInUse) {
        setError(`Cannot delete label "${labelToDelete.name}" because it is currently used by one or more contours. Please change the labels of those contours first.`);
        setShowDeleteLabelModal(false);
        setLabelToDelete(null);
        return;
      }
      
      // Delete label through API
      await api.deleteLabel(labelToDelete.id, currentDataset.id);
      
      // Remove from available labels
      setAvailableLabels(prev => prev.filter(label => label.id !== labelToDelete.id));
      
      // Close modal and reset state
      setShowDeleteLabelModal(false);
      setLabelToDelete(null);
      
      // Show success message
      setSuccessMessageWithTimeout(`Label "${labelToDelete.name}" deleted successfully!`);
      
    } catch (err) {
      console.error("Error deleting label:", err);
      setError(err.message || "There was an error deleting the label. It may be in use by existing annotations.");
    } finally {
      setLoading(false);
    }
  };

  // Open delete confirmation modal
  const handleDeleteLabelClick = (label, event) => {
    if (event) {
      event.stopPropagation();
    }
    setLabelToDelete(label);
    setShowDeleteLabelModal(true);
  };

  return (
    <div className="contour-editor border border-blue-300 rounded-lg shadow-lg bg-white overflow-hidden">
      <div className="editor-header flex items-center justify-between p-3 bg-blue-50 border-b border-blue-300">
        <div className="flex items-center gap-2">
          <Edit size={18} className="text-blue-600" />
          <h3 className="text-sm font-medium text-blue-800">Contour Editor</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 rounded-full hover:bg-red-100 text-red-600"
            onClick={onCancel}
            title="Close editor"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Instructions banner */}
      <div className="p-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
        <p className="font-medium mb-1">How to use the editor:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Select a contour from the list below to modify it</li>
          <li>Click "Edit Label" to change what the contour represents</li>
          <li>Add new contours by clicking "Add Contour" and drawing on the image</li>
          <li>Click "Save Changes" when finished</li>
        </ol>
      </div>
      
      {error && (
        <div className="error-message p-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}
      
      {/* Updated Success Message Toast */}
      {successMessage && (
        <div className="toast-notification">
          <div className="toast-header">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <h4 className="font-medium text-gray-800">Success</h4>
            <button 
              className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setSuccessMessage(null)}
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="toast-content">
            <p className="text-sm text-gray-600">{successMessage}</p>
          </div>
          <div className="toast-progress"></div>
        </div>
      )}
      
      <div className="canvas-container relative border border-gray-200 m-3 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        />
        
        {isDrawing && (
          <div className="drawing-controls absolute top-3 right-3 bg-white p-2 rounded shadow-md flex gap-2">
            <button
              className="p-1.5 rounded bg-green-100 hover:bg-green-200 text-green-600 flex items-center gap-1.5 text-xs font-medium"
              onClick={handleCompletePolygon}
            >
              <CheckCircle size={14} />
              Complete Contour
            </button>
            <button
              className="p-1.5 rounded bg-red-100 hover:bg-red-200 text-red-600 flex items-center gap-1.5 text-xs font-medium"
              onClick={handleCancelPolygon}
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        )}
        
        {/* Label selector popup */}
        {showLabelSelector && selectedContourIndex !== null && (
          <div className="label-selector absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-xl border border-blue-200 w-80">
            <h4 className="text-sm font-medium mb-2 text-blue-800 border-b border-blue-100 pb-2">Select a Label</h4>
            <div className="label-options space-y-2 mb-3 max-h-60 overflow-y-auto">
              {/* Hierarchical Label Selection */}
              {selectedLabel ? (
                <>
                  <div className="selected-label-path mb-2 flex items-center gap-1 text-xs">
                    <button 
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                      onClick={() => setSelectedLabel(null)}
                    >
                      Root
                    </button>
                    <span>&gt;</span>
                    <span className="px-2 py-1 bg-blue-100 rounded font-medium">{getLabelName(selectedLabel)}</span>
                  </div>
                  
                  {/* Children of selected label */}
                  {availableLabels
                    .filter(label => label.parent_id === selectedLabel)
                    .map(label => (
                      <div
                        key={label.id}
                        className={`w-full text-left p-2 px-3 rounded text-sm flex items-center justify-between gap-2 transition-colors ${
                          editedContours[selectedContourIndex].label === label.id
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <button
                          className="flex items-center gap-2 flex-grow"
                          onClick={() => handleUpdateContourLabel(label.id)}
                        >
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          {label.name}
                        </button>
                        <div className="flex items-center gap-1">
                          {availableLabels.some(childLabel => childLabel.parent_id === label.id) && (
                            <span className="text-xs text-gray-400">(not selectable)</span>
                          )}
                          <button
                            onClick={(e) => handleDeleteLabelClick(label, e)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                            title="Delete label"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                  {/* Add New Subclass option */}
                  <div className="mt-4 pt-2 border-t border-gray-100">
                    {isAddingLabel ? (
                      <div className="p-2">
                        <input
                          type="text"
                          className="w-full p-2 border border-blue-200 rounded text-sm mb-2"
                          placeholder="New subclass name"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            className="flex-1 p-1.5 bg-blue-500 text-white rounded text-xs"
                            onClick={() => handleCreateNewLabel(selectedLabel)}
                            disabled={loading}
                          >
                            {loading ? "Creating..." : "Create"}
                          </button>
                          <button
                            className="flex-1 p-1.5 bg-gray-200 rounded text-xs"
                            onClick={() => {
                              setIsAddingLabel(false);
                              setNewLabelName('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="w-full text-left p-2 px-3 rounded text-sm flex items-center gap-2 text-blue-600 hover:bg-blue-50"
                        onClick={() => setIsAddingLabel(true)}
                      >
                        <Plus size={14} />
                        + New subclass of {getLabelName(selectedLabel)}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Root level labels */}
                                      {availableLabels
                      .filter(label => !label.parent_id)
                      .map(label => (
                        <div
                          key={label.id}
                          className={`w-full text-left p-2 px-3 rounded text-sm flex items-center justify-between gap-2 transition-colors ${
                            editedContours[selectedContourIndex].label === label.id
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <button
                            className="flex items-center gap-2 flex-grow"
                            onClick={() => {
                              // If label has children, set it as selected to navigate to its children
                              if (availableLabels.some(childLabel => childLabel.parent_id === label.id)) {
                                setSelectedLabel(label.id);
                              } else {
                                // If no children, directly select the label
                                handleUpdateContourLabel(label.id);
                              }
                            }}
                          >
                            <span className={`w-3 h-3 rounded-full ${
                              label.name.toLowerCase().includes('petri') ? 'bg-purple-500' : 
                              label.name.toLowerCase().includes('coral') ? 'bg-blue-500' : 
                              label.name.toLowerCase().includes('ruler') ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}></span>
                            {label.name}
                          </button>
                          <div className="flex items-center gap-1">
                            {availableLabels.some(childLabel => childLabel.parent_id === label.id) && (
                              <span className="text-xs text-gray-400">▶</span>
                            )}
                            <button
                              onClick={(e) => handleDeleteLabelClick(label, e)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                              title="Delete label"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    
                  {/* Add New Class option */}
                  <div className="mt-4 pt-2 border-t border-gray-100">
                    {isAddingLabel ? (
                      <div className="p-2">
                        <input
                          type="text"
                          className="w-full p-2 border border-blue-200 rounded text-sm mb-2"
                          placeholder="New class name"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            className="flex-1 p-1.5 bg-blue-500 text-white rounded text-xs"
                            onClick={() => handleCreateNewLabel()}
                            disabled={loading}
                          >
                            {loading ? "Creating..." : "Create"}
                          </button>
                          <button
                            className="flex-1 p-1.5 bg-gray-200 rounded text-xs"
                            onClick={() => {
                              setIsAddingLabel(false);
                              setNewLabelName('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="w-full text-left p-2 px-3 rounded text-sm flex items-center gap-2 text-blue-600 hover:bg-blue-50"
                        onClick={() => setIsAddingLabel(true)}
                      >
                        <Plus size={14} />
                        + New class
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <button 
              className="mt-2 text-sm bg-gray-100 hover:bg-gray-200 w-full py-2 rounded text-gray-700 transition-colors"
              onClick={() => {
                setShowLabelSelector(false);
                setSelectedLabel(null);
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      
      <div className="editor-controls p-3 border-t border-gray-200 flex flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md flex items-center gap-1.5 text-sm font-medium"
            onClick={() => {
              setIsDrawing(true);
              setCurrentPolygon([]);
            }}
            disabled={isDrawing}
          >
            <Plus size={16} />
            Add Contour
          </button>
          
          <button
            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md flex items-center gap-1.5 text-sm font-medium"
            onClick={handleDeleteContour}
            disabled={selectedContourIndex === null}
          >
            <Trash2 size={16} />
            Delete
          </button>
          
          <button
            className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md flex items-center gap-1.5 text-sm font-medium"
            onClick={() => setShowLabelSelector(!showLabelSelector)}
            disabled={selectedContourIndex === null}
          >
            <Tag size={16} />
            Edit Label
          </button>
        </div>
        
        <div className="ml-auto">
          <button
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm flex items-center gap-1.5 text-sm font-medium transition-colors"
            onClick={handleSaveChanges}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                Saving...
              </span>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="contours-list p-3 border-t border-gray-200 bg-gray-50">
        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
          Available Contours ({editedContours.length})
        </h4>
        
        <div className="contours-container max-h-60 overflow-y-auto pr-1">
          {editedContours.length === 0 ? (
            <div className="text-sm text-gray-500 italic bg-white p-3 rounded border border-gray-200">
              No contours in this mask yet. Draw a contour to add it.
            </div>
          ) : (
            <div className="space-y-2">
              {editedContours.map((contour, index) => (
                <div
                  key={index}
                  className={`contour-item p-2 border rounded flex items-center justify-between cursor-pointer transition-colors ${
                    selectedContourIndex === index 
                      ? "border-blue-500 bg-blue-50" 
                      : "bg-white hover:bg-blue-50 border-gray-200"
                  }`}
                  onClick={() => setSelectedContourIndex(index)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        getLabelName(contour.label || getDefaultLabelId()) === 'petri_dish' ? 'bg-purple-500' : 
                        getLabelName(contour.label || getDefaultLabelId()) === 'coral' ? 'bg-blue-500' : 
                        'bg-green-500'
                      }`}
                    />
                    <span className="text-sm font-medium">
                      {index + 1}. {getLabelName(contour.label || getDefaultLabelId())}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({contour.x ? contour.x.length : (contour.points?.length || 0)} points)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      className="p-1 rounded hover:bg-purple-100" 
                      title="Edit label"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContourIndex(index);
                        setShowLabelSelector(true);
                      }}
                    >
                      <Tag size={14} className="text-purple-600" />
                    </button>
                    <button 
                      className="p-1 rounded hover:bg-red-100" 
                      title="Delete contour"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContourIndex(index);
                        handleDeleteContour();
                      }}
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Label Confirmation Modal */}
      {showDeleteLabelModal && labelToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Label
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete the label "{labelToDelete.name}"? 
                        This action cannot be undone and may affect existing annotations across the entire dataset.
                      </p>
                      {editedContours.some(contour => contour.label === labelToDelete.id) && (
                        <p className="text-sm text-red-600 mt-2 font-medium">
                          ⚠️ This label is currently being used by contours in this mask. 
                          Please change their labels first.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteLabel}
                  disabled={loading || editedContours.some(contour => contour.label === labelToDelete.id)}
                  className={`w-full inline-flex justify-center rounded-lg px-6 py-3 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200 ${
                    loading || editedContours.some(contour => contour.label === labelToDelete.id)
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteLabelModal(false);
                    setLabelToDelete(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContourEditor; 