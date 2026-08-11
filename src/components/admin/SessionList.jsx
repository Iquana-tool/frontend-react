import React from 'react';
import { User } from 'lucide-react';
import { formatSpan, formatUtc } from '../../utils/telemetry';

/**
 * The index a study runner works from: one row per captured session, newest
 * first. Selecting a row filters the event table to that session, which is the
 * question this page exists to answer ("what did that participant actually do?").
 */
const SessionList = ({ sessions, loading, selectedId, onSelect }) => (
  <section className="bg-p1 border border-ln rounded-xl overflow-hidden flex flex-col">
    <header className="px-4 py-3 border-b border-ln flex items-baseline justify-between gap-2">
      <h2 className="text-sm font-semibold text-t1">Sessions</h2>
      {!loading && (
        <span className="text-xs text-t3">{sessions.length}</span>
      )}
    </header>

    {loading ? (
      <ul className="p-2 space-y-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="h-14 rounded-lg bg-well animate-pulse motion-reduce:animate-none" />
        ))}
      </ul>
    ) : sessions.length === 0 ? (
      <p className="px-4 py-8 text-sm text-t3 text-center">
        No sessions yet. One appears as soon as someone uses the tool while capture is on.
      </p>
    ) : (
      <ul className="divide-y divide-ln max-h-[28rem] overflow-y-auto">
        {sessions.map((session) => {
          const id = session.session_id;
          // Backend events carry no session id, so `id` is null for that group.
          // Without the guard `null === null` would render every such row as the
          // selected one whenever nothing is selected.
          const selected = Boolean(id) && id === selectedId;
          return (
            <li key={`${id || 'none'}:${session.username || 'anon'}`}>
              <button
                type="button"
                onClick={() => onSelect(selected ? null : id)}
                aria-pressed={selected}
                disabled={!id}
                // The visible content is four separate spans of ids and counts,
                // which reads as noise; state the row's meaning instead.
                aria-label={
                  id
                    ? `Session ${id.slice(0, 8)} by ${session.username || 'an anonymous user'}, `
                      + `${session.event_count} events`
                    : `${session.event_count} events with no session id`
                }
                className={`w-full text-left px-4 py-3 transition-colors duration-150
                  motion-reduce:transition-none focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-ac focus-visible:-ring-offset-1
                  disabled:cursor-default ${
                    selected ? 'bg-acS' : 'hover:bg-hv disabled:hover:bg-transparent'
                  }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-t1 truncate">
                    <User className="w-3.5 h-3.5 text-t3 shrink-0" />
                    {session.username || <span className="text-t3 italic">anonymous</span>}
                  </span>
                  <span className="text-xs text-t2 shrink-0">{session.event_count}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-t3">
                  <span className="truncate font-mono">
                    {id ? id.slice(0, 8) : 'no session id'}
                  </span>
                  <span className="shrink-0">{formatSpan(session.started_at, session.ended_at)}</span>
                </div>
                <div className="mt-0.5 text-xs text-t3">{formatUtc(session.started_at)}</div>
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

export default SessionList;
