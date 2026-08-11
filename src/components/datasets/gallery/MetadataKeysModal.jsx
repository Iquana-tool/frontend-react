import React, { useEffect, useState } from 'react';
import { Loader2, Merge, Settings2, Trash2, X } from 'lucide-react';
import * as api from '../../../api';
import { MetadataValueType, VALUE_TYPE_LABELS } from '../../../utils/imageMetadata';

/**
 * Declare what each metadata key means: its type, unit and allowed values.
 *
 * A key exists the moment someone types it, as a category — nothing has to be
 * set up first. This is where that guess gets corrected: marking `depth` as a
 * number turns its filter into a range, and locking a category's vocabulary
 * stops the next typo becoming a fourth subgroup.
 *
 * Two operations here can destroy work and are treated accordingly. **Retyping**
 * re-validates every stored value server-side and is refused, naming the
 * offenders, if any do not fit — the error is shown verbatim because it is the
 * only way to know which images to fix. **Delete** removes the key from every
 * image and asks first.
 */
const TYPE_ORDER = [
  MetadataValueType.CATEGORICAL,
  MetadataValueType.NUMBER,
  MetadataValueType.DATE,
  MetadataValueType.BOOLEAN,
  MetadataValueType.TEXT,
];

const KeyRow = ({ facet, datasetId, onChanged, onError }) => {
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newKey, setNewKey] = useState(facet.key);
  const [unit, setUnit] = useState(facet.unit || '');

  const run = async (action) => {
    setBusy(true);
    onError(null);
    try {
      await action();
      await onChanged();
    } catch (err) {
      onError(err.message || 'Could not update the key.');
    } finally {
      setBusy(false);
    }
  };

  const changeType = (valueType) =>
    run(() => api.updateDatasetMetadataKey(datasetId, facet.key, { value_type: valueType }));

  const commitUnit = () => {
    if ((facet.unit || '') === unit) return;
    run(() => api.updateDatasetMetadataKey(datasetId, facet.key, { unit }));
  };

  const commitRename = async (merge = false) => {
    const target = newKey.trim();
    if (!target || target === facet.key) {
      setRenaming(false);
      return;
    }
    await run(() => api.renameDatasetMetadataKey(datasetId, facet.key, target, merge));
    setRenaming(false);
  };

  const remove = () => {
    const confirmed = window.confirm(
      `Remove "${facet.key}" from all ${facet.image_count} image(s)? This cannot be undone.`
    );
    if (confirmed) run(() => api.deleteDatasetMetadataKey(datasetId, facet.key));
  };

  return (
    <div className="border border-ln rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        {renaming ? (
          <>
            <input
              autoFocus
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setNewKey(facet.key);
                  setRenaming(false);
                }
              }}
              className="flex-1 px-2 py-1 text-sm border border-ln2 rounded-md bg-p1 text-t1 focus:ring-2 focus:ring-ac focus:border-transparent"
            />
            <button
              onClick={() => commitRename(false)}
              className="px-2 py-1 text-xs font-medium rounded-md bg-accent text-onAccent hover:brightness-110"
            >
              Rename
            </button>
            {/* Merging is the repair for a key split by a typo, so it is offered
                right where the collision would otherwise just be an error. */}
            <button
              onClick={() => commitRename(true)}
              title="Rename, folding into an existing key of that name"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-t2 hover:bg-hv"
            >
              <Merge className="w-3.5 h-3.5" />
              Merge
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setRenaming(true)}
              className="font-medium text-sm text-t1 hover:text-ac transition-colors"
              title="Rename this key"
            >
              {facet.key}
            </button>
            <span className="text-xs text-t3">
              {facet.image_count} image{facet.image_count === 1 ? '' : 's'}
            </span>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-t3" />}
            <button
              onClick={remove}
              disabled={busy}
              className="ml-auto p-1 rounded-md text-t3 hover:text-err hover:bg-hv transition-colors"
              title="Remove this key from every image"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={facet.value_type}
          disabled={busy}
          onChange={(e) => changeType(e.target.value)}
          className="px-2 py-1 text-xs border border-ln2 rounded-md bg-p1 text-t1"
        >
          {TYPE_ORDER.map((type) => (
            <option key={type} value={type}>
              {VALUE_TYPE_LABELS[type].label}
            </option>
          ))}
        </select>

        {facet.value_type === MetadataValueType.NUMBER && (
          <input
            type="text"
            value={unit}
            placeholder="unit (m, °C)"
            disabled={busy}
            onChange={(e) => setUnit(e.target.value)}
            onBlur={commitUnit}
            className="w-28 px-2 py-1 text-xs border border-ln2 rounded-md bg-p1 text-t1"
          />
        )}

        <span className="text-[11px] text-t3">
          {VALUE_TYPE_LABELS[facet.value_type]?.hint}
        </span>
      </div>
    </div>
  );
};

const MetadataKeysModal = ({ isOpen, dataset, facets = [], onClose, onChanged }) => {
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        <div className="fixed inset-0 bg-scrim transition-opacity" onClick={onClose} />

        <div className="relative inline-block w-full max-w-xl text-left align-middle bg-p1 rounded-2xl shadow-xl overflow-hidden">
          <div className="relative bg-p2 border-b border-ln px-6 py-5 text-t1">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-lg text-t3 hover:text-t1 hover:bg-hv2 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Settings2 className="w-5 h-5" />
              Metadata keys
            </h3>
            <p className="text-sm text-t2 mt-0.5">{dataset?.name}</p>
          </div>

          <div className="px-6 py-5 space-y-3 max-h-[28rem] overflow-y-auto">
            {facets.length === 0 ? (
              <p className="text-sm text-t2">
                This dataset has no metadata keys yet. Tag an image or import a
                CSV, and the keys will appear here to be typed.
              </p>
            ) : (
              <>
                <p className="text-xs text-t3">
                  A key's type decides its filter and whether it can group a
                  quantification. Changing it re-checks every value already stored
                  and is refused if any of them no longer fit.
                </p>
                {facets.map((facet) => (
                  <KeyRow
                    key={facet.key}
                    facet={facet}
                    datasetId={dataset.id}
                    onChanged={onChanged}
                    onError={setError}
                  />
                ))}
              </>
            )}

            {error && (
              <div className="px-3 py-2 rounded-lg bg-errBg text-err text-sm">{error}</div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-ln flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-onAccent hover:brightness-110 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataKeysModal;
