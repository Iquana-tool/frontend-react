import { handleApiError } from "./util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Register a new user
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>} Response with success status and message
 */
export const register = async (username, password) => {
    try {
        const url = new URL(`${API_BASE_URL}/auth/register`);
        url.searchParams.append("name", username);
        url.searchParams.append("password", password);

        const response = await fetch(url, {
            method: "POST",
        });
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

/**
 * Login a user
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<Object>}
 */
export const login = async (username, password) => {
    try {
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            body: formData,
        });
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

/**
 * Get current user information
 * @param {string} token - The access token
 * @returns {Promise<Object>} Current user information
 */
export const getCurrentUser = async (token) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

