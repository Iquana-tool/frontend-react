/**
 * Stacks: OCT volumes (and later videos, z-stacks) uploaded as one file and
 * stored as an ordered list of frames. Each frame is an ordinary image, so
 * everything per-frame goes through the image, mask and contour endpoints.
 */
import { handleApiError, getAuthHeaders, buildUrl } from "./util";
import { API_BASE_URL } from "./config";

/** File extensions the stack upload accepts, used when the server cannot be asked. */
export const DEFAULT_STACK_EXTENSIONS = [".e2e", ".vol"];

/** Whether a file name is a stack file (an OCT export) rather than an image. */
export const isStackFileName = (name, extensions = DEFAULT_STACK_EXTENSIONS) => {
    const lower = String(name || "").toLowerCase();
    return extensions.some((extension) => lower.endsWith(extension));
};

/** @returns {Promise<{extensions: string[]}>} */
export const fetchStackFormats = async () => {
    const response = await fetch(`${API_BASE_URL}/stacks/formats`, { headers: getAuthHeaders() });
    return handleApiError(response);
};

/**
 * Upload stack files. One file can hold several stacks (an E2E export of both eyes).
 *
 * @returns {Promise<{stack_ids: number[], failed: Array<{file_name: string, reason: string}>}>}
 */
export const uploadStackFiles = async (files, datasetId) => {
    const formData = new FormData();
    for (const file of files) {
        formData.append("files", file);
    }
    const url = buildUrl(API_BASE_URL, "/stacks/upload", { dataset_id: datasetId });
    const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
    });
    return handleApiError(response);
};

/** @returns {Promise<{stacks: Array<Object>}>} */
export const fetchStacks = async (datasetId) => {
    const response = await fetch(`${API_BASE_URL}/stacks/dataset/${datasetId}`, {
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/**
 * A stack with its frames: where each lies on the overview, its scale and its
 * workflow status. Stack metadata comes once, as `metadata`; each frame carries
 * only its own keys.
 */
export const fetchStack = async (stackId) => {
    const response = await fetch(`${API_BASE_URL}/stacks/${stackId}`, { headers: getAuthHeaders() });
    return handleApiError(response);
};

/**
 * Every object on every frame of a stack, with its outline (normalised x/y) and
 * frame index. Feeds the object timeline and the neighbouring-slice outlines.
 *
 * @returns {Promise<{objects: Array<Object>}>}
 */
export const fetchStackObjects = async (stackId) => {
    const response = await fetch(`${API_BASE_URL}/stacks/${stackId}/objects`, { headers: getAuthHeaders() });
    return handleApiError(response);
};

/**
 * Edit the stack's own metadata, which every frame inherits. An empty value
 * removes the key, as `remove_keys` does.
 */
export const updateStackMetadata = async (stackId, entries = {}, removeKeys = []) => {
    const response = await fetch(`${API_BASE_URL}/stacks/${stackId}/metadata`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ entries, remove_keys: removeKeys }),
    });
    return handleApiError(response);
};

/**
 * The stack's overview image (an OCT volume's IR-SLO) as an object URL.
 *
 * Fetched rather than linked because the request needs the auth header; the
 * caller owns the URL and revokes it.
 */
export const fetchStackOverviewUrl = async (stackId) => {
    const response = await fetch(`${API_BASE_URL}/stacks/${stackId}/overview`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(`Overview of stack ${stackId} could not be loaded (${response.status}).`);
    return URL.createObjectURL(await response.blob());
};

/** Delete a stack with all its frames and their annotations. */
export const deleteStack = async (stackId) => {
    const response = await fetch(`${API_BASE_URL}/stacks/${stackId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/**
 * The stack's gallery thumbnail (the overview when there is one, else the
 * middle frame) as an object URL the caller revokes.
 */
export const fetchStackThumbnailUrl = async (stackId) => {
    const response = await fetch(`${API_BASE_URL}/stacks/${stackId}/thumbnail`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(`Thumbnail of stack ${stackId} could not be loaded (${response.status}).`);
    return URL.createObjectURL(await response.blob());
};
