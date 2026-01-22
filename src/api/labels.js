import { handleApiError, getAuthHeaders } from "../api/util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

// Fetch all available labels
export const fetchLabels = async (datasetId) => {
    try {
        if (!datasetId) {
            throw new Error("Dataset ID is required");
        }
        const response = await fetch(
            `${API_BASE_URL}/datasets/get_labels/${datasetId}`,
            {
                headers: getAuthHeaders(),
            }
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

// Create a new label (class)
// labelData: { name: string, parent_id: number | null, value: number | null }
// parent_id: null for top-level labels, actual ID for subclasses
export const createLabel = async (labelData, datasetId) => {
    try {
        // Extract values from the label data object
        const { name, parent_id = null, value = null } = labelData;

        if (!name) {
            throw new Error("Label name is required");
        }

        if (!datasetId) {
            throw new Error("Dataset ID is required");
        }

        const url = new URL(`${API_BASE_URL}/labels/create`);
        url.searchParams.append("label_name", name);
        url.searchParams.append("dataset_id", String(datasetId));

        // Send null for top-level, actual ID for subclasses
        if (parent_id !== null) {
            url.searchParams.append("parent_label_id", String(parent_id));
        }

        // Send value if provided
        if (value !== null) {
            url.searchParams.append("label_value", String(value));
        }

        const response = await fetch(url, {
            method: "POST",
            headers: getAuthHeaders(),
        });

        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

// Update a label
// labelData: { name: string }
export const updateLabel = async (labelId, labelData, datasetId) => {
    try {
        if (!labelId) {
            throw new Error("Label ID is required");
        }

        if (!labelData || !labelData.name) {
            throw new Error("Label name is required");
        }

        const response = await fetch(
            `${API_BASE_URL}/labels/${labelId}`,
            {
                method: "PATCH",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: labelData.name }),
            }
        );

        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

// Delete a label
export const deleteLabel = async (labelId, datasetId) => {
    try {
        if (!labelId) {
            throw new Error("Label ID is required");
        }

        const response = await fetch(
            `${API_BASE_URL}/labels/${labelId}`,
            {
                method: "DELETE",
                headers: getAuthHeaders(),
            }
        );

        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};