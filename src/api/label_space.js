import { handleApiError, getAuthHeaders, buildUrl } from "../api/util";

import { API_BASE_URL } from "./config";

// Check whether LLM-assisted label-space generation is configured on the server.
// Returns { enabled: boolean, model: string | null }.
export const getLabelSpaceConfig = async () => {
    const response = await fetch(`${API_BASE_URL}/label_space/config`, {
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

// Generate a draft label hierarchy from a plain-language description.
// Returns { success, draft: { labels: [{ name, description, children: [...] }] } }.
export const generateLabelSpace = async (description, options = {}) => {
    if (!description || !description.trim()) {
        throw new Error("A description is required");
    }
    const { maxDepth = 3, maxLabels = 50, model = null } = options;

    const response = await fetch(`${API_BASE_URL}/label_space/generate`, {
        method: "POST",
        headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            description: description.trim(),
            max_depth: maxDepth,
            max_labels: maxLabels,
            ...(model ? { model } : {}),
        }),
    });
    return handleApiError(response);
};

// Refine an existing draft from a follow-up instruction.
export const refineLabelSpace = async (currentDraft, message, options = {}) => {
    if (!message || !message.trim()) {
        throw new Error("A refinement instruction is required");
    }
    const { description = null, maxDepth = 3, maxLabels = 50, model = null } = options;

    const response = await fetch(`${API_BASE_URL}/label_space/refine`, {
        method: "POST",
        headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            current_draft: currentDraft,
            message: message.trim(),
            description,
            max_depth: maxDepth,
            max_labels: maxLabels,
            ...(model ? { model } : {}),
        }),
    });
    return handleApiError(response);
};

// Persist an approved draft label hierarchy for a dataset in one transaction.
// draft: { labels: [{ name, children: [...] }] }
export const applyLabelSpace = async (datasetId, draft) => {
    if (!datasetId) {
        throw new Error("Dataset ID is required");
    }
    const url = buildUrl(API_BASE_URL, "/labels/bulk_create", { dataset_id: datasetId });
    const response = await fetch(url, {
        method: "POST",
        headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
    });
    return handleApiError(response);
};
