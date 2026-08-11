import { getAuthHeaders, handleApiError, buildUrl } from "./util";
import { API_BASE_URL } from "./config";

/**
 * Register a new user
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>} Response with success status and message
 */
export const register = async (username, password) => {
    try {
        const url = buildUrl(API_BASE_URL, '/auth/register', {
            name: username,
            password: password
        });

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
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
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
        // Built on getAuthHeaders rather than a bare Authorization header so the
        // request carries X-Telemetry-Session like every other call. Without it
        // the `/auth/me` timings landed with a null session_id and showed up as a
        // phantom "no session id" row in the study log.
        // The explicit token still wins: this is called during login with a token
        // that has not been written to storage yet.
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: "GET",
            headers: {
                ...getAuthHeaders(),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

