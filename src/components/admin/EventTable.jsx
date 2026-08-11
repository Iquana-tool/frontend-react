import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import {
  COMPONENTS,
  COMPONENT_META,
  formatDuration,
  formatPayload,
  formatPayloadPretty,
  formatUtc,
} from '../../utils/telemetry';
import PurgeEventsModal from './PurgeEventsModal';

/**
 * Copies `text` on click and shows a brief confirmation instead of relying on
 * the button's own label to change -- useful in a table row where a relabel
 * would reflow neighbouring cells.
 */
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs
        bg-hv hover:bg-hv2 text-t2 hover:text-t1 transition-colors duration-150
        motion-reduce:transition-none focus:outline-none focus-visible:ring-2
        focus-visible:ring-ac"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-ok" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

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
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  // Which row's full detail is open. A native `title` tooltip used to be the
  // only way to read a long event_type/username/payload: it wraps at a fixed
  // width regardless of word boundaries (so "study-logs" split mid-word), has
  // no selection or copy, and vanishes the moment the mouse leaves it. This is
  // an in-page panel instead, so the content can be read and copied normally.
  const [expandedId, setExpandedId] = useState(null);

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const scoped = Boolean(filters.session_id || filters.username || filters.component
    || filters.start || filters.end);

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

        <button
          type="button"
          onClick={() => setPurgeModalOpen(true)}
          disabled={total === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
            text-t3 hover:text-err hover:bg-errBg transition-colors duration-150
            motion-reduce:transition-none focus:outline-none focus-visible:ring-2
            focus-visible:ring-err disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </header>

      <PurgeEventsModal
        isOpen={purgeModalOpen}
        total={total}
        filters={filters}
        busy={busy}
        onExport={onExport}
        onCancel={() => setPurgeModalOpen(false)}
        onConfirm={() => { setPurgeModalOpen(false); onPurge(); }}
      />

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
        {/* table-fixed plus explicit widths on every column but the last: without
            it, `max-w-*`/`truncate` on a <td> are no-ops -- an auto-layout table
            grows a column to fit its longest cell regardless, so the payload
            column was never actually being clipped by CSS, just cut off by the
            container's right edge with no ellipsis and no way to see the rest. */}
        <table className="w-full text-sm table-fixed">
          <thead className="bg-well text-t2">
            <tr>
              <th className="w-40 text-left font-medium px-4 py-2.5 whitespace-nowrap">Time (UTC)</th>
              <th className="w-32 text-left font-medium px-4 py-2.5">Component</th>
              <th className="w-44 text-left font-medium px-4 py-2.5">Event</th>
              <th className="w-24 text-left font-medium px-4 py-2.5">User</th>
              <th className="w-20 text-right font-medium px-4 py-2.5 whitespace-nowrap">Duration</th>
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
                const expanded = expandedId === event.event_id;
                const toggle = () => setExpandedId(expanded ? null : event.event_id);
                return (
                  <React.Fragment key={event.event_id}>
                    <tr
                      onClick={toggle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
                      }}
                      tabIndex={0}
                      aria-expanded={expanded}
                      aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${event.event_type}`}
                      className={`cursor-pointer transition-colors duration-150
                        motion-reduce:transition-none focus:outline-none focus-visible:ring-2
                        focus-visible:ring-inset focus-visible:ring-ac
                        ${expanded ? 'bg-hv' : 'hover:bg-hv'}`}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-t2">
                        {formatUtc(event.ts)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-t2">
                          {Icon && <Icon className="w-3.5 h-3.5 text-t3" />}
                          {meta?.label || event.component}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-t1 truncate">
                        {event.event_type}
                      </td>
                      <td className="px-4 py-2.5 text-t2 truncate">
                        {event.username || <span className="text-t3">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap text-t2 tabular-nums">
                        {formatDuration(event.duration_ms)}
                      </td>
                      <td className="px-4 py-2.5 text-t3 font-mono text-xs">
                        <span className="flex items-center gap-1.5">
                          <ChevronDown
                            className={`w-3.5 h-3.5 shrink-0 text-t3 transition-transform
                              duration-150 motion-reduce:transition-none
                              ${expanded ? 'rotate-180' : ''}`}
                          />
                          <span className="truncate">{formatPayload(event.payload)}</span>
                        </span>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-well">
                        <td colSpan={6} className="px-4 py-4">
                          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 mb-3 text-xs">
                            <div>
                              <dt className="text-t3">Event</dt>
                              <dd className="text-t1 font-medium break-all">{event.event_type}</dd>
                            </div>
                            <div>
                              <dt className="text-t3">User</dt>
                              <dd className="text-t1 break-all">{event.username || '—'}</dd>
                            </div>
                            <div>
                              <dt className="text-t3">Session</dt>
                              <dd className="text-t1 break-all">{event.session_id || '—'}</dd>
                            </div>
                            <div>
                              <dt className="text-t3">Event ID</dt>
                              <dd className="text-t1 break-all">{event.event_id}</dd>
                            </div>
                          </dl>

                          {event.payload && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium text-t2">Payload</span>
                                <CopyButton text={formatPayloadPretty(event.payload)} />
                              </div>
                              <pre className="text-xs font-mono text-t1 bg-p1 border border-ln
                                rounded-lg p-3 max-h-64 overflow-auto whitespace-pre-wrap break-all">
                                {formatPayloadPretty(event.payload)}
                              </pre>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
