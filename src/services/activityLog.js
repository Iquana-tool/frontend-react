/**
 * Activity log client.
 *
 * One singleton for the whole app. Every call site can `track(...)`
 * unconditionally: until `init()` has fetched a config that enables the relevant
 * component, `track` returns immediately without allocating anything. On a
 * deployment with the activity log switched off that is the permanent state, so the
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
    beaconActivityBatch,
    fetchActivityLogConfig,
    sendActivityBatch,
} from "../api/activityLog";
import { getSessionId } from "./activityLogSession";

/** Must match ActivityComponent in the backend's app/services/activity_log/config.py. */
export const ActivityComponent = {
    ANNOTATION: "annotation",
    AI: "ai",
    NAVIGATION: "navigation",
    API: "api",
};

/** Hard ceiling on the buffer, so a backend outage cannot grow it without bound. */
const MAX_BUFFER = 500;

const randomId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/** Best-effort count of objects an AI response carried; null when unknown. */
const resultCount = (result) => {
    const data = result?.data ?? result;
    for (const key of ["objects", "contours", "added", "results"]) {
        if (Array.isArray(data?.[key])) return data[key].length;
    }
    return null;
};

class ActivityLogClient {
    constructor() {
        this.config = null;
        this.buffer = [];
        this.timer = null;
        this.initPromise = null;
        this.listenersBound = false;
        /** Counts events dropped locally, reported alongside the next flush. */
        this.dropped = 0;
        /** In-process observers (the visit tracker); see `subscribe`. */
        this.listeners = new Set();
        this.aiTokens = 0;
    }

    /**
     * Observe tracked events and AI request spans, e.g. to derive per-image
     * summaries. Notified whenever capture is on, even for a component that is
     * switched off, so a summary does not depend on its inputs being stored.
     *
     * @param {(type: 'track'|'ai.start'|'ai.end', data: Object) => void} listener
     * @returns {Function} unsubscribe
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify(type, data) {
        if (!this.isEnabled()) return;
        for (const listener of this.listeners) {
            try {
                listener(type, data);
            } catch {
                // An observer must never break the call site it is observing.
            }
        }
    }

    /**
     * Fetch the capture config and start flushing. Safe to call more than once.
     *
     * @returns {Promise<Object|null>} the resolved config
     */
    init() {
        if (this.initPromise) return this.initPromise;
        this.initPromise = fetchActivityLogConfig().then((config) => {
            this.config = config;
            if (this.isEnabled()) {
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
     * @param {string} component one of ActivityComponent
     * @param {string} eventType dotted name, e.g. "tool.switch"
     * @param {Object} [detail]
     * @param {Object} [detail.payload]     event-specific fields (no free text, no image data)
     * @param {number} [detail.datasetId]
     * @param {number} [detail.imageId]
     * @param {number} [detail.durationMs]
     * @returns {boolean} whether the event was buffered
     */
    track(component, eventType, detail = {}) {
        this.notify("track", { component, eventType, detail });
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
            // Read per event, not cached at init: a login or logout part-way through
            // the page's life starts or ends the session, and the very next event
            // must already carry the new value.
            session_id: getSessionId(),
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

    /**
     * Time an AI request from the user's side: from sending it to its result
     * arriving. Recorded as `ai.request` (the backend separately records the
     * model call as `ai.*.invoke`) and reported to observers as an AI wait.
     *
     * @param {'prompted'|'refine'|'suggest'|'cross_image'|'instance'} kind
     * @param {Function} fn the request
     * @param {Object} [detail]
     * @returns {Promise<*>} whatever `fn` resolves to
     */
    async trackAiRequest(kind, fn, detail = {}) {
        const token = ++this.aiTokens;
        const started = performance.now();
        this.notify("ai.start", { token, kind });
        const finish = (payload) => {
            this.notify("ai.end", { token, kind });
            this.track(ActivityComponent.AI, "ai.request", {
                ...detail,
                durationMs: Math.round(performance.now() - started),
                payload: { ...(detail.payload ?? {}), kind, ...payload },
            });
        };
        try {
            const result = await fn();
            finish({ ok: true, result_count: resultCount(result) });
            return result;
        } catch (error) {
            finish({ ok: false, error: error?.name ?? "Error" });
            throw error;
        }
    }

    /** Send everything buffered. Never rejects. */
    async flush() {
        if (!this.buffer.length) return;
        const batch = this.buffer.splice(0, this.config?.max_batch ?? 200);
        const ok = await sendActivityBatch(batch);
        if (!ok) this.dropped += batch.length;
    }

    /**
     * Flush during unload, when a normal fetch would be cancelled mid-flight.
     * Synchronous by necessity -- the browser will not wait for a promise here.
     */
    flushOnUnload() {
        if (!this.buffer.length) return;
        const batch = this.buffer.splice(0, this.config?.max_batch ?? 200);
        beaconActivityBatch(batch);
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
                this.track(ActivityComponent.NAVIGATION, "app.hidden");
                this.flushOnUnload();
            } else {
                this.track(ActivityComponent.NAVIGATION, "app.visible");
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
        this.initPromise = null;
        this.dropped = 0;
        this.listeners.clear();
    }
}

export const activityLog = new ActivityLogClient();

/** Shorthand used by call sites; keeps instrumentation to one short line. */
export const track = (component, eventType, detail) =>
    activityLog.track(component, eventType, detail);

export const trackAnnotation = (eventType, detail) =>
    activityLog.track(ActivityComponent.ANNOTATION, eventType, detail);

export const trackAi = (eventType, detail) =>
    activityLog.track(ActivityComponent.AI, eventType, detail);

export const trackNavigation = (eventType, detail) =>
    activityLog.track(ActivityComponent.NAVIGATION, eventType, detail);

/**
 * Record the verdict on unreviewed objects in the workspace review flow. For
 * AI output this is accepting or rejecting a suggestion; `added_by` says what
 * produced each object, so analysis can separate AI from manual ones.
 *
 * @param {'suggestion.accept'|'suggestion.reject'} eventType
 * @param {Array<Object>} objects store objects
 */
export const trackSuggestionVerdict = (eventType, objects) => {
    if (!activityLog.isEnabled() || !objects?.length) return;
    activityLog.track(ActivityComponent.AI, eventType, {
        payload: {
            count: objects.length,
            contour_ids: objects.map((o) => o.contour_id ?? o.id).slice(0, 200),
            added_by: [...new Set(objects.map((o) => o.added_by ?? null))],
        },
    });
};

export default activityLog;
