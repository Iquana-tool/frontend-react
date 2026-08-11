import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Settings2, Tag, X } from 'lucide-react';
import { MetadataValueType, filterKindFor } from '../../../utils/imageMetadata';

/**
 * Filter the gallery down to a metadata subgroup.
 *
 * One control per key the dataset uses, shaped by that key's declared type: a
 * site gets chips, a depth gets a range, a collection date gets two date
 * pickers, a note gets a substring box. The row doubles as a summary of how the
 * dataset is grouped, not just a control for narrowing it.
 *
 * "Untagged" is deliberately not a value of any key: it is the complement of
 * every subgroup, and it is the one filter a curator needs while the grouping is
 * still being filled in.
 */

/** A date input needs YYYY-MM-DD; the filter carries epoch seconds. */
const toDateInput = (seconds) =>
  seconds == null ? '' : new Date(seconds * 1000).toISOString().slice(0, 10);

const fromDateInput = (text) => {
  if (!text) return null;
  const parsed = Date.parse(`${text}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed / 1000;
};

const summarizeRange = (facet, condition) => {
  const unit = facet.unit ? ` ${facet.unit}` : '';
  if (facet.value_type === MetadataValueType.DATE) {
    const from = toDateInput(condition.min);
    const to = toDateInput(condition.max);
    if (from && to) return `${from} → ${to}`;
    return from ? `from ${from}` : `until ${to}`;
  }
  if (condition.min != null && condition.max != null) {
    return `${condition.min}–${condition.max}${unit}`;
  }
  return condition.min != null ? `≥ ${condition.min}${unit}` : `≤ ${condition.max}${unit}`;
};

/** How an active condition on a key reads as a pill. */
const describeCondition = (facet, condition) => {
  if (Array.isArray(condition)) {
    return condition.length === 0 ? 'any' : condition.join(', ');
  }
  if (condition?.contains) return `contains "${condition.contains}"`;
  return summarizeRange(facet, condition || {});
};

const ValueList = ({ facet, selected, onToggleValue }) => (
  <>
    {facet.values.length === 0 && (
      <p className="px-2 py-1.5 text-xs text-t3">No values yet.</p>
    )}
    {facet.values.map((entry) => (
      <button
        key={entry.value}
        onClick={() => onToggleValue(facet.key, entry.value)}
        className="w-full flex items-center justify-between gap-3 px-2 py-1.5 rounded-md text-xs text-t1 hover:bg-hv"
      >
        <span className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={selected.includes(entry.value)}
            readOnly
            className="pointer-events-none"
          />
          <span className="truncate">{entry.value}</span>
        </span>
        <span className="text-t3">{entry.count}</span>
      </button>
    ))}
  </>
);

const RangeInputs = ({ facet, condition, onChange }) => {
  const isDate = facet.value_type === MetadataValueType.DATE;
  const inputClass =
    'w-full px-2 py-1 text-xs border border-ln2 rounded-md bg-p1 text-t1 focus:ring-2 focus:ring-ac focus:border-transparent';

  const update = (edge, raw) => {
    const parsed = isDate
      ? fromDateInput(raw)
      : (raw === '' ? null : Number(raw));
    onChange(facet.key, {
      ...condition,
      [edge]: parsed === null || Number.isNaN(parsed) ? null : parsed,
    });
  };

  return (
    <div className="p-2 space-y-2 w-56">
      {/* The observed range, so the bounds to type are not a guess. */}
      {facet.range && !isDate && (
        <p className="text-[11px] text-t3">
          {facet.range.min} – {facet.range.max}
          {facet.unit ? ` ${facet.unit}` : ''} across {facet.image_count} images
        </p>
      )}
      <label className="block text-[11px] text-t2">
        From
        <input
          type={isDate ? 'date' : 'number'}
          className={inputClass}
          value={isDate ? toDateInput(condition.min) : (condition.min ?? '')}
          onChange={(e) => update('min', e.target.value)}
        />
      </label>
      <label className="block text-[11px] text-t2">
        To
        <input
          type={isDate ? 'date' : 'number'}
          className={inputClass}
          value={isDate ? toDateInput(condition.max) : (condition.max ?? '')}
          onChange={(e) => update('max', e.target.value)}
        />
      </label>
    </div>
  );
};

const ContainsInput = ({ facet, condition, onChange }) => (
  <div className="p-2 w-56">
    <input
      type="text"
      autoFocus
      placeholder={`Search ${facet.key}...`}
      value={condition.contains || ''}
      onChange={(e) => onChange(facet.key, { contains: e.target.value })}
      className="w-full px-2 py-1 text-xs border border-ln2 rounded-md bg-p1 text-t1 focus:ring-2 focus:ring-ac focus:border-transparent"
    />
  </div>
);

const MetadataFilterBar = ({
  facets = [],
  filters = {},
  onlyUntagged = false,
  untaggedCount = 0,
  onToggleValue,
  onSetCondition,
  onToggleUntagged,
  onClear,
  onManageKeys,
}) => {
  const [openKey, setOpenKey] = useState(null);
  const containerRef = useRef(null);

  // A dropdown left open behind a click elsewhere would sit on top of the grid.
  useEffect(() => {
    if (!openKey) return undefined;
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpenKey(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openKey]);

  if (facets.length === 0 && untaggedCount === 0 && !onManageKeys) return null;

  const activePills = Object.entries(filters).flatMap(([key, condition]) => {
    const facet = facets.find((f) => f.key === key) || { key };
    if (Array.isArray(condition) && condition.length > 0) {
      return condition.map((value) => ({ key, value, condition }));
    }
    return [{ key, value: describeCondition(facet, condition), condition }];
  });
  const hasActiveFilter = activePills.length > 0 || onlyUntagged;

  return (
    <div ref={containerRef} className="mt-2">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-t3">
          <Tag className="w-3 h-3" />
          Metadata
        </span>

        {facets.map((facet) => {
          const condition = filters[facet.key];
          const kind = filterKindFor(facet.value_type);
          const selected = Array.isArray(condition) ? condition : [];
          const active = kind === 'values' ? selected.length > 0 : condition != null;
          const open = openKey === facet.key;
          return (
            <div key={facet.key} className="relative">
              <button
                onClick={() => setOpenKey(open ? null : facet.key)}
                aria-expanded={open}
                disabled={onlyUntagged}
                title={facet.description || undefined}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-acS text-ac border-transparent ring-2 ring-ac'
                    : 'bg-p1 text-t2 border-ln hover:bg-hv'
                } ${onlyUntagged ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span>{facet.key}</span>
                {facet.unit && <span className="opacity-60">({facet.unit})</span>}
                {kind === 'values' && selected.length > 0 && (
                  <span className="opacity-70">{selected.length}</span>
                )}
                <ChevronDown className="w-3 h-3" />
              </button>

              {open && (
                <div className="absolute z-30 mt-1 min-w-[12rem] max-h-64 overflow-y-auto rounded-lg border border-ln bg-p1 shadow-lg p-1">
                  {kind === 'values' && (
                    <ValueList
                      facet={facet}
                      selected={selected}
                      onToggleValue={onToggleValue}
                    />
                  )}
                  {kind === 'range' && (
                    <RangeInputs
                      facet={facet}
                      condition={Array.isArray(condition) ? {} : (condition || {})}
                      onChange={onSetCondition}
                    />
                  )}
                  {kind === 'contains' && (
                    <ContainsInput
                      facet={facet}
                      condition={Array.isArray(condition) ? {} : (condition || {})}
                      onChange={onSetCondition}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {untaggedCount > 0 && (
          <button
            onClick={() => onToggleUntagged(!onlyUntagged)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              onlyUntagged
                ? 'bg-warnBg text-warn border-transparent ring-2 ring-warnLn'
                : 'bg-p1 text-t2 border-ln hover:bg-hv'
            }`}
            title="Images that carry no metadata at all"
          >
            <span>Untagged</span>
            <span className={onlyUntagged ? 'opacity-70' : 'text-t3'}>{untaggedCount}</span>
          </button>
        )}

        {hasActiveFilter && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-t2 hover:bg-hv"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}

        {onManageKeys && (
          <button
            onClick={onManageKeys}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-t2 hover:bg-hv ml-auto"
            title="Set each key's type, unit and allowed values"
          >
            <Settings2 className="w-3 h-3" />
            Manage keys
          </button>
        )}
      </div>

      {/* The active conditions spelled out, so what the grid is showing stays
          readable without opening every dropdown again. */}
      {activePills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {activePills.map(({ key, value, condition }) => (
            <button
              key={`${key}:${value}`}
              onClick={() =>
                Array.isArray(condition)
                  ? onToggleValue(key, value)
                  : onSetCondition(key, null)
              }
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-acS text-ac border border-acLn hover:brightness-95"
              title={`Remove ${key} = ${value}`}
            >
              <span className="opacity-70">{key}</span>
              <span className="font-medium">{value}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MetadataFilterBar;
