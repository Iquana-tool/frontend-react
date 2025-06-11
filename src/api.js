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
export const fetchImages = async (datasetId) => {
  try {
    if (!datasetId) {
      throw new Error("Dataset ID is required");
    }
    const response = await fetch(`${API_BASE_URL}/images/list_images/${datasetId}`);
    return handleApiError(response);
  } catch (error) {
    console.error("Error fetching images:", error);
    throw error;
  }
};

// Upload multiple images at once
export const uploadImages = async (files, datasetId) => {
  const maxRetries = 2;
  let retryCount = 0;
  let lastError = null;

  if (!datasetId) {
    throw new Error("Dataset ID is required");
  }

  if (!files || files.length === 0) {
    throw new Error("No files provided");
  }

  while (retryCount <= maxRetries) {
    try {
      console.log(`Uploading ${files.length} files to: ${API_BASE_URL}/images/upload_images (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      // Create a new FormData for each attempt
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      // Use a timeout to abort the request if it takes too long
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for multiple files
      
      try {
        const url = new URL(`${API_BASE_URL}/images/upload_images`);
        url.searchParams.append('dataset_id', datasetId);
        
        const response = await fetch(url, {
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
            throw new Error("Files are too large. Maximum total size exceeded.");
          } else if (response.status === 415) {
            throw new Error("Unsupported file type. Please upload valid image files.");
          } else if (response.status === 401 || response.status === 403) {
            throw new Error("Unauthorized. Please try again or refresh the page.");
          } else if (response.status === 500) {
            // Check if it's a duplicate image error
            if (responseText.includes("UNIQUE constraint failed") || 
                responseText.includes("Invalid file or upload failed")) {
              throw new Error("Some images already exist in the system. Each image can only be uploaded once across all datasets. Please select different images or remove duplicates.");
            }
            // Server errors are worth retrying for other cases
            throw new Error(`Server error (${response.status}). Retrying...`);
          } else if (response.status === 400) {
            // Handle duplicate image errors specifically
            if (responseText.includes("Invalid file or upload failed")) {
              throw new Error("Some images already exist in the system. Each image can only be uploaded once across all datasets. Please select different images or remove duplicates.");
            }
            throw new Error("Bad request. Please check your files and try again.");
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
          throw new Error("Upload timed out. Please try again with smaller files or check your connection.");
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error(`Upload attempt ${retryCount + 1} failed:`, error);
      lastError = error;
      
      // Don't retry duplicate image errors or client errors
      const isDuplicateError = error.message.includes("already exist in the system") ||
                              error.message.includes("Invalid file or upload failed");
      const isClientError = error.message.includes("Files are too large") ||
                           error.message.includes("Unsupported file type") ||
                           error.message.includes("Unauthorized") ||
                           error.message.includes("Bad request");
      
      if (isDuplicateError || isClientError || retryCount >= maxRetries) {
        break; // Don't retry these types of errors
      }
      
      // Only retry on network errors and server errors (5xx) that aren't duplicate errors
      const isRetryableError = error.message.includes("Server error") || 
                               error.message.includes("network") ||
                               error.message.includes("failed to fetch");
      
      if (!isRetryableError) {
        break;
      }
      
      // Wait before retrying
      const delay = 1000 * Math.pow(2, retryCount); // Exponential backoff
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retryCount++;
    }
  }
  
  // If we got here, all retries failed
  throw lastError || new Error("Failed to upload images after multiple attempts");
};

// Upload an image
export const uploadImage = async (file, datasetId) => {
  const maxRetries = 2;
  let retryCount = 0;
  let lastError = null;

  if (!datasetId) {
    throw new Error("Dataset ID is required");
  }

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
        const url = new URL(`${API_BASE_URL}/images/upload_image`);
        url.searchParams.append('dataset_id', datasetId);
        
        const response = await fetch(url, {
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
          } else if (response.status === 500) {
            // Check if it's a duplicate image error
            if (responseText.includes("UNIQUE constraint failed") || 
                responseText.includes("Invalid file or upload failed")) {
              throw new Error("This image already exists in the system. Each image can only be uploaded once across all datasets.");
            }
            // Server errors are worth retrying for other cases
            throw new Error(`Server error (${response.status}). Retrying...`);
          } else if (response.status === 400) {
            // Handle duplicate image errors specifically
            if (responseText.includes("Invalid file or upload failed")) {
              throw new Error("This image already exists in the system. Each image can only be uploaded once across all datasets.");
            }
            throw new Error("Bad request. Please check your file and try again.");
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
      
      // Don't retry duplicate image errors or client errors
      const isDuplicateError = error.message.includes("already exists in the system") ||
                              error.message.includes("Invalid file or upload failed");
      const isClientError = error.message.includes("File is too large") ||
                           error.message.includes("Unsupported file type") ||
                           error.message.includes("Unauthorized") ||
                           error.message.includes("Bad request");
      
      if (isDuplicateError || isClientError || retryCount >= maxRetries) {
        break; // Don't retry these types of errors
      }
      
      // Only retry on network errors and server errors (5xx) that aren't duplicate errors
      const isRetryableError = error.message.includes("Server error") || 
                               error.message.includes("network") ||
                               error.message.includes("failed to fetch");
      
      if (!isRetryableError) {
        break;
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
    
    console.log(`Creating mask for image ${imageId} with label "${label}" and ${contours.length} contours`);
    
    // First create a mask to get a mask_id
    const createMaskUrl = `${API_BASE_URL}/masks/create_mask/${imageId}`;
    console.log(`Creating base mask at: ${createMaskUrl}`);
    
    const createResponse = await fetch(createMaskUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      }
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`Error creating mask: ${createResponse.status}`, errorText);
      throw new Error(`Failed to create mask: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const createResult = await createResponse.json();
    console.log("Mask creation result:", createResult);
    
    if (!createResult || !createResult.mask_id) {
      throw new Error("Failed to get mask ID from create_mask response");
    }
    
    const maskId = createResult.mask_id;
    console.log(`Successfully created mask with ID: ${maskId}`);
    
    // Now add each contour to the mask
    const results = [];
    
    for (let i = 0; i < contours.length; i++) {
      const contour = contours[i];
      console.log(`Adding contour ${i + 1}/${contours.length} to mask ${maskId}`);
      
      // Create the query parameters
      const params = new URLSearchParams();
      params.append('mask_id', maskId);
      
      if (i > 0 && results.length > 0 && results[i-1].contour_id) {
        // If we have a previous contour, we can set it as parent
        params.append('parent_contour_id', results[i-1].contour_id);
      }
      
      const addContourUrl = `${API_BASE_URL}/masks/add_contour?${params.toString()}`;
      
      const addResponse = await fetch(addContourUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          x: contour.x,
          y: contour.y,
          label: contour.label || 0
        }),
      });
      
      if (!addResponse.ok) {
        console.error(`Error adding contour ${i + 1}: ${addResponse.status}`);
        continue; // Try to continue with the next contour
      }
      
      const addResult = await addResponse.json();
      console.log(`Added contour ${i + 1}, result:`, addResult);
      results.push(addResult);
    }
    
    // Return information about the mask and contours
    return {
      id: maskId,
      success: true,
      message: `Created mask with ${results.length} contours`,
      contours: results.map(r => r.contour_id)
    };
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
      // Update to use path parameter format to match backend implementation
      const url = `${API_BASE_URL}/masks/get_masks_for_image/${imageId}`;
      
      console.log(`Making request to: ${url}`);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        method: 'GET'
      });
      
      clearTimeout(timeoutId);
      
      // Handle the case where the backend returns 404 (which is expected if no masks exist)
      if (response.status === 404) {
        console.log(`No masks found for image ID: ${imageId} (normal before segmentation)`);
        return {
          success: true,
          message: "No masks found for this image yet",
          masks: []
        };
      }
      
      // For other error status codes, handle them through structured error responses
      if (!response.ok) {
        // Try to parse error response
        try {
          const errorData = await response.json();
          console.error("Error response from get_masks_for_image:", errorData);
          return {
            success: false,
            message: errorData.detail || `Error ${response.status}: ${response.statusText}`,
            masks: []
          };
        } catch (e) {
          // If we can't parse the error as JSON, use the status text
          return {
            success: false,
            message: `Error ${response.status}: ${response.statusText}`,
            masks: []
          };
        }
      }
      
      const data = await response.json();
      console.log("Masks for image API response:", data);
      
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
    // Log appropriately based on error type
    if (error.name === "AbortError") {
      console.warn(`Request to get masks for image ${imageId} timed out`);
    } else if (error.message?.includes("NetworkError") || 
               error.message?.includes("Failed to fetch")) {
      console.warn(`Network error fetching masks for image ${imageId} - backend might be unavailable`);
    } else {
      console.error(`Error getting masks for image ${imageId}:`, error);
    }
    
    // Return a safe response instead of throwing
    return {
      success: false,
      message: "Cannot retrieve masks: " + (error.name === "AbortError" ? 
        "Request timed out" : 
        error.message || "Unknown error"),
      masks: []
    };
  }
};

