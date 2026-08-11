import React from 'react';
import { Layers } from 'lucide-react';

/**
 * Choose an image-metadata key to break the quantification down by.
 *
 * Only *groupable* keys are offered. A number or a date is near-unique per image, so
 * grouping by one would draw a band per image rather than a comparison — the server
 * refuses those with a 422, and there is no reason to let someone ask for it. Keys that
 * exist but cannot group are listed as disabled with the reason, which is more useful
 * than silently omitting them: "why isn't depth here?" is the obvious next question.
 */
const GroupBySelector = ({ facets = [], value, onChange }) => {
  const groupable = facets.filter((facet) => facet.groupable && facet.image_count > 0);
  const ungroupable = facets.filter((facet) => !facet.groupable && facet.image_count > 0);

  if (groupable.length === 0 && ungroupable.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-sm text-t2">
      <Layers className="w-4 h-4 text-t3" />
      <span>Group by</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={groupable.length === 0}
        className="px-2 py-1 text-sm border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac focus:border-transparent disabled:opacity-50"
        title={groupable.length === 0
          ? 'This dataset has no category metadata to group by'
          : undefined}
      >
        <option value="">Nothing</option>
        {groupable.map((facet) => (
          <option key={facet.key} value={facet.key}>
            {facet.key} ({facet.values.length})
          </option>
        ))}
        {ungroupable.map((facet) => (
          <option key={facet.key} value={facet.key} disabled>
            {facet.key} — {facet.value_type} keys cannot group
          </option>
        ))}
      </select>
    </label>
  );
};

export default GroupBySelector;
