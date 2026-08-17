import { handleApiError, getAuthHeaders } from "../api/util";

import { API_BASE_URL } from "./config";

/**
 * The annotator's undo/redo history for one image.
 *
 * These are REST rather than annotation-session WebSocket messages: the socket's
 * message types are an enum in the shared iquana-toolbox package, and undo/redo
 * are not in it. The three calls need nothing from the socket anyway — undo and
 * redo return the image's full contour hierarchy, which is the same shape the
 * socket's `objects` message carries, so the caller refreshes the object list
 * through the code path it already has.
 */

/** Whether this user has anything to undo or redo on `imageId`, and what it is. */
export const getAnnotationHistoryStatus = async (imageId) => {
    const response = await fetch(`${API_BASE_URL}/annotation-history/${imageId}`, {
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/** Revert this user's most recent action on `imageId`. */
export const undoAnnotationAction = async (imageId) => {
    const response = await fetch(`${API_BASE_URL}/annotation-history/${imageId}/undo`, {
        method: "POST",
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/** Re-apply the action this user most recently undid on `imageId`. */
export const redoAnnotationAction = async (imageId) => {
    const response = await fetch(`${API_BASE_URL}/annotation-history/${imageId}/redo`, {
        method: "POST",
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};
