/**
 * One's own account: profile, password, preferences and personal API keys.
 *
 * Everything here acts on the signed-in account only; administering other
 * accounts lives in `admin.js`.
 */
import { handleApiError, getAuthHeaders } from "./util";
import { API_BASE_URL } from "./config";

const jsonHeaders = () => getAuthHeaders({ "Content-Type": "application/json" });

/**
 * Change one's own display name, email address or preferences.
 *
 * Only the fields present in `changes` are touched; `null` clears a field.
 * `preferences` is merged key by key on the server rather than replaced, so
 * separate parts of the UI can each save their own keys, and a key sent as
 * `null` is removed.
 *
 * @param {{display_name?: string|null, email?: string|null, preferences?: Object}} changes
 * @returns {Promise<Object>} The account, in the same shape as `/auth/me`.
 */
export const updateProfile = async (changes) => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify(changes),
    });
    return handleApiError(response);
};

/**
 * Change one's own password. Every other session is signed out.
 *
 * A wrong current password answers 400, not 401, so it surfaces as an error
 * here instead of signing the user out.
 *
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<{success: boolean, message: string, access_token: string}>}
 *   `access_token` replaces the current one, which the change has revoked.
 */
export const changePassword = async (currentPassword, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/auth/password`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    return handleApiError(response);
};

/**
 * One's own API keys. Never the key itself: the model, the base URL and its
 * last characters.
 *
 * @returns {Promise<{success: boolean, credentials: Array<{kind: string, model: string, api_base: string|null, hint: string, last_used_at: string|null}>}>}
 */
export const fetchMyCredentials = async () => {
    const response = await fetch(`${API_BASE_URL}/auth/credentials`, {
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/**
 * Set one's own LLM key, used ahead of the organisation's and the instance's.
 *
 * `api_key` may be left out to change only the model. Changing `api_base`
 * needs the key again, or the server refuses it.
 *
 * @param {{model: string, api_key?: string, api_base?: string|null}} credential
 */
export const setMyLlmKey = async (credential) => {
    const response = await fetch(`${API_BASE_URL}/auth/credentials/llm`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify(credential),
    });
    return handleApiError(response);
};

export const deleteMyLlmKey = async () => {
    const response = await fetch(`${API_BASE_URL}/auth/credentials/llm`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};
