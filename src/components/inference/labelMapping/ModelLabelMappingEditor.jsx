import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, RotateCcw, Tags } from "lucide-react";
import { getModelLabelMapping, saveModelLabelMapping } from "../../../api/modelLabelMappings";
import {
  CREATE,
  DISCARD,
  RESET,
  UNMAPPED,
  changesFromDraft,
  choiceOf,
  draftFromMapping,
  labelChoice,
  labelOptions,
  mappingSummary,
  orderedClasses,
} from "./labelMappingModel";

const SOURCE_HINT = {
  saved: null,
  suggested: "same name",
  none: null,
};

/**
 * One model's label space, class by class, with what each class means in this dataset:
 * one of its labels, discarded, or added as a new label. Classes the model nests (vessels
 * part of the choroid) are indented under their parent; a label created for such a class is
 * nested under the parent's label.
 */
export default function ModelLabelMappingEditor({
  datasetId,
  registryKey,
  modelName,
  labelsById,
  canEdit = false,
  canCreateLabels = false,
  onSaved,
}) {
  const [mapping, setMapping] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getModelLabelMapping(datasetId, registryKey)
      .then((loaded) => {
        if (cancelled) return;
        setMapping(loaded);
        setDraft(draftFromMapping(loaded));
      })
      .catch((e) => !cancelled && setError(e.message || "Could not load the label mapping."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [datasetId, registryKey]);

  const rows = useMemo(() => orderedClasses(mapping?.classes), [mapping]);
  const options = useMemo(() => labelOptions(labelsById), [labelsById]);
  const changes = useMemo(() => changesFromDraft(mapping, draft), [mapping, draft]);
  const summary = mappingSummary(mapping);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveModelLabelMapping(datasetId, registryKey, changes);
      setMapping(saved);
      setDraft(draftFromMapping(saved));
      onSaved?.(saved, changes);
    } catch (e) {
      setError(e.message || "Could not save the label mapping.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="bg-p1 border border-ln rounded-2xl overflow-hidden"
      data-testid={`label-mapping-${registryKey}`}
    >
      <header className="px-4 py-3 border-b border-ln flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Tags size={15} className="text-teal-400 shrink-0" />
          <h3 className="text-sm font-semibold text-t1 truncate">{modelName || registryKey}</h3>
        </div>
        {mapping && (
          <span className="text-[11px] text-t3">
            {summary.mapped} of {summary.total} classes labelled
            {summary.discarded > 0 && ` · ${summary.discarded} discarded`}
            {summary.unmapped > 0 && ` · ${summary.unmapped} unlabelled`}
          </span>
        )}
      </header>

      {loading ? (
        <div className="flex items-center gap-2 p-4 text-xs text-t3">
          <Loader2 size={14} className="animate-spin text-ac" /> Loading label space…
        </div>
      ) : (
        <div className="divide-y divide-ln">
          {rows.map(({ entry, depth }) => {
            const key = entry.model_class.key;
            const choice = draft[key] ?? choiceOf(entry);
            const hint = choice === choiceOf(entry) ? SOURCE_HINT[entry.source] : null;
            return (
              <div key={key} className="px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <div className="flex-1 min-w-[10rem]" style={{ paddingLeft: `${depth * 1.25}rem` }}>
                  <div className="text-xs font-medium text-t1">
                    {depth > 0 && <span className="text-t3 mr-1">↳</span>}
                    {entry.model_class.name}
                  </div>
                  {entry.model_class.description && (
                    <div className="text-[11px] text-t3">{entry.model_class.description}</div>
                  )}
                </div>
                <ArrowRight size={13} className="text-t3 shrink-0" />
                <div className="flex items-center gap-2 w-full sm:w-72">
                  <select
                    aria-label={`Label for ${entry.model_class.name}`}
                    value={choice}
                    disabled={!canEdit || saving}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-well border border-ln2 text-xs text-t1 focus:outline-none focus:border-teal-500/60"
                  >
                    {choice === UNMAPPED && <option value={UNMAPPED}>Not labelled yet</option>}
                    <optgroup label="Dataset labels">
                      {options.map((label) => (
                        <option key={label.id} value={labelChoice(label.id)}>
                          {"  ".repeat(label.depth)}
                          {label.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other">
                      {canCreateLabels && (
                        <option value={CREATE}>+ Add “{entry.model_class.name}” as a new label</option>
                      )}
                      <option value={DISCARD}>Discard these predictions</option>
                      {entry.source === "saved" && (
                        <option value={RESET}>Forget this choice</option>
                      )}
                    </optgroup>
                  </select>
                  {hint && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-500 border border-teal-500/30 whitespace-nowrap">
                      {hint}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(error || (canEdit && changes.length > 0)) && (
        <footer className="px-4 py-2.5 border-t border-ln flex flex-wrap items-center justify-end gap-2">
          {error && <span className="text-[11px] text-err mr-auto">{error}</span>}
          {changes.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setDraft(draftFromMapping(mapping))}
                disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-t2 hover:text-t1 bg-well border border-ln rounded-lg hover:bg-hv transition disabled:opacity-50"
              >
                <RotateCcw size={12} /> Undo changes
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition disabled:opacity-50"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                Save {changes.length} change{changes.length > 1 ? "s" : ""}
              </button>
            </>
          )}
        </footer>
      )}
    </section>
  );
}
