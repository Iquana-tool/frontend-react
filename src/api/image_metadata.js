/**
 * Per-image metadata — the free-form key/value pairs that split a dataset into
 * the subgroups a study is later compared across (site, transect, treatment,
 * collection date).
 *
 * Reading one image's pairs is rarely needed on its own: `GET /datasets/{id}/images`
 * already carries `metadata` on every row, which is what the gallery filters on.
 * What this module is mostly for is the dataset's *vocabulary* (`fetchDatasetMetadata`)
 * and the writes.
 */
import { handleApiError, getAuthHeaders, buildUrl } from "./util";
import { API_BASE_URL } from "./config";

const jsonHeaders = () => getAuthHeaders({ "Content-Type": "application/json" });

/** Every metadata pair of one image, as `{ metadata: {key: value} }`. */
export const fetchImageMetadata = async (imageId) => {
    const response = await fetch(`${API_BASE_URL}/metadata/image/${imageId}`, {
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/**
 * Write metadata onto one image.
 *
 * @param {number} imageId
 * @param {Object.<string,string>} entries - Pairs to write. An empty value
 *   removes that key, so clearing a field and deleting it are one gesture.
 * @param {boolean} [replace] - Make `entries` authoritative for the whole image,
 *   deleting any key it does not mention.
 */
export const setImageMetadata = async (imageId, entries, replace = false) => {
    const response = await fetch(`${API_BASE_URL}/metadata/image/${imageId}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ entries, replace }),
    });
    return handleApiError(response);
};

/** Remove a single key from a single image. */
export const deleteImageMetadataKey = async (imageId, key) => {
    const response = await fetch(
        `${API_BASE_URL}/metadata/image/${imageId}/${encodeURIComponent(key)}`,
        { method: "DELETE", headers: getAuthHeaders() }
    );
    return handleApiError(response);
};

/**
 * Apply one set of edits to many images — the grouping action.
 *
 * Additive by default: it writes the keys it is given and leaves every other key
 * on those images alone, so tagging a selection with `site` cannot wipe the
 * per-image notes it says nothing about. `removeKeys` is the inverse, for
 * pulling images back out of a subgroup.
 *
 * @param {number[]} imageIds
 * @param {Object.<string,string>} [entries]
 * @param {string[]} [removeKeys]
 */
export const setMetadataForImages = async (imageIds, entries = {}, removeKeys = []) => {
    const response = await fetch(`${API_BASE_URL}/metadata/images`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
            image_ids: imageIds,
            entries,
            remove_keys: removeKeys,
        }),
    });
    return handleApiError(response);
};

/**
 * The dataset's metadata vocabulary: which keys it uses, each key's declared
 * type / unit / allowed values, which values it takes and how many images carry
 * them, plus how many images are untagged.
 *
 * Drives the filter controls (a range for a depth, chips for a site) and the
 * key/value suggestions in the editor — the suggestions are what stop a second
 * curator from inventing `Site` alongside `site`, since the backend deliberately
 * keeps the two apart.
 */
export const fetchDatasetMetadata = async (datasetId) => {
    const response = await fetch(`${API_BASE_URL}/metadata/dataset/${datasetId}`, {
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/** The value types a key can have, and which of them are ordered / groupable. */
export const fetchMetadataTypes = async () => {
    const response = await fetch(`${API_BASE_URL}/metadata/types`, {
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/** Every declared key of the dataset with its type, unit and vocabulary. */
export const fetchDatasetMetadataKeys = async (datasetId) => {
    const response = await fetch(`${API_BASE_URL}/metadata/dataset/${datasetId}/keys`, {
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/**
 * Declare what a key means, or change it.
 *
 * Retyping re-validates every value already stored under the key: the call fails
 * with a 422 naming the offending values rather than dropping them, so the error
 * is something the user can act on.
 *
 * @param {Object} declaration - `{value_type, unit, options, description}`. Any
 *   field left out is unchanged.
 */
export const updateDatasetMetadataKey = async (datasetId, key, declaration) => {
    const response = await fetch(
        `${API_BASE_URL}/metadata/dataset/${datasetId}/keys/${encodeURIComponent(key)}`,
        { method: "PUT", headers: jsonHeaders(), body: JSON.stringify(declaration) }
    );
    return handleApiError(response);
};

/**
 * Rename a key across the dataset, optionally merging it into an existing one.
 *
 * The repair for a key split by a typo — `Site` next to `site` reported as two
 * subgroups. Without `merge` a collision is refused rather than silently folding
 * two vocabularies together.
 */
export const renameDatasetMetadataKey = async (datasetId, key, newKey, merge = false) => {
    const response = await fetch(
        `${API_BASE_URL}/metadata/dataset/${datasetId}/keys/${encodeURIComponent(key)}/rename`,
        { method: "POST", headers: jsonHeaders(), body: JSON.stringify({ new_key: newKey, merge }) }
    );
    return handleApiError(response);
};

/** Drop a key and every value of it across the dataset. */
export const deleteDatasetMetadataKey = async (datasetId, key) => {
    const response = await fetch(
        `${API_BASE_URL}/metadata/dataset/${datasetId}/keys/${encodeURIComponent(key)}`,
        { method: "DELETE", headers: getAuthHeaders() }
    );
    return handleApiError(response);
};

/**
 * Download the dataset's metadata as a CSV, one row per image.
 *
 * With nothing tagged yet this is the *template*: a column of filenames to fill
 * in. Starting from it is what makes the filenames match on the way back in.
 */
export const downloadDatasetMetadataCsv = async (datasetId, datasetName = "dataset") => {
    const response = await fetch(`${API_BASE_URL}/metadata/dataset/${datasetId}/csv`, {
        headers: getAuthHeaders(),
    });
    if (!response.ok) return handleApiError(response);

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${datasetName.replace(/\s+/g, "_")}_metadata.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
};

/**
 * Apply a metadata CSV to the dataset, or preview what it would do.
 *
 * `dryRun` (the default) writes nothing and returns the preview — matched rows,
 * filenames not found, images the file omits, and each column's key and inferred
 * type. Applying runs the same code, so what the user approves is what happens.
 *
 * @param {boolean} [replace] - Treat each row as the image's complete metadata,
 *   deleting keys the file does not mention.
 */
export const importDatasetMetadataCsv = async (
    datasetId, file, { dryRun = true, replace = false } = {}
) => {
    const formData = new FormData();
    formData.append("file", file);
    const url = buildUrl(API_BASE_URL, `/metadata/dataset/${datasetId}/import`, {
        dry_run: dryRun,
        replace,
    });
    const response = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
    });
    return handleApiError(response);
};
