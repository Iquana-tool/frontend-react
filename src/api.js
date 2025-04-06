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