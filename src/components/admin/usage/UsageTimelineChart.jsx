import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import useThemeColors from '../../../hooks/useThemeColors';
import { formatHours, timelineSeries } from '../../../utils/usageStats';

/**
 * Categorical series colours, one set per theme. Not the annotation class palette:
 * that one is tuned for label overlays and fails colour-blind separation and the
 * dark-surface lightness band as chart fills. These six slots were checked against
 * this app's panel surfaces (#ffffff light, #151b23 dark) for both. Slots are
 * assigned in order and never cycled -- `timelineSeries` caps the count at six.
 */
const SERIES_COLORS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
};

const TimelineTooltip = ({ active, payload, label, colors }) => {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value > 0);
  const total = rows.reduce((sum, p) => sum + p.value, 0);
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-sm"
      style={{ backgroundColor: colors.p2, border: `1px solid ${colors.ln}`, color: colors.t1 }}
    >
      <p className="font-semibold mb-1">{label}</p>
      {rows.length === 0 && <p style={{ color: colors.t3 }}>No page time recorded</p>}
      {rows.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 tabular-nums">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} aria-hidden="true" />
          <span style={{ color: colors.t2 }}>{p.dataKey}</span>
          <span className="ml-auto pl-3">{formatHours(p.value * 60000)}</span>
        </p>
      ))}
      {rows.length > 1 && (
        <p className="mt-1 pt-1 tabular-nums" style={{ borderTop: `1px solid ${colors.ln}` }}>
          Total <span className="float-right pl-3">{formatHours(total * 60000)}</span>
        </p>
      )}
    </div>
  );
};

/**
 * Legend in series order (busiest first, bottom of the stack first). Recharts'
 * default sorts alphabetically and paints the text in the series colour; here the
 * swatch carries the colour and the label stays in a text colour.
 */
const SeriesLegend = ({ series, palette }) => (
  <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs text-t2">
    {series.map((name, index) => (
      <li key={name} className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: palette[index] }} aria-hidden="true" />
        {name}
      </li>
    ))}
  </ul>
);

/**
 * Time on each workflow per day, stacked, with a table of the same numbers
 * underneath for readers who cannot rely on the colours.
 *
 * @param {Object} props
 * @param {Array<{date: string, workflows: Object<string, number>}>} props.timeline
 */
const UsageTimelineChart = ({ timeline }) => {
  const { colors, theme } = useThemeColors();
  const { series, rows } = useMemo(() => timelineSeries(timeline), [timeline]);
  const palette = SERIES_COLORS[theme === 'light' ? 'light' : 'dark'];

  if (!series.length) {
    return <p className="text-sm text-t3 py-2">No page time recorded in this window.</p>;
  }

  return (
    <div>
      <div className="h-64" role="img" aria-label="Minutes per workflow per day; the same numbers are in the table below.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={colors.ln} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.t2 }} tickLine={false}
              axisLine={{ stroke: colors.ln }} />
            <YAxis tick={{ fontSize: 11, fill: colors.t2 }} tickLine={false} axisLine={false}
              allowDecimals={false} unit=" m" />
            <Tooltip cursor={{ fill: colors.hv }} content={<TimelineTooltip colors={colors} />} />
            <Legend content={() => <SeriesLegend series={series} palette={palette} />} />
            {series.map((name, index) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="time"
                fill={palette[index]}
                // A thin surface-coloured outline separates stacked segments.
                stroke={colors.p1}
                strokeWidth={1}
                radius={index === series.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={36}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-t2 hover:text-t1 select-none">Show as table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-t3 text-left">
                <th className="py-1 pr-3 font-medium">Day</th>
                {series.map((name) => (
                  <th key={name} className="py-1 pr-3 font-medium text-right">{name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ln">
              {rows.map((row) => (
                <tr key={row.date} className="text-t2">
                  <td className="py-1 pr-3 text-t1">{row.date}</td>
                  {series.map((name) => (
                    <td key={name} className="py-1 pr-3 text-right">
                      {row[name] ? formatHours(row[name] * 60000) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

export default UsageTimelineChart;
