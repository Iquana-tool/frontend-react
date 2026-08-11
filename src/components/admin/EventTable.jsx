import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2, Trash2, X } from 'lucide-react';
import {
  COMPONENTS,
  COMPONENT_META,
  formatDuration,
  formatPayload,
  formatUtc,
} from '../../utils/telemetry';

const inputClass =
  'px-2 py-1.5 text-sm bg-p1 border border-ln2 rounded-lg text-t1 placeholder:text-t3 ' +
  'focus:outline-none focus:ring-2 focus:ring-ac';

/** Filters, the event table itself, paging, and the two data-export actions. */
const EventTable = ({
  events,
  total,
  loading,
  busy,
  filters,
  limit,
  offset,
  onFilterChange,
  onPage,
  onExport,
  onPurge,
}) => {
  // Purge confirms inline rather than in a modal: the row it will affect is the
  // filter shown right above it, and a modal would cover exactly that context.
  const [confirmingPurge, setConfirmingPurge] = useState(false);

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const scoped = Boolean(filters.session_id || filters.username || filters.start || filters.end);

  return (
    <section className="bg-p1 border border-ln rounded-xl overflow-hidden">
      <header className="px-4 py-3 border-b border-ln flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-t1 mr-auto">Events</h2>

        <button
          type="button"
          onClick={() => onExport('jsonl')}
          disabled={busy === 'export:jsonl' || total === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-hv hover:bg-hv2
            text-t2 hover:text-t1 transition-colors duration-150 motion-reduce:transition-none
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ac
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === 'export:jsonl'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />}
          JSONL
        </button>
        <button
          type="button"
          onClick={() => onExport('csv')}
          disabled={busy === 'export:csv' || total === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-hv hover:bg-hv2
            text-t2 hover:text-t1 transition-colors duration-150 motion-reduce:transition-none
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ac
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === 'export:csv'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />}
          CSV
        </button>

        {confirmingPurge ? (
          <span className="inline-flex items-center gap-2 pl-2">
            <span className="text-sm text-t2">
              Delete {scoped ? `these ${total}` : `all ${total}`} events?
            </span>
            <button
              type="button"
              onClick={() => { setConfirmingPurge(false); onPurge(); }}
              disabled={busy === 'purge'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                bg-err text-onAccent hover:brightness-110 transition-colors duration-150
                motion-reduce:transition-none focus:outline-none focus-visible:ring-2
                focus-visible:ring-err disabled:opacity-60"
            >
              {busy === 'purge' && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmingPurge(false)}
              className="p-1.5 rounded-lg text-t3 hover:text-t1 hover:bg-hv
                transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus-visible:ring-2 focus-visible:ring-ac"
              aria-label="Cancel delete"
            >
              <X className="w-4 h-4" />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingPurge(true)}
            disabled={total === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
              text-t3 hover:text-err hover:bg-errBg transition-colors duration-150
              motion-reduce:transition-none focus:outline-none focus-visible:ring-2
              focus-visible:ring-err disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </header>

      <div className="px-4 py-3 border-b border-ln flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-t2">User</span>
          <input
            type="text"
            value={filters.username || ''}
            onChange={(e) => onFilterChange({ username: e.target.value })}
            placeholder="any"
            className={`${inputClass} w-32`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-t2">Component</span>
          <select
            value={filters.component || ''}
            onChange={(e) => onFilterChange({ component: e.target.value })}
            className={`${inputClass} w-36`}
          >
            <option value="">All</option>
            {COMPONENTS.map((name) => (
              <option key={name} value={name}>{COMPONENT_META[name].label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-t2">From (UTC)</span>
          <input
            type="datetime-local"
            value={filters.start || ''}
            onChange={(e) => onFilterChange({ start: e.target.value })}
            className={`${inputClass} w-52`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-t2">To (UTC)</span>
          <input
            type="datetime-local"
            value={filters.end || ''}
            onChange={(e) => onFilterChange({ end: e.target.value })}
            className={`${inputClass} w-52`}
          />
        </label>

        {filters.session_id && (
          <button
            type="button"
            onClick={() => onFilterChange({ session_id: '' })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm
              bg-acS text-ac border border-acLn hover:brightness-105
              transition-colors duration-150 motion-reduce:transition-none
              focus:outline-none focus-visible:ring-2 focus-visible:ring-ac"
          >
            <span className="font-mono text-xs">{filters.session_id.slice(0, 8)}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-well text-t2">
            <tr>
              <th className="text-left font-medium px-4 py-2.5 whitespace-nowrap">Time (UTC)</th>
              <th className="text-left font-medium px-4 py-2.5">Component</th>
              <th className="text-left font-medium px-4 py-2.5">Event</th>
              <th className="text-left font-medium px-4 py-2.5">User</th>
              <th className="text-right font-medium px-4 py-2.5 whitespace-nowrap">Duration</th>
              <th className="text-left font-medium px-4 py-2.5">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ln">
            {loading ? (
              [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <tr key={i} aria-hidden="true">
                  <td className="px-4 py-2.5" colSpan={6}>
                    <div className="h-4 rounded bg-well animate-pulse motion-reduce:animate-none" />
                  </td>
                </tr>
              ))
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-sm text-t2">No events match these filters.</p>
                  <p className="mt-1 text-sm text-t3">
                    {scoped
                      ? 'Widen the filters, or clear them to see everything captured.'
                      : 'Start capture above, then use the tool in another tab. Frontend events arrive within about five seconds.'}
                  </p>
                </td>
              </tr>
            ) : (
              events.map((event) => {
                const meta = COMPONENT_META[event.component];
                const Icon = meta?.Icon;
                return (
                  <tr key={event.event_id} className="hover:bg-hv transition-colors duration-150 motion-reduce:transition-none">
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-t2">
                      {formatUtc(event.ts)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-t2">
                        {Icon && <Icon className="w-3.5 h-3.5 text-t3" />}
                        {meta?.label || event.component}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-t1 whitespace-nowrap">
                      {event.event_type}
                    </td>
                    <td className="px-4 py-2.5 text-t2 whitespace-nowrap">
                      {event.username || <span className="text-t3">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap text-t2 tabular-nums">
                      {formatDuration(event.duration_ms)}
                    </td>
                    <td className="px-4 py-2.5 text-t3 font-mono text-xs max-w-md truncate"
                        title={formatPayload(event.payload)}>
                      {formatPayload(event.payload)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <footer className="px-4 py-3 border-t border-ln flex items-center justify-between gap-3">
        <p className="text-xs text-t3">
          {loading ? 'Loading…' : total === 0 ? 'No events' : `${from}–${to} of ${total}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(-1)}
            disabled={offset === 0 || loading}
            className="p-1.5 rounded-lg text-t2 hover:text-t1 hover:bg-hv transition-colors
              duration-150 motion-reduce:transition-none focus:outline-none
              focus-visible:ring-2 focus-visible:ring-ac
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onPage(1)}
            disabled={to >= total || loading}
            className="p-1.5 rounded-lg text-t2 hover:text-t1 hover:bg-hv transition-colors
              duration-150 motion-reduce:transition-none focus:outline-none
              focus-visible:ring-2 focus-visible:ring-ac
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </section>
  );
};

export default EventTable;
