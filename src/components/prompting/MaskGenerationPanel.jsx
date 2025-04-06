import React, { useState, useEffect, useRef } from "react";
import { Layers, Edit, CheckCircle, X, Plus, Trash2 } from "lucide-react";
import * as api from "../../api";

const MaskGenerationPanel = ({
  imageId,
  selectedImage,
  onMaskSelected,
  onAddToFinalMask,
  onFinalMaskUpdated,
  onEditMask,
  className
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [masks, setMasks] = useState([]);
  const [finalMask, setFinalMask] = useState(null);
  const [selectedMaskId, setSelectedMaskId] = useState(null);
  const canvasRef = useRef(null);

  // Fetch all masks and final mask on component mount or imageId change
  useEffect(() => {
    if (!imageId) return;
    
    const fetchMasks = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all masks for the image
        const masksResponse = await api.getMasksForImage(imageId);
        if (masksResponse.success) {
          setMasks(masksResponse.masks);
        }
        
        // Fetch final mask if it exists
        try {
          const finalMaskResponse = await api.getFinalMask(imageId);
          if (finalMaskResponse.success) {
            setFinalMask(finalMaskResponse.mask);
          }
        } catch (finalMaskError) {
          // Final mask might not exist yet, this is ok
          console.log("Final mask not found:", finalMaskError);
        }
        
        setLoading(false);
      } catch (err) {
        setError("Failed to load masks");
        setLoading(false);
        console.error("Error fetching masks:", err);
      }
    };
    
    fetchMasks();
  }, [imageId]);

  // Draw mask preview on canvas
  const drawMaskPreview = (mask, canvas) => {
    if (!mask || !canvas || !selectedImage) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = selectedImage;
    
    // Set canvas dimensions to match image
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw image as background (scaled to fit)
    if (selectedImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        
        // Draw contours
        if (mask.contours && mask.contours.length > 0) {
          mask.contours.forEach((contour, index) => {
            // Generate a color based on index to differentiate contours
            const hue = (index * 137) % 360; // Golden angle to get visually distinct colors
            ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
            ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.3)`;
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            
            // Draw polygon points
            if (contour.points && contour.points.length > 0) {
              const firstPoint = contour.points[0];
              ctx.moveTo(firstPoint.x * width, firstPoint.y * height);
              
              for (let i = 1; i < contour.points.length; i++) {
                const point = contour.points[i];
                ctx.lineTo(point.x * width, point.y * height);
              }
              
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          });
        }
      };
      img.src = selectedImage.url || `data:image/jpeg;base64,${selectedImage.data}`;
    }
  };

  // Handle mask selection
  const handleSelectMask = (mask) => {
    setSelectedMaskId(mask.id);
    onMaskSelected(mask);
  };

  // Add selected mask contours to final mask
  const handleAddToFinalMask = async (mask) => {
    if (!mask || !imageId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Call API to add contours to final mask
      const response = await api.addContoursToFinalMask(imageId, mask.contours);
      
      if (response.success) {
        // Update final mask with new data
        setFinalMask(response.mask);
        onFinalMaskUpdated(response.mask);
      }
      
      setLoading(false);
    } catch (err) {
      setError("Failed to add contours to final mask");
      setLoading(false);
      console.error("Error adding contours to final mask:", err);
    }
  };

  // Handle editing a mask
  const handleEditMask = (mask) => {
    if (onEditMask) {
      onEditMask(mask);
    }
  };

  // Delete a mask
  const handleDeleteMask = async (maskId) => {
    if (!maskId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Call API to delete mask
      const response = await api.deleteMask(maskId);
      
      if (response.success) {
        // Remove deleted mask from state
        setMasks(masks.filter(mask => mask.id !== maskId));
        
        // Deselect if currently selected
        if (selectedMaskId === maskId) {
          setSelectedMaskId(null);
          onMaskSelected(null);
        }
      }
      
      setLoading(false);
    } catch (err) {
      setError("Failed to delete mask");
      setLoading(false);
      console.error("Error deleting mask:", err);
    }
  };

  return (
    <div className={`mask-generation-panel ${className || ''}`}>
      <div className="panel-header flex items-center gap-2 p-2 bg-gray-100 border-b">
        <Layers size={16} />
        <h3 className="text-sm font-medium">Mask Generation</h3>
      </div>
      
      {error && (
        <div className="error-message p-2 text-sm text-red-600">
          {error}
        </div>
      )}
      
      <div className="masks-container p-2 space-y-2">
        <div className="section-title text-xs font-semibold text-gray-500 uppercase mt-2">
          Final Mask
        </div>
        
        <div className="final-mask-container border rounded p-2 bg-gray-50">
          {finalMask ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-blue-500" />
                <span className="text-sm font-medium">Final Mask</span>
                <span className="text-xs text-gray-500">
                  ({finalMask.contours?.length || 0} contours)
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  className="p-1 rounded hover:bg-gray-200 text-blue-600"
                  onClick={() => handleSelectMask(finalMask)}
                  title="View mask"
                >
                  <CheckCircle size={14} />
                </button>
                <button
                  className="p-1 rounded hover:bg-gray-200 text-blue-600"
                  onClick={() => handleEditMask(finalMask)}
                  title="Edit contours"
                >
                  <Edit size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              No final mask yet. Add contours from segmentation masks.
            </div>
          )}
        </div>
        
        <div className="section-title text-xs font-semibold text-gray-500 uppercase mt-4">
          Segmentation Masks
        </div>
        
        {loading ? (
          <div className="text-sm text-gray-500 p-2">Loading masks...</div>
        ) : masks.length === 0 ? (
          <div className="text-sm text-gray-500 italic p-2">
            No segmentation masks available. Run segmentation to create masks.
          </div>
        ) : (
          <div className="masks-list space-y-2 max-h-96 overflow-y-auto">
            {masks.map(mask => (
              <div 
                key={mask.id}
                className={`mask-item border rounded p-2 ${selectedMaskId === mask.id ? 'border-blue-500 bg-blue-50' : 'bg-white'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span className="text-sm">
                      {mask.label || 'Mask'} {mask.id}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1 rounded hover:bg-gray-200 text-green-600"
                      title="Add to final mask"
                      onClick={() => handleAddToFinalMask(mask)}
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-gray-200 text-blue-600"
                      title="View mask"
                      onClick={() => handleSelectMask(mask)}
                    >
                      <CheckCircle size={14} />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-gray-200 text-blue-600"
                      title="Edit contours"
                      onClick={() => handleEditMask(mask)}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-gray-200 text-red-600"
                      title="Delete mask"
                      onClick={() => handleDeleteMask(mask.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {selectedMaskId === mask.id && (
                  <canvas 
                    ref={el => {
                      if (el) {
                        drawMaskPreview(mask, el);
                      }
                    }}
                    className="mask-preview mt-2 w-full h-32 object-contain border"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaskGenerationPanel; 