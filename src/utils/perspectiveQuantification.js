/**
 * Shaping the per-contour export for Perspective.
 *
 * Everything here is pure and free of both React and the Perspective runtime, so it can be
 * tested without booting a WASM engine — which is most of the reason it is not folded into
 * the viewer component.
 *
 * The one idea worth stating up front: Perspective infers a schema from the first rows it
 * is handed, and this export is full of legitimately-null columns (a `meta_` key the
 * dataset declares but no *exported* image carries, a metric scoped to labels that did not
 * survive the filters). Inference on a null-leading column is a coin flip, and a column
 * typed wrong is a column that cannot be grouped or aggregated. So the schema is derived
 * explicitly here and handed to `client.table()` before any row is loaded.
 */
import { opencvLabToRgbCss } from "./quantificationUtils";

/**
 * The multi-component colour metrics, and how to turn their components into a CSS colour.
 *
 * Column names mirror the backend's `_metric_column_name`, which suffixes a multi-component
 * metric with its lowercased registry component names — `("R","G","B")` and `("L","a","b")`.
 * The synthesized column takes the *bare* metric key, which cannot collide: the backend
 * only emits a bare key for single-component metrics.
 */
export const COLOR_SWATCH_METRICS = [
    {
        key: "mean_color_rgb",
        components: ["mean_color_rgb_r", "mean_color_rgb_g", "mean_color_rgb_b"],
        // Already display sRGB; only needs rounding into integer channels.
        toCss: ([r, g, b]) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
    },
    {
        key: "mean_color_lab",
        components: ["mean_color_lab_l", "mean_color_lab_a", "mean_color_lab_b"],
        // opencv 8-bit LAB (all channels 0-255), not the conventional L*/a*/b* ranges.
        toCss: opencvLabToRgbCss,
    },
];

/**
 * Map one sample value onto a Perspective schema type.
 *
 * Deliberately coarse: the export only ever carries numbers (metrics, ids), strings
 * (filenames, labels, metadata values) and nulls. Dates are not inferred even for a
 * date-typed metadata key, because the value arrives as a string and mistyping a column as
 * `date` makes it un-groupable when a single row fails to parse.
 */
const perspectiveTypeOf = (value) => {
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return Number.isInteger(value) ? "integer" : "float";
    return "string";
};

/** Which colour metrics have all three of their component columns present in the export. */
export const detectSwatchMetrics = (columns) => {
    const present = new Set(columns);
    return COLOR_SWATCH_METRICS.filter((metric) =>
        metric.components.every((component) => present.has(component))
    );
};

/**
 * Turn export rows into the columns, schema and swatches Perspective is loaded with.
 *
 * Done as one pass over the rows, for three reasons that only show up at real dataset
 * sizes (a six-figure contour count is normal):
 *
 * 1. **Columnar output.** Perspective is a columnar engine, and handing it row objects
 *    makes it transpose them itself — measured at roughly 6x the cost of passing columns
 *    that are already built.
 * 2. **No row copies.** Deriving the colour swatches by copying every row object allocated
 *    a second full copy of the dataset purely to add two fields.
 * 3. **Type inference comes free.** It needs to visit every value anyway (a metric is null
 *    on exactly the rows whose label is out of its scope, which can be a long run at the
 *    top of the frame), so it rides along with the transpose instead of being its own pass.
 *
 * Typing rules: a column that is null in *every* row becomes `string` — it has no values to
 * be wrong about, and `string` is the one type that stays groupable and never fails a cast.
 * An integer-looking column widens to `float` as soon as any row is fractional, so a metric
 * that happens to open on whole numbers is not truncated.
 *
 * @param {Object[]} rows - Export rows, as returned by `fetchQuantificationRows`.
 * @returns {{columns: Object.<string, Array>, schema: Object.<string, string>,
 *   columnNames: string[], swatchMetrics: Array}}
 */
