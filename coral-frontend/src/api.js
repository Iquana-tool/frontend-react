const API_BASE_URL = 'http://localhost:8000';

// Function to handle API errors
const handleApiError = (response) => {
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

// Fetch list of available images
export const fetchImages = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/images/list_images`);
    return handleApiError(response);
  } catch (error) {
    console.error('Error fetching images:', error);
    throw error;
  }
};

// Upload an image
export const uploadImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/images/upload_image`, {
      method: 'POST',
      body: formData,
    });
    return handleApiError(response);
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Get image by ID
export const getImageById = async (imageId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/images/get_image/${imageId}`);
    return handleApiError(response);
  } catch (error) {
    console.error('Error getting image:', error);
    throw error;
  }
};

// Segment an image
export const segmentImage = async (imageId, prompts = null) => {
    try {
      const requestData = {
        image_id: imageId,
        use_prompts: !!prompts,
        point_prompts: [],
        box_prompts: [],
      };
  
      if (prompts) {
        // Convert prompts to the format expected by the API
        prompts.forEach(prompt => {
          if (prompt.type === 'point') {
            requestData.point_prompts.push({
              x: prompt.coordinates.x,
              y: prompt.coordinates.y,
              label: prompt.label,
            });
          } else if (prompt.type === 'box') {
            requestData.box_prompts.push({
              min_x: prompt.coordinates.startX,
              min_y: prompt.coordinates.startY,
              max_x: prompt.coordinates.endX,
              max_y: prompt.coordinates.endY,
            });
          }
        });
      }
  
      /*
      const response = await fetch(`${API_BASE_URL}/segmentation/segment_image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      return handleApiError(response);
      */
      
      // Mock response - will be replaced by actual API call in production
      return new Promise((resolve) => {
        setTimeout(() => {
          // Create a few random "mask" strings (these would be base64 encoded PNGs in production)
          const mockBase64Masks = [
            // These would be actual base64 encoded PNGs in production
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=="
          ];
          
          const mockQuality = [0.92, 0.85, 0.78];
          
          resolve({
            base64_masks: mockBase64Masks,
            quality: mockQuality
          });
        }, 1000);
      });
    } catch (error) {
      console.error('Error segmenting image:', error);
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
  
      // For the purpose of this implementation, we'll mock the API response
      // In production, we have to uncomment the fetch code below
      
      /*
      const response = await fetch(`${API_BASE_URL}/cutouts/get_cutouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      return handleApiError(response);
      */
      
      // Mock response - will be replaced by actual API call in production
      // In this mock, we're just returning the mask as the cutout image
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            cutout_image: base64Mask, // In real implementation, this would be the cutout image
            position: {
              x: 0,
              y: 0
            }
          });
        }, 500);
      });
    } catch (error) {
      console.error('Error creating cutouts:', error);
      throw error;
    }
  };

export default {
  fetchImages,
  uploadImage,
  getImageById,
  segmentImage,
  createCutouts,
};