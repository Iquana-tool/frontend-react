/**
 * The Perspective-backed data explorer.
 *
 * This module is the lazy-load boundary: QuantificationPage reaches it only through
 * `React.lazy()`, so the engine and both plugins stay out of the main bundle. Anything
 * imported here is imported by everyone who opens the Data tab, and by nobody else.
 *
 * There is one viewer, not one per kind of analysis. The table, the pivots and the plots
 * are all the same table seen through different settings, and Perspective's own config
 * panel is what switches between them — splitting that across tabs of our own would be
 * rebuilding, worse, a control the library already ships.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import useAppStore from "../../stores/useAppStore";
import { defaultViewerConfig, perspectiveTheme } from "../../utils/perspectiveQuantification";
import {
    acquireContourTable,
    getPerspectiveClient,
    paintSwatchCells,
    releaseSupersededTables,
} from "./perspectiveEngine";

/** How long to let a burst of viewer edits settle before saving the configuration. */
const SAVE_DEBOUNCE_MS = 500;

/**
 * @param {string} [configScope] - Distinguishes this viewer's saved analysis from another
 *   viewer over the same dataset and profile (the per-image pivot vs the dataset-wide
 *   explorer). Omit for the dataset-wide one, whose saved configs predate the parameter.
 * @param {Function} [buildDefault] - `(columns, theme) => config` for the configuration
 *   this viewer opens with, and returns to on Reset. Defaults to the plain table.
 */
