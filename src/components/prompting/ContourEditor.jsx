import React, { useState, useRef, useEffect } from "react";
import { Edit, Save, Trash2, Plus, X, CheckCircle } from "lucide-react";
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
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // Initialize editor with mask contours
  useEffect(() => {
    if (mask && mask.contours) {
      setEditedContours([...mask.contours]);
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
        
        // Draw polygon points
        if (contour.points && contour.points.length > 0) {
          const firstPoint = contour.points[0];
          ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
          
          for (let i = 1; i < contour.points.length; i++) {
            const point = contour.points[i];
            ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
          }
          
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Draw vertices for selected contour
          if (isSelected) {
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
    
    // Create a new contour from the current polygon
    const newContour = {
      points: [...currentPolygon],
      // Add any other required properties for a contour
      type: "polygon"
    };
    
    // Add the new contour to the edited contours
    setEditedContours(prev => [...prev, newContour]);
    
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

  // Save changes to the mask
  const handleSaveChanges = async () => {
    if (!mask || !mask.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Call API to update the mask with edited contours
      const response = await api.updateMask(mask.id, editedContours);
      
      if (response.success) {
        // Notify parent component of the update
        onMaskUpdated({
          ...mask,
          contours: editedContours
        });
      }
      
      setLoading(false);
    } catch (err) {
      setError("Failed to save changes");
      setLoading(false);
      console.error("Error saving mask changes:", err);
    }
  };

  return (
    <div className="contour-editor">
      <div className="editor-header flex items-center justify-between p-2 bg-gray-100 border-b">
        <div className="flex items-center gap-2">
          <Edit size={16} />
          <h3 className="text-sm font-medium">Contour Editor</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className="p-1 rounded hover:bg-gray-200 text-gray-600"
            onClick={onCancel}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {error && (
        <div className="error-message p-2 text-sm text-red-600">
          {error}
        </div>
      )}
      
      <div className="canvas-container relative border">
        <canvas
          ref={canvasRef}
          className="w-full"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        />
        
        {isDrawing && (
          <div className="drawing-controls absolute top-2 right-2 bg-white p-2 rounded shadow-md flex gap-2">
            <button
              className="p-1 rounded bg-green-100 hover:bg-green-200 text-green-600 flex items-center gap-1 text-xs"
              onClick={handleCompletePolygon}
            >
              <CheckCircle size={14} />
              Complete
            </button>
            <button
              className="p-1 rounded bg-red-100 hover:bg-red-200 text-red-600 flex items-center gap-1 text-xs"
              onClick={handleCancelPolygon}
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        )}
      </div>
      
      <div className="editor-controls p-2 border-t flex justify-between">
        <div className="left-controls flex gap-2">
          <button
            className="p-1 px-2 rounded bg-blue-100 hover:bg-blue-200 text-blue-600 flex items-center gap-1 text-sm"
            onClick={() => {
              setIsDrawing(true);
              setCurrentPolygon([]);
            }}
            disabled={isDrawing}
          >
            <Plus size={14} />
            Add Contour
          </button>
          
          <button
            className="p-1 px-2 rounded bg-red-100 hover:bg-red-200 text-red-600 flex items-center gap-1 text-sm"
            onClick={handleDeleteContour}
            disabled={selectedContourIndex === null}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
        
        <div className="right-controls">
          <button
            className="p-1 px-3 rounded bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 text-sm"
            onClick={handleSaveChanges}
            disabled={loading}
          >
            {loading ? (
              "Saving..."
            ) : (
              <>
                <Save size={14} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="contours-list p-2 border-t">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Contours ({editedContours.length})
        </h4>
        
        <div className="contours-container max-h-40 overflow-y-auto">
          {editedContours.length === 0 ? (
            <div className="text-sm text-gray-500 italic">
              No contours in this mask yet. Draw a contour to add it.
            </div>
          ) : (
            <div className="space-y-1">
              {editedContours.map((contour, index) => (
                <div
                  key={index}
                  className={`contour-item p-1 border rounded flex items-center justify-between ${
                    selectedContourIndex === index ? "border-blue-500 bg-blue-50" : "bg-white"
                  }`}
                  onClick={() => setSelectedContourIndex(index)}
                >
                  <div className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: selectedContourIndex === index ? "#2563eb" : "#10b981",
                      }}
                    />
                    <span className="text-xs">
                      Contour {index + 1} ({contour.points?.length || 0} points)
                    </span>
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