import { handleApiError } from "../api/util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

// Fetch all available labels
export const fetchLabels = async (datasetId) => {
    try {
        if (!datasetId) {
            throw new Error("Dataset ID is required");
        }
        const response = await fetch(
            `${API_BASE_URL}/labels/get_labels/${datasetId}`
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

// Create a new label (class)
// labelData: { name: string, parent_id: number | null }
// parent_id: null for top-level labels, actual ID for subclasses
export const createLabel = async (labelData, datasetId) => {
    try {
        // Extract values from the label data object
        const { name, parent_id = null } = labelData;

        if (!name) {
            throw new Error("Label name is required");
        }

        if (!datasetId) {
            throw new Error("Dataset ID is required");
        }

        const url = new URL(`${API_BASE_URL}/labels/create_label`);
        url.searchParams.append("label_name", name);
        url.searchParams.append("dataset_id", datasetId);

        // Send null for top-level, actual ID for subclasses
        if (parent_id !== null) {
            url.searchParams.append("parent_label_id", parent_id);
        }

        const response = await fetch(url, {
            method: "POST",
        });

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

        if (!datasetId) {
            throw new Error("Dataset ID is required");
        }

        const response = await fetch(
            `${API_BASE_URL}/labels/delete_label/label=${labelId}`,
            {
                method: "DELETE",
            }
        );

        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};