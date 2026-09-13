import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { getLabelColor } from '../../../utils/labelColors';
import { formatMeasurement } from '../../../utils/perImageQuantification';

/** Row keys that identify the object rather than measure it — never a metric column. */
const IDENTITY_COLUMNS = new Set(['file_name', 'label', 'label_id', 'contour_id']);

/** Column keys carrying image metadata, which belongs to the image, not the object. */
const isMetadataColumn = (key) => key.startsWith('meta_');

/**
 * Turn a metric column key into a header.
 *
 * The server emits `<metric_key>` for a scalar and `<metric_key>_<component>` for a
 * multi-component one (`mean_color_rgb_r`), so the catalog cannot be looked up by the
 * column key directly. Longest-prefix match against the catalog recovers the display
 * name and keeps the component suffix visible.
 */
const headerFor = (column, catalogMap) => {
  const match = Object.keys(catalogMap || {})
    .filter((key) => column === key || column.startsWith(`${key}_`))
    .sort((a, b) => b.length - a.length)[0];
  if (!match) return column.replace(/_/g, ' ');
  const name = catalogMap[match]?.name || match;
  const suffix = column.slice(match.length).replace(/^_/, '');
  return suffix ? `${name} ${suffix}` : name;
};

const SortIcon = ({ active, direction }) => {
  if (!active) return null;
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown;
  return <Icon className="inline-block w-3 h-3 ml-1" />;
};

/**
 * Every measured object on one image, as a sortable table.
 *
 * These are the export rows — the same request the CSV download makes, scoped to this
 * image — so what is on screen and what comes out of "Export this image" cannot disagree.
 * That also means the columns follow the active profile: change the profile above and the
 * measurements change with it, no mapping in between.
 *
 * Selecting a row drives the canvas: this table is how an outlier in the numbers becomes
 * an object you can look at, which is the whole point of inspecting per image rather than
 * reading the dataset table.
 *
 * @param {Object} props
 * @param {Array<Object>} props.rows - Export rows for this image.
 * @param {Object} props.catalogMap - metric_key -> catalog entry, for column headers.
 * @param {number|null} props.selectedContourId
 * @param {Function} props.onSelectContour - Called with a contour id (or null).
 */
const ObjectsOnImageTable = ({ rows, catalogMap, selectedContourId, onSelectContour }) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ column: null, direction: 'desc' });

  // Derived from the rows rather than from the profile: the profile says which metrics
  // were asked for, the rows say which ones actually came back.
  const metricColumns = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return Object.keys(rows[0]).filter(
      (key) => !IDENTITY_COLUMNS.has(key) && !isMetadataColumn(key)
    );
  }, [rows]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? (rows || []).filter(
          (row) =>
            String(row.label || '').toLowerCase().includes(term) ||
            String(row.contour_id || '').includes(term)
        )
      : rows || [];

    if (!sort.column) return filtered;
    const factor = sort.direction === 'asc' ? 1 : -1;
    // Copied before sorting: `rows` is state owned by the page, and sorting it in place
    // would mutate what the export and the canvas selection are indexed against.
    return [...filtered].sort((a, b) => {
      const left = a[sort.column];
      const right = b[sort.column];
      // Nulls last in both directions — a missing measurement is not a small one, and
      // letting it sort as one puts out-of-scope objects at the top of "smallest first".
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor;
      return String(left).localeCompare(String(right)) * factor;
    });
  }, [rows, search, sort]);

  const toggleSort = (column) => {
    setSort((current) =>
      current.column === column
        ? { column, direction: current.direction === 'desc' ? 'asc' : 'desc' }
        : { column, direction: 'desc' }
    );
  };

  if (!rows || rows.length === 0) return null;

  return (
    <div className="bg-p1 rounded-lg border border-ln overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ln">
        <h3 className="text-sm font-semibold text-t1">
          Objects on this image{' '}
          <span className="ml-1 px-2 py-0.5 rounded-full bg-well text-t2 text-xs font-normal">
            {rows.length}
          </span>
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-t3" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search objects…"
            aria-label="Search objects"
            className="pl-8 pr-3 py-1.5 text-sm bg-well border border-ln rounded-lg text-t1 placeholder:text-t3 focus:outline-none focus:ring-1 focus:ring-ac"
          />
        </div>
      </div>

      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-p1 z-10">
            <tr className="border-b border-ln text-t3 text-xs uppercase tracking-wide">
              <th className="px-4 py-2 text-left font-medium w-10">#</th>
              <th className="px-4 py-2 text-left font-medium">Object</th>
              <th
                className="px-4 py-2 text-left font-medium cursor-pointer hover:text-t2"
                onClick={() => toggleSort('label')}
              >
                Label
                <SortIcon active={sort.column === 'label'} direction={sort.direction} />
              </th>
              {metricColumns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-2 text-right font-medium cursor-pointer hover:text-t2 whitespace-nowrap"
                  onClick={() => toggleSort(column)}
                >
                  {headerFor(column, catalogMap)}
                  <SortIcon active={sort.column === column} direction={sort.direction} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const selected = row.contour_id === selectedContourId;
              return (
                <tr
                  key={row.contour_id}
                  onClick={() => onSelectContour?.(selected ? null : row.contour_id)}
                  className={`border-b border-ln cursor-pointer transition-colors ${
                    selected ? 'bg-acS' : 'hover:bg-hv'
                  }`}
                >
                  <td className="px-4 py-2 text-t3 tabular-nums">{index + 1}</td>
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: getLabelColor(row.label_id) }}
                      />
                      <span className="text-t1 font-medium">#{row.contour_id}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2 text-t2">{row.label}</td>
                  {metricColumns.map((column) => (
                    <td key={column} className="px-4 py-2 text-right text-t2 tabular-nums">
                      {typeof row[column] === 'number'
                        ? formatMeasurement(row[column], { digits: 4 })
                        : row[column] ?? '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-ln text-xs text-t3">
        <span>
          Showing {visibleRows.length} of {rows.length}
        </span>
        <span>Rows and columns follow the active profile, as in the CSV export</span>
      </div>
    </div>
  );
};

export default ObjectsOnImageTable;
