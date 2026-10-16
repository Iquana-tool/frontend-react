import React, { useEffect, useState } from 'react';
import { Info, Loader2, User } from 'lucide-react';
import * as api from '../../api';
import TimeRangeToggle from '../datasets/gallery/TimeRangeToggle';
import UserUsageDetail from './usage/UserUsageDetail';
import { formatUtc } from '../../utils/activityLog';
import { outcomeBreakdown } from '../../utils/suggestionStats';
import { formatHours, formatIou } from '../../utils/usageStats';

const OUTCOME_TONE = { as_is: 'bg-ok', edited: 'bg-warn', rejected: 'bg-err' };

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API Error:\s*/i, '') || fallback;

/**
 * Hook-style loader that ignores responses for a request that has been superseded
 * (a newer time range or another user picked while the old one was in flight).
 */
const useLoad = (load, deps) => {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    load()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
};

const OutcomeBar = ({ row }) => {
  if (!row.suggestions) return <span className="text-t3">—</span>;
  const parts = outcomeBreakdown(row);
  return (
    <div className="min-w-[8rem]">
      <div
        className="flex h-1.5 rounded-full overflow-hidden bg-well gap-px"
        role="img"
        aria-label={parts.map((p) => `${p.pct}% ${p.label}`).join(', ')}
      >
        {parts.filter((p) => p.count > 0).map((p) => (
          <span key={p.key} className={OUTCOME_TONE[p.key]} style={{ width: `${p.pct}%` }} />
        ))}
      </div>
      <p className="mt-1 text-xs text-t3 tabular-nums">
        {parts.map((p) => `${p.pct}%`).join(' · ')}
      </p>
    </div>
  );
};

/**
 * Admin Usage view: one row per person, and the full breakdown for whoever is
 * selected. AI suggestion outcomes are always available; everything else needs
 * activity capture, which the panel says plainly when it is off.
 */
const UsagePanel = () => {
  const [days, setDays] = useState(30);
  const [selected, setSelected] = useState(null);

  const overview = useLoad(() => api.fetchUsageUsers(days), [days]);
  const detail = useLoad(
    () => (selected ? api.fetchUserUsage(selected, days) : Promise.resolve(null)),
    [selected, days]
  );

  const users = overview.data?.users ?? [];
  const eventsEnabled = overview.data?.events_enabled ?? true;

  return (
    <div className="space-y-4">
      <section className="bg-p1 border border-ln rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-ln flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-t1">Usage by user</h2>
            <p className="text-xs text-t3">
              Select a person to see their models, workflows, tools and time per image.
            </p>
          </div>
          <TimeRangeToggle days={days} onChange={setDays} />
        </header>

        {!eventsEnabled && (
          <p className="flex items-start gap-2 px-4 py-2 text-xs text-t2 bg-well border-b border-ln">
            <Info className="w-4 h-4 shrink-0 text-t3" aria-hidden="true" />
            Activity capture is off on this deployment (USER_EVENTS_ENABLED), so only AI suggestion
            outcomes are shown. Time, workflows and tools need capture to be on.
          </p>
        )}

        {overview.error && (
          <p className="px-4 py-6 text-sm text-err">
            {readableError(overview.error, 'Could not load usage statistics.')}
          </p>
        )}

        {!overview.error && overview.loading && !overview.data && (
          <p className="flex items-center gap-2 px-4 py-6 text-sm text-t3">
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Loading usage…
          </p>
        )}

        {!overview.error && overview.data && users.length === 0 && (
          <p className="px-4 py-8 text-sm text-t3 text-center">No usage recorded in this window.</p>
        )}

        {!overview.error && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-xs text-t3 text-left border-b border-ln">
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Last active (UTC)</th>
                  <th className="px-3 py-2 font-medium text-right">AI suggestions</th>
                  <th className="px-3 py-2 font-medium">As-is · edited · rejected</th>
                  <th className="px-3 py-2 font-medium text-right" title="Mean IoU between the suggested and the edited outline">
                    Edit overlap
                  </th>
                  <th className="px-3 py-2 font-medium text-right">Active time</th>
                  <th className="px-3 py-2 font-medium text-right">Images</th>
                  <th className="px-3 py-2 font-medium text-right">Sessions</th>
                  <th className="px-3 py-2 font-medium text-right">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ln">
                {users.map((row) => {
                  const isSelected = row.username === selected;
                  return (
                    <tr
                      key={row.username}
                      className={`cursor-pointer transition-colors duration-150 motion-reduce:transition-none ${
                        isSelected ? 'bg-acS' : 'hover:bg-hv'
                      }`}
                      onClick={() => setSelected(isSelected ? null : row.username)}
                    >
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          className="flex items-center gap-1.5 font-medium text-t1 rounded whitespace-nowrap
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-ac"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(isSelected ? null : row.username);
                          }}
                        >
                          <User className="w-3.5 h-3.5 text-t3" aria-hidden="true" />
                          {row.username}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-t2 whitespace-nowrap">{formatUtc(row.last_seen)}</td>
                      <td className="px-3 py-2.5 text-right text-t1">{row.suggestions || '—'}</td>
                      <td className="px-3 py-2.5"><OutcomeBar row={row} /></td>
                      <td className="px-3 py-2.5 text-right text-t2">{formatIou(row.mean_edit_iou)}</td>
                      <td className="px-3 py-2.5 text-right text-t2">
                        {row.active_ms ? formatHours(row.active_ms) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-t2">{row.images_visited || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-t2">{row.sessions || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-t2">{row.active_days || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div>
          <h2 className="text-base font-semibold text-t1 mb-3 flex items-center gap-2">
            {selected}
            {detail.loading && (
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none text-t3" aria-label="Loading" />
            )}
          </h2>
          {detail.error && (
            <p className="text-sm text-err">{readableError(detail.error, 'Could not load this user.')}</p>
          )}
          {detail.data && <UserUsageDetail detail={detail.data} />}
        </div>
      )}
    </div>
  );
};

export default UsagePanel;
