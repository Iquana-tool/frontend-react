import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Rotating palette so each scalar metric chart gets a distinct color without hard-coding
// which metrics exist.
const BAR_COLORS = ["#14b8a6", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#6366f1"];

const PLOT_TYPES = ["box", "violin", "bar"];
const PLOT_LABELS = { box: "Box", violin: "Violin", bar: "Bar" };

// --- shared SVG plot geometry ------------------------------------------------
const PLOT_W = 460;
const PLOT_H = 250;
const MARGIN = { top: 14, right: 12, bottom: 64, left: 48 };
const INNER_W = PLOT_W - MARGIN.left - MARGIN.right;
const INNER_H = PLOT_H - MARGIN.top - MARGIN.bottom;

// Format a numeric axis/tooltip value compactly.
const fmt = (v) => (typeof v === "number" ? (Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(3)) : "N/A");

// Collect the {labelId, label, stats} rows that have distribution stats for one metric.
const distRowsForMetric = (comparisonData, distributionData, metricKey) => {
  if (!distributionData) return [];
  const rows = [];
  comparisonData.forEach((d) => {
    const stats = distributionData?.[String(d.labelId)]?.[metricKey]?.["0"];
    if (stats && stats.count > 0) rows.push({ ...d, stats });
  });
  return rows;
};

// Build a linear value->pixel scale (y, inverted) over [min, max] with a little padding.
const makeYScale = (min, max) => {
  if (!(max > min)) {
    // Degenerate range: center the single value.
    const pad = Math.abs(max) || 1;
    min -= pad;
    max += pad;
  }
  const range = max - min;
  const lo = min - range * 0.05;
  const hi = max + range * 0.05;
  return {
    lo,
    hi,
    y: (v) => MARGIN.top + INNER_H - ((v - lo) / (hi - lo)) * INNER_H,
  };
};

// Y axis ticks (5 evenly spaced) + gridlines.
const AxisAndGrid = ({ scale }) => {
  const ticks = Array.from({ length: 5 }, (_, i) => scale.lo + ((scale.hi - scale.lo) * i) / 4);
  return (
    <g>
      {ticks.map((t, i) => {
        const y = scale.y(t);
        return (
          <g key={i}>
            <line x1={MARGIN.left} x2={MARGIN.left + INNER_W} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
            <text x={MARGIN.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#6b7280">
              {fmt(t)}
            </text>
          </g>
        );
      })}
    </g>
  );
};

// X-axis category labels (rotated so long label names fit).
const CategoryLabels = ({ rows, bandWidth }) => (
  <g>
    {rows.map((r, i) => {
      const cx = MARGIN.left + bandWidth * (i + 0.5);
      return (
        <text
          key={r.labelId}
          x={cx}
          y={MARGIN.top + INNER_H + 14}
          fontSize="10"
          fill="#374151"
          textAnchor="end"
          transform={`rotate(-45 ${cx} ${MARGIN.top + INNER_H + 14})`}
        >
          {r.label}
        </text>
      );
    })}
  </g>
);

// A distinct diamond marker for the MEAN so the average stays readable on box & violin.
const MeanMarker = ({ cx, cy, color }) => {
  const s = 5;
  return (
    <polygon
      points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
      fill="#111827"
      stroke={color}
      strokeWidth="1.5"
    >
      <title>Mean: {fmt(cy)}</title>
    </polygon>
  );
};

// One box-and-whisker per label from {min,q1,median,q3,max, whiskers, outliers, mean}.
const BoxPlot = ({ rows, color }) => {
  const allMin = Math.min(...rows.map((r) => r.stats.min));
  const allMax = Math.max(...rows.map((r) => r.stats.max));
  const scale = makeYScale(allMin, allMax);
  const band = INNER_W / rows.length;
  const boxW = Math.min(40, band * 0.5);

  return (
    <svg viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} width="100%" height={PLOT_H} role="img">
      <AxisAndGrid scale={scale} />
      {rows.map((r, i) => {
        const cx = MARGIN.left + band * (i + 0.5);
        const s = r.stats;
        const yQ1 = scale.y(s.q1);
        const yQ3 = scale.y(s.q3);
        const yMed = scale.y(s.median);
        const yWLow = scale.y(s.whisker_low);
        const yWHigh = scale.y(s.whisker_high);
        return (
          <g key={r.labelId}>
            {/* whiskers */}
            <line x1={cx} x2={cx} y1={yWHigh} y2={yQ3} stroke={color} />
            <line x1={cx} x2={cx} y1={yQ1} y2={yWLow} stroke={color} />
            <line x1={cx - boxW / 4} x2={cx + boxW / 4} y1={yWHigh} y2={yWHigh} stroke={color} />
            <line x1={cx - boxW / 4} x2={cx + boxW / 4} y1={yWLow} y2={yWLow} stroke={color} />
            {/* IQR box */}
            <rect
              x={cx - boxW / 2}
              y={Math.min(yQ1, yQ3)}
              width={boxW}
              height={Math.abs(yQ1 - yQ3) || 1}
              fill={color}
              fillOpacity="0.25"
              stroke={color}
            />
            {/* median line */}
            <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={yMed} y2={yMed} stroke={color} strokeWidth="2" />
            {/* outliers */}
            {(s.outliers || []).map((o, j) => (
              <circle key={j} cx={cx} cy={scale.y(o)} r="2" fill="none" stroke={color} />
            ))}
            {/* mean marker (distinct diamond) */}
            <MeanMarker cx={cx} cy={scale.y(s.mean)} color={color} />
          </g>
        );
      })}
      <CategoryLabels rows={rows} bandWidth={band} />
    </svg>
  );
};

// One mirrored KDE violin per label, with median and mean lines marked.
const ViolinPlot = ({ rows, color }) => {
  const allMin = Math.min(...rows.map((r) => r.stats.min));
  const allMax = Math.max(...rows.map((r) => r.stats.max));
  const scale = makeYScale(allMin, allMax);
  const band = INNER_W / rows.length;
  const halfW = Math.min(28, band * 0.42);

  return (
    <svg viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} width="100%" height={PLOT_H} role="img">
      <AxisAndGrid scale={scale} />
      {rows.map((r, i) => {
        const cx = MARGIN.left + band * (i + 0.5);
        const s = r.stats;
        // Prefer the KDE curve; fall back to the histogram; else a thin bar (mean only).
        const curve = s.kde
          ? s.kde.x.map((x, k) => ({ v: x, d: s.kde.density[k] }))
          : s.histogram
          ? s.histogram.counts.map((c, k) => ({
              v: (s.histogram.edges[k] + s.histogram.edges[k + 1]) / 2,
              d: c,
            }))
          : null;
        const maxD = curve ? Math.max(...curve.map((p) => p.d), 1e-9) : 1;
        let body = null;
        if (curve && curve.length > 1) {
          const right = curve.map((p) => `${cx + (p.d / maxD) * halfW},${scale.y(p.v)}`);
          const left = [...curve].reverse().map((p) => `${cx - (p.d / maxD) * halfW},${scale.y(p.v)}`);
          body = (
            <polygon
              points={[...right, ...left].join(" ")}
              fill={color}
              fillOpacity="0.25"
              stroke={color}
            />
          );
        }
        const yMed = scale.y(s.median);
        const yMean = scale.y(s.mean);
        return (
          <g key={r.labelId}>
            {body}
            {/* median line (solid), mean line (dashed) + diamond marker for readability */}
            <line x1={cx - halfW} x2={cx + halfW} y1={yMed} y2={yMed} stroke={color} strokeWidth="1.5" />
            <line
              x1={cx - halfW}
              x2={cx + halfW}
              y1={yMean}
              y2={yMean}
              stroke="#111827"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
            <MeanMarker cx={cx} cy={yMean} color={color} />
          </g>
        );
      })}
      <CategoryLabels rows={rows} bandWidth={band} />
    </svg>
  );
};

