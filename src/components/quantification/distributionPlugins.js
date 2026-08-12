/**
 * Box-plot and violin plugins for `<perspective-viewer>`.
 *
 * Perspective ships sixteen chart types and none of them is a distribution plot; there is
 * no plugin registry and no third-party one to install, so this is the way to get them
 * without standing a second charting stack up beside the viewer. Registered here, they
 * appear in the viewer's own plugin menu next to Datagrid and Y Bar, inherit its theme, and
 * — the reason it is worth doing at all — are filtered and sorted by the same controls as
 * every other view.
 *
 * **Why two column slots rather than `group_by`.** A box plot needs the values themselves,
 * not a summary of them: quartiles cannot be recovered from a mean. Perspective's
 * `group_by` aggregates server-side and would hand this plugin one row per group with the
 * distribution already thrown away. Declaring `config_column_names` instead gives the
 * plugin the raw rows for two columns — the same arrangement X/Y Scatter uses — and the
 * grouping happens here, over values that still exist.
 *
 * Statistics come from `utils/distributionStats`, which reproduces the backend's numbers
 * deliberately; see the note there.
 */
import {
    distributionStats,
    groupedDistributions,
} from "../../utils/distributionStats";

const SVG_NS = "http://www.w3.org/2000/svg";
/** Room for the value axis and the category labels. */
const MARGIN = { top: 16, right: 16, bottom: 44, left: 64 };
/** Beyond this, per-row work stops being worth it and the plot is unreadable anyway. */
const MAX_ROWS = 500000;

const el = (name, attrs = {}) => {
    const node = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    return node;
};

/** Read a themed colour off the host, so the plots follow the active Perspective theme. */
const themeColor = (styles, variable, fallback) =>
    styles.getPropertyValue(variable).trim() || fallback;

/** A "nice" tick step for a value axis, in the 1/2/5 x 10^n family. */
const niceStep = (span, target = 5) => {
    if (!(span > 0)) return 1;
    const raw = span / target;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const normalised = raw / magnitude;
    const step = normalised >= 5 ? 10 : normalised >= 2 ? 5 : normalised >= 1 ? 2 : 1;
    return step * magnitude;
};

const formatTick = (value) => {
    const magnitude = Math.abs(value);
    if (magnitude !== 0 && (magnitude < 1e-3 || magnitude >= 1e6)) return value.toExponential(1);
    return Number(value.toFixed(3)).toLocaleString();
};

/**
 * Shared base: pull two columns out of the view, group them, and hand the summaries to a
 * subclass to draw. Subclasses implement `drawGroup`, and say whether they need a KDE.
 */
class DistributionPluginBase extends HTMLElement {
    /** Whether this plot needs a density curve — box plots do not, and it is not cheap. */
    static needsDensity = false;

    constructor() {
        super();
        this._summaries = null;
        this._valueLabel = "";
        this._groupLabel = "";
        this._truncated = 0;
    }

    async draw(view) {
        await this._read(view);
        this._render();
    }

    async update(view) {
        await this._read(view);
        this._render();
    }

    async resize() {
        // Geometry only; the summaries are still valid. Skipped while hidden, per the host
        // contract — a plugin in an inactive panel has no box to lay out against.
        if (this.offsetParent !== null) this._render();
    }

    async restyle() {
        // Colours come from CSS custom properties read at paint time, so a theme change is
        // just a repaint.
        this._render();
    }

    async clear() {
        this._summaries = null;
        this.innerHTML = "";
    }

    save() {
        return {};
    }

    restore() {}

    delete() {}

    /** Pull the two configured columns and summarise them. */
    async _read(view) {
        // Slot order is the order of the viewer's `columns` config, which is the order
        // `to_columns()` returns its keys in.
        const columns = await view.to_columns();
        const names = Object.keys(columns);
        if (names.length < 2) {
            this._summaries = null;
            return;
        }

        const [groupName, valueName] = names;
        let groups = columns[groupName] ?? [];
        let values = columns[valueName] ?? [];
        this._truncated = 0;
        if (values.length > MAX_ROWS) {
            this._truncated = values.length - MAX_ROWS;
            groups = groups.slice(0, MAX_ROWS);
            values = values.slice(0, MAX_ROWS);
        }

        this._groupLabel = groupName;
        this._valueLabel = valueName;
        this._summaries = groupedDistributions(
            groups,
            values,
            this.constructor.needsDensity
        );
    }