// Get a mask with its contours properly loaded
export const getMaskWithContours = async (maskId) => {
  try {
    // Add a timeout to avoid hanging on slow requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      console.log(`Fetching mask details for mask ID: ${maskId}`);
      
      // First get the basic mask info
      const response = await fetch(`${API_BASE_URL}/masks/get_mask/${maskId}`, {
        signal: controller.signal
      });
      
      // Handle 404 and other errors
      if (response.status === 404) {
        console.log(`Mask with ID ${maskId} not found`);
        return {
          success: false,
          message: `Mask not found`,
          mask: null
        };
      }
      
      if (!response.ok) {
        return {
          success: false,
          message: `Error ${response.status}: ${response.statusText}`,
          mask: null
        };
      }
      
      // Parse mask data
      const maskData = await response.json();
      
      // Now fetch the contours for this mask
      console.log(`Fetching contours for mask ID: ${maskId}`);
      const contoursResponse = await fetch(`${API_BASE_URL}/masks/get_contours_of_mask/${maskId}`, {
        signal: controller.signal
      });
      
      // Clear timeout once both requests complete
      clearTimeout(timeoutId);
      
      // Handle 404 for contours request (mask exists but has no contours)
      if (contoursResponse.status === 404) {
        console.log(`No contours found for mask ID: ${maskId}`);
        return {
          success: true,
          message: 'Mask found but has no contours',
          mask: {
            ...maskData,
            contours: []
          }
        };
      }
      
      // Handle other errors for contours request
      if (!contoursResponse.ok) {
        return {
          success: true,
          message: `Mask found but error fetching contours: ${contoursResponse.status}`,
          mask: {
            ...maskData,
            contours: []
          }
        };
      }
      
      // Parse contours data
      const contoursData = await contoursResponse.json();
      
      // Format contours data for frontend use
      const formattedContours = contoursData.map(contour => {
        let coords = {};
        try {
          coords = JSON.parse(contour.coords);
        } catch (e) {
          console.error("Error parsing contour coordinates:", e);
          coords = { x: [], y: [] };
        }
        
        return {
          id: contour.id,
          x: coords.x || [],
          y: coords.y || [],
          label: contour.label || 0,
          parent_id: contour.parent_id
        };
      });
      
      // Combine mask data with contours
      return {
        success: true,
        mask: {
          ...maskData,
          contours: formattedContours
        }
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    // Log appropriately based on error type
    if (error.name === "AbortError") {
      console.warn(`Request to get mask details for mask ID ${maskId} timed out`);
    } else if (error.message?.includes("NetworkError") || 
               error.message?.includes("Failed to fetch")) {
      console.warn(`Network error fetching mask details for mask ID ${maskId}`);
    } else {
      console.error(`Error getting mask details for mask ID ${maskId}:`, error);
    }
    
    // Return a safe response instead of throwing
    return {
      success: false,
      message: "Cannot retrieve mask details: " + (error.name === "AbortError" ? 
        "Request timed out" : 
        error.message || "Unknown error"),
      mask: null
    };
  }
};

/**
 * Retrieves the final mask for an image directly from the dedicated backend endpoint.
 * This function uses the specialized endpoint for final masks that includes contours.
 * 
 * @param {number} imageId - The ID of the image to get the final mask for.
 * @returns {Promise<Object>} - A response object containing the final mask with its contours if found.
 */
export async function getFinalMask(imageId) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      console.log(`Fetching final mask for image ${imageId} (attempt ${attempts + 1})`);
      const response = await fetch(`${API_BASE_URL}/masks/get_final_mask/${imageId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // If mask not found, return appropriate message
      if (response.status === 404) {
        console.log(`No final mask found for image ${imageId}`);
        return {
          success: false,
          message: "No final mask found for this image."
        };
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error fetching final mask: ${errorData.detail || response.statusText}`);
        return {
          success: false,
          message: errorData.detail || "Error fetching final mask."
        };
      }

      // Parse and return the successful response
      const data = await response.json();
      console.log(`Successfully fetched final mask for image ${imageId}`, data);
      
      // The backend returns the mask data directly, not nested under a "mask" property
      return {
        success: true,
        mask: {
          id: data.mask_id,
          image_id: data.image_id,
          contours: data.contours || []
        }
      };
    } catch (error) {
      console.error(`Network error when fetching final mask: ${error.message}`);
      attempts++;
      
      // If we still have attempts left, wait before retrying
      if (attempts < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        return {
          success: false,
          message: `Network error: ${error.message}`
        };
      }
    }
  }
}