export const buildColumnarTable = (rows) => {
    if (!rows || rows.length === 0) {
        return { columns: {}, schema: {}, columnNames: [], swatchMetrics: [] };
    }

    // The backend emits the same columns for every row (the metadata key list is a
    // dataset-wide union), so the first row defines the shape.
    const sourceKeys = Object.keys(rows[0]);
    const swatchMetrics = detectSwatchMetrics(sourceKeys);
    const total = rows.length;

    const columns = {};
    const schema = {};
    for (const key of sourceKeys) {
        columns[key] = new Array(total);
        schema[key] = null;
    }
    for (const metric of swatchMetrics) {
        columns[metric.key] = new Array(total);
        schema[metric.key] = "string";
    }

    for (let i = 0; i < total; i++) {
        const row = rows[i];

        for (let k = 0; k < sourceKeys.length; k++) {
            const key = sourceKeys[k];
            const value = row[key];
            columns[key][i] = value;

            // Once a column is float there is nothing left to learn about it.
            if (value === null || value === undefined || schema[key] === "float") continue;
            const type = perspectiveTypeOf(value);
            if (schema[key] === null) schema[key] = type;
            else if (schema[key] === "integer" && type === "float") schema[key] = "float";
        }

        for (const metric of swatchMetrics) {
            const [first, second, third] = metric.components;
            const a = row[first];
            const b = row[second];
            const c = row[third];
            // A colour is all-or-nothing: one missing channel and there is no colour to
            // show, so leave the cell empty rather than inventing a channel value.
            columns[metric.key][i] =
                typeof a === "number" && typeof b === "number" && typeof c === "number"
                    ? metric.toCss([a, b, c])
                    : null;
        }
    }

    for (const key of sourceKeys) {
        if (schema[key] === null) schema[key] = "string";
    }

    return { columns, schema, columnNames: Object.keys(schema), swatchMetrics };
};

/** Channels of a `rgb(r, g, b)` string, or null if it is not one. */
export const parseCssRgb = (css) => {
    const match = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(css || "");
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
};

/**
 * Black or white, whichever stays readable on `cssRgb`.
 *
 * The swatch cell paints the colour as its own background *and* keeps showing the value,
 * so the text has to adapt or half the palette becomes unreadable. Uses the WCAG relative
 * luminance rather than a naive channel average, because the eye is far more sensitive to
 * green than to blue and averaging flips the choice on saturated colours.
 */
export const readableTextColor = (cssRgb) => {
    const channels = parseCssRgb(cssRgb);
    if (!channels) return null;

    const linear = channels
        .map((channel) => channel / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    return luminance > 0.179 ? "#000000" : "#ffffff";
};

/**
 * The Perspective theme name to apply.
 *
 * Constant, and that is the point: `styles/perspectiveIquanaTheme.css` defines "Iquana"
 * entirely in terms of the app's design tokens, and those are already swapped by
 * `[data-theme]`. So the viewer follows the app between light and dark without being told
 * which one it is, and there is no second place where a colour has to be kept in sync.
 *
 * The argument is kept because the caller still has to re-apply the theme when the app
 * flips: the variables change underneath the viewer, but Perspective only re-reads its CSS
 * when the theme is (re-)applied.
 */
export const perspectiveTheme = () => "Iquana";

/**
 * Move each synthesized swatch column in front of the components it was built from.
 *
 * `buildColumnarTable` appends them, which puts them past the right edge of a table this
 * wide — the grid virtualizes columns, so an appended swatch is not merely off-screen but
 * never rendered until the user scrolls to the end looking for something they have no
 * reason to know is there. Next to its own R/G/B it reads as the heading for them.
 */
export const orderColumnsForDisplay = (columns) => {
    const ordered = [...columns];
    COLOR_SWATCH_METRICS.forEach((metric) => {
        const swatchAt = ordered.indexOf(metric.key);
        if (swatchAt === -1) return;
        const firstComponentAt = ordered.indexOf(metric.components[0]);
        if (firstComponentAt === -1) return;

        ordered.splice(swatchAt, 1);
        // Re-read the index: removing the swatch shifts everything after it left by one.
        ordered.splice(ordered.indexOf(metric.components[0]), 0, metric.key);
    });
    return ordered;
};

/**
 * The configuration the explorer opens with: the plain table, and the controls visible.
 *
 * Deliberately unpivoted and unfiltered — every column, one row per outline, exactly what
 * the CSV export contains. Anything else is a choice the person looking at it should make,
 * not one made for them before they have seen the data.
 *
 * `settings: true` is the part that is easy to leave out and expensive to miss. A
 * `<perspective-viewer>` opens with its config panel *closed*, which renders the group-by,
 * filter, aggregate and — most visibly — the plot-type selector invisible. The page then
 * looks like a plain grid with no charting at all, which is the opposite of the point: the
 * whole reason for adopting Perspective is that those controls exist and we do not
 * hand-roll them. Opening the panel is what makes the sixteen chart types discoverable.
 */
export const defaultViewerConfig = (columns, theme) => ({
    plugin: "Datagrid",
    columns: orderColumnsForDisplay(columns),
    group_by: [],
    split_by: [],
    aggregates: {},
    sort: [],
    filter: [],
    expressions: {},
    settings: true,
    theme,
});
