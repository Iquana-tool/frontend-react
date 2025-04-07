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
          setMasks(masksResponse.masks || []);
        } else {
          console.log("Masks response was not successful:", masksResponse);
          // Not setting error here,  handle empty masks gracefully
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
          // Don't set error for missing final mask
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching masks:", err);
        //  user-friendly error message
        if (err.message && err.message.includes("404")) {
          setError("No masks are available yet. Create masks by running segmentation first.");
        } else if (err.message && err.message.includes("500")) {
          setError("The server encountered an error. Please try again or contact support.");
        } else {
          setError("Failed to load masks. The mask management API may not be fully implemented yet.");
        }
        setLoading(false);
        // Set empty arrays to prevent null reference errors
        setMasks([]);
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
    <div className={`mask-generation-panel ${className || ''} w-80 border border-blue-200 rounded-lg shadow-lg bg-white overflow-hidden`}>
      <div className="panel-header flex items-center justify-between p-3 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-blue-600" />
          <h3 className="text-sm font-medium text-blue-800">Mask Generation Panel</h3>
        </div>
        
        <div className="flex items-center text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
          <span>Manage & Edit Masks</span>
        </div>
      </div>
      
      {/* Information banner */}
      <div className="p-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
        <p>Here you can manage your final mask by adding contours from segmentation masks, editing labels, and modifying contours.</p>
      </div>
      
      {error && (
        <div className="error-message p-3 text-sm text-red-600 bg-red-50 border-b border-red-100">
          {error}
        </div>
      )}
      
      <div className="masks-container p-3 space-y-3 max-h-[70vh] overflow-y-auto">
        <div className="section-title flex items-center gap-2 text-xs font-semibold text-blue-800 uppercase">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
          Final Mask
        </div>
        
        <div className="final-mask-container border border-blue-100 rounded p-3 bg-blue-50">
          {finalMask ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-blue-500" />
                <span className="text-sm font-medium">Final Mask</span>
                <span className="text-xs text-gray-500 bg-blue-100 px-1.5 py-0.5 rounded-full">
                  {finalMask.contours?.length || 0} contours
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 rounded hover:bg-blue-200 text-blue-600"
                  onClick={() => handleSelectMask(finalMask)}
                  title="View mask"
                >
                  <CheckCircle size={14} />
                </button>
                <button
                  className="p-1.5 rounded hover:bg-blue-200 text-blue-600"
                  onClick={() => handleEditMask(finalMask)}
                  title="Edit contours"
                >
                  <Edit size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-blue-600 italic p-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-400 rounded"></div>
              No final mask yet. Create one by:
              <ol className="list-decimal ml-5 text-xs">
                <li className="mb-1">Run segmentation to create masks</li>
                <li>Click "+" next to any mask to add its contours</li>
              </ol>
            </div>
          )}
        </div>
        
        <div className="section-title flex items-center gap-2 text-xs font-semibold text-green-800 uppercase mt-4">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
          Segmentation Masks
        </div>
        
        {loading ? (
          <div className="text-sm text-gray-500 p-3 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            Loading masks...
          </div>
        ) : masks.length === 0 ? (
          <div className="text-sm text-gray-600 italic p-3 bg-gray-50 border border-gray-100 rounded">
            <p className="mb-2">No segmentation masks available yet.</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">1</div>
                <span>First select your image</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">2</div>
                <span>Create a box or point prompt on the image</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">3</div>
                <span>Click "Start Segmentation" to generate masks</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="masks-list space-y-2 max-h-96 overflow-y-auto">
            {masks.map(mask => (
              <div 
                key={mask.id}
                className={`mask-item border rounded p-3 ${selectedMaskId === mask.id ? 'border-blue-500 bg-blue-50' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
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
                      className="p-1.5 rounded hover:bg-green-100 text-green-600"
                      title="Add to final mask"
                      onClick={() => handleAddToFinalMask(mask)}
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                      title="View mask"
                      onClick={() => handleSelectMask(mask)}
                    >
                      <CheckCircle size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                      title="Edit contours"
                      onClick={() => handleEditMask(mask)}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-red-100 text-red-600"
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
                    className="mask-preview mt-2 w-full h-32 object-contain border rounded"
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