/**
 * Creates a final mask for an image if one doesn't exist yet.
 * 
 * @param {number} imageId - The ID of the image to create a final mask for.
 * @returns {Promise<Object>} - Response with the mask ID and creation status.
 */
export async function createFinalMask(imageId) {
  try {
    console.log(`Creating final mask for image ${imageId}`);
    const response = await fetch(`${API_BASE_URL}/masks/create_final_mask/${imageId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error creating final mask: ${errorData.detail || response.statusText}`);
      return {
        success: false,
        message: errorData.detail || "Error creating final mask."
      };
    }

    const data = await response.json();
    console.log(`Final mask creation response: ${data.is_new ? 'Created new mask' : 'Using existing mask'} with ID ${data.mask_id}`);
    return {
      success: true,
      maskId: data.mask_id,
      isNew: data.is_new,
      message: data.message
    };
  } catch (error) {
    console.error(`Network error when creating final mask: ${error.message}`);
    return {
      success: false,
      message: `Network error: ${error.message}`
    };
  }
}

/**
 * Adds a contour to the final mask of an image.
 * Creates the final mask if it doesn't exist yet.
 * 
 * @param {number} imageId - The ID of the image.
 * @param {Object} contour - The contour to add with x, y coordinates and a label.
 * @returns {Promise<Object>} - Response with the mask ID and contour ID.
 */
