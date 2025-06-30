import { handleApiError } from "../api/util";
import { getImageById } from "./images"; // Import the image fetching function

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

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