const QuantificationExplorer = ({
    datasetId,
    profileId,
    dataKey,
    rows,
    theme = "light",
    configScope = null,
    buildDefault = defaultViewerConfig,
}) => {
    const hostRef = useRef(null);
    // The `<perspective-viewer>` element, created imperatively rather than rendered as JSX.
    // The host freezes its plugin list the moment the first one is instantiated, so it
    // cannot exist before the engine has finished registering the plugins — including the
    // box and violin ones, which would otherwise be silently missing.
    const [viewer, setViewer] = useState(null);
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState(null);

    const { viewerConfigKey, setViewerConfig, getViewerConfig } = useAppStore(
        (state) => state.quantificationActions
    );
    const configKey = viewerConfigKey(datasetId, profileId, configScope);

    // Read inside effects without making them depend on it: a theme toggle must restyle the
    // viewer, not tear down and rebuild the table it is showing.
    const themeRef = useRef(theme);
    themeRef.current = theme;

    const buildDefaultConfig = useCallback(
        (columns) => buildDefault(columns, perspectiveTheme(themeRef.current)),
        [buildDefault]
    );

    // Create the viewer element, once, after the engine has registered every plugin.
    useEffect(() => {
        let cancelled = false;
        let element = null;

        getPerspectiveClient()
            .then(() => {
                if (cancelled || !hostRef.current) return;
                element = document.createElement("perspective-viewer");
                element.style.width = "100%";
                element.style.height = "100%";
                hostRef.current.appendChild(element);
                setViewer(element);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Could not start the Perspective engine:", err);
                setError(err.message || "Could not start the data explorer");
                setStatus("error");
            });

        return () => {
            cancelled = true;
            element?.remove();
            setViewer(null);
        };
    }, []);

    // Load the table and apply a configuration. Re-runs only when the underlying rows
    // change — a new dataset, profile, or inclusion filter.
    useEffect(() => {
        if (!viewer || !rows || rows.length === 0) return undefined;

        let cancelled = false;
        let detachSwatches = null;

        (async () => {
            try {
                setStatus("loading");
                // Timed because this is the stretch between clicking the tab and seeing
                // data, and when it is slow the only useful question is which part was.
                const started = performance.now();
                const { name, columns, swatchMetrics } = await acquireContourTable(dataKey, rows);
                const built = performance.now();
                if (cancelled) return;

                // `load(table)` is deprecated in v5: the client is what gets loaded, and the
                // table is named in the restore alongside the rest of the configuration.
                const client = await getPerspectiveClient();
                await viewer.load(client);
                if (cancelled) return;

                const saved = getViewerConfig(configKey);
                const config = { ...(saved || buildDefaultConfig(columns)), table: name };

                try {
                    await viewer.restore(config);
                } catch (restoreErr) {
                    // A saved configuration can outlive what it refers to — a filter on a
                    // metadata value that no longer occurs, say. Falling back to the default
                    // costs the user their layout; refusing to render costs them the page.
                    console.warn("Saved viewer configuration could not be restored:", restoreErr);
                    await viewer.restore({ ...buildDefaultConfig(columns), table: name });
                }
                if (cancelled) return;

                detachSwatches = await paintSwatchCells(viewer, swatchMetrics);
                // Safe only now: the viewer is showing the new table, so nothing on screen
                // still points at the one being freed.
                releaseSupersededTables();
                console.debug(
                    `[quantification] ${rows.length.toLocaleString()} rows — ` +
                    `table built in ${Math.round(built - started)} ms, ` +
                    `rendered in ${Math.round(performance.now() - built)} ms`
                );
                setStatus("ready");
            } catch (err) {
                if (cancelled) return;
                console.error("Could not initialise the quantification viewer:", err);
                setError(err.message || "Could not initialise the viewer");
                setStatus("error");
            }
        })();

        return () => {
            cancelled = true;
            detachSwatches?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewer, dataKey, configKey]);

    // Persist the configuration — a pivot, a filter, a chart type is a saved analysis, and
    // losing it on a re-render would throw away the user's actual work.
    useEffect(() => {
        if (!viewer) return undefined;

        let timer = null;
        const persist = async () => {
            try {
                const config = await viewer.save();
                setViewerConfig(configKey, config);
            } catch (err) {
                console.debug("Viewer configuration not saved:", err);
            }
        };
        // The event's own `getConfig()` is only valid synchronously inside the callback, so
        // the config is read back with `save()` instead — which is also what lets this be
        // debounced through a burst of edits (dragging a column fires many updates).
        const onConfigUpdate = () => {
            clearTimeout(timer);
            timer = setTimeout(persist, SAVE_DEBOUNCE_MS);
        };

        viewer.addEventListener("perspective-config-update", onConfigUpdate);
        return () => {
            viewer.removeEventListener("perspective-config-update", onConfigUpdate);
            // Capture whatever the pending debounce was about to save, so leaving the tab
            // immediately after an edit does not lose it.
            if (timer) {
                clearTimeout(timer);
                persist();
            }
        };
    }, [viewer, configKey, setViewerConfig]);

    // Follow the app's theme rather than sitting in the page as a foreign object.
    useEffect(() => {
        if (!viewer || status !== "ready") return;
        viewer
            .restore({ theme: perspectiveTheme(theme) })
            .catch((err) => console.debug("Viewer theme not applied:", err));
    }, [viewer, theme, status]);

    /** Discard the saved analysis and return to the plain table. */
    const handleReset = async () => {
        if (!viewer) return;
        try {
            const { name, columns } = await acquireContourTable(dataKey, rows);
            setViewerConfig(configKey, null);
            await viewer.restore({ ...buildDefaultConfig(columns), table: name });
        } catch (err) {
            console.error("Could not reset the viewer:", err);
        }
    };

    return (
        <div className="relative flex-1 min-h-0 rounded-lg border border-ln overflow-hidden">
            {status === "error" && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-p1">
                    <div className="flex items-start gap-3 rounded-lg border border-errLn bg-errBg px-4 py-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-err" />
                        <p className="text-sm text-err">{error}</p>
                    </div>
                </div>
            )}

            {status === "loading" && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-p1">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-acLn mx-auto mb-3"></div>
                        <p className="text-sm text-t2">
                            Preparing {rows?.length?.toLocaleString() ?? ""} rows…
                        </p>
                    </div>
                </div>
            )}

            {status === "ready" && (
                <button
                    onClick={handleReset}
                    title="Discard grouping, filters and plot type, and go back to the plain table"
                    className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-ln bg-p1 px-2.5 py-1.5 text-xs font-medium text-t2 shadow-sm hover:bg-hv2 transition-colors"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset view
                </button>
            )}

            {/* The viewer element is appended here once the engine is ready. It sizes
                itself to its container, so the container is what must have a resolved
                height — hence the `min-h-0` flex child above. */}
            <div ref={hostRef} className="w-full h-full" />
        </div>
    );
};

export default QuantificationExplorer;