export async function addContourToFinalMask(imageId, contour) {
  try {
    // Validate parameters
    if (!imageId || typeof imageId !== 'number') {
      console.error("Invalid imageId provided to addContourToFinalMask");
      return {
        success: false,
        message: "Invalid image ID."
      };
    }

    if (!contour || !Array.isArray(contour.x) || !Array.isArray(contour.y) || !contour.label) {
      console.error("Invalid contour provided to addContourToFinalMask", contour);
      return {
        success: false,
        message: "Invalid contour data. Must include x and y coordinate arrays and a label."
      };
    }

    console.log(`Adding contour to final mask for image ${imageId} with label ${contour.label}`);
    
    const response = await fetch(`${API_BASE_URL}/masks/add_contour_to_final_mask/${imageId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contour)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error adding contour to final mask: ${errorData.detail || response.statusText}`);
      return {
        success: false,
        message: errorData.detail || "Error adding contour to final mask."
      };
    }

    const data = await response.json();
    console.log(`Successfully added contour to final mask: mask ID ${data.mask_id}, contour ID ${data.contour_id}`);
    return {
      success: true,
      maskId: data.mask_id,
      contourId: data.contour_id,
      message: data.message
    };
  } catch (error) {
    console.error(`Network error when adding contour to final mask: ${error.message}`);
    return {
      success: false,
      message: `Network error: ${error.message}`
    };
  }
}

