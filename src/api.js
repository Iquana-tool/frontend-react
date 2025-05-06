const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

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
  const maxRetries = 2;
  let retryCount = 0;
  let lastError = null;

  while (retryCount <= maxRetries) {
    try {
      console.log(`Uploading to: ${API_BASE_URL}/images/upload_image (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Create a new FormData for each attempt
      const formData = new FormData();
      formData.append("file", file);

      // Use a timeout to abort the request if it takes too long
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(`${API_BASE_URL}/images/upload_image`, {
          method: "POST",
          body: formData,
          signal: controller.signal
        });
        
        // Clear the timeout since the request completed
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error("Upload failed with status:", response.status);
          const responseText = await response.text();
          console.error("Response:", responseText);
          
          // Specific handling for different error codes
          if (response.status === 413) {
            throw new Error("File is too large. Maximum file size is 10MB.");
          } else if (response.status === 415) {
            throw new Error("Unsupported file type. Please upload a valid image file.");
          } else if (response.status === 401 || response.status === 403) {
            throw new Error("Unauthorized. Please try again or refresh the page.");
          } else if (response.status >= 500) {
            // Server errors are worth retrying
            throw new Error(`Server error (${response.status}). Retrying...`);
          }
          
          throw new Error(`Upload failed with status ${response.status}`);
        }
        
        // Parse the response
        const data = await response.json();
        return data;
      } catch (fetchError) {
        // Clear the timeout if we got an error
        clearTimeout(timeoutId);
        
        // Handle abort errors specially
        if (fetchError.name === 'AbortError') {
          console.warn("Upload request timed out");
          throw new Error("Upload timed out. Please try again with a smaller file or check your connection.");
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error(`Upload attempt ${retryCount + 1} failed:`, error);
      lastError = error;
      
      // Only retry on network errors and server errors (5xx)
      const isServerError = error.message.includes("Server error") || 
                           error.message.includes("network") ||
                           error.message.includes("failed to fetch");
      
      if (!isServerError || retryCount >= maxRetries) {
        break; // Don't retry client errors or if we've hit the retry limit
      }
      
      // Wait before retrying
      const delay = 1000 * Math.pow(2, retryCount); // Exponential backoff
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retryCount++;
    }
  }
  
  // If we got here, all retries failed
  throw lastError || new Error("Failed to upload image after multiple attempts");
};

// Get image by ID
export const getImageById = async (imageId) => {
  try {
    const maxRetries = 3;
    let retries = 0;
    let lastError = null;
    
    while (retries < maxRetries) {
      try {
        const response = await fetch(`${API_BASE_URL}/images/get_image/${imageId}`);
        
        if (!response.ok) {
          // Log detailed error information
          const errorText = await response.text();
          console.warn(`Error fetching image ${imageId}, attempt ${retries + 1}/${maxRetries}:`, {
            status: response.status,
            statusText: response.statusText,
            errorText
          });
          
          // If we get a 404, don't retry - the image doesn't exist
          if (response.status === 404) {
            throw new Error(`Image with ID ${imageId} not found`);
          }
          
          // For other errors, retry
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        // Try to parse as JSON, retry if parsing fails
        try {
          const data = await response.json();
          return data;
        } catch (parseError) {
          console.warn(`JSON parse error for image ${imageId}, attempt ${retries + 1}/${maxRetries}:`, parseError);
          throw new Error("Invalid response format from server");
        }
      } catch (err) {
        lastError = err;
        retries++;
        
        if (retries >= maxRetries) {
          console.error(`All ${maxRetries} attempts to fetch image ${imageId} failed`);
          break;
        }
        
        // Wait before retrying, with increasing backoff
        await new Promise(resolve => setTimeout(resolve, 300 * retries));
      }
    }
    
    throw lastError || new Error(`Failed to fetch image after ${maxRetries} attempts`);
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
  prompts = null,
  cropCoords = { min_x: 0, min_y: 0, max_x: 1, max_y: 1 },
  label = 0
) => {
  try {
    const requestData = {
      image_id: imageId,
      model: model,
      use_prompts: !!prompts && prompts.length > 0,
      point_prompts: [],
      box_prompts: [],
      polygon_prompts: [],
      circle_prompts: [],
      min_x: cropCoords.min_x,
      min_y: cropCoords.min_y,
      max_x: cropCoords.max_x,
      max_y: cropCoords.max_y,
      label: label
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
    
    // Handle the new response format (masks with contours instead of base64_masks)
    if (result.masks && Array.isArray(result.masks)) {
      console.log("Received segmentation result with masks:", result.masks.length);
      
      // Convert the new response format to the old format for backward compatibility
      // This helps minimize changes in the rest of the application
      result.base64_masks = [];
      result.quality = [];
      
      result.masks.forEach(mask => {
        if (mask.contours && mask.contours.length > 0) {
          // We'll use a placeholder for base64_masks since we'll use the contours directly
          result.base64_masks.push('placeholder');
          result.quality.push(mask.predicted_iou);
          
          // Log quantification data if available for debugging
          if (mask.contours[0].quantifications) {
            console.log("Mask has quantifications:", mask.contours[0].quantifications);
          }
        }
      });
      
      // Add the original response format to allow proper rendering later
      result.original_masks = result.masks;
    } else {
      console.warn("Unexpected response format from segmentation endpoint:", result);
    }
    
    return result;
  } catch (error) {
    console.error("Error segmenting image:", error);
    throw error;
  }
};

// Save a mask
export const saveMask = async (imageId, label, contours) => {
  try {
    // Validate parameters
    if (imageId === undefined || imageId === null) {
      throw new Error("Image ID is required");
    }
    
    if (!label || typeof label !== 'string') {
      throw new Error("Label is required and must be a string");
    }
    
    if (!contours || !Array.isArray(contours) || contours.length === 0) {
      throw new Error("Contours are required and must be a non-empty array");
    }
    
    console.log(`Save mask functionality has been removed.`);
    console.log(`Would have saved mask for image ${imageId} with label ${label} and ${contours.length} contours`);
    
    // Return a mock success response
  
  } catch (error) {
    console.error("Error in save mask:", error);
    throw error;
  }
};

// Get all masks for an image
export const getMasksForImage = async (imageId) => {
  try {
    console.log(`Fetching masks for image: ${imageId}`);
    
    // Add a timeout to avoid hanging on slow requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/masks/get_masks_for_image/${imageId}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      // Handle the case where the backend returns 404 (which is expected if no masks exist)
      if (response.status === 404) {
        console.log("No masks found for image, which is normal before segmentation");
        return {
          success: true,
          message: "No masks found for this image yet",
          masks: []
        };
      }
      
      const data = await handleApiError(response);
      
      // If the response is in unexpected format, normalize it
      if (Array.isArray(data)) {
        // Backend is returning just an array of masks without the success wrapper
        return {
          success: true,
          masks: data.map(mask => ({
            ...mask,
            contours: mask.contours || []
          }))
        };
      }
      
      // Handle the case where masks might be missing or null
      if (data && !data.masks) {
        return {
          ...data,
          success: true,
          masks: []
        };
      }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error("Error getting masks for image:", error);
    
    // backend is not fully implemented yet, return a safe fallback
    if (error.message?.includes("NetworkError") || 
        error.message?.includes("Failed to fetch") ||
        error.name === "AbortError") {
      console.warn("Network error or timeout fetching masks - backend might be unavailable");
      return {
        success: false,
        message: "Cannot connect to mask service",
        masks: []
      };
    }
    
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

// Get final mask for an image
export const getFinalMask = async (imageId) => {
  try {
    console.log(`Fetching final mask for image: ${imageId}`);
    
    // Add a timeout to avoid hanging on slow requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/masks/get_final_mask/${imageId}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      // Handle the case where the backend returns 404 (which is expected if no final mask exists)
      if (response.status === 404) {
        console.log("No final mask found, which is normal before creating one");
        return {
          success: false,
          message: "No final mask exists yet",
          mask: null
        };
      }
      
      const data = await handleApiError(response);
      
      // Ensure the response has the expected structure
      if (data && !data.mask && data.id) {
        // Backend is returning the mask object directly, not wrapped
        return {
          success: true,
          mask: data
        };
      }
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error("Error getting final mask:", error);
    
    // If the backend is not fully implemented yet, return a safe fallback
    if (error.message?.includes("NetworkError") || 
        error.message?.includes("Failed to fetch") ||
        error.name === "AbortError") {
      console.warn("Network error or timeout fetching final mask - backend might be unavailable");
      return {
        success: false,
        message: "Cannot connect to mask service",
        mask: null
      };
    }
    
    throw error;
  }
};

// Update a mask with new contours
export const updateMask = async (mask) => {
  try {
    // Get the mask ID from the mask object
    const maskId = mask.id;
    
    if (!maskId) {
      throw new Error("Mask ID is required");
    }
    
    // Ensure contours are in the correct format: x/y arrays, label, and quantifications
    const formattedContours = mask.contours.map(contour => {
      // Make sure each contour has the required properties
      return {
        x: contour.x,
        y: contour.y,
        label: parseInt(contour.label || 0, 10),  // Ensure it's an integer
        area: contour.quantifications?.area || 0,
        perimeter: contour.quantifications?.perimeter || 0,
        circularity: contour.quantifications?.circularity || 0,
        diameters: contour.quantifications?.diameters || []
      };
    });

    const requestData = {
      mask_id: maskId,
      contours: formattedContours,
      is_final: mask.is_final || false
    };

    const response = await fetch(`${API_BASE_URL}/masks/update_mask`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });
    return handleApiError(response);
  } catch (error) {
    console.error("Error updating mask:", error);
    throw error;
  }
};

// Add contours to final mask
export const addContoursToFinalMask = async (imageId, contours) => {
  try {
    console.log(`Add contours to final mask functionality has been removed.`);
    console.log(`Would have added ${contours.length} contours to final mask for image ${imageId}`);
    
    // Return a mock success response
    return {
      success: true,
      message: "Add contours to final mask functionality has been removed",
      mask: { id: 0 }
    };
  } catch (error) {
    console.error("Error in add contours to final mask:", error);
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

// Fetch all available labels
export const fetchLabels = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/labels/get_labels`);
    return handleApiError(response);
  } catch (error) {
    console.error("Error fetching labels:", error);
    throw error;
  }
};

// Create a new label (class)
export const createLabel = async (labelData) => {
  try {
    // Extract values from the label data object
    const { name, parent_id = null } = labelData;
    
    if (!name) {
      throw new Error("Label name is required");
    }
    
    const url = new URL(`${API_BASE_URL}/labels/create_label`);
    url.searchParams.append('label_name', name);
    
    if (parent_id) {
      url.searchParams.append('parent_label_id', parent_id);
    } else {
      url.searchParams.append('parent_label_id', 0);
    }
    
    const response = await fetch(url, {
      method: 'POST'
    });
    
    return handleApiError(response);
  } catch (error) {
    console.error("Error creating label:", error);
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
  getFinalMask,
  updateMask,
  addContoursToFinalMask,
  deleteMask,
  createCutouts,
  fetchLabels,
  createLabel,
};

export default API;