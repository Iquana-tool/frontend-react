import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

const toRows = (entries) => Object.entries(entries || {}).map(([key, value]) => ({ key, value, saved: key }));

/**
 * Key/value tags for the item on the canvas -- the image metadata the gallery
 * filters and review queues use.
 *
 * Edits are saved when a field loses focus: a changed value is set, a renamed
 * key is set under the new name and removed under the old one, and the cross
 * removes it. A new row is saved once it has both a name and a value.
 *
 * @param {Object} props
 * @param {Object<string, string>} props.entries - The editable tags.
 * @param {Object<string, string>} [props.fixed] - Shown read-only below them
 *   (a slice's own keys, which are edited elsewhere).
 * @param {(key: string, value: string) => Promise} props.onSet
 * @param {(key: string) => Promise} props.onRemove
 * @param {boolean} props.canEdit
 * @param {string} props.note - What the tags apply to.
 */
const TagsEditor = ({ entries, fixed = {}, onSet, onRemove, canEdit, note }) => {
  const [rows, setRows] = useState(() => toRows(entries));
  const [error, setError] = useState(null);

  useEffect(() => {
    setRows(toRows(entries));
  }, [entries]);

  const update = (index, patch) => setRows((current) =>
    current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const save = async (index) => {
    const row = rows[index];
    const key = row.key.trim();
    const value = row.value.trim();
    if (!key || !value) return;
    if (key === row.saved && value === entries[key]) return;
    setError(null);
    try {
      await onSet(key, value);
      if (row.saved && row.saved !== key) await onRemove(row.saved);
      update(index, { key, value, saved: key });
    } catch (exc) {
      setError(exc.message || 'The tag could not be saved.');
    }
  };

  const remove = async (index) => {
    const row = rows[index];
    setRows((current) => current.filter((_, i) => i !== index));
    if (!row.saved) return;
    setError(null);
    try {
      await onRemove(row.saved);
    } catch (exc) {
      setError(exc.message || 'The tag could not be removed.');
      setRows(toRows(entries));
    }
  };

  const fixedEntries = Object.entries(fixed || {});

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center">
        <span className="text-sect font-bold tracking-[.08em] uppercase text-t3">Tags</span>
        <span className="flex-1" />
        <span className="text-meta text-t3">{canEdit ? 'editable' : 'read only'}</span>
      </div>

      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-[4px]">
          <input
            aria-label="Tag name"
            value={row.key}
            placeholder="name"
            disabled={!canEdit}
            onChange={(event) => update(index, { key: event.target.value })}
            onBlur={() => save(index)}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            className="w-[86px] h-6 px-[6px] rounded-5 border border-ln bg-well text-ctl text-t2 disabled:opacity-70"
          />
          <input
            aria-label="Tag value"
            value={row.value}
            placeholder="value"
            disabled={!canEdit}
            onChange={(event) => update(index, { value: event.target.value })}
            onBlur={() => save(index)}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            className="flex-1 min-w-0 h-6 px-[6px] rounded-5 border border-ln2 bg-well2 text-ctl text-t1 disabled:opacity-70"
          />
          {canEdit && (
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove tag ${row.key}`}
              className="w-[22px] h-[22px] flex-none flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-err"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}

      {canEdit && (
        <button
          type="button"
          onClick={() => setRows((current) => [...current, { key: '', value: '', saved: null }])}
          className="self-start h-6 flex items-center gap-[5px] px-[8px] rounded-6 border border-dashed border-ln2 text-ctl text-t2 hover:bg-hv"
        >
          <Plus size={11} />
          Add tag
        </button>
      )}

      {fixedEntries.length > 0 && (
        <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-y-[4px] gap-x-[4px] mt-[2px] font-mono text-ctl">
          {fixedEntries.map(([key, value]) => (
            <React.Fragment key={key}>
              <span className="text-t3 truncate" title={key}>{key}</span>
              <span className="text-t2 truncate" title={`${value} (this slice only)`}>{value}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {error && <span className="text-sect text-err" role="alert">{error}</span>}
      <span className="text-sect leading-[1.45] text-t3">{note}</span>
    </div>
  );
};

export default TagsEditor;
