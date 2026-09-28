import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchDatasetActivity } from '../../../api/datasets';
import { ACTIVITY_WINDOWS, activityPhrases, formatLastActive } from '../../../utils/datasetActivity';
import TimeRangeToggle from './TimeRangeToggle';

/** Rows shown before "Show all"; most datasets have a handful of people. */
const COLLAPSED_ROWS = 5;

/**
 * Who has done what on this dataset recently, one line per person.
 *
 * Read from the stored annotation data rather than the activity log, so it works
 * on every deployment. A failed load collapses to a short message instead of
 * taking the page down with it -- this is context, not a control.
 *
 * The time range is its own unless `days` is passed, in which case the parent
 * owns it (the dataset page shares one switch between its summaries).
 */
const DatasetActivityCard = ({ datasetId, days: controlledDays }) => {
  const [ownDays, setOwnDays] = useState(ACTIVITY_WINDOWS[0].days);
  const controlled = controlledDays !== undefined;
  const days = controlled ? controlledDays : ownDays;
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!datasetId) return undefined;
    let cancelled = false;
    setError(false);
    setUsers(null);
    fetchDatasetActivity(datasetId, days)
      .then((response) => {
        if (!cancelled) setUsers(response?.users ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [datasetId, days]);

  // A new range starts collapsed again, whoever changed it.
  useEffect(() => { setExpanded(false); }, [days]);

  const range = ACTIVITY_WINDOWS.find((w) => w.days === days) ?? ACTIVITY_WINDOWS[0];
  const active = (users ?? []).filter((row) => activityPhrases(row).length > 0);
  const visible = expanded ? active : active.slice(0, COLLAPSED_ROWS);

  return (
    <div className="bg-p1 border border-ln rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-sm text-t2">Who worked on this dataset, from its annotations and reviews.</p>
        {!controlled && <TimeRangeToggle days={days} onChange={setOwnDays} />}
      </div>

      {error && <p className="text-sm text-t3 py-2">Activity could not be loaded.</p>}

      {!error && users === null && (
        <p className="flex items-center gap-2 text-sm text-t3 py-2">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Loading activity…
        </p>
      )}

      {!error && users !== null && active.length === 0 && (
        <p className="text-sm text-t3 py-2">No activity {range.empty}.</p>
      )}

      {!error && active.length > 0 && (
        <ul className="divide-y divide-ln">
          {visible.map((row) => (
            <li key={row.username} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-semibold text-t1">{row.username}</span>
                {row.last_active && (
                  <span className="text-xs text-t3">active {formatLastActive(row.last_active)}</span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-t2">
                {activityPhrases(row).map((phrase, index) => (
                  <React.Fragment key={phrase.key}>
                    {index > 0 && <span className="text-t3" aria-hidden="true"> · </span>}
                    <span>{phrase.text}</span>
                    {phrase.detail && <span className="text-t3"> ({phrase.detail})</span>}
                  </React.Fragment>
                ))}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!error && active.length > COLLAPSED_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-3 text-sm font-medium text-ac hover:underline focus:outline-none
            focus-visible:ring-2 focus-visible:ring-ac rounded"
        >
          {expanded ? 'Show fewer' : `Show all ${active.length} people`}
        </button>
      )}
    </div>
  );
};

export default DatasetActivityCard;