    _render() {
        this.innerHTML = "";
        const summaries = this._summaries;
        const width = this.clientWidth;
        const height = this.clientHeight;
        if (!summaries || summaries.length === 0 || width === 0 || height === 0) {
            if (summaries && summaries.length === 0) this._renderMessage("No data to plot.");
            return;
        }

        const styles = getComputedStyle(this);
        const ink = themeColor(styles, "--psp--color", "#000");
        const line = themeColor(styles, "--psp-charts--gridline--color", "#ccc");
        const axis = themeColor(styles, "--psp-charts--axis-ticks--color", "#888");
        const series = (index) =>
            themeColor(
                styles,
                `--psp-charts--series-${(index % 10) + 1}--color`,
                "#3b82f6"
            );

        const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
        const plotHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 1);

        // The value axis has to cover the whiskers *and* the plotted outliers, or points
        // land outside the frame.
        let low = Infinity;
        let high = -Infinity;
        for (const { stats } of summaries) {
            low = Math.min(low, stats.whiskerLow, ...stats.outliers);
            high = Math.max(high, stats.whiskerHigh, ...stats.outliers);
        }
        if (!(high > low)) {
            high = low + 1;
            low -= 1;
        }
        const pad = (high - low) * 0.05;
        low -= pad;
        high += pad;

        const y = (value) => MARGIN.top + plotHeight * (1 - (value - low) / (high - low));
        const band = plotWidth / summaries.length;

        const svg = el("svg", {
            width,
            height,
            viewBox: `0 0 ${width} ${height}`,
            style: "display:block",
        });

        // Value axis: gridlines and labels.
        const step = niceStep(high - low);
        const first = Math.ceil(low / step) * step;
        for (let value = first; value <= high; value += step) {
            const at = y(value);
            svg.appendChild(
                el("line", {
                    x1: MARGIN.left, x2: width - MARGIN.right, y1: at, y2: at,
                    stroke: line, "stroke-width": 1,
                })
            );
            const label = el("text", {
                x: MARGIN.left - 8, y: at + 4, "text-anchor": "end",
                fill: axis, "font-size": 11,
            });
            label.textContent = formatTick(value);
            svg.appendChild(label);
        }

        summaries.forEach(({ group, stats }, index) => {
            const centre = MARGIN.left + band * (index + 0.5);
            const groupNode = el("g");
            this.drawGroup(groupNode, {
                stats, centre, band, y, color: series(index), ink,
            });

            // Category label, angled when the bands get narrow.
            const label = el("text", {
                x: centre, y: height - MARGIN.bottom + 16,
                "text-anchor": band < 60 ? "end" : "middle",
                fill: axis, "font-size": 11,
                ...(band < 60
                    ? { transform: `rotate(-40 ${centre} ${height - MARGIN.bottom + 16})` }
                    : {}),
            });
            label.textContent = group;
            const title = el("title");
            title.textContent =
                `${group}\nn = ${stats.count.toLocaleString()}\n` +
                `median ${formatTick(stats.median)}\n` +
                `q1 ${formatTick(stats.q1)}  q3 ${formatTick(stats.q3)}\n` +
                `mean ${formatTick(stats.mean)}\n` +
                `outliers ${stats.outlierCount.toLocaleString()}`;
            groupNode.appendChild(title);
            svg.appendChild(groupNode);
            svg.appendChild(label);
        });

        // Axis captions, so a plot read on its own still says what it shows.
        const valueCaption = el("text", {
            x: 12, y: MARGIN.top + plotHeight / 2, fill: axis, "font-size": 11,
            "text-anchor": "middle",
            transform: `rotate(-90 12 ${MARGIN.top + plotHeight / 2})`,
        });
        valueCaption.textContent = this._valueLabel;
        svg.appendChild(valueCaption);

        if (this._truncated > 0) {
            const note = el("text", {
                x: width - MARGIN.right, y: MARGIN.top - 4, "text-anchor": "end",
                fill: axis, "font-size": 10,
            });
            note.textContent = `first ${MAX_ROWS.toLocaleString()} rows`;
            svg.appendChild(note);
        }

        this.appendChild(svg);
    }

    _renderMessage(text) {
        const node = document.createElement("div");
        node.style.cssText =
            "display:flex;align-items:center;justify-content:center;height:100%;font:12px sans-serif;opacity:0.6";
        node.textContent = text;
        this.appendChild(node);
    }
}

/** Box-and-whisker: the five-number summary, with outliers as points and the mean marked. */
class BoxPlotElement extends DistributionPluginBase {
    static needsDensity = false;

    get_static_config() {
        return {
            name: "Box Plot",
            category: "Distribution",
            config_column_names: ["Group", "Value"],
            min_config_columns: 2,
            max_columns: 2,
        };
    }