// Legacy mean bar chart (backward-compatible view; needs no distribution data).
const MeanBarChart = ({ comparisonData, metricKey, color }) => (
  <ResponsiveContainer width="100%" height={PLOT_H}>
    <BarChart data={comparisonData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
      <YAxis tick={{ fontSize: 11 }} />
      <Tooltip
        formatter={(value) => [value?.toFixed(4) || "N/A", "Mean"]}
        contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "4px" }}
      />
      <Bar dataKey={metricKey} fill={color} radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

// Generic comparison charts: one plot per SCALAR metric present in the summary
// (multi-component metrics like color are excluded upstream). A page-level toggle chooses
// Box (default) | Violin | Bar. Box/Violin read the server-computed `distributionData`
// ({labelId: {metricKey: {"0": {q1, median, q3, whiskers, outliers, kde, mean, ...}}}}),
// which the page fetches only when a distribution plot is active (bar stays cheap).
const ComparisonCharts = ({
  comparisonData,
  metricKeys = [],
  catalogMap = {},
  plotType = "box",
  onPlotTypeChange,
  distributionData = null,
  distributionLoading = false,
}) => {
  if (!comparisonData || comparisonData.length === 0 || metricKeys.length === 0) {
    return null;
  }

  const renderPlot = (metricKey, color) => {
    if (plotType === "bar") {
      return <MeanBarChart comparisonData={comparisonData} metricKey={metricKey} color={color} />;
    }
    if (distributionLoading) {
      return <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">Loading distribution…</div>;
    }
    const rows = distRowsForMetric(comparisonData, distributionData, metricKey);
    if (rows.length === 0) {
      return (
        <div className="h-[250px] flex items-center justify-center text-sm text-gray-400 text-center px-4">
          Not enough data for a distribution. Switch to Bar to see the mean.
        </div>
      );
    }
    return plotType === "violin" ? (
      <ViolinPlot rows={rows} color={color} />
    ) : (
      <BoxPlot rows={rows} color={color} />
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Metric Comparison Across Labels</h2>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden" role="group">
          {PLOT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onPlotTypeChange && onPlotTypeChange(t)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                plotType === t ? "bg-teal-500 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {PLOT_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metricKeys.map((metricKey, index) => {
          if (!comparisonData.some((d) => d[metricKey] !== undefined)) return null;
          const catalog = catalogMap[metricKey];
          const title = catalog?.name || metricKey;
          const color = BAR_COLORS[index % BAR_COLORS.length];
          return (
            <div key={metricKey}>
              <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
              {renderPlot(metricKey, color)}
            </div>
          );
        })}
      </div>
      {plotType !== "bar" && (
        <p className="text-[11px] text-gray-400 mt-3">
          Box/violin show the distribution per label. The mean is drawn as a diamond marker
          (median as a solid line) so the average stays readable.
        </p>
      )}
    </div>
  );
};

export default ComparisonCharts;
