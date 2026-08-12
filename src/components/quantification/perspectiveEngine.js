/**
 * The Perspective engine, and the lifecycle of the contour table it serves.
 *
 * IMPORTANT: importing this module pulls in the Perspective engine — a small amount of
 * JavaScript, but ~4.5 MB of WebAssembly behind it. Nothing outside the `React.lazy()`
 * boundary in QuantificationPage may import it, directly or transitively, or every route
 * in the app (login included) starts paying for the quantification page.
 *
 * The engine and the loaded table both live at module scope rather than in component
 * state, so a remount does not rebuild a six-figure-row table for data that has not
 * changed.
 */
import perspective from "@perspective-dev/client";
import viewer from "@perspective-dev/viewer";
import "@perspective-dev/viewer/themes";
// Registers the "Iquana" theme by declaring `--psp-theme-name`. Imported after the stock
// themes so it layers on top of the Pro defaults it deliberately leaves in place.
import "../../styles/perspectiveIquanaTheme.css";

// The three WebAssembly binaries, imported as asset URLs rather than through the `/inline`
// entries that base64-embed them into the JavaScript.
//
// Inline is simpler — it needs no bundler configuration and it sequences its own
// initialization behind a top-level `await`. It was also what shipped first here. But it
// costs 11.6 MB of script against 5.2 MB of assets.
//
// The bigger win is not the size, it is *cacheability*. Inline welds the engine into the
// same chunk as our own code, so changing one line of this page re-downloads the entire
// engine — 11.6 MB against 0.5 MB once the wasm is split out. As separate hashed assets it
// is fetched once and survives every subsequent frontend deploy.
//
// Vite emits each as a real asset and rewrites the URL against `base`, so they keep
// resolving behind the reverse proxy's path prefix — the reason not to hand-roll a path.
import viewerWasm from "@perspective-dev/viewer/dist/wasm/perspective-viewer.wasm?url";
import clientWasm from "@perspective-dev/client/dist/wasm/perspective-js.wasm?url";
import serverWasm from "@perspective-dev/server/dist/wasm/perspective-server.wasm?url";

import { buildColumnarTable, readableTextColor } from "../../utils/perspectiveQuantification";
import { registerDistributionPlugins } from "./distributionPlugins";

// Engine and client wasm are only *registered* here; neither is fetched until first use.
// Only `wasm32` is registered — adding `wasm64` would opt into the Memory64 engine wherever
// the browser supports it, trading engine performance for a 16GB heap ceiling instead of
// 4GB and pulling a second 2.53 MB binary. Nothing here needs that much heap.
perspective.init_server(() => fetch(serverWasm));
perspective.init_client(fetch(clientWasm));

/**
 * Bring the engine up, in an order that is load-bearing.
 *
 * Without the `/inline` entries there is no top-level `await` sequencing this, and the
 * steps are not independent. Doing them concurrently — which is the natural thing to write,
 * and what an earlier version of this file did — fails on a cold load with a
 * "memory access out of bounds" trap from inside `viewer.load()`, while working fine on a
 * warm page. The order below was arrived at by A/B-ing cold loads and is stable across
 * repeated trials:
 *
 *   1. the viewer's own wasm, awaited to completion. It is a second instance, separate from
 *      the engine's, and the viewer's element class only becomes real once it is up.
 *   2. the plugins, which register themselves into that instance on import and therefore
 *      cannot be imported before it exists.
 *   3. our own box/violin plugins, for the same reason.
 *   4. only then `worker()`, which boots the engine itself.
 *
 * Nothing may create a `<perspective-viewer>` until this resolves — the host freezes its
 * plugin list at the first instantiation, which would silently drop the distribution plots.
 * `QuantificationExplorer` therefore creates the element after awaiting this, rather than
 * rendering it as JSX.
 */
const enginePromise = (async () => {
    await viewer.init_client(fetch(viewerWasm));
    await Promise.all([
        import("@perspective-dev/viewer-datagrid"),
        import("@perspective-dev/viewer-charts"),
    ]);
    registerDistributionPlugins();
    return perspective.worker();
})();

/**
 * The Perspective client, booted once per page load.
 *
 * `worker()` puts the engine on its own thread, so sorting or re-pivoting a large table
 * does not block the UI thread the rest of the app renders on.
 */
export const getPerspectiveClient = () => enginePromise;

// Tables are named uniquely rather than reusing one name. A `client.table()` call whose
// name is already taken throws, which would make table creation depend on the previous
// table's deletion having succeeded — and deletion can legitimately fail while a viewer
// still holds a view on it. With unique names, cleanup is best-effort and can never block
// the new table from being built.
let tableSequence = 0;
let currentTable = { key: null, promise: null };
// Tables that have been replaced but may still be on screen. See `releaseSupersededTables`.
let supersededTables = [];

