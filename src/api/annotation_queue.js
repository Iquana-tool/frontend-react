/**
 * Annotation-queue endpoints: the persisted order an annotator works images in.
 *
 * Unlike the review queue (a per-session snapshot), an annotation queue is saved
 * per (dataset, user): the builder on the Annotation card writes it, and the
 * editor's loader applies it so next/previous follow that order. See
 * `app.services.annotation_queue` on the backend for the ordering registry (where
 * active-learning orderings plug in).
 */
import { handleApiError, getAuthHeaders } from "./util";
import { API_BASE_URL } from "./config";

const jsonHeaders = () => getAuthHeaders({ "Content-Type": "application/json" });

/**
 * The dataset's annotation workload, the sorting methods, and the caller's saved queue.
 *
 * Backs the Annotation card's "x in progress, y not started" subcaption and the
 * queue builder's ordering options / resume prompt.
 *
 * @param {number|string} datasetId
 * @returns {Promise<{success: boolean, summary: {
 *   not_started: number, in_progress: number, finished: number, total: number,
 *   has_saved_queue: boolean, saved_settings: QueueSettings|null,
 *   methods: Array<{key: string, label: string,
 *     needs: Array<"embedding_model"|"trained_model">, directions: string[],
 *     descriptions: Object<string, string>}>,
 * }}>}
 */
export const fetchAnnotationQueueSummary = async (datasetId) => {
    const response = await fetch(
        `${API_BASE_URL}/annotation-queue/datasets/${datasetId}/summary`,
        { headers: getAuthHeaders() }
    );
    return handleApiError(response);
};

/**
 * The caller's saved queue for a dataset, or `queue: null` if none was built.
 *
 * @param {number|string} datasetId
 * @returns {Promise<{success: boolean, queue: {
 *   settings: QueueSettings, image_ids: number[], total: number, updated_at: string|null,
 * }|null}>}
 */
export const fetchAnnotationQueue = async (datasetId) => {
    const response = await fetch(
        `${API_BASE_URL}/annotation-queue/datasets/${datasetId}`,
        { headers: getAuthHeaders() }
    );
    return handleApiError(response);
};

/**
 * Queue settings, as sent to prepare and build and saved with the queue.
 * @typedef {Object} QueueSettings
 * @property {string} method - A key from the summary's `methods`.
 * @property {"ascending"|"descending"} [direction] - Defaults to the method's first direction.
 * @property {string} [round_robin_with] - A second method to alternate with.
 * @property {string} [embedding_model] - For methods that need one.
 * @property {string} [trained_model] - For methods, or the confidence filter, that need one.
 * @property {Object} [metadata_filters] - Same shape as the gallery's metadata filter.
 * @property {number} [max_confidence] - 0..1; keeps images whose most confident detection is lower.
 * @property {boolean} [show_builder] - False opens this queue directly next time.
 */

const postSettings = async (url, settings) => {
    const response = await fetch(url, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(settings),
    });
    return handleApiError(response);
};

/**
 * Build the queue for the settings and persist it, overwriting any earlier queue for this
 * dataset + user.
 *
 * @param {number|string} datasetId
 * @param {QueueSettings} settings
 * @returns {Promise<{success: boolean, queue: {settings: QueueSettings, image_ids: number[],
 *   total: number, details: Object, updated_at: string|null}}>}
 */
export const buildAnnotationQueue = (datasetId, settings) =>
    postSettings(`${API_BASE_URL}/annotation-queue/datasets/${datasetId}`, settings);

/**
 * Fill in what the settings need (image vectors, model scores). `ready: true` means build
 * now; otherwise poll `fetchQueuePrepJob` until the job ends.
 *
 * @param {number|string} datasetId
 * @param {QueueSettings} settings
 * @returns {Promise<{success: boolean, ready: boolean, job: null|{
 *   id: number, status: string, total: number, done: number, failed: number,
 * }}>}
 */
export const prepareAnnotationQueue = (datasetId, settings) =>
    postSettings(`${API_BASE_URL}/annotation-queue/datasets/${datasetId}/prepare`, settings);

/** Progress of a preparation job. */
export const fetchQueuePrepJob = async (datasetId, jobId) => {
    const response = await fetch(
        `${API_BASE_URL}/annotation-queue/datasets/${datasetId}/prep-jobs/${jobId}`,
        { headers: getAuthHeaders() }
    );
    return handleApiError(response);
};

/** Stop a preparation job after its current image. */
export const cancelQueuePrepJob = async (datasetId, jobId) => {
    const response = await fetch(
        `${API_BASE_URL}/annotation-queue/datasets/${datasetId}/prep-jobs/${jobId}/cancel`,
        { method: "POST", headers: getAuthHeaders() }
    );
    return handleApiError(response);
};

/**
 * Models the builder can offer: embedding models, and models trained on this dataset.
 * @returns {Promise<{success: boolean, models: {
 *   embedding: Array<{registry_key: string, name: string}>,
 *   trained: Array<{registry_key: string, name: string}>,
 * }}>}
 */
export const fetchQueueModels = async (datasetId) => {
    const response = await fetch(
        `${API_BASE_URL}/annotation-queue/datasets/${datasetId}/models`,
        { headers: getAuthHeaders() }
    );
    return handleApiError(response);
};
