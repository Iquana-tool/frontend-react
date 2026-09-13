import { handleApiError, getAuthHeaders } from "../api/util";

import { API_BASE_URL } from "./config";

// Get available prompted segmentation models from backend

export const getPromptedModels = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/prompted_segmentation/models`, {
            headers: getAuthHeaders(),
        });
        const data = await handleApiError(response);

        if (data.success && Array.isArray(data.result)) {
            return {
                success: true,
                models: data.result,
            };
        }

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

// Get available suggestion segmentation models from backend
export const getSuggestionModels = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/suggestion_segmentation/models`, {
            headers: getAuthHeaders(),
        });
        const data = await handleApiError(response);

        if (data.success && Array.isArray(data.result)) {
            return {
                success: true,
                models: data.result,
            };
        }

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

// --- Favorite (default) models, per user + per task -----------------------

// Get the current user's favorite model per task as { task: registry_key }.
export const getModelFavorites = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/me/model-favorites`, {
            headers: getAuthHeaders(),
        });
        const data = await handleApiError(response);
        return { success: true, favorites: data?.result || {} };
    } catch (error) {
        return { success: false, favorites: {}, error: error.message };
    }
};

// Set the current user's favorite model for a task.
export const setModelFavorite = async (task, registryKey) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/me/model-favorites/${encodeURIComponent(task)}`,
            {
                method: "PUT",
                headers: getAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ model_registry_key: registryKey }),
            }
        );
        await handleApiError(response);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Clear the current user's favorite model for a task.
export const clearModelFavorite = async (task) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/me/model-favorites/${encodeURIComponent(task)}`,
            { method: "DELETE", headers: getAuthHeaders() }
        );
        await handleApiError(response);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};