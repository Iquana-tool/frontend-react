import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Copy, Pencil, Plus, Sigma, Trash2, X } from "lucide-react";
import {
  copyDerivedMetrics,
  createDerivedMetric,
  deleteDerivedMetric,
  listDerivedMetrics,
  previewDerivedMetric,
  updateDerivedMetric,
} from "../../../api/derivedMetrics";
import { fetchDatasets } from "../../../api/datasets";
import {
  TEMPLATES,
  describeExponent,
  formulaText,
  slugifyKey,
  unitForExponent,
} from "../../../utils/derivedMetrics";
import ExpressionEditor, { LabelChips } from "./ExpressionEditor";

const readable = (err, fallback) => (err?.message || "").replace(/^API (Validation )?Error:\s*/i, "") || fallback;

const formatValue = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) return value.toExponential(3);
  return Number(value.toPrecision(5)).toString();
};

const flattenLabels = (labels) => {
  const out = [];
  const visit = (list) =>
    (list || []).forEach((l) => {
      out.push({ id: l.id, name: l.name });
      visit(l.children);
    });
  visit(labels?.root_level_labels);
  return out;
};

/** Live check of the formula being edited: unit, statistics and a few objects. */
const PreviewPane = ({ state, displayUnit }) => {
  if (state.loading && !state.result) {
    return <p className="text-sm text-t3">Computing…</p>;
  }
  if (state.error) {
    return <p className="text-sm text-err">{state.error}</p>;
  }
  const result = state.result;
  if (!result) return null;
  if (!result.ok) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-warnLn bg-warnBg px-3 py-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 text-warn flex-shrink-0" />
        <ul className="text-sm text-warn space-y-0.5">
          {result.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    );
  }
  const unit = result.unit;
  const s = result.summary;
  return (
    <div className={`space-y-3 ${state.loading ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-t2">
          Unit: <span className="font-medium text-t1">{unit || "none"}</span>{" "}
          <span className="text-t3">({describeExponent(result.unit_exponent)})</span>
        </span>
        <span className="text-t2">
          {result.objects_in_scope} {result.objects_in_scope === 1 ? "object" : "objects"} in scope
          {result.objects_without_value > 0 && (
            <span className="text-warn"> · {result.objects_without_value} without a value</span>
          )}
        </span>
      </div>
      {displayUnit === "px" && result.unit_exponent !== 0 && (
        <p className="text-xs text-t3">
          Shown in pixels because not every image has the same scale; with calibrated images
          this is reported in real-world units.
        </p>
      )}
      {s ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            ["Mean", s.mean],
            ["SD", s.std],
            ["Min", s.min],
            ["Max", s.max],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-well px-2 py-1.5">
              <p className="text-[11px] text-t3">{label}</p>
              <p className="text-sm font-medium text-t1">
                {formatValue(value)} <span className="text-t3 text-xs">{unit}</span>
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-t3">No object has a value yet.</p>
      )}
      {result.samples.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-t3 text-left">
              <th className="font-normal py-1">Object</th>
              <th className="font-normal py-1">Image</th>
              <th className="font-normal py-1 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {result.samples.map((row) => (
              <tr key={row.contour_id} className="border-t border-ln text-t2">
                <td className="py-1">
                  {row.label} #{row.contour_id}
                </td>
                <td className="py-1 truncate max-w-[12rem]">{row.file_name}</td>
                <td className="py-1 text-right font-mono">
                  {formatValue(row.value)} {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

/** Create or edit one definition. */
const DefinitionEditor = ({
  datasetId,
  initial,
  existingKeys,
  metricOptions,
  labels,
  filters,
  displayUnit,
  onSaved,
  onCancel,
}) => {
  const isNew = !initial?.id;
  const [name, setName] = useState(initial?.name || "");
  const [key, setKey] = useState(initial?.key || "");
  const [keyTouched, setKeyTouched] = useState(!isNew);
  const [description, setDescription] = useState(initial?.description || "");
  const [labelIds, setLabelIds] = useState(initial ? initial.label_ids : null);
  const [expression, setExpression] = useState(initial?.expression || TEMPLATES[0].expression);
  const [preview, setPreview] = useState({ loading: false, result: null, error: null });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const requestRef = useRef(0);

  const effectiveKey = keyTouched ? key : slugifyKey(name);
  const keyClash = isNew && existingKeys.includes(effectiveKey);

  // A derived metric cannot read itself; offering it in the picker would only invite that.
  const options = useMemo(
    () => metricOptions.filter((m) => m.key !== initial?.key),
    [metricOptions, initial]
  );
  const labelName = useMemo(() => {
    const map = new Map(labels.map((l) => [l.id, l.name]));
    return (id) => map.get(id) || `deleted label #${id}`;
  }, [labels]);
  const metricName = useMemo(() => {
    const map = new Map(metricOptions.map((m) => [m.key, m]));
    return (k, component) => {
      const entry = map.get(k);
      if (!entry) return k || "?";
      return (entry.value_dim || 1) > 1 ? `${entry.name} (${entry.components?.[component] ?? component})` : entry.name;
    };
  }, [metricOptions]);

  const definition = useMemo(
    () => ({
      key: effectiveKey || "draft",
      name: name || "Draft",
      description,
      label_ids: labelIds,
      expression,
    }),
    [effectiveKey, name, description, labelIds, expression]
  );
  const previewKey = JSON.stringify([definition, filters]);

  // Debounced preview: the formula is re-checked and re-computed as it is edited.
  useEffect(() => {
    const request = ++requestRef.current;
    setPreview((p) => ({ ...p, loading: true }));
    const timer = setTimeout(async () => {
      try {
        const result = await previewDerivedMetric(datasetId, definition, {
          id: initial?.id ?? null,
          excludeNotFullyAnnotated: filters.excludeNotFullyAnnotated,
          excludeUnreviewed: filters.excludeUnreviewed,
        });
        if (request === requestRef.current) setPreview({ loading: false, result, error: null });
      } catch (err) {
        if (request === requestRef.current)
          setPreview({ loading: false, result: null, error: readable(err, "Preview failed") });
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, datasetId]);

  const keyValid = /^[a-z][a-z0-9_]{0,47}$/.test(effectiveKey);
  const canSave = name.trim() && keyValid && !keyClash && preview.result?.ok && !saving;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const body = { ...definition, key: effectiveKey, name: name.trim() };
      if (isNew) await createDerivedMetric(datasetId, body);
      else await updateDerivedMetric(datasetId, initial.id, body);
      await onSaved();
    } catch (err) {
      setSaveError(readable(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {isNew && (
        <div>
          <h4 className="text-sm font-semibold text-t2 mb-2">Start from</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setExpression(t.expression)}
                className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                  JSON.stringify(expression) === JSON.stringify(t.expression)
                    ? "border-acLn bg-acS"
                    : "border-ln hover:bg-hv"
                }`}
              >
                <p className="text-sm font-medium text-t1">{t.name}</p>
                {t.example && <p className="text-xs text-t3">{t.example}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-t2 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Choroidal vascularity index"
            className="w-full px-3 py-2 text-sm border border-ln2 rounded-lg bg-p1 focus:outline-none focus:ring-2 focus:ring-ac"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-t2 mb-1">
            Column name {!isNew && <span className="text-t3 font-normal">(fixed)</span>}
          </label>
          <input
            type="text"
            value={effectiveKey}
            disabled={!isNew}
            onChange={(e) => {
              setKeyTouched(true);
              setKey(e.target.value);
            }}
            placeholder="cvi"
            className="w-full px-3 py-2 text-sm font-mono border border-ln2 rounded-lg bg-p1 focus:outline-none focus:ring-2 focus:ring-ac disabled:bg-well disabled:text-t3"
          />
          {isNew && effectiveKey && !keyValid && (
            <p className="text-xs text-warn mt-1">Lowercase letters, digits and _; starting with a letter.</p>
          )}
          {keyClash && <p className="text-xs text-warn mt-1">This dataset already uses that name.</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-t2 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What it measures, and the reference it follows."
          className="w-full px-3 py-2 text-sm border border-ln2 rounded-lg bg-p1 focus:outline-none focus:ring-2 focus:ring-ac"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-t2 mb-1">Reported on</label>
        <LabelChips value={labelIds} onChange={setLabelIds} labels={labels} anyText="All labels" />
      </div>

      <div>
        <label className="block text-sm font-medium text-t2 mb-1">Formula</label>
        <ExpressionEditor node={expression} onChange={setExpression} metricOptions={options} labels={labels} />
        <p className="mt-2 text-sm text-t2 font-mono break-words">
          = {formulaText(expression, { metricName, labelName })}
        </p>
      </div>

      <div className="rounded-lg border border-ln p-3">
        <h4 className="text-sm font-semibold text-t2 mb-2">Preview</h4>
        <PreviewPane state={preview} displayUnit={displayUnit} />
      </div>

      {saveError && (
        <div className="text-sm text-err bg-errBg border border-errLn rounded-lg px-3 py-2">{saveError}</div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-t2 bg-well rounded-lg hover:bg-hv2 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="px-4 py-2 text-sm font-medium text-onAccent bg-accent rounded-lg hover:brightness-110 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : isNew ? "Add measurement" : "Save"}
        </button>
      </div>
    </div>
  );
};

/** Copy definitions in from another dataset the user can see. */
const CopyFromDataset = ({ datasetId, onCopied, onCancel }) => {
  const [datasets, setDatasets] = useState(null);
  const [sourceId, setSourceId] = useState("");
  const [sourceDefs, setSourceDefs] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchDatasets()
      .then((res) => setDatasets((res.datasets || []).filter((d) => d.id !== datasetId)))
      .catch((err) => setError(readable(err, "Could not list datasets")));
  }, [datasetId]);

  useEffect(() => {
    if (!sourceId) return;
    setSourceDefs(null);
    setError(null);
    listDerivedMetrics(Number(sourceId))
      .then((res) => {
        const defs = res.derived_metrics || [];
        setSourceDefs(defs);
        setSelected(new Set(defs.filter((d) => !d.problems?.length).map((d) => d.key)));
      })
      .catch((err) => setError(readable(err, "Could not load that dataset's measurements")));
  }, [sourceId]);

  const copy = async () => {
    setBusy(true);
    setError(null);
    try {
      await copyDerivedMetrics(datasetId, Number(sourceId), [...selected]);
      await onCopied();
    } catch (err) {
      setError(readable(err, "Copy failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-t2">
        Labels are matched by name, so the other dataset's labels must exist here too. Measurements a
        copied one builds on are copied along.
      </p>
      <select
        value={sourceId}
        onChange={(e) => setSourceId(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-ln2 rounded-lg bg-p1 focus:outline-none focus:ring-2 focus:ring-ac"
      >
        <option value="">{datasets ? "Pick a dataset…" : "Loading datasets…"}</option>
        {(datasets || []).map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      {sourceDefs && sourceDefs.length === 0 && (
        <p className="text-sm text-t3">That dataset has no derived measurements.</p>
      )}
      {sourceDefs && sourceDefs.length > 0 && (
        <div className="space-y-1.5">
          {sourceDefs.map((d) => (
            <label key={d.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(d.key)}
                onChange={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(d.key)) next.delete(d.key);
                    else next.add(d.key);
                    return next;
                  })
                }
              />
              <span className="text-t1">{d.name}</span>
              <span className="font-mono text-xs text-t3">{d.key}</span>
            </label>
          ))}
        </div>
      )}
      {error && <div className="text-sm text-err bg-errBg border border-errLn rounded-lg px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-t2 bg-well rounded-lg hover:bg-hv2 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={busy || !sourceId || selected.size === 0}
          className="px-4 py-2 text-sm font-medium text-onAccent bg-accent rounded-lg hover:brightness-110 transition-colors disabled:opacity-50"
        >
          {busy ? "Copying…" : `Copy ${selected.size || ""}`}
        </button>
      </div>
    </div>
  );
};

/**
 * The dataset's derived measurements: list, define, edit, copy in.
 *
 * @param {Object[]} props.definitions - From `listDerivedMetrics`.
 * @param {Object[]} props.catalog - The registry catalog (direct measurements).
 * @param {Object} props.labels - The label hierarchy dump.
 * @param {boolean} props.canEdit - Whether the user may change dataset configuration.
 * @param {Object} props.filters - `{excludeNotFullyAnnotated, excludeUnreviewed}` the page uses.
 * @param {string} props.displayUnit - The page's length unit ("px" when scales are mixed).
 * @param {Function} props.onChanged - Called after any write; the page reloads.
 */
const DerivedMetricsPanel = ({
  datasetId,
  definitions,
  catalog,
  labels,
  canEdit,
  filters,
  displayUnit,
  onChanged,
  onClose,
}) => {
  const [mode, setMode] = useState({ view: "list" }); // list | edit {definition} | copy
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState(null);

  const allLabels = useMemo(() => flattenLabels(labels), [labels]);
  const labelName = useMemo(() => {
    const map = new Map(allLabels.map((l) => [l.id, l.name]));
    return (id) => map.get(id) || `deleted label #${id}`;
  }, [allLabels]);

  const metricOptions = useMemo(
    () => [
      ...catalog.map((m) => ({ ...m, derived: false })),
      ...definitions.map((d) => ({ key: d.key, name: d.name, value_dim: 1, derived: true })),
    ],
    [catalog, definitions]
  );
  const metricName = useMemo(() => {
    const map = new Map(metricOptions.map((m) => [m.key, m]));
    return (k, component) => {
      const entry = map.get(k);
      if (!entry) return k || "?";
      return (entry.value_dim || 1) > 1 ? `${entry.name} (${entry.components?.[component] ?? component})` : entry.name;
    };
  }, [metricOptions]);

  const finish = async () => {
    await onChanged();
    setMode({ view: "list" });
  };

  const remove = async (definition) => {
    setError(null);
    try {
      await deleteDerivedMetric(datasetId, definition.id);
      setConfirmDelete(null);
      await onChanged();
    } catch (err) {
      setConfirmDelete(null);
      setError(readable(err, "Failed to delete"));
    }
  };

  const title =
    mode.view === "edit"
      ? mode.definition
        ? `Edit “${mode.definition.name}”`
        : "New derived measurement"
      : mode.view === "copy"
        ? "Copy from another dataset"
        : "Derived measurements";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
      <div className="bg-p1 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ln sticky top-0 bg-p1 z-10">
          <h3 className="text-lg font-semibold text-t1 flex items-center gap-2">
            <Sigma className="w-5 h-5 text-ac" />
            {title}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-hv rounded" aria-label="Close">
            <X className="w-5 h-5 text-t3" />
          </button>
        </div>

        <div className="px-6 py-5">
          {mode.view === "edit" && (
            <DefinitionEditor
              datasetId={datasetId}
              initial={mode.definition}
              existingKeys={definitions.map((d) => d.key)}
              metricOptions={metricOptions}
              labels={allLabels}
              filters={filters}
              displayUnit={displayUnit}
              onSaved={finish}
              onCancel={() => setMode({ view: "list" })}
            />
          )}

          {mode.view === "copy" && (
            <CopyFromDataset datasetId={datasetId} onCopied={finish} onCancel={() => setMode({ view: "list" })} />
          )}

          {mode.view === "list" && (
            <div className="space-y-4">
              <p className="text-sm text-t2">
                Formulas over the measured values that only this dataset needs — a vascularity
                index, a polyp density. They are computed from the stored measurements whenever
                the page is read, appear as cards, as columns in the Objects table and in the CSV
                export, and their unit follows from the formula.
              </p>

              {error && (
                <div className="text-sm text-err bg-errBg border border-errLn rounded-lg px-3 py-2">{error}</div>
              )}

              {definitions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-ln2 px-4 py-8 text-center text-sm text-t3">
                  No derived measurements yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {definitions.map((d) => {
                    const broken = d.problems?.length > 0;
                    return (
                      <li key={d.id} className={`rounded-lg border p-3 ${broken ? "border-warnLn" : "border-ln"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-t1">
                              {d.name}{" "}
                              <span className="font-mono text-xs text-t3">{d.key}</span>
                              {!broken && (
                                <span className="ml-2 text-xs text-t3 bg-well px-1.5 py-0.5 rounded">
                                  {unitForExponent(d.unit_exponent, displayUnit) || "unitless"}
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-t2 font-mono mt-1 break-words">
                              {formulaText(d.expression, { metricName, labelName })}
                            </p>
                            <p className="text-xs text-t3 mt-1">
                              Reported on{" "}
                              {d.label_ids === null ? "all labels" : d.label_ids.map(labelName).join(", ")}
                            </p>
                            {d.description && <p className="text-xs text-t3 mt-1">{d.description}</p>}
                            {broken && (
                              <ul className="mt-2 text-xs text-warn space-y-0.5">
                                {d.problems.map((p) => (
                                  <li key={p} className="flex gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                    {p} Not computed until fixed.
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {confirmDelete === d.id ? (
                                <>
                                  <button
                                    onClick={() => remove(d)}
                                    className="px-2 py-1 text-xs font-medium text-onAccent bg-err rounded-md"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="px-2 py-1 text-xs text-t2 bg-well rounded-md"
                                  >
                                    Keep
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setMode({ view: "edit", definition: d })}
                                    className="p-1.5 rounded-md hover:bg-hv text-t2"
                                    aria-label={`Edit ${d.name}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelete(d.id)}
                                    className="p-1.5 rounded-md hover:bg-errBg text-err"
                                    aria-label={`Delete ${d.name}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {canEdit ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMode({ view: "edit", definition: null })}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-onAccent bg-accent rounded-lg hover:brightness-110"
                  >
                    <Plus className="w-4 h-4" />
                    New measurement
                  </button>
                  <button
                    onClick={() => setMode({ view: "copy" })}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-t2 bg-well rounded-lg hover:bg-hv2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy from another dataset
                  </button>
                </div>
              ) : (
                <p className="text-xs text-t3">Only curators and owners of this dataset can change these.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DerivedMetricsPanel;
