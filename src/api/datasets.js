import { handleApiError, getAuthHeaders, buildUrl } from "../api/util";
import { getImageById } from "./images"; // Import the image fetching function

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

// Dataset API functions
export const fetchDatasets = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/datasets/all`, {
            headers: getAuthHeaders(),
        });
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

export const createDataset = async (name, description, datasetType) => {
    try {
        const url = buildUrl(API_BASE_URL, '/datasets/create', {
            name: name,
            description: description,
            dataset_type: datasetType
        });

        const response = await fetch(url, {
            method: "POST",
            headers: getAuthHeaders(),
        });
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

export const deleteDataset = async (datasetId) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/datasets/${datasetId}`,
            {
                method: "DELETE",
                headers: getAuthHeaders(),
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
            `${API_BASE_URL}/datasets/${datasetId}`,
            {
                headers: getAuthHeaders(),
            }
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

// Get annotation progress for a dataset
export const getAnnotationProgress = async (datasetId) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/datasets/${datasetId}/progress`,
            {
                headers: getAuthHeaders(),
            }
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

// Get sample images for a dataset (first few images)
export const getSampleImages = async (datasetId, limit = 4) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/datasets/${datasetId}/images`,
            {
                headers: getAuthHeaders(),
            }
        );
        const data = await handleApiError(response);

        
        const imageList = data.image_data || data.images || [];
        
        if (data.success && imageList.length > 0) {
            // Get the first few images as samples
            const sampleImages = imageList.slice(0, limit);

            // Fetch the actual image data for each sample
            const imagePromises = sampleImages.map(async (imageItem) => {
                
                const imageId = imageItem.image_id || imageItem.id;
                const filename = imageItem.filename || `image_${imageId}`;
                
                try {
                    const imageData = await getImageById(imageId, true);
                    
                    // The backend returns the image_id as a dynamic key in the response
                    // Try multiple ways to access it (numeric, string, or check all keys)
                    let base64 = imageData[imageId] || imageData[String(imageId)];
                    
                    // If still not found, try to find it by checking all keys
                    if (!base64) {
                        const keys = Object.keys(imageData);
                        
                        // Try to find any key that isn't 'success' or 'message'
                        const dataKey = keys.find(key => key !== 'success' && key !== 'message');
                        if (dataKey) {
                            base64 = imageData[dataKey];
                        }
                    }
                    
                    if (!base64) {
                        return null;
                    }
                    
                    return {
                        id: imageId,
                        base64: base64,
                        filename: filename,
                    };
                } catch (error) {
                    return null;
                }
            });

            const resolvedImages = await Promise.all(imagePromises);
            const validImages = resolvedImages.filter((img) => img !== null);
            return validImages;
        }

        return [];
    } catch (error) {
        return [];
    }
};