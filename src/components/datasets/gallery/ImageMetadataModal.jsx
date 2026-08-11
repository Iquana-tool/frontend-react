import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Tag, Trash2, X } from 'lucide-react';
import * as api from '../../../api';
import {
  MetadataValueType,
  mergeMetadata,
  normalizeKey,
  normalizeValue,
} from '../../../utils/imageMetadata';

/**
 * Edit the metadata of one image, or of a whole selection at once.
 *
 * One component for both because tagging forty images is the same gesture as
 * tagging one, and a separate bulk dialog would drift out of step with the
 * single-image one. The only difference is how a *disagreement* is handled: a key
 * the selected images do not agree on shows as "multiple values" and is left
 * alone unless it is typed into, so opening the editor on a mixed selection and
 * pressing Save cannot silently flatten the differences.
 *
 * Existing keys and values are offered as datalist suggestions. The backend
 * deliberately keeps `Site` and `site` apart (it cannot know they were meant to
 * be the same), so preventing the near-duplicate at the point of typing is the
 * only cheap place to do it.
 */
const ImageMetadataModal = ({ isOpen, images = [], facets = [], onClose, onSaved }) => {
  const [rows, setRows] = useState([]);
  const [initialKeys, setInitialKeys] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isBulk = images.length > 1;

  // Reset the form whenever the dialog is opened on a different selection.
  useEffect(() => {
    if (!isOpen) return;
    const merged = mergeMetadata(images);
    setRows(merged.length > 0 ? merged : [{ key: '', value: '', mixed: false }]);
    setInitialKeys(merged.map((row) => row.key));
    setError(null);
  }, [isOpen, images]);

  const facetsByKey = useMemo(() => {
    const map = new Map();
    facets.forEach((facet) => map.set(facet.key, facet));
    return map;
  }, [facets]);

  if (!isOpen) return null;

  const updateRow = (index, patch) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );

  const removeRow = (index) =>
    setRows((current) => current.filter((_, i) => i !== index));

  const addRow = () =>
    setRows((current) => [...current, { key: '', value: '', mixed: false }]);

  /**
   * Turn the form into the two things the API takes: pairs to write, and keys to
   * delete. A row is skipped when it is still mixed and untouched — that is the
   * "leave the disagreement alone" rule. A row whose key was cleared, or that was
   * removed outright, becomes a deletion.
   */
  const buildPayload = () => {
    const entries = {};
    const seen = new Set();
    for (const row of rows) {
      const key = normalizeKey(row.key);
      if (!key) continue;
      if (row.mixed && !row.touched) {
        seen.add(key);
        continue;
      }
      if (seen.has(key) && entries[key] !== undefined) {
        throw new Error(`"${key}" is listed twice. Remove one of the rows.`);
      }
      seen.add(key);
      entries[key] = normalizeValue(row.value);
    }
    const removeKeys = initialKeys.filter((key) => !seen.has(key));
    return { entries, removeKeys };
  };

  const handleSave = async () => {
    setError(null);
    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      setError(err.message);
      return;
    }
    if (Object.keys(payload.entries).length === 0 && payload.removeKeys.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      // The bulk endpoint is additive plus explicit removals, which is exactly
      // what the form means — so one image and forty take the same path.
      const response = await api.setMetadataForImages(
        images.map((image) => image.id),
        payload.entries,
        payload.removeKeys
      );
      onSaved?.(response);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save the metadata.');
    } finally {
      setSaving(false);
    }
  };

  const subtitle = isBulk
    ? `${images.length} images selected`
    : images[0]?.file_name || images[0]?.name || `Image ${images[0]?.id}`;

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
              <Tag className="w-5 h-5" />
              Image metadata
            </h3>
            <p className="text-sm text-t2 mt-0.5 truncate">{subtitle}</p>
          </div>

          <div className="px-6 py-5">
            <p className="text-xs text-t3 mb-3">
              Key/value pairs that group these images into subgroups — site,
              transect, treatment, collection date. They travel with the
              measurements into the COCO and quantification exports.
            </p>

            <datalist id="metadata-key-suggestions">
              {facets.map((facet) => (
                <option key={facet.key} value={facet.key} />
              ))}
            </datalist>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {rows.map((row, index) => {
                const facet = facetsByKey.get(normalizeKey(row.key));
                const valueType = facet?.value_type || MetadataValueType.CATEGORICAL;
                const suggestions = facet
                  ? (facet.options?.length ? facet.options : facet.values.map((v) => v.value))
                  : [];
                const listId = `metadata-values-${index}`;
                const showMixed = row.mixed && !row.touched;
                // The input matches the key's declared type, so a bad value is
                // caught by the browser before the request rather than coming
                // back as a 422 — and a locked vocabulary becomes a dropdown,
                // which is the whole point of locking it.
                const isLocked = valueType === MetadataValueType.CATEGORICAL
                  && Boolean(facet?.options?.length);
                const inputType = valueType === MetadataValueType.NUMBER ? 'number'
                  : valueType === MetadataValueType.DATE ? 'date'
                  : 'text';
                const valueClass = `flex-1 px-2.5 py-1.5 text-sm border rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac focus:border-transparent ${
                  showMixed
                    ? 'border-warnLn placeholder:italic placeholder:text-warn'
                    : 'border-ln2'
                }`;

                return (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.key}
                      list="metadata-key-suggestions"
                      placeholder="key"
                      onChange={(e) => updateRow(index, { key: e.target.value, touched: true })}
                      className="w-2/5 px-2.5 py-1.5 text-sm border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac focus:border-transparent"
                    />

                    {isLocked ? (
                      <select
                        value={row.value}
                        onChange={(e) => updateRow(index, { value: e.target.value, touched: true })}
                        className={valueClass}
                      >
                        <option value="">{showMixed ? 'multiple values' : '—'}</option>
                        {facet.options.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : valueType === MetadataValueType.BOOLEAN ? (
                      <select
                        value={row.value}
                        onChange={(e) => updateRow(index, { value: e.target.value, touched: true })}
                        className={valueClass}
                      >
                        <option value="">{showMixed ? 'multiple values' : '—'}</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <>
                        <datalist id={listId}>
                          {suggestions.map((value) => (
                            <option key={value} value={value} />
                          ))}
                        </datalist>
                        <input
                          type={inputType}
                          value={row.value}
                          list={inputType === 'text' ? listId : undefined}
                          placeholder={showMixed ? 'multiple values' : (facet?.unit || 'value')}
                          onChange={(e) => updateRow(index, { value: e.target.value, touched: true })}
                          className={valueClass}
                        />
                      </>
                    )}

                    <button
                      onClick={() => removeRow(index)}
                      className="p-1.5 rounded-lg text-t3 hover:text-err hover:bg-hv transition-colors"
                      title={isBulk ? 'Remove this key from every selected image'
                                    : 'Remove this key'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={addRow}
              className="mt-3 inline-flex items-center gap-1 text-sm text-ac hover:brightness-110"
            >
              <Plus className="w-4 h-4" />
              Add field
            </button>

            {isBulk && (
              <p className="mt-3 text-xs text-t3">
                Saving writes these fields to all {images.length} images. Keys not
                listed here are left untouched — clear a field with the bin icon to
                remove it from every selected image.
              </p>
            )}

            {error && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-errBg text-err text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-ln flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg text-t2 hover:bg-hv transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-onAccent hover:brightness-110 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageMetadataModal;
