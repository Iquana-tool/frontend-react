import { API_BASE_URL } from "./config";
import { buildUrl, getAuthHeaders, handleApiError } from "./util";

/**
 * Fetch the capture configuration the client should apply.
 *
 * Deliberately does not go through `handleApiError`: that helper clears the auth
 * token and dispatches `auth:unauthorized` on a 401, which telemetry -- a
 * background concern that must never affect the session -- has no business doing.
 * A failure here simply means "capture nothing".
 *
 * @returns {Promise<Object|null>} the config object, or null when unavailable
 */
export const fetchTelemetryConfig = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/telemetry/config`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) return null;
        const body = await response.json();
        return body?.config ?? null;
    } catch (error) {
        // Telemetry is disabled on this deployment, or the backend is unreachable.
        return null;
    }
};

/**
 * Send a batch of events.
 *
 * @param {Array<Object>} events
 * @returns {Promise<boolean>} whether the batch was accepted
 */
export const sendTelemetryBatch = async (events) => {
    if (!events.length) return true;
    try {
        const response = await fetch(`${API_BASE_URL}/telemetry/events`, {
            method: "POST",
            headers: getAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ events }),
        });
        return response.ok;
    } catch (error) {
        return false;
    }
};

/**
 * Best-effort delivery during page unload.
 *
 * `sendBeacon` is the only transport a browser guarantees to finish once the page
 * is going away, but it cannot carry an Authorization header -- the backend
 * therefore accepts unauthenticated ingest and simply stores those events without
 * a username. Losing the username on the last flush is a far better trade than
 * losing the end of every session.
 *
 * @param {Array<Object>} events
 * @returns {boolean} whether the beacon was queued by the browser
 */
export const beaconTelemetryBatch = (events) => {
    if (!events.length) return true;
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return false;
    try {
        const blob = new Blob([JSON.stringify({ events })], { type: "application/json" });
        return navigator.sendBeacon(`${API_BASE_URL}/telemetry/events`, blob);
    } catch (error) {
        return false;
    }
};

/* -- Study administration ------------------------------------------------
 *
 * Everything below needs the `telemetry.manage` permission. Unlike the capture
 * calls above, these DO go through `handleApiError`: they are foreground admin
 * actions, so a 401 should end the session exactly as it would anywhere else.
 */

/** Drop null/undefined/empty filters so they are not sent as literal "". */
const activeFilters = (filters = {}) =>
    Object.fromEntries(
        Object.entries(filters).filter(([, value]) =>
            value !== null && value !== undefined && value !== "")
    );

/**
 * Page through stored events, newest filters applied server-side.
 *
 * @param {Object} [filters]
 * @param {string} [filters.start] - ISO timestamp, inclusive lower bound
 * @param {string} [filters.end] - ISO timestamp, exclusive upper bound
 * @param {string} [filters.username]
 * @param {string} [filters.session_id]
 * @param {string} [filters.component]
 * @param {number} [filters.limit]
 * @param {number} [filters.offset]
 * @returns {Promise<{success: boolean, total: number, events: Array<Object>}>}
 */
export const fetchTelemetryEvents = async (filters = {}) => {
    const response = await fetch(
        buildUrl(API_BASE_URL, "/telemetry/events", activeFilters(filters)),
        { headers: getAuthHeaders() }
    );
    return handleApiError(response);
};

/**
 * One row per captured session: who, when, how many events.
 * @returns {Promise<{success: boolean, sessions: Array<Object>}>}
 */
export const fetchTelemetrySessions = async () => {
    const response = await fetch(`${API_BASE_URL}/telemetry/sessions`, {
        headers: getAuthHeaders(),
    });
    return handleApiError(response);
};

/**
 * Change capture at runtime. Omitted fields are left as they are.
 *
 * Cannot enable capture on a deployment whose `USER_EVENTS_ENABLED` is false --
 * the backend treats that env flag as a lock and rejects the change.
 *
 * @param {{capture_enabled?: boolean, components?: string[]}} update
 */
export const updateTelemetryConfig = async (update) => {
    const response = await fetch(`${API_BASE_URL}/telemetry/config`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(update),
    });
    return handleApiError(response);
};

/**
 * Download the filtered event log.
 *
 * Goes through fetch rather than a plain link because the endpoint needs a bearer
 * token, which an `<a download>` cannot carry. The response is streamed by the
 * backend but has to be buffered here to become a blob URL; exports of a whole
 * study are tens of MB at worst, which is well within what a browser holds.
 *
 * @param {"jsonl"|"csv"} format
 * @param {Object} [filters] - same filters as `fetchTelemetryEvents`
 * @returns {Promise<string>} the filename that was saved
 */
export const downloadTelemetryExport = async (format = "jsonl", filters = {}) => {
    const url = buildUrl(API_BASE_URL, "/telemetry/export",
        { ...activeFilters(filters), format });
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) return handleApiError(response);

    // Prefer the name the backend chose (it carries the export timestamp).
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || `user-events.${format}`;

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
    } finally {
        // Revoking immediately would race the download in Safari; one tick is enough.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    }
    return filename;
};

/**
 * Delete captured events -- a pilot run, or a participant who withdrew.
 *
 * At least one filter is required unless `confirm` is true, so a mistake cannot
 * wipe a study in one call.
 *
 * @param {{before?: string, session_id?: string, username?: string, confirm?: boolean}} filters
 * @returns {Promise<{success: boolean, deleted: number}>}
 */
export const purgeTelemetryEvents = async (filters = {}) => {
    const response = await fetch(
        buildUrl(API_BASE_URL, "/telemetry/events", activeFilters(filters)),
        { method: "DELETE", headers: getAuthHeaders() }
    );
    return handleApiError(response);
};
