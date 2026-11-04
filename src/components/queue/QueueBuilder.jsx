import React, { useState } from "react";
import MetadataFilterBar from "../datasets/gallery/MetadataFilterBar";

/**
 * The part of a queue builder both queues share: sort by a method and direction (or round
 * robin between two methods), take turns by a metadata key, and filter by metadata, by whose
 * work it is and by confidence. The annotation window sorts images, the review setup sorts objects; each adds
 * its own sections around this one.
 *
 * Methods come from the backend's registry (``app.services.queue_methods``): each says which
 * directions it supports, with one sentence per direction, so a new method appears here
 * without changes.
 */

export const ROUND_ROBIN = "round_robin";
export const DEFAULT_CONFIDENCE_PCT = 50;
const ORDER_LABELS = { ascending: "Ascending", descending: "Descending", [ROUND_ROBIN]: "Round robin" };
/** How many metadata keys the filter search suggests at once. */
const KEY_SUGGESTIONS = 8;

export const fieldClass = "w-full px-3 py-2 text-sm border border-ln2 rounded-lg bg-p1 text-t1 disabled:opacity-60";
export const labelClass = "block text-sm font-medium text-t1 mb-1";

/** A method's sentence for one of its directions; round robin runs each in its default order. */
export const describe = (m, direction = m?.directions[0]) => m?.descriptions[direction];

/** Builder state from saved or recommended settings in the API's shape. */
export const sortStateFrom = (saved, methods) => ({
  method: saved?.method || methods[0]?.key || null,
  order: saved?.round_robin_with ? ROUND_ROBIN : saved?.direction || null,
  roundRobinWith: saved?.round_robin_with || null,
  metadataFilters: saved?.metadata_filters || {},
  balanceBy: saved?.balance_by || null,
  confidencePct: saved?.max_confidence != null ? Math.round(saved.max_confidence * 100) : null,
  by: saved?.by || "everyone",
  byPerson: saved?.by_person || null,
});

/** The API's sort settings from builder state. */
export const sortPayload = (state, method, useConfidence = state.confidencePct != null) => {
  const roundRobin = state.order === ROUND_ROBIN;
  return {
    method: state.method,
    direction: roundRobin ? null : state.order || method?.directions[0] || null,
    round_robin_with: roundRobin ? state.roundRobinWith : null,
    metadata_filters: state.metadataFilters,
    balance_by: state.balanceBy || null,
    max_confidence: useConfidence ? state.confidencePct / 100 : null,
    ...authorPayload(state),
  };
};

/** The "By" filter alone, for queues that take no sorting. */
export const authorPayload = (state) => ({
  by: state.by || "everyone",
  by_person: state.by === "person" ? state.byPerson : null,
});

/** The "By" select's value: the choice, or the person picked. */
const PERSON = "person:";
const byValue = (state) => (state.by === "person" ? `${PERSON}${state.byPerson}` : state.by || "everyone");

/**
 * @param {{singular: string, plural: string}} unit - What is sorted, for labels and hints.
 * @param {object[]} methods - The summary's method list.
 * @param {object} settings - Builder state, see `sortStateFrom`.
 * @param {(patch: object) => void} update - Merges a patch into `settings`.
 * @param {object[]} facets - The dataset's metadata facets.
 * @param {string[]} [authors] - Other people who drew in the dataset, for the "By" filter.
 * @param {(method: object) => string|null} [blockedMethod] - Why a method cannot run here.
 * @param {{label: string, blocked?: string|null}} confidence - The confidence filter's label;
 *   `blocked` hides it when no confidence is available.
 * @param {boolean} [sortable] - False shows only the metadata filter, for queues whose order
 *   is fixed (review by entire images).
 * @param {React.ReactNode} [children] - Sections that belong right after the sort, such as
 *   the models a method needs.
 */
