/**
 * Recommended queues: the settings a curator suggests for a dataset's annotation or review
 * queue, with a one-line reason. Builders read them from their summary (`recommended`);
 * these calls save or remove them and need the dataset-update permission. See
 * `app.services.queue_recommendation` on the backend.
 */
import { handleApiError, getAuthHeaders } from "./util";
import { API_BASE_URL } from "./config";

const PREFIX = { annotation: "annotation-queue", review: "reviews" };
const url = (kind, datasetId) => `${API_BASE_URL}/${PREFIX[kind]}/datasets/${datasetId}/recommended`;

/**
 * @param {"annotation"|"review"} kind
 * @param {number|string} datasetId
 * @param {{settings: Object, reason: string}} body - The builder's settings, as sent to build.
 * @returns {Promise<{success: boolean, recommended: {settings: Object, reason: string,
 *   updated_by: string, updated_at: string}}>}
 */
export const saveRecommendedQueue = async (kind, datasetId, body) => {
    const response = await fetch(url(kind, datasetId), {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
    });
    return handleApiError(response);
};

/** @param {"annotation"|"review"} kind @param {number|string} datasetId */
export const clearRecommendedQueue = async (kind, datasetId) => {
    const response = await fetch(url(kind, datasetId), { method: "DELETE", headers: getAuthHeaders() });
    return handleApiError(response);
};
