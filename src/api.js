const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

// Function to handle API errors
const handleApiError = async (response) => {
  if (!response.ok) {
    // Try to parse the error message from the response
    try {
      const errorData = await response.json();
      console.error("API Error Response:", errorData);
      
      // Handle FastAPI validation errors which come in 'detail' field
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // FastAPI validation errors are often arrays
          const errorMessage = errorData.detail.map(err => 
            `${err.loc.join('.')}: ${err.msg}`
          ).join(', ');
          throw new Error(`API Validation Error: ${errorMessage}`);
        } else {
          throw new Error(`API Error: ${errorData.detail}`);
        }
      }
      
      // Handle general error message
      if (errorData.message) {
        throw new Error(`API Error: ${errorData.message}`);
      }
      
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        // Could not parse the error response as JSON
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      throw parseError;
    }
  }
  return response.json();
};

// Fetch list of available images
export const fetchImages = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/images/list_images`);
    return handleApiError(response);
  } catch (error) {
    console.error("Error fetching images:", error);
    throw error;
  }
};

// Upload an image
export const uploadImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/images/upload_image`, {
      method: "POST",
      body: formData,
    });
    return handleApiError(response);
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

// Get image by ID
export const getImageById = async (imageId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/images/get_image/${imageId}`);
    return handleApiError(response);
  } catch (error) {
    console.error("Error getting image:", error);
    throw error;
  }
};

// Delete image
export const deleteImage = async (imageId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/images/delete_image/${imageId}`,
      {
        method: "DELETE",
      }
    );
    return handleApiError(response);
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
};

// Segment an image using the segmentation endpoint
export const segmentImage = async (
  imageId,
  model = "SAM2Tiny",
  prompts = null
) => {
  try {
    const requestData = {
      image_id: imageId,
      model: model,
      use_prompts: !!prompts && prompts.length > 0,
      point_prompts: [],
      box_prompts: [],
      polygon_prompts: [],
      circle_prompts: []
    };

    if (prompts && prompts.length > 0) {
      // Convert prompts to the format expected by the API
      prompts.forEach((prompt) => {
        if (prompt.type === "point") {
          requestData.point_prompts.push({
            x: prompt.coordinates.x,
            y: prompt.coordinates.y,
            label: prompt.label ? 1 : 0, // Convert boolean to 1/0
          });
        } else if (prompt.type === "box") {
          requestData.box_prompts.push({
            min_x: prompt.coordinates.startX,
            min_y: prompt.coordinates.startY,
            max_x: prompt.coordinates.endX,
            max_y: prompt.coordinates.endY,
          });
        } else if (prompt.type === "polygon") {
          const vertices = prompt.coordinates.map((point) => [
            point.x,
            point.y,
          ]);
          requestData.polygon_prompts.push({
            vertices: vertices,
          });
        } else if (prompt.type === "circle") {
          requestData.circle_prompts.push({
            center_x: prompt.coordinates.centerX,
            center_y: prompt.coordinates.centerY,
            radius: prompt.coordinates.radius,
          });
        }
      });
    }

    console.log("Sending segmentation request:", requestData);
    
    const response = await fetch(`${API_BASE_URL}/segmentation/segment_image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });
    
    const result = await handleApiError(response);
    console.log("Received segmentation result with masks:", result.base64_masks.length);
    return result;
  } catch (error) {
    console.error("Error segmenting image:", error);
    throw error;
  }
};

// Save a mask
export const saveMask = async (imageId, label, base64Mask) => {
  try {
    // Validate parameters
    if (imageId === undefined || imageId === null) {
      throw new Error("Image ID is required");
    }
    
    if (!label || typeof label !== 'string') {
      throw new Error("Label is required and must be a string");
    }
    
    if (!base64Mask || typeof base64Mask !== 'string') {
      throw new Error("Mask data is required and must be a base64 string");
    }
    
    console.log(`Saving mask for image ${imageId} with label ${label}`);
    console.log(`Mask data length: ${base64Mask ? base64Mask.length : 0} characters`);
    
    // Convert imageId to number if it's a string
    const numericImageId = typeof imageId === 'string' ? parseInt(imageId, 10) : imageId;
    
    if (isNaN(numericImageId)) {
      throw new Error(`Invalid image ID: ${imageId}`);
    }
    
    const requestData = {
      image_id: numericImageId,
      label: label,
      base64_mask: base64Mask,
    };

    console.log("Sending save mask request:", JSON.stringify(requestData).substring(0, 100) + "...");

    const response = await fetch(`${API_BASE_URL}/masks/save_mask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });
    return await handleApiError(response);
  } catch (error) {
    console.error("Error saving mask:", error);
    throw error;
  }
};

// Get all masks for an image
export const getMasksForImage = async (imageId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/masks/get_masks_for_image/${imageId}`
    );
    return handleApiError(response);
  } catch (error) {
    console.error("Error getting masks for image:", error);
    throw error;
  }
};

// Get a specific mask
export const getMask = async (maskId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/masks/get_mask/${maskId}`);
    return handleApiError(response);
  } catch (error) {
    console.error("Error getting mask:", error);
    throw error;
  }
};

// Delete a mask
export const deleteMask = async (maskId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/masks/delete_mask/${maskId}`,
      {
        method: "DELETE",
      }
    );
    return handleApiError(response);
  } catch (error) {
    console.error("Error deleting mask:", error);
    throw error;
  }
};

// Create cutouts from a mask
export const createCutouts = async (imageId, base64Mask, options = {}) => {
  try {
    const requestData = {
      image_id: imageId,
      base64_mask: base64Mask,
      resize_factor: options.resizeFactor || 1.0,
      darken_outside_contours: options.darkenOutsideContours || true,
      darkening_factor: options.darkeningFactor || 0.6,
    };

    const response = await fetch(`${API_BASE_URL}/cutouts/get_cutouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });
    return handleApiError(response);
  } catch (error) {
    console.error("Error creating cutouts:", error);
    throw error;
  }
};

const API = {
  fetchImages,
  uploadImage,
  getImageById,
  deleteImage,
  segmentImage,
  saveMask,
  getMasksForImage,
  getMask,
  deleteMask,
  createCutouts,
};

export default API;