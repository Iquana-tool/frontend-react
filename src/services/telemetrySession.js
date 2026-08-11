/**
 * The study session id: one session is one login, ending at logout.
 *
 * Deliberately its own module. Both the telemetry client and the API layer need
 * the current id -- the client to stamp events it buffers, the API layer to put
 * it on the `X-Telemetry-Session` header so backend-emitted events join the same
 * session -- and having either import the other would make a cycle.
 *
 * `localStorage`, not `sessionStorage`: a session follows the *login*, so it has
 * to survive a reload and be shared by every tab the participant opens. The
 * previous per-tab id split one participant's work into several sessions as soon
 * as they opened a second tab.
 *
 * Before login there is no session, and `getSessionId()` returns null. Those
 * events are still recorded, with a null `session_id`, because they are not part
 * of anyone's study run.
 */
const STORAGE_KEY = 'telemetry_session_id';

const randomId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * The current session id, or null when nobody is signed in.
 * @returns {string|null}
 */
export const getSessionId = () => {
    try {
        return localStorage.getItem(STORAGE_KEY) || null;
    } catch (error) {
        // Private mode or storage disabled. Capture continues without grouping.
        return null;
    }
};

/**
 * Begin a session. Called on login, so every event until logout shares this id.
 * @returns {string|null} the new id, or null if storage is unavailable
 */
export const startSession = () => {
    const id = randomId();
    try {
        localStorage.setItem(STORAGE_KEY, id);
        return id;
    } catch (error) {
        return null;
    }
};

/** End the session. Called on logout and whenever the token is rejected. */
export const endSession = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        /* nothing to clear */
    }
};