/**
 * Build (or reuse) the Perspective table for one set of export rows.
 *
 * `key` identifies the data: same key, same table, no rebuild. Callers should derive it
 * from everything that changes the rows — dataset, profile and the inclusion filters.
 *
 * The schema is computed and passed to `client.table()` *before* any row is loaded, rather
 * than letting Perspective infer one. See `buildColumnarTable` for why.
 *
 * @param {string} key
 * @param {Object[]} rows - Raw export rows, as returned by `fetchQuantificationRows`.
 * @returns {Promise<{name: string, columns: string[], swatchMetrics: Array}>}
 */
export const acquireContourTable = (key, rows) => {
    if (currentTable.key === key && currentTable.promise) return currentTable.promise;

    const previous = currentTable.promise;
    const name = `contours_${++tableSequence}`;

    // The outgoing table is queued rather than deleted here. At this moment the viewer is
    // still showing it, and deleting a table out from under an attached view leaves the
    // viewer referring to something that no longer exists — the next `restore()` then fails
    // validating its columns against a dead table. The caller releases it once the new
    // table is actually on screen.
    if (previous) supersededTables.push(previous);

    currentTable = {
        key,
        promise: (async () => {
            const client = await getPerspectiveClient();
            const { columns, schema, columnNames, swatchMetrics } = buildColumnarTable(rows);

            // Deliberately *not* indexed on `contour_id`. An index would make the table a
            // keyed store — useful for streaming updates that replace rows, which this
            // never does: it is built once, from an export that already has exactly one row
            // per contour. Measured at 100k rows it cost 1.8s of the 2.0s total load.
            const table = await client.table(schema, { name });
            await table.update(columns);

            return { table, name, columns: columnNames, swatchMetrics };
        })(),
    };

    return currentTable.promise;
};

/**
 * Free the memory of tables that have since been replaced.
 *
 * Call this only once the viewer is displaying the current table, so nothing on screen
 * still refers to what is being freed. Failing to free is not worth surfacing: it costs
 * memory that the next successful release reclaims anyway.
 */
export const releaseSupersededTables = async () => {
    const releasing = supersededTables;
    supersededTables = [];
    await Promise.all(
        releasing.map(async (pending) => {
            try {
                (await pending).table.delete();
            } catch (err) {
                console.debug("Superseded quantification table not deleted:", err);
            }
        })
    );
};

/**
 * Paint the synthesized colour columns as swatches.
 *
 * The datagrid is `regular-table` underneath, which re-renders cells as it virtualizes and
 * so cannot be styled by writing to the DOM once. `addStyleListener` is its supported hook:
 * it runs after every draw, over exactly the cells currently realised.
 *
 * Each swatch cell already holds a CSS colour string (see `buildColumnarTable`), so painting
 * is just reading the cell's own text — no cross-column lookup, which a per-cell hook could
 * not do anyway. The value stays visible on top of the swatch, with the text colour flipped
 * to whichever of black/white survives on that background.
 *
 * @param {HTMLElement} viewer - The `<perspective-viewer>` element.
 * @param {Array} swatchMetrics - From `acquireContourTable`.
 * @returns {Promise<Function>} Detach function; a no-op when there is nothing to paint.
 */
export const paintSwatchCells = async (viewer, swatchMetrics) => {
    const noop = () => {};
    if (!swatchMetrics || swatchMetrics.length === 0) return noop;

    const plugin = await viewer.getPlugin();
    const regularTable = plugin?.regular_table;
    // Only the Datagrid plugin is a regular-table; the chart plugins have no cells to
    // paint, and switching to one simply leaves the swatches behind with the grid.
    if (!regularTable?.addStyleListener) return noop;

    const swatchColumns = new Set(swatchMetrics.map((metric) => metric.key));
    let detached = false;

    regularTable.addStyleListener(() => {
        if (detached) return;
        for (const td of regularTable.querySelectorAll("tbody td")) {
            const meta = regularTable.getMeta(td);
            // `column_header` is a path once a split_by is applied; the column's own name
            // is always its last element.
            const column = meta?.column_header?.[meta.column_header.length - 1];

            if (!swatchColumns.has(column)) {
                // Cells are recycled across draws, so a cell that was a swatch a moment
                // ago has to be actively cleared or the colour follows it to its new column.
                if (td.style.background) {
                    td.style.background = "";
                    td.style.color = "";
                }
                continue;
            }

            const textColor = readableTextColor(td.textContent);
            if (textColor) {
                td.style.background = td.textContent;
                td.style.color = textColor;
            } else {
                td.style.background = "";
                td.style.color = "";
            }
        }
    });

    // regular-table has no removeStyleListener; the flag makes the retained listener inert
    // once this viewer is gone, which matters because the listener closes over its element.
    return () => {
        detached = true;
    };
};

/**
 * Force a synchronous repaint of the datagrid.
 *
 * `regular-table` and the chart plugins only paint on a compositing frame, so in a hidden
 * or non-compositing browser pane the grid comes up blank and a `restore()` onto a chart
 * plugin never settles. Automated checks driving the page need this; normal use does not.
 */
export const forceDraw = async (viewer) => {
    const plugin = await viewer.getPlugin();
    await plugin?.regular_table?.draw?.();
};
