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