/**
 * Adds multiple contours to the final mask of an image.
 * Creates the final mask if it doesn't exist yet.
 * 
 * @param {number} imageId - The ID of the image.
 * @param {Array<Object>} contours - Array of contours to add, each with x, y coordinates and a label.
 * @returns {Promise<Object>} - Response with the mask ID and array of contour IDs.
 */
export async function addContoursToFinalMask(imageId, contours) {
  try {
    // Validate parameters
    if (!imageId || typeof imageId !== 'number') {
      console.error("Invalid imageId provided to addContoursToFinalMask");
      return {
        success: false,
        message: "Invalid image ID."
      };
    }

    if (!Array.isArray(contours) || contours.length === 0) {
      console.error("Invalid contours provided to addContoursToFinalMask", contours);
      return {
        success: false,
        message: "Invalid contours data. Must provide an array of contours."
      };
    }

    // Validate each contour
    for (const contour of contours) {
      if (!contour || !Array.isArray(contour.x) || !Array.isArray(contour.y) || !contour.label) {
        console.error("Invalid contour in array", contour);
        return {
          success: false,
          message: "Invalid contour data. Each contour must include x and y coordinate arrays and a label."
        };
      }
    }

    console.log(`Adding ${contours.length} contours to final mask for image ${imageId}`);
    
    // Add debug info about the URL being called
    const url = `${API_BASE_URL}/masks/add_contours_to_final_mask/${imageId}`;
    
    // Create proper request body - wrap contours array in an object with a "contours" key
    const requestBody = { contours };
    
    console.log(`Making API call to: ${url}`);
    console.log(`Request body: ${JSON.stringify(requestBody)}`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        // Ignore JSON parsing error
      }
      console.error(`Error adding contours to final mask: ${errorMessage}`);
      return {
        success: false,
        message: errorMessage
      };
    }

    const data = await response.json();
    console.log(`Successfully added ${data.contour_ids?.length || 0} contours to final mask: mask ID ${data.mask_id}`);
    return {
      success: true,
      maskId: data.mask_id,
      contourIds: data.contour_ids || [],
      message: data.message || "Contours added successfully"
    };
  } catch (error) {
    console.error(`Network error when adding contours to final mask: ${error.message}`);
    return {
      success: false,
      message: `Network error: ${error.message}`
    };
  }
}

