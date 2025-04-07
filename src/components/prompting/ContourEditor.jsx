import React, { useState, useRef, useEffect } from "react";
import { Edit, Save, Trash2, Plus, X, CheckCircle, Tag } from "lucide-react";
import * as api from "../../api";

const ContourEditor = ({
  mask,
  image,
  onMaskUpdated,
  onCancel
}) => {
  const [selectedContourIndex, setSelectedContourIndex] = useState(null);
  const [editedContours, setEditedContours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [availableLabels, setAvailableLabels] = useState([
    { id: 1, name: 'petri_dish' },
    { id: 2, name: 'coral' },
    { id: 3, name: 'polyp' }
  ]);
  const [showLabelSelector, setShowLabelSelector] = useState(false);

  // Handle polygon editing with different backend data formats
  const normalizeContour = (contour) => {
    // If the contour is already in the correct format, return it
    if (contour.x && contour.y && Array.isArray(contour.x) && Array.isArray(contour.y)) {
      return {
        ...contour,
        label: contour.label || 2, // Default to coral if no label
        quantifications: contour.quantifications || { area: 0, perimeter: 0 }
      };
    }
    
    // If the contour has points in an array of objects format, convert to x/y arrays
    if (contour.points && Array.isArray(contour.points)) {
      return {
        x: contour.points.map(p => p.x),
        y: contour.points.map(p => p.y),
        label: contour.label || 2,
        type: "polygon",
        quantifications: contour.quantifications || { area: 0, perimeter: 0 }
      };
    }
    
    // If we can't interpret the format, return a placeholder
    console.warn("Unrecognized contour format:", contour);
    return {
      x: [],
      y: [],
      label: contour.label || 2,
      type: "polygon",
      quantifications: { area: 0, perimeter: 0 }
    };
  };

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
  }, [mask]);

  // Set up canvas when component mounts or image/contours change
  useEffect(() => {
    if (!canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
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
  }, [image, editedContours, selectedContourIndex, currentPolygon]);

  // Draw the canvas with image and contours
  const drawCanvas = () => {
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
  };

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
      setError("A polygon must have at least 3 points");
      return;
    }
    
    // Create a new contour from the current polygon with x and y arrays for backend compatibility
    const newContour = {
      // Convert points array to separate x and y arrays as required by backend
      x: currentPolygon.map(point => point.x),
      y: currentPolygon.map(point => point.y),
      label: 2, // Default label (coral=2 based on the available labels)
      type: "polygon",
      // Add empty quantifications if needed by the backend
      quantifications: {
        area: 0,
        perimeter: 0
      }
    };
    
    // Add the new contour to the edited contours
    setEditedContours(prev => [...prev, newContour]);
    
    // Show success message with the default label
    setError(null);
    setSuccessMessage(`New contour created with label: ${getLabelName(2)}`);
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
    
    // Reset the current polygon
    setCurrentPolygon([]);
    setIsDrawing(false);
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
    
    setEditedContours(prev => 
      prev.map((contour, index) => 
        index === selectedContourIndex
          ? { ...contour, label: labelId }
          : contour
      )
    );
    
    setShowLabelSelector(false);
  };

  // Get label name from id
  const getLabelName = (labelId) => {
    const label = availableLabels.find(label => label.id === labelId);
    return label ? label.name : 'unknown';
  };

  // Save changes to the mask
  const handleSaveChanges = async () => {
    if (!mask || !mask.id) {
      setError("Cannot save changes: No valid mask ID found");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Format the contours correctly for the backend
      const formattedContours = editedContours.map(contour => ({
        x: contour.x || [],
        y: contour.y || [],
        label: contour.label || 2,
        quantifications: contour.quantifications || { area: 0, perimeter: 0 }
      }));
      
      // Call API to update the mask with edited contours
      const response = await api.updateMask(mask.id, formattedContours);
      
      if (response && response.success) {
        // Notify parent component of the update
        setSuccessMessage("Mask updated successfully!");
        onMaskUpdated({
          ...mask,
          contours: formattedContours
        });
      } else {
        setError("Failed to save changes: " + (response?.message || "Unknown error"));
      }
      
      setLoading(false);
    } catch (err) {
      setError("Failed to save changes: " + (err.message || "Unknown error"));
      setLoading(false);
      console.error("Error saving mask changes:", err);
    }
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
      
      {successMessage && (
        <div className="success-message p-3 text-sm text-green-600 bg-green-50 border-b border-green-100">
          {successMessage}
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
          <div className="label-selector absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-xl border border-blue-200 w-60">
            <h4 className="text-sm font-medium mb-2 text-blue-800 border-b border-blue-100 pb-2">Select a Label</h4>
            <div className="label-options space-y-2 mb-3">
              {availableLabels.map(label => (
                <button
                  key={label.id}
                  className={`w-full text-left p-2 px-3 rounded text-sm flex items-center gap-2 transition-colors ${
                    editedContours[selectedContourIndex].label === label.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleUpdateContourLabel(label.id)}
                >
                  <span className={`w-3 h-3 rounded-full ${
                    label.name === 'petri_dish' ? 'bg-purple-500' : 
                    label.name === 'coral' ? 'bg-blue-500' : 
                    'bg-green-500'
                  }`}></span>
                  {label.name}
                </button>
              ))}
            </div>
            <button 
              className="mt-2 text-sm bg-gray-100 hover:bg-gray-200 w-full py-2 rounded text-gray-700 transition-colors"
              onClick={() => setShowLabelSelector(false)}
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
                        getLabelName(contour.label || 2) === 'petri_dish' ? 'bg-purple-500' : 
                        getLabelName(contour.label || 2) === 'coral' ? 'bg-blue-500' : 
                        'bg-green-500'
                      }`}
                    />
                    <span className="text-sm font-medium">
                      {index + 1}. {getLabelName(contour.label || 2)}
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
    </div>
  );
};

export default ContourEditor; 