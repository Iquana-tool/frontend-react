import { API_BASE_URL } from "./config";
import { getAuthHeaders, handleApiError } from "./util";

/**
 * Per-user usage summary for the admin Usage view.
 *
 * @param {number} days - window in days; 0 for all time
 * @returns {Promise<{success: boolean, since: string|null, events_enabled: boolean, users: Array<Object>}>}
 */
export const fetchUsageUsers = async (days = 30) => {
    const response = await fetch(`${API_BASE_URL}/usage-stats/users?days=${days}`, {
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/**
 * One user's suggestions by model, workflows, tools, AI use, timeline and per-image effort.
 *
 * @param {string} username
 * @param {number} days - window in days; 0 for all time
 */
export const fetchUserUsage = async (username, days = 30) => {
    const response = await fetch(
        `${API_BASE_URL}/usage-stats/users/${encodeURIComponent(username)}?days=${days}`,
        { headers: getAuthHeaders() }
    );
    return handleApiError(response);
};
