import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import activityLog, { ActivityComponent, trackNavigation } from "../services/activityLog";
import visitTracker from "../services/visitTracker";

/**
 * Start the activity log client once, for the lifetime of the app.
 *
 * Safe to call when the activity log is disabled: `init()` resolves to null and every
 * later `track()` is a no-op.
 */
export const useActivityLogInit = () => {
    useEffect(() => {
        // The visit tracker only subscribes once capture is known to be on, so a
        // deployment with the activity log off never binds its input listeners.
        activityLog.init().then(() => visitTracker.attach()).catch(() => {});
        // No teardown: the client is a singleton and its listeners are bound once.
        // Unmounting the app root means the page is going away anyway.
    }, []);
};

/**
 * Record route changes and how long the participant spent on each route.
 *
 * The dwell time is emitted when *leaving* a route, so each event describes a
 * completed visit. Only the path pattern is recorded -- query strings can carry
 * invite tokens and similar, which have no place in an activity log.
 */
export const useRouteActivity = () => {
    const location = useLocation();
    const previous = useRef(null);

    useEffect(() => {
        const now = performance.now();
        const from = previous.current;

        trackNavigation("route.change", {
            payload: {
                to: location.pathname,
                from: from?.pathname ?? null,
                dwell_ms: from ? Math.round(now - from.enteredAt) : null,
            },
        });

        previous.current = { pathname: location.pathname, enteredAt: now };
    }, [location.pathname]);
};

/** Direct access for components that need to emit their own events. */
export const useActivityLog = () => ({
    track: activityLog.track.bind(activityLog),
    trackDuration: activityLog.trackDuration.bind(activityLog),
    ActivityComponent,
});

export default useActivityLog;
