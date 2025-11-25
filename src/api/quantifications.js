import { handleApiError, getAuthHeaders } from "../api/util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

// Get quantification data for a given mask_id
export const getQuantification = async (maskId) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/contours/get_contours_of_mask/${maskId}&flattened=false`,
            {
                headers: getAuthHeaders(),
            }
        );
        const data = await handleApiError(response);

        // Check if the data has the expected structure
        if (!data || !data.quantification) {
            return { quantification: [] };
        }

        return data;
    } catch (error) {
        throw error;
    }
};

// Get dataset object quantifications with hierarchical labels and aggregated metrics
export const getDatasetObjectQuantifications = async (datasetId, includeManual = true, includeAuto = true) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/export/get_dataset_object_quantifications/${datasetId}&include_manual=${includeManual}&include_auto=${includeAuto}`,
            {
                headers: getAuthHeaders(),
            }
        );
        const data = await handleApiError(response);
        return data;
    } catch (error) {
        throw error;
    }
};