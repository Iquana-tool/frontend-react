import { handleApiError, getAuthHeaders } from "../api/util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

// Get available prompted segmentation models from backend
export const getPromptedModels = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/prompted_segmentation/models`, {
            headers: getAuthHeaders(),
        });
        const data = await handleApiError(response);

        // The backend returns: { success, message, response: { success, message, available_models } }
        if (data.success && data.response && data.response.available_models) {
            return {
                success: true,
                models: data.response.available_models,
            };
        }

        // Fallback to hardcoded models if backend doesn't return any
        return {
            success: true,
            models: [],
            fallback: true,
        };
    } catch (error) {
        console.warn("Error fetching prompted models, using fallback:", error);
        return {
            success: true,
            models: [],
            fallback: true,
        };
    }
};

// Get available automatic segmentation models from backend
export const getAutomaticModels = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/models/get_automatic_models`, {
            headers: getAuthHeaders(),
        });
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
            `${API_BASE_URL}/models/get_automatic_3d_models`,
            {
                headers: getAuthHeaders(),
            }
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

// Get available completion segmentation models from backend
export const getCompletionModels = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/completion_segmentation/models`, {
            headers: getAuthHeaders(),
        });
        const data = await handleApiError(response);

        if (data.success && data.response && data.response.available_models) {
            return {
                success: true,
                models: data.response.available_models,
            };
        }

        // Fallback to empty array if backend doesn't return any
        return {
            success: true,
            models: [],
            fallback: true,
        };
    } catch (error) {
        console.warn("Error fetching completion models, using fallback:", error);
        return {
            success: true,
            models: [],
            fallback: true,
        };
    }
};