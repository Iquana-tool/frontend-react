/**
 * User telemetry client.
 *
 * One singleton for the whole app. Every call site can `track(...)`
 * unconditionally: until `init()` has fetched a config that enables the relevant
 * component, `track` returns immediately without allocating anything. On a
 * deployment with telemetry switched off that is the permanent state, so the
 * instrumentation costs one property read per call.
 *
 * Events are buffered and flushed on whichever comes first:
 *   - the configured interval (default 5s),
 *   - the configured batch size (default 50),
 *   - the tab becoming hidden,
 *   - page unload (via `sendBeacon`, the only transport that survives it).
 *
 * Nothing here ever throws into a caller: a failed flush drops the batch and the
 * app carries on. Instrumentation that can break the tool it is measuring is
 * worse than no instrumentation.
 */
import {
    beaconTelemetryBatch,
    fetchTelemetryConfig,
    sendTelemetryBatch,
} from "../api/telemetry";

/** Must match TelemetryComponent in the backend's app/services/telemetry/config.py. */
export const TelemetryComponent = {
    ANNOTATION: "annotation",
    AI: "ai",
    NAVIGATION: "navigation",
    API: "api",
};

const SESSION_STORAGE_KEY = "telemetry_session_id";
/** Hard ceiling on the buffer, so a backend outage cannot grow it without bound. */
const MAX_BUFFER = 500;

const randomId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * One id per browser tab, surviving reloads but not a new tab.
 *
 * That is the unit a study session actually maps to: a participant working
 * through a task in one tab, including any refresh they do along the way.
 */
const resolveSessionId = () => {
    try {
        const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (existing) return existing;
        const created = randomId();
        sessionStorage.setItem(SESSION_STORAGE_KEY, created);
        return created;
    } catch (error) {
        // Private mode, or storage disabled: fall back to a per-load id.
        return randomId();
    }
};

class TelemetryClient {
    constructor() {
        this.config = null;
        this.buffer = [];
        this.sessionId = null;
        this.timer = null;
        this.initPromise = null;
        this.listenersBound = false;
        /** Counts events dropped locally, reported alongside the next flush. */
        this.dropped = 0;
    }

    /**
     * Fetch the capture config and start flushing. Safe to call more than once.
     *
     * @returns {Promise<Object|null>} the resolved config
     */
    init() {
        if (this.initPromise) return this.initPromise;
        this.initPromise = fetchTelemetryConfig().then((config) => {
            this.config = config;
            if (this.isEnabled()) {
                this.sessionId = resolveSessionId();
                this.bindListeners();
                this.startTimer();
            } else {
                // Anything buffered before the config arrived is unwanted after all.
                this.buffer = [];
            }
            return config;
        });
        return this.initPromise;
    }

    /** True when the deployment captures anything at all. */
    isEnabled() {
        return Boolean(this.config?.enabled && this.config?.capture_enabled);
    }

    /** True when this specific component is switched on. */
    captures(component) {
        return Boolean(this.isEnabled() && this.config?.components?.[component]);
    }

    /**
     * Record one user action.
     *
     * @param {string} component one of TelemetryComponent
     * @param {string} eventType dotted name, e.g. "tool.switch"
     * @param {Object} [detail]
     * @param {Object} [detail.payload]     event-specific fields (no free text, no image data)
     * @param {number} [detail.datasetId]
     * @param {number} [detail.imageId]
     * @param {number} [detail.durationMs]
     * @returns {boolean} whether the event was buffered
     */
    track(component, eventType, detail = {}) {
        if (!this.captures(component)) return false;

        if (this.buffer.length >= MAX_BUFFER) {
            // Drop the oldest: during a stall the recent events are the ones that
            // still describe what the participant is doing.
            this.buffer.shift();
            this.dropped += 1;
        }

        this.buffer.push({
            event_id: randomId(),
            ts: new Date().toISOString(),
            component,
            event_type: eventType,
            session_id: this.sessionId,
            dataset_id: detail.datasetId ?? null,
            image_id: detail.imageId ?? null,
            duration_ms: detail.durationMs ?? null,
            payload: detail.payload ?? null,
            client: this.clientHint(),
        });

        if (this.buffer.length >= (this.config?.batch_size ?? 50)) {
            this.flush();
        }
        return true;
    }

