import React from 'react';
import { formatDuration } from '../../../utils/activityLog';
import { outcomeBreakdown, sourceLabel } from '../../../utils/suggestionStats';
import { formatHours, formatIou, sceneGraphActionLabel, toolLabel } from '../../../utils/usageStats';
import UsageTimelineChart from './UsageTimelineChart';

/** Same outcome colours as the dataset page's Model suggestions card. */
const OUTCOME_TONE = { as_is: 'bg-ok', edited: 'bg-warn', rejected: 'bg-err' };

const Section = ({ title, hint, className = '', children }) => (
  <section className={`bg-p1 border border-ln rounded-xl p-4 sm:p-5 ${className}`}>
    <h3 className="text-sm font-semibold text-t1">{title}</h3>
    {hint && <p className="text-xs text-t3 mt-0.5">{hint}</p>}
    <div className="mt-3">{children}</div>
  </section>
);

const Empty = ({ children }) => <p className="text-sm text-t3 py-1">{children}</p>;

const Stat = ({ label, value }) => (
  <div className="rounded-lg bg-well px-3 py-2">
    <p className="text-xs text-t3">{label}</p>
    <p className="text-base font-semibold text-t1 tabular-nums">{value}</p>
  </div>
);

/** A horizontal bar list: one neutral bar per row, sized against the largest. */
const BarList = ({ rows, valueOf, labelOf, formatValue, extraOf }) => {
  const max = Math.max(...rows.map(valueOf), 1);
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={labelOf(row)}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-t1 truncate">{labelOf(row)}</span>
            <span className="text-t2 tabular-nums shrink-0">
              {formatValue(valueOf(row))}
              {extraOf && <span className="text-t3"> · {extraOf(row)}</span>}
            </span>
          </div>
          <div className="h-1.5 mt-1 rounded-full bg-well overflow-hidden">
            <div className="h-full rounded-full bg-ac" style={{ width: `${(valueOf(row) / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

const SuggestionsByModel = ({ models, distribution }) => {
  if (!models.length) return <Empty>No AI suggestions in this window.</Empty>;
  const edited = distribution.reduce((sum, b) => sum + b.count, 0);
  return (
    <>
      <ul className="divide-y divide-ln">
        {models.map((row) => {
          const parts = outcomeBreakdown(row);
          return (
            <li key={row.model_key} className="py-3 first:pt-0">
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
              {row.edited > 0 && (
                <p className="mt-0.5 text-xs text-t3">
                  Edited outlines kept{' '}
                  <span className="font-semibold text-t1">{formatIou(row.mean_edit_iou)}</span>{' '}
                  overlap (IoU) with the suggestion on average
                  {row.edits_with_iou < row.edited && ` (measured for ${row.edits_with_iou} of ${row.edited})`}.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {edited > 0 && (
        <div className="mt-4 pt-3 border-t border-ln">
          <p className="text-xs font-medium text-t2 mb-2">How much edited suggestions changed</p>
          <BarList
            rows={distribution}
            valueOf={(b) => b.count}
            labelOf={(b) => `IoU ${b.bucket}`}
            formatValue={(n) => `${n}`}
          />
        </div>
      )}
    </>
  );
};

/**
 * Everything the Usage view shows for one person.
 *
 * @param {Object} props
 * @param {Object} props.detail - response of `GET /usage-stats/users/{username}`
 */
const UserUsageDetail = ({ detail }) => {
  const noEvents = !detail.events_enabled;
  const missing = noEvents
    ? 'Activity capture is off on this deployment.'
    : 'Nothing captured in this window.';
  const { images } = detail;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section
        title="AI suggestions by model"
        hint="Accepted as-is, accepted after a hand edit, or deleted. IoU: how much of the suggested outline the final outline still overlaps (100% = unchanged)."
        className="lg:col-span-2"
      >
        <SuggestionsByModel models={detail.suggestions} distribution={detail.iou_distribution} />
      </Section>

      <Section
        title="Timeline"
        hint="Time on each workflow per day (UTC), from page visits. Includes idle time while a page was open."
        className="lg:col-span-2"
      >
        {noEvents ? <Empty>{missing}</Empty> : <UsageTimelineChart timeline={detail.timeline} />}
      </Section>

      <Section title="Workflows" hint="Total time on each part of the app, and how many visits.">
        {detail.workflows.length ? (
          <BarList
            rows={detail.workflows}
            valueOf={(w) => w.time_ms}
            labelOf={(w) => w.workflow}
            formatValue={formatHours}
            extraOf={(w) => `${w.visits} ${w.visits === 1 ? 'visit' : 'visits'}`}
          />
        ) : <Empty>{missing}</Empty>}
      </Section>

      <Section title="Per-image effort" hint="From each time an image was open in the annotation view.">
        {images.visits ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Stat label="Images" value={images.images} />
              <Stat label="Image visits" value={images.visits} />
              <Stat label="Total active" value={formatHours(images.total_active_ms)} />
              <Stat label="Active / visit" value={formatDuration(images.mean_active_ms)} />
              <Stat label="Idle / visit" value={formatDuration(images.mean_idle_ms)} />
              <Stat label="AI wait / visit" value={formatDuration(images.mean_ai_wait_ms)} />
            </div>
            <p className="mt-3 text-xs text-t3 tabular-nums">
              {Object.entries(images.interactions)
                .filter(([, n]) => n > 0)
                .map(([key, n]) => `${n} ${key}`)
                .join(' · ') || 'No interactions recorded.'}
            </p>
          </>
        ) : <Empty>{missing}</Empty>}
      </Section>

      <Section title="Annotation tools" hint="How often each tool was switched to.">
        {detail.tools.length ? (
          <BarList
            rows={detail.tools}
            valueOf={(t) => t.count}
            labelOf={(t) => toolLabel(t.tool)}
            formatValue={(n) => `${n}×`}
          />
        ) : <Empty>{missing}</Empty>}
      </Section>

      <Section title="AI features" hint="Model calls with median wait, and which models were picked.">
        {detail.ai_features.length ? (
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-xs text-t3 text-left">
                <th className="pb-1 font-medium">Feature</th>
                <th className="pb-1 font-medium">Model</th>
                <th className="pb-1 font-medium text-right">Calls</th>
                <th className="pb-1 font-medium text-right">Median</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ln">
              {detail.ai_features.map((row) => (
                <tr key={`${row.feature}:${row.model}`} className="text-t2">
                  <td className="py-1.5 pr-2 text-t1">{row.feature}</td>
                  <td className="py-1.5 pr-2 break-all">{row.model}</td>
                  <td className="py-1.5 text-right">
                    {row.count}
                    {row.failures > 0 && <span className="text-err"> ({row.failures} failed)</span>}
                  </td>
                  <td className="py-1.5 pl-2 text-right">{formatDuration(row.median_ms) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>{missing}</Empty>}
        {detail.model_selections.length > 0 && (
          <p className="mt-3 text-xs text-t3">
            Models picked:{' '}
            {detail.model_selections.map((m) => `${m.model} (${m.count}×)`).join(', ')}
          </p>
        )}
      </Section>

      <Section
        title="Scene graph"
        hint="Relationships and attributes edited, with how many objects each touched."
        className="lg:col-span-2"
      >
        {detail.scene_graph?.actions?.length ? (
          <>
            <BarList
              rows={detail.scene_graph.actions}
              valueOf={(a) => a.count}
              labelOf={(a) => sceneGraphActionLabel(a.action)}
              formatValue={(n) => `${n}×`}
              extraOf={(a) => `${a.objects} ${a.objects === 1 ? 'object' : 'objects'}`}
            />
            {detail.scene_graph.relationships.length > 0 && (
              <p className="mt-3 text-xs text-t3">
                Relationships used:{' '}
                {detail.scene_graph.relationships.map((r) => `${r.name} (${r.count}×)`).join(', ')}
              </p>
            )}
          </>
        ) : <Empty>{missing}</Empty>}
      </Section>
    </div>
  );
};

export default UserUsageDetail;
