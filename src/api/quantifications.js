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
        // An image-metadata key to break the results down by (site, treatment, ...).
        // Only groupable key types are accepted; the server answers 422 otherwise.
        groupBy = null,
        // Narrow every aggregation to one image of the dataset. The response shape is
        // unchanged, so the per-image page renders it with the same components as the
        // dataset page; it just asks twice - once scoped, once not - to have a baseline
        // to compare the image against. Note `scale_status` then describes that one
        // image, so a calibrated image reports mm even in a dataset that mixes units.
        imageId = null,
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
    if (groupBy) {
        params.append("group_by", groupBy);
    }
    if (imageId !== null && imageId !== undefined) {
        params.append("image_id", imageId);
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

/**
 * The per-contour export as row objects — the same rows the CSV download contains.
 *
 * This is the raw table the explore surfaces are built on, so it deliberately reads the
 * *export* endpoint rather than `/quantification`: only this one accepts `profile_id`,
 * and the profile shape is the one worth having. It emits a column per profile
 * metric/component instead of the four legacy geometry columns, and — the reason it
 * matters over the wire — it omits `coords_x`/`coords_y` entirely, which the legacy shape
 * emits as full normalized polygon arrays that are useless in a table and dwarf every
 * other column. The page always has a profile (the server auto-creates a default on first
 * listing), so the coordinate arrays never reach us.
 *
 * `Content-Disposition: attachment` on the response only affects a browser navigation, not
 * an XHR, so reading the body here is fine.
 *
 * Two response shapes have to be told apart: normally an array of row objects, but an
 * empty dataframe short-circuits to `{success: false, message}` — a JSON *object*. Handing
 * that to a table would be a confusing crash far from its cause, so it is normalised here
 * into an explicit empty result the caller can render an explanation for.
 *
 * Note this endpoint computes metrics on demand (`only_stale=True` per profile tier)
 * before building the frame, so a first call on a large or newly-changed dataset can be
 * slow. That is compute, not transfer.
 *
 * `imageId` narrows it to one image, which is what the per-image page tabulates. It reads
 * the same endpoint on purpose: the table on screen and the "Export this image" file are
 * then the same rows, and cannot drift apart.
 *
 * @returns {Promise<{rows: Object[], empty: boolean, message: string|null}>}
 */
export const fetchQuantificationRows = async (
    datasetId,
    { profileId = null, excludeNotFullyAnnotated = true, excludeUnreviewed = true, imageId = null } = {}
) => {
    const url = buildQuantificationDownloadUrl(datasetId, {
        profileId,
        fileFormat: "json",
        excludeNotFullyAnnotated,
        excludeUnreviewed,
        imageId,
    });
    const payload = await fetch(url, { headers: getAuthHeaders() }).then(handleApiError);

    if (Array.isArray(payload)) {
        return { rows: payload, empty: payload.length === 0, message: null };
    }
    // The no-data shape. `success` is false here; anything else unexpected is treated the
    // same way, since an empty table is a truthful rendering of "we got no rows".
    return { rows: [], empty: true, message: payload?.message || null };
};

// Build the download URL for the quantification export, optionally scoped to a profile.
// The exclude_* flags mirror the summary so the export matches whatever the page shows.
export const buildQuantificationDownloadUrl = (
    datasetId,
    {
        profileId = null,
        fileFormat = "csv",
        excludeNotFullyAnnotated = true,
        excludeUnreviewed = true,
        // Restrict the export to one image of the dataset (same columns, that image's rows).
        imageId = null,
    } = {}
) => {
    const params = new URLSearchParams();
    params.append("file_format", fileFormat);
    params.append("exclude_not_fully_annotated", excludeNotFullyAnnotated);
    params.append("exclude_unreviewed", excludeUnreviewed);
    if (profileId !== null && profileId !== undefined) {
        params.append("profile_id", profileId);
    }
    if (imageId !== null && imageId !== undefined) {
        params.append("image_id", imageId);
    }
    return `${API_BASE_URL}/datasets/${datasetId}/quantification/download?${params.toString()}`;
};