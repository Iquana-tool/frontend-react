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

        if (data.success && data.response && data.response.result) {
            if (Array.isArray(data.response.result) && data.response.result.length > 0) {
                return {
                    success: true,
                    models: data.response.result,
                };
            }
        }

        // No models returned from backend
        return {
            success: true,
            models: [],
        };
    } catch (error) {
        return {
            success: false,
            models: [],
            error: error.message,
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

        if (data.success && data.response && data.response.result) {
            if (Array.isArray(data.response.result) && data.response.result.length > 0) {
                return {
                    success: true,
                    models: data.response.result,
                };
            }
        }

        // No models returned from backend
        return {
            success: true,
            models: [],
        };
    } catch (error) {
        return {
            success: false,
            models: [],
            error: error.message,
        };
    }
};