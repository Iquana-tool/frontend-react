import { handleApiError, getAuthHeaders } from "../api/util";
import { transformFlatDataToHierarchical } from "../utils/quantificationUtils";

import { API_BASE_URL } from "./config";

// Get quantification data for a given mask_id
export const getQuantification = async (maskId) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/masks/${maskId}/contours?flattened=false`,
            {
                headers: getAuthHeaders(),
            }
        );
        const data = await handleApiError(response);

        // Check if the data has the expected structure
        if (!data || !data.quantification) {
            return { quantification: [] };
        }

        return data;
    } catch (error) {
        throw error;
    }
};

// Get dataset object quantifications with hierarchical labels and aggregated metrics
export const getDatasetObjectQuantifications = async (datasetId, includeManual = true, includeAuto = true, includeLabelIds = null, asDownload = false) => {
    try {
        // Map the include flags to exclude parameters
        const excludeUnreviewed = !includeAuto;
        const excludeNotFullyAnnotated = !includeManual;
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append("exclude_unreviewed", excludeUnreviewed);
        params.append("exclude_not_fully_annotated", excludeNotFullyAnnotated);
        params.append("as_download", asDownload);
        
        if (includeLabelIds && includeLabelIds.length > 0) {
            includeLabelIds.forEach(id => params.append("include_label_ids", id));
        }
        
        const queryString = params.toString();
        const quantUrl = `${API_BASE_URL}/datasets/${datasetId}/quantification${queryString ? `?${queryString}` : ''}`;
        
        // Fetch quantification data and labels in parallel
        const [quantData, labelsData] = await Promise.all([
            fetch(quantUrl, { headers: getAuthHeaders() }).then(handleApiError),
            fetch(`${API_BASE_URL}/datasets/${datasetId}/labels`, { headers: getAuthHeaders() }).then(handleApiError)
        ]);
        
        // Transform flat data to hierarchical format
        const transformedData = transformFlatDataToHierarchical(quantData);
        
        // Combine with labels
        return {
            ...transformedData,
            labels: labelsData.labels
        };
    } catch (error) {
        throw error;
    }
};

// --- Step 5: pre-aggregated summary + metric catalog + profile CRUD ----------

// Server-side aggregated quantification summary. Returns the pre-aggregated
// {count, mean, std, min, max} per label / metric / component (no raw arrays), plus
// child_counts_per_label_id and the label hierarchy. A profileId scopes which metrics
// (and which labels per metric) are returned.
export const getQuantificationSummary = async (
    datasetId,
    {
        profileId = null,
        includeAppearance = true,
        includeContextual = true,
        includeRelational = true,
        includeDistribution = false,
        // Whether to drop not-fully-annotated masks / unreviewed contours from the
        // aggregation. Default true (finalized-only) matches the endpoint defaults; the
        // quantification page flips these via its include toggles to surface in-progress work.
        excludeNotFullyAnnotated = true,
        excludeUnreviewed = true,
    } = {}
) => {
    const params = new URLSearchParams();
    params.append("include_appearance", includeAppearance);
    params.append("include_contextual", includeContextual);
    params.append("include_relational", includeRelational);
    // Distribution (box/violin) stats are heavier (per-contour values reduced server-side),
    // so only requested when a distribution plot is actually shown; the bar view omits it.
    params.append("include_distribution", includeDistribution);
    params.append("exclude_not_fully_annotated", excludeNotFullyAnnotated);
    params.append("exclude_unreviewed", excludeUnreviewed);
    if (profileId !== null && profileId !== undefined) {
        params.append("profile_id", profileId);
    }
    const url = `${API_BASE_URL}/datasets/${datasetId}/quantification/summary?${params.toString()}`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleApiError);
};

// Catalog of every registered metric: key, name, description, tier, unit_kind,
// value_dim, components (or null), params_schema. Used to render metrics generically.
export const getMetricsCatalog = async () => {
    const url = `${API_BASE_URL}/datasets/quantification/metrics/catalog`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleApiError);
};

// List the dataset's quantification profiles (auto-creates a geometry default if none).
export const getQuantificationProfiles = async (datasetId) => {
    const url = `${API_BASE_URL}/datasets/${datasetId}/quantification/profiles`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleApiError);
};

// Create a new profile. `profile` = { name, is_default, entries:[{metric_key, params, label_ids}] }.
export const createQuantificationProfile = async (datasetId, profile) => {
    const url = `${API_BASE_URL}/datasets/${datasetId}/quantification/profiles`;
    return fetch(url, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(profile),
    }).then(handleApiError);
};

// Update an existing profile (name / is_default / entries).
export const updateQuantificationProfile = async (datasetId, profileId, profile) => {
    const url = `${API_BASE_URL}/datasets/${datasetId}/quantification/profiles/${profileId}`;
    return fetch(url, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(profile),
    }).then(handleApiError);
};

// Delete a profile.
export const deleteQuantificationProfile = async (datasetId, profileId) => {
    const url = `${API_BASE_URL}/datasets/${datasetId}/quantification/profiles/${profileId}`;
    return fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders(),
    }).then(handleApiError);
};

// Build the download URL for the quantification export, optionally scoped to a profile.
// The exclude_* flags mirror the summary so the export matches whatever the page shows.
export const buildQuantificationDownloadUrl = (
    datasetId,
    { profileId = null, fileFormat = "csv", excludeNotFullyAnnotated = true, excludeUnreviewed = true } = {}
) => {
    const params = new URLSearchParams();
    params.append("file_format", fileFormat);
    params.append("exclude_not_fully_annotated", excludeNotFullyAnnotated);
    params.append("exclude_unreviewed", excludeUnreviewed);
    if (profileId !== null && profileId !== undefined) {
        params.append("profile_id", profileId);
    }
    return `${API_BASE_URL}/datasets/${datasetId}/quantification/download?${params.toString()}`;
};