const QueueBuilder = ({
  unit, methods, settings, update, facets = [], authors = [], busy = false,
  blockedMethod = () => null,
  confidence, sortable = true, children,
}) => {
  // Metadata keys the user searched for and picked; only these (and keys with an active
  // filter) are shown, instead of one control per key the dataset has.
  const [pickedKeys, setPickedKeys] = useState([]);
  const [keyQuery, setKeyQuery] = useState("");

  const byKey = Object.fromEntries(methods.map((m) => [m.key, m]));
  const method = byKey[settings.method];
  const roundRobin = settings.order === ROUND_ROBIN;
  const partner = roundRobin && byKey[settings.roundRobinWith];
  const useConfidence = settings.confidencePct != null && !confidence?.blocked;

  const selectOrder = (order) => update({
    order,
    // Round robin needs a partner; offer the first other method that can run here.
    roundRobinWith: order === ROUND_ROBIN && !settings.roundRobinWith
      ? methods.find((m) => m.key !== settings.method && !blockedMethod(m))?.key || null
      : settings.roundRobinWith,
  });

  const methodOptions = (exclude = null) =>
    methods.filter((m) => m.key !== exclude).map((m) => {
      const reason = blockedMethod(m);
      return (
        <option key={m.key} value={m.key} disabled={Boolean(reason)}>
          {reason ? `${m.label} (${reason})` : m.label}
        </option>
      );
    });

  // Same filter shape as the gallery: values within a key are OR-ed, keys are AND-ed.
  const toggleMetadataValue = (key, value) => {
    const values = settings.metadataFilters[key];
    const list = Array.isArray(values) ? values : [];
    const next = { ...settings.metadataFilters };
    const nextValues = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    if (nextValues.length) next[key] = nextValues;
    else delete next[key];
    update({ metadataFilters: next });
  };

  const shownFacets = facets.filter(
    (f) => pickedKeys.includes(f.key) || Object.hasOwn(settings.metadataFilters, f.key)
  );
  const keySuggestions = keyQuery.trim()
    ? facets
      .filter((f) => !shownFacets.includes(f)
        && f.key.toLowerCase().includes(keyQuery.trim().toLowerCase()))
      .slice(0, KEY_SUGGESTIONS)
    : [];
  const selectBy = (value) => update(value.startsWith(PERSON)
    ? { by: "person", byPerson: value.slice(PERSON.length) }
    : { by: value, byPerson: null });
  const byHint = {
    everyone: `${unit.plural[0].toUpperCase()}${unit.plural.slice(1)} by anyone.`,
    mine: `Only ${unit.plural} by you.`,
    others: `Only ${unit.plural} not by you.`,
    person: `Only ${unit.plural} by ${settings.byPerson}.`,
  }[settings.by || "everyone"];

  const pickKey = (key) => {
    setPickedKeys((current) => (current.includes(key) ? current : [...current, key]));
    setKeyQuery("");
  };

  return (
    <>
      {sortable && (
        <>
          {/* Sort */}
          <div>
            <label htmlFor="queue-method" className={labelClass}>Sort {unit.plural} by</label>
            <div className="flex flex-wrap gap-2">
              <select id="queue-method" value={settings.method || ""} disabled={busy}
                onChange={(e) => update({ method: e.target.value, order: null })}
                className={`${fieldClass} flex-1 min-w-[10rem] w-auto`}>
                {methodOptions()}
              </select>
              <div className="flex rounded-lg border border-ln2 overflow-hidden" role="group" aria-label="Order">
                {[...(method?.directions || []), ...(methods.length > 1 ? [ROUND_ROBIN] : [])].map((order) => {
                  const active = (settings.order || method?.directions[0]) === order;
                  return (
                    <button key={order} type="button" disabled={busy} aria-pressed={active}
                      onClick={() => selectOrder(order)}
                      className={`px-3 py-2 text-sm transition-colors ${
                        active ? "bg-accent text-onAccent" : "bg-p1 text-t2 hover:bg-hv"}`}>
                      {ORDER_LABELS[order]}
                    </button>
                  );
                })}
              </div>
            </div>
            {method && (
              <p className="text-[11px] text-t3 mt-1">
                {roundRobin
                  ? `Takes turns: one ${unit.singular} by ${method.label}, then one by the method below. ${describe(method)}`
                  : describe(method, settings.order || undefined)}
              </p>
            )}
          </div>

          {roundRobin && (
            <div>
              <label htmlFor="queue-partner" className={labelClass}>Alternate with</label>
              <select id="queue-partner" value={settings.roundRobinWith || ""} disabled={busy}
                onChange={(e) => update({ roundRobinWith: e.target.value })} className={fieldClass}>
                {methodOptions(settings.method)}
              </select>
              {partner && <p className="text-[11px] text-t3 mt-1">{describe(partner)}</p>}
            </div>
          )}

          {children}

          {/* Balance: take turns between the values of a metadata key */}
          {facets.length > 0 && (
            <div>
              <label htmlFor="queue-balance" className={labelClass}>Take turns by</label>
              <select id="queue-balance" value={settings.balanceBy || ""} disabled={busy}
                onChange={(e) => update({ balanceBy: e.target.value || null })}
                className={fieldClass}>
                <option value="">Nothing (one sorted list)</option>
                {facets.map((f) => <option key={f.key} value={f.key}>{f.key}</option>)}
              </select>
              <p className="text-[11px] text-t3 mt-1">
                {settings.balanceBy
                  ? `One ${unit.singular} of each ${settings.balanceBy} in turn, every ${settings.balanceBy} in the order above.`
                  : "E.g. species: alternate between species instead of finishing one before the next."}
              </p>
            </div>
          )}
        </>
      )}

      {/* Filter: search a key, then narrow it */}
      <div className="space-y-2">
        <label htmlFor="queue-filter-key" className={labelClass}>Filter by</label>
        {facets.length > 0 ? (
          <div className="relative">
            <input id="queue-filter-key" type="search" value={keyQuery} disabled={busy}
              onChange={(e) => setKeyQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && keySuggestions[0]) {
                  e.preventDefault();
                  pickKey(keySuggestions[0].key);
                }
              }}
              placeholder="Search metadata, e.g. species"
              className={fieldClass} />
            {keySuggestions.length > 0 && (
              <ul role="listbox" aria-label="Metadata keys"
                className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-ln2 bg-p1 shadow-lg">
                {keySuggestions.map((f) => (
                  <li key={f.key}>
                    <button type="button" role="option" aria-selected="false"
                      onClick={() => pickKey(f.key)}
                      className="w-full text-left px-3 py-1.5 text-sm text-t1 hover:bg-hv">
                      {f.key}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-t3">This dataset has no image metadata to filter by.</p>
        )}
        {shownFacets.length > 0 && (
          <MetadataFilterBar
            facets={shownFacets}
            filters={settings.metadataFilters}
            untaggedCount={0}
            onToggleValue={toggleMetadataValue}
            onSetCondition={(key, condition) =>
              update({ metadataFilters: { ...settings.metadataFilters, [key]: condition } })}
            onClear={() => {
              setPickedKeys([]);
              update({ metadataFilters: {} });
            }}
          />
        )}
        <div>
          <label htmlFor="queue-by" className="sr-only">By</label>
          <div className="flex items-center gap-2 text-sm text-t2">
            By
            <select id="queue-by" value={byValue(settings)} disabled={busy}
              onChange={(e) => selectBy(e.target.value)}
              className={`${fieldClass} flex-1 w-auto`}>
              <option value="everyone">Everyone</option>
              <option value="mine">Only mine</option>
              <option value="others">Everyone but me</option>
              {authors.length > 0 && (
                <optgroup label="People who drew here">
                  {authors.map((a) => <option key={a} value={`${PERSON}${a}`}>{a}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <p className="text-[11px] text-t3 mt-1">{byHint}</p>
        </div>
        {sortable && confidence && !confidence.blocked && (
          <label className="flex items-center gap-2 text-sm text-t2">
            <input type="checkbox" className="h-4 w-4" checked={useConfidence}
              disabled={busy}
              onChange={(e) => update({ confidencePct: e.target.checked ? DEFAULT_CONFIDENCE_PCT : null })} />
            {confidence.label}
            <input type="number" min={1} max={100} aria-label="Confidence percent"
              value={settings.confidencePct ?? DEFAULT_CONFIDENCE_PCT}
              disabled={busy || !useConfidence}
              onChange={(e) => update({ confidencePct: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })}
              className="w-16 px-2 py-1 text-sm border border-ln2 rounded bg-p1 text-t1" />%
          </label>
        )}
      </div>
    </>
  );
};

export default QueueBuilder;
