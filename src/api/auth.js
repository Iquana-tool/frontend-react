import { getAuthHeaders, handleApiError, buildUrl } from "./util";
import { API_BASE_URL } from "./config";

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
        // request carries X-Activity-Session like every other call. Without it
        // the `/auth/me` timings landed with a null session_id and showed up as a
        // phantom "no session id" row in the activity log.
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

/**
 * Check a registration link before showing the form. Public: the invitee has no
 * account yet, and the token is the whole authorisation.
 * @param {string} token
 * @returns {Promise<{success: boolean, invite: {is_valid: boolean, invited_by: string, expires_at: string|null}}>}
 */
export const previewRegistrationLink = async (token) => {
    const response = await fetch(`${API_BASE_URL}/auth/invites/${encodeURIComponent(token)}`);
    return handleApiError(response);
};

/**
 * Create your own account with a registration link an admin sent. There is no other
 * way to register; the account is a plain member and chose its own password.
 * @param {string} token
 * @param {string} username
 * @param {string} password
 */
export const registerWithLink = async (token, username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username, password }),
    });
    return handleApiError(response);
};