    drawGroup(node, { stats, centre, band, y, color, ink }) {
        const boxWidth = Math.min(band * 0.6, 60);
        const left = centre - boxWidth / 2;
        const top = y(stats.q3);
        const bottom = y(stats.q1);

        // Whiskers, with caps.
        node.appendChild(el("line", {
            x1: centre, x2: centre, y1: y(stats.whiskerHigh), y2: top,
            stroke: color, "stroke-width": 1,
        }));
        node.appendChild(el("line", {
            x1: centre, x2: centre, y1: bottom, y2: y(stats.whiskerLow),
            stroke: color, "stroke-width": 1,
        }));
        for (const value of [stats.whiskerLow, stats.whiskerHigh]) {
            node.appendChild(el("line", {
                x1: centre - boxWidth / 4, x2: centre + boxWidth / 4,
                y1: y(value), y2: y(value), stroke: color, "stroke-width": 1,
            }));
        }

        node.appendChild(el("rect", {
            x: left, y: top, width: boxWidth, height: Math.max(bottom - top, 1),
            fill: color, "fill-opacity": 0.28, stroke: color, "stroke-width": 1.5,
        }));

        // Median sits on top of the fill at full strength — it is the number people read.
        node.appendChild(el("line", {
            x1: left, x2: left + boxWidth, y1: y(stats.median), y2: y(stats.median),
            stroke: color, "stroke-width": 2.5,
        }));

        // The mean as a diamond, so it stays distinguishable from the median line.
        const meanY = y(stats.mean);
        const r = 4;
        node.appendChild(el("polygon", {
            points: `${centre},${meanY - r} ${centre + r},${meanY} ${centre},${meanY + r} ${centre - r},${meanY}`,
            fill: ink, "fill-opacity": 0.75,
        }));

        for (const value of stats.outliers) {
            node.appendChild(el("circle", {
                cx: centre, cy: y(value), r: 1.8,
                fill: color, "fill-opacity": 0.55,
            }));
        }
    }
}

/** Violin: a mirrored kernel density curve, with the median and mean marked. */
class ViolinPlotElement extends DistributionPluginBase {
    static needsDensity = true;

    get_static_config() {
        return {
            name: "Violin",
            category: "Distribution",
            config_column_names: ["Group", "Value"],
            min_config_columns: 2,
            max_columns: 2,
        };
    }

    drawGroup(node, { stats, centre, band, y, color, ink }) {
        const half = Math.min(band * 0.42, 50);

        if (stats.kde) {
            const peak = Math.max(...stats.kde.density) || 1;
            const right = [];
            const left = [];
            stats.kde.x.forEach((value, i) => {
                const at = y(value);
                const spread = (stats.kde.density[i] / peak) * half;
                right.push(`${centre + spread},${at}`);
                left.unshift(`${centre - spread},${at}`);
            });
            node.appendChild(el("polygon", {
                points: [...right, ...left].join(" "),
                fill: color, "fill-opacity": 0.32, stroke: color, "stroke-width": 1.5,
            }));
        } else {
            // No spread: a violin would be a spike, so show the single value as a tick
            // rather than drawing nothing and looking like missing data.
            node.appendChild(el("line", {
                x1: centre - half / 2, x2: centre + half / 2,
                y1: y(stats.median), y2: y(stats.median),
                stroke: color, "stroke-width": 2,
            }));
        }

        node.appendChild(el("line", {
            x1: centre - half / 2, x2: centre + half / 2,
            y1: y(stats.median), y2: y(stats.median),
            stroke: ink, "stroke-width": 2, "stroke-opacity": 0.85,
        }));
        node.appendChild(el("line", {
            x1: centre - half / 2, x2: centre + half / 2,
            y1: y(stats.mean), y2: y(stats.mean),
            stroke: ink, "stroke-width": 1.5, "stroke-dasharray": "3 2", "stroke-opacity": 0.7,
        }));
    }
}

let registered = false;

/**
 * Define and register both plugins.
 *
 * Must run before any `<perspective-viewer>` is instantiated — the host freezes its plugin
 * list at that point — which is why the engine module calls this at import time.
 */
export const registerDistributionPlugins = () => {
    if (registered) return;
    registered = true;

    customElements.define("perspective-viewer-box-plot", BoxPlotElement);
    customElements.define("perspective-viewer-violin", ViolinPlotElement);

    const Viewer = customElements.get("perspective-viewer");
    Viewer.registerPlugin("perspective-viewer-box-plot");
    Viewer.registerPlugin("perspective-viewer-violin");
};

export { BoxPlotElement, ViolinPlotElement, niceStep };
