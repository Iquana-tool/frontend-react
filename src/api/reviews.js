/**
 * Review endpoints: sending annotation work back with a reason, and clearing it again.
 *
 * Approving a single contour lives in `api/contours.js`; rejecting lives here
 * because a rejection can be about the mask as a whole ("objects are missing")
 * rather than any one contour.
 */
import { handleApiError, getAuthHeaders, buildUrl } from "./util";
import { API_BASE_URL } from "./config";

const jsonHeaders = () => getAuthHeaders({ "Content-Type": "application/json" });

/**
 * Fetch the predefined rejection reasons with their display labels.
 *
 * The wording lives with the backend enum so the dropdown cannot drift out of
 * sync with what the API accepts.
 *
 * @returns {Promise<{success: boolean, reasons: Array<{value: string, label: string, requires_note: boolean}>}>}
 */
export const fetchRejectionReasons = async () => {
    const response = await fetch(`${API_BASE_URL}/reviews/reasons`, {
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/**
 * Send a mask back to its annotator with a reason.
 *
 * Rejecting clears `fully_annotated`, so the mask leaves the review queue and
 * reappears in the annotator's work list. Its status stays `rejected` until every
 * open rejection is resolved.
 *
 * @param {number} maskId
 * @param {Object} rejection
 * @param {string} rejection.reason - A value from `fetchRejectionReasons`.
 * @param {string} [rejection.note] - Free-text detail. Required when reason is "other".
 * @param {number} [rejection.contourId] - Reject one object; omit for a mask-level problem.
 */
export const rejectMask = async (maskId, { reason, note = null, contourId = null }) => {
    const response = await fetch(`${API_BASE_URL}/reviews/masks/${maskId}/reject`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ reason, note, contour_id: contourId }),
    });
    return handleApiError(response);
};

/**
 * List rejections recorded against a mask, newest first.
 *
 * Readable by annotators as well as reviewers — an annotator has to be able to
 * see why their work came back.
 *
 * @param {number} maskId
 * @param {boolean} [openOnly=false] - Only rejections that have not been resolved.
 */
export const fetchMaskRejections = async (maskId, openOnly = false) => {
    const url = buildUrl(API_BASE_URL, `/reviews/masks/${maskId}/rejections`, {
        open_only: openOnly,
    });
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleApiError(response);
};

/**
 * Mark one rejection as addressed.
 * @param {number} rejectionId
 */
export const resolveRejection = async (rejectionId) => {
    const response = await fetch(
        `${API_BASE_URL}/reviews/rejections/${rejectionId}/resolve`,
        { method: "PATCH", headers: getAuthHeaders() }
    );
    return handleApiError(response);
};

/**
 * Clear every open rejection on a mask, e.g. after reworking it.
 * @param {number} maskId
 */
export const resolveAllMaskRejections = async (maskId) => {
    const response = await fetch(
        `${API_BASE_URL}/reviews/masks/${maskId}/rejections/resolve`,
        { method: "PATCH", headers: getAuthHeaders() }
    );
    return handleApiError(response);
};