    /**
     * Time an async operation and record it as one event.
     *
     * @param {string} component
     * @param {string} eventType
     * @param {Function} fn the operation to run
     * @param {Object} [detail]
     * @returns {Promise<*>} whatever `fn` resolves to
     */
    async trackDuration(component, eventType, fn, detail = {}) {
        const started = performance.now();
        try {
            const result = await fn();
            this.track(component, eventType, {
                ...detail,
                durationMs: Math.round(performance.now() - started),
                payload: { ...(detail.payload ?? {}), ok: true },
            });
            return result;
        } catch (error) {
            // A failed operation is as interesting to a study as a successful one.
            this.track(component, eventType, {
                ...detail,
                durationMs: Math.round(performance.now() - started),
                payload: { ...(detail.payload ?? {}), ok: false, error: error?.name ?? "Error" },
            });
            throw error;
        }
    }

    /** Send everything buffered. Never rejects. */
    async flush() {
        if (!this.buffer.length) return;
        const batch = this.buffer.splice(0, this.config?.max_batch ?? 200);
        const ok = await sendTelemetryBatch(batch);
        if (!ok) this.dropped += batch.length;
    }

    /**
     * Flush during unload, when a normal fetch would be cancelled mid-flight.
     * Synchronous by necessity -- the browser will not wait for a promise here.
     */
    flushOnUnload() {
        if (!this.buffer.length) return;
        const batch = this.buffer.splice(0, this.config?.max_batch ?? 200);
        beaconTelemetryBatch(batch);
    }

    // -- internals --------------------------------------------------------

    clientHint() {
        if (typeof navigator === "undefined") return null;
        // The UA string alone, capped. Enough to separate browser effects during
        // analysis without turning the row into a fingerprint.
        return String(navigator.userAgent ?? "").slice(0, 255);
    }

    startTimer() {
        if (this.timer) return;
        const interval = this.config?.flush_interval_ms ?? 5000;
        this.timer = setInterval(() => { this.flush(); }, interval);
    }

    bindListeners() {
        if (this.listenersBound || typeof window === "undefined") return;
        this.listenersBound = true;

        // `visibilitychange` fires reliably on mobile and on tab switches, where
        // `beforeunload` often does not; both are registered so a session's tail
        // is captured on every platform.
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                this.track(TelemetryComponent.NAVIGATION, "app.hidden");
                this.flushOnUnload();
            } else {
                this.track(TelemetryComponent.NAVIGATION, "app.visible");
            }
        });
        window.addEventListener("pagehide", () => { this.flushOnUnload(); });
        window.addEventListener("beforeunload", () => { this.flushOnUnload(); });
    }

    /** Test seam: drop all state so a fresh init can be exercised. */
    reset() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.config = null;
        this.buffer = [];
        this.sessionId = null;
        this.initPromise = null;
        this.dropped = 0;
    }
}

export const telemetry = new TelemetryClient();

/** Shorthand used by call sites; keeps instrumentation to one short line. */
export const track = (component, eventType, detail) =>
    telemetry.track(component, eventType, detail);

export const trackAnnotation = (eventType, detail) =>
    telemetry.track(TelemetryComponent.ANNOTATION, eventType, detail);

export const trackAi = (eventType, detail) =>
    telemetry.track(TelemetryComponent.AI, eventType, detail);

export const trackNavigation = (eventType, detail) =>
    telemetry.track(TelemetryComponent.NAVIGATION, eventType, detail);

export default telemetry;
