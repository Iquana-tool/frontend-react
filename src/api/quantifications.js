import { handleApiError } from "../api/util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

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