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

// Get all quantifications for a dataset
// TODO: Replace with actual endpoint
// Expected endpoint: GET /quantifications/get_dataset_quantifications/{dataset_id}?include_manual={include_manual}&include_auto={include_auto}
export const getDatasetQuantifications = async (datasetId, includeManual = true, includeAuto = true) => {
    try {
        // TODO: Uncomment when backend endpoint is available
        /*
        const response = await fetch(
            `${API_BASE_URL}/quantifications/get_dataset_quantifications/${datasetId}?include_manual=${includeManual}&include_auto=${includeAuto}`,
            {
                headers: getAuthHeaders(),
            }
        );
        const data = await handleApiError(response);
        return data.quantifications || [];
        */
        
        // Placeholder - return empty array for now
        return [];
    } catch (error) {
        throw error;
    }
};