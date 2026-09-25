import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchSuggestionStats } from '../../../api/datasets';
import { ACTIVITY_WINDOWS } from '../../../utils/datasetActivity';
import { outcomeBreakdown, sourceLabel } from '../../../utils/suggestionStats';

/** Bar colour per outcome: kept is good, a fix is a warning, a deletion an error. */
const OUTCOME_TONE = { as_is: 'bg-ok', edited: 'bg-warn', rejected: 'bg-err' };

/**
 * How each model's AI suggestions on this dataset were treated: kept as the model
 * made them, kept after a hand edit, or deleted.
 *
 * @param {Object} props
 * @param {number} props.datasetId
 * @param {number} props.days - time window in days; 0 for all time
 */
const ModelSuggestionsCard = ({ datasetId, days }) => {
  const [models, setModels] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!datasetId) return undefined;
    let cancelled = false;
    setError(false);
    setModels(null);
    fetchSuggestionStats(datasetId, days)
      .then((response) => {
        if (!cancelled) setModels(response?.models ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [datasetId, days]);

  const range = ACTIVITY_WINDOWS.find((w) => w.days === days) ?? ACTIVITY_WINDOWS[0];

  return (
    <div className="bg-p1 border border-ln rounded-xl p-4 sm:p-5">
      <p className="text-sm text-t2 mb-3">
        How each model&apos;s suggestions were used: kept as-is, kept after a hand edit, or deleted.
      </p>

      {error && <p className="text-sm text-t3 py-2">Model suggestions could not be loaded.</p>}

      {!error && models === null && (
        <p className="flex items-center gap-2 text-sm text-t3 py-2">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Loading model suggestions…
        </p>
      )}

      {!error && models !== null && models.length === 0 && (
        <p className="text-sm text-t3 py-2">No AI suggestions {range.empty}.</p>
      )}

      {!error && models?.length > 0 && (
        <ul className="divide-y divide-ln">
          {models.map((row) => {
            const parts = outcomeBreakdown(row);
            return (
              <li key={row.model_key} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-semibold text-t1 break-all">{row.model_key}</span>
                  <span className="text-xs text-t3 tabular-nums">
                    {row.total} {row.total === 1 ? 'suggestion' : 'suggestions'}
                  </span>
                </div>
                <p className="text-xs text-t3 mt-0.5">{row.sources.map(sourceLabel).join(' · ')}</p>
                <div
                  className="flex h-2 mt-2 rounded-full overflow-hidden bg-well gap-px"
                  role="img"
                  aria-label={parts.map((p) => `${p.pct}% ${p.label}`).join(', ')}
                >
                  {parts.filter((p) => p.count > 0).map((p) => (
                    <span key={p.key} className={OUTCOME_TONE[p.key]} style={{ width: `${p.pct}%` }} />
                  ))}
                </div>
                <p className="mt-1.5 text-sm text-t2 tabular-nums">
                  {parts.map((p, index) => (
                    <React.Fragment key={p.key}>
                      {index > 0 && <span className="text-t3" aria-hidden="true"> · </span>}
                      <span className="font-semibold text-t1">{p.pct}%</span> {p.label}
                      <span className="text-t3"> ({p.count})</span>
                    </React.Fragment>
                  ))}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ModelSuggestionsCard;