// Update a mask with new contours
export const updateMask = async (mask) => {
  try {
    // Get the mask ID from the mask object
    const maskId = mask.id;
    if (!maskId) {
      throw new Error("Mask ID is required");
    }
    // Ensure contours are in the correct format: x/y arrays and label only
    const formattedContours = mask.contours.map(contour => {
      return {
        x: contour.x,
        y: contour.y,
        label: parseInt(contour.label || 0, 10) // Ensure it's an integer
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

// Get a specific mask (basic version without contours)
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

// Fetch all available labels
export const fetchLabels = async (datasetId) => {
  try {
    if (!datasetId) {
      throw new Error("Dataset ID is required");
    }
    const response = await fetch(`${API_BASE_URL}/labels/get_labels/${datasetId}`);
    return handleApiError(response);
  } catch (error) {
    console.error("Error fetching labels:", error);
    throw error;
  }
};

// Create a new label (class)
// labelData: { name: string, parent_id: number | null } 
// parent_id: null for top-level labels, actual ID for subclasses
export const createLabel = async (labelData, datasetId) => {
  try {
    // Extract values from the label data object
    const { name, parent_id = null } = labelData;
    
    if (!name) {
      throw new Error("Label name is required");
    }
    
    if (!datasetId) {
      throw new Error("Dataset ID is required");
    }
    
    const url = new URL(`${API_BASE_URL}/labels/create_label`);
    url.searchParams.append('label_name', name);
    url.searchParams.append('dataset_id', datasetId);
    
    // Send null for top-level, actual ID for subclasses
    if (parent_id !== null) {
      url.searchParams.append('parent_label_id', parent_id);
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

// Get quantification data for a given mask_id
export const getQuantification = async (maskId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/export/get_quantification/${maskId}`);
    const data = await handleApiError(response);
    
    // Check if the data has the expected structure
    if (!data || !data.quantifications) {
      console.warn(`Invalid quantification data format for mask ${maskId}`);
      return { quantifications: [] };
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching quantification for mask ${maskId}:`, error);
    throw error;
  }
};

// Get all contours for a mask
export const getContoursForMask = async (maskId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/masks/get_contours_of_mask/${maskId}`
    );
    return handleApiError(response);
  } catch (error) {
    console.error("Error getting contours for mask:", error);
    throw error;
  }
};

// Delete a contour from a mask
export const deleteContour = async (contourId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/masks/delete_contour/${contourId}`,
      {
        method: "DELETE",
      }
    );
    return handleApiError(response);
  } catch (error) {
    console.error("Error deleting contour:", error);
    throw error;
  }
};

// Dataset API functions
export const fetchDatasets = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/get_datasets`);
    return handleApiError(response);
  } catch (error) {
    console.error("Error fetching datasets:", error);
    throw error;
  }
};

export const createDataset = async (name, description) => {
  try {
    const url = new URL(`${API_BASE_URL}/datasets/create_dataset`);
    url.searchParams.append('name', name);
    url.searchParams.append('description', description);
    
    const response = await fetch(url, {
      method: 'POST'
    });
    return handleApiError(response);
  } catch (error) {
    console.error("Error creating dataset:", error);
    throw error;
  }
};

export const deleteDataset = async (datasetId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/delete_dataset/${datasetId}`, {
      method: 'DELETE'
    });
    return handleApiError(response);
  } catch (error) {
    console.error("Error deleting dataset:", error);
    throw error;
  }
};

export const getDataset = async (datasetId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/get_dataset/${datasetId}`);
    return handleApiError(response);
  } catch (error) {
    console.error("Error fetching dataset:", error);
    throw error;
  }
};

// Get annotation progress for a dataset
export const getAnnotationProgress = async (datasetId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/get_annotation_progress/${datasetId}`);
    return handleApiError(response);
  } catch (error) {
    console.error("Error fetching annotation progress:", error);
    throw error;
  }
};

// Get sample images for a dataset (first few images)
export const getSampleImages = async (datasetId, limit = 4) => {
  try {
    const response = await fetch(`${API_BASE_URL}/images/list_images/${datasetId}`);
    const data = await handleApiError(response);
    
    if (data.success && data.images && data.images.length > 0) {
      // Get the first few images as samples
      const sampleImages = data.images.slice(0, limit);
      
      // Fetch the actual image data for each sample
      const imagePromises = sampleImages.map(async (image) => {
        try {
          const imageData = await getImageById(image.id);
          return {
            id: image.id,
            base64: imageData[image.id],
            filename: image.filename
          };
        } catch (error) {
          console.warn(`Failed to fetch sample image ${image.id}:`, error);
          return null;
        }
      });
      
      const resolvedImages = await Promise.all(imagePromises);
      return resolvedImages.filter(img => img !== null);
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching sample images:", error);
    return [];
  }
};

const API = {
  fetchImages,
  uploadImage,
  uploadImages,
  getImageById,
  deleteImage,
  segmentImage,
  saveMask,
  getMasksForImage,
  getMaskWithContours,
  getFinalMask,
  updateMask,
  addContoursToFinalMask,
  deleteMask,
  createCutouts,
  fetchLabels,
  createLabel,
  getQuantification,
  getContoursForMask,
  getMask,
  deleteContour,
  fetchDatasets,
  createDataset,
  deleteDataset,
  getDataset,
  getAnnotationProgress,
  getSampleImages,
};

export default API;