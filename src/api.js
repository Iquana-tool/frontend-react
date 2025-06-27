import {
  fetchImages,
  uploadImage,
  deleteImage,
  getImageById,
  uploadImages
} from 'api/images'
import {
  segmentImage
} from "./api/segmentation";
import {
  getMask,
  deleteMask,
  saveMask,
  getMasksForImage,
  updateMask,
  getMaskWithContours,
  addContoursToFinalMask,
  createFinalMask,
  addContourToFinalMask,
  getFinalMask
} from "./api/masks";
import {
  fetchLabels,
  createLabel,
  deleteLabel
} from "./api/labels";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

// Function to handle API errors
const handleApiError = async (response) => {
  if (!response.ok) {
    // Try to parse the error message from the response
    try {
      const errorData = await response.json();

      // Handle FastAPI validation errors which come in 'detail' field
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // FastAPI validation errors are often arrays
          const errorMessage = errorData.detail
            .map((err) => `${err.loc.join(".")}: ${err.msg}`)
            .join(", ");
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

// Get quantification data for a given mask_id
export const getQuantification = async (maskId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/export/get_quantification/${maskId}`
    );
    const data = await handleApiError(response);

    // Check if the data has the expected structure
    if (!data || !data.quantifications) {
      return { quantifications: [] };
    }

    return data;
  } catch (error) {
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
    throw error;
  }
};

// Dataset API functions
export const fetchDatasets = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/datasets/get_datasets`);
    return handleApiError(response);
  } catch (error) {
    throw error;
  }
};

export const createDataset = async (name, description, datasetType) => {
  try {
    const url = new URL(`${API_BASE_URL}/datasets/create_dataset`);
    url.searchParams.append("name", name);
    url.searchParams.append("description", description);
    url.searchParams.append("dataset_type", datasetType);

    const response = await fetch(url, {
      method: "POST",
    });
    return handleApiError(response);
  } catch (error) {
    throw error;
  }
};

export const deleteDataset = async (datasetId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/datasets/delete_dataset/${datasetId}`,
      {
        method: "DELETE",
      }
    );
    return handleApiError(response);
  } catch (error) {
    throw error;
  }
};

export const getDataset = async (datasetId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/datasets/get_dataset/${datasetId}`
    );
    return handleApiError(response);
  } catch (error) {
    console.error("Error fetching dataset:", error);
    throw error;
  }
};

// Get annotation progress for a dataset
export const getAnnotationProgress = async (datasetId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/datasets/get_annotation_progress/${datasetId}`
    );
    return handleApiError(response);
  } catch (error) {
    console.error("Error fetching annotation progress:", error);
    throw error;
  }
};

// Get sample images for a dataset (first few images)
export const getSampleImages = async (datasetId, limit = 4) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/images/list_images/${datasetId}`
    );
    const data = await handleApiError(response);

    if (data.success && data.images && data.images.length > 0) {
      // Get the first few images as samples
      const sampleImages = data.images.slice(0, limit);

      // Fetch the actual image data for each sample
      const imagePromises = sampleImages.map(async (image) => {
        try {
          const imageData = await getImageById(image.id, true);
          return {
            id: image.id,
            base64: imageData[image.id],
            filename: image.filename,
          };
        } catch (error) {
          console.warn(`Failed to fetch sample image ${image.id}:`, error);
          return null;
        }
      });

      const resolvedImages = await Promise.all(imagePromises);
      return resolvedImages.filter((img) => img !== null);
    }

    return [];
  } catch (error) {
    console.error("Error fetching sample images:", error);
    return [];
  }
};

// Get available prompted segmentation models from backend
export const getPromptedModels = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/models/get_prompted_models`);
    const data = await handleApiError(response);

    if (data.success && data.models) {
      return {
        success: true,
        models: data.models,
      };
    }

    // Fallback to hardcoded models if backend doesn't return any
    return {
      success: true,
      models: [
        { id: 1, name: "SAM2Tiny", model_type: "prompted" },
        { id: 2, name: "SAM2Small", model_type: "prompted" },
        { id: 3, name: "SAM2Large", model_type: "prompted" },
        { id: 4, name: "SAM2BasePlus", model_type: "prompted" },
      ],
      fallback: true,
    };
  } catch (error) {
    console.warn("Error fetching prompted models, using fallback:", error);
    return {
      success: true,
      models: [
        { id: 1, name: "SAM2Tiny", model_type: "prompted" },
        { id: 2, name: "SAM2Small", model_type: "prompted" },
        { id: 3, name: "SAM2Large", model_type: "prompted" },
        { id: 4, name: "SAM2BasePlus", model_type: "prompted" },
      ],
      fallback: true,
    };
  }
};

// Get available automatic segmentation models from backend
export const getAutomaticModels = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/models/get_automatic_models`);
    const data = await handleApiError(response);

    if (data.success && data.models) {
      return {
        success: true,
        models: data.models,
      };
    }

    return {
      success: true,
      models: [],
      message: "No automatic models available",
    };
  } catch (error) {
    console.error("Error fetching automatic models:", error);
    return {
      success: false,
      models: [],
      message: error.message,
    };
  }
};

// Get available 3D segmentation models from backend
export const get3DModels = async () => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/models/get_automatic_3d_models`
    );
    const data = await handleApiError(response);

    if (data.success && data.models) {
      return {
        success: true,
        models: data.models,
      };
    }

    return {
      success: true,
      models: [],
      message: "No 3D models available",
    };
  } catch (error) {
    console.error("Error fetching 3D models:", error);
    return {
      success: false,
      models: [],
      message: error.message,
    };
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
  updateMask,
  deleteMask,
  createCutouts,
  fetchLabels,
  createLabel,
  deleteLabel,
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
  getPromptedModels,
  getAutomaticModels,
  get3DModels,
};

export default API;
