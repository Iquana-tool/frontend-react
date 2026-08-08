import React from "react";
import { ChevronRight, Cpu, Sparkles, Star, Layers } from "lucide-react";

/**
 * The orchestration editor: the dataset's label hierarchy, with a model bound to each label.
 *
 * This is the whole point of the page. A user who trained one specialist per class points
 * each label at its own model; a user with one multiclass model points several labels at it
 * and the backend filters its output down to each label in turn. Labels left on "Skip" are
 * simply not part of the run.
 *
 * The tree is rendered *by level*, not as a nested outline, because the level is what the run
 * actually does: everything at level 1 is annotated across the whole dataset before anything
 * at level 2 starts, so a child model always has parent instances to nest its predictions in.
 * The heading on each level block says so.
 */

const SKIP = "";

/** Group labels by hierarchy depth, with each label's parent name for the caption. */
export const groupLabelsByLevel = (labelsById) => {
    const labels = Object.values(labelsById || {});
    const depthOf = (label) => {
        let depth = 0;
        let current = label;
        // Hierarchies are a handful of levels deep; walking up is cheaper than a pre-pass.
        while (current?.parent_id != null && labelsById[current.parent_id]) {
            depth += 1;
            current = labelsById[current.parent_id];
        }
        return depth;
    };

    const byLevel = new Map();
    labels.forEach((label) => {
        const level = depthOf(label);
        if (!byLevel.has(level)) byLevel.set(level, []);
        byLevel.get(level).push({
            ...label,
            level,
            parentName: label.parent_id != null ? labelsById[label.parent_id]?.name : null,
        });
    });
    return [...byLevel.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([level, entries]) => ({
            level,
            labels: entries.sort((a, b) => a.name.localeCompare(b.name)),
        }));
};

/** Models that may be bound to a label: class-agnostic ones, plus those predicting it. */
export const modelsForLabel = (models, labelId) =>
    (models || []).filter(
        (model) => model.label_ids.length === 0 || model.label_ids.includes(labelId)
    );

function ModelRow({ label, step, models, strategies, onChange }) {
    const options = modelsForLabel(models, label.id);
    const selected = models.find(
        (model) => step && model.registry_key === step.model_registry_key && model.task === step.task
    );
    const isCrossImage = selected?.task === "cross-image-suggestion";

    const setModel = (value) => {
        if (value === SKIP) return onChange(label.id, null);
        const [task, registryKey] = value.split("::");
        onChange(label.id, {
            label_id: label.id,
            model_registry_key: registryKey,
            task,
            min_confidence: step?.min_confidence ?? 0,
            // A cross-image step needs a strategy; preselect the first available one so the
            // common case never requires opening the advanced row.
            retrieval_strategy:
                task === "cross-image-suggestion"
                    ? step?.retrieval_strategy ||
                      strategies.find((s) => s.available)?.key ||
                      null
                    : null,
            top_k: step?.top_k ?? 5,
        });
    };

    return (
        <div className="border border-ln rounded-xl bg-p1 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        {label.parentName && <ChevronRight size={13} className="text-t3 shrink-0" />}
                        <span className="text-sm font-medium text-t1 truncate">{label.name}</span>
                    </div>
                    {label.parentName && (
                        <p className="text-[11px] text-t3 mt-0.5">
                            nested inside {label.parentName}
                        </p>
                    )}
                </div>

                <select
                    value={step ? `${step.task}::${step.model_registry_key}` : SKIP}
                    onChange={(event) => setModel(event.target.value)}
                    className="w-full sm:w-72 px-3 py-1.5 text-sm border border-ln2 rounded-lg bg-well text-t1 focus:ring-2 focus:ring-ac focus:border-transparent"
                    aria-label={`Model for ${label.name}`}
                >
                    <option value={SKIP}>Skip this label</option>
                    {options.map((model) => (
                        <option
                            key={`${model.task}::${model.registry_key}`}
                            value={`${model.task}::${model.registry_key}`}
                        >
                            {model.name}
                            {model.trained_on_dataset ? " ★" : ""}
                            {model.task === "cross-image-suggestion" ? " (in-context)" : ""}
                        </option>
                    ))}
                    {options.length === 0 && <option disabled>No compatible model</option>}
                </select>
            </div>

            {step && selected && (
                <div className="px-3 pb-2.5 pt-0 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {selected.trained_on_dataset && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-ok">
                            <Star size={11} /> trained on this dataset
                        </span>
                    )}
                    {selected.label_ids.length > 1 && (
                        <span className="text-[11px] text-t3">
                            Predicts {selected.label_ids.length} classes — output filtered to “{label.name}”.
                        </span>
                    )}
                    {selected.label_ids.length === 0 && (
                        <span className="text-[11px] text-t3">
                            Class-agnostic — everything it finds is labelled “{label.name}”.
                        </span>
                    )}

                    <label className="inline-flex items-center gap-1.5 text-[11px] text-t2">
                        Min. confidence
                        <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.05}
                            value={step.min_confidence ?? 0}
                            onChange={(event) =>
                                onChange(label.id, {
                                    ...step,
                                    min_confidence: Number(event.target.value),
                                })
                            }
                            className="w-16 px-1.5 py-0.5 text-[11px] border border-ln rounded bg-well text-t1"
                        />
                    </label>

                    {isCrossImage && (
                        <>
                            <label className="inline-flex items-center gap-1.5 text-[11px] text-t2">
                                Exemplars
                                {/* Only runnable strategies are listed. The backend marks a
                                    strategy unavailable when this dataset lacks the
                                    embeddings it ranks by, and offering one anyway just
                                    means the user picks it and every image fails. */}
                                <select
                                    value={step.retrieval_strategy || ""}
                                    onChange={(event) =>
                                        onChange(label.id, {
                                            ...step,
                                            retrieval_strategy: event.target.value,
                                        })
                                    }
                                    className="px-1.5 py-0.5 text-[11px] border border-ln rounded bg-well text-t1"
                                >
                                    {strategies
                                        .filter((strategy) => strategy.available)
                                        .map((strategy) => (
                                            <option key={strategy.key} value={strategy.key}>
                                                {strategy.label || strategy.key}
                                            </option>
                                        ))}
                                </select>
                            </label>
                            <label className="inline-flex items-center gap-1.5 text-[11px] text-t2">
                                Top-k
                                <input
                                    type="number"
                                    min={1}
                                    max={32}
                                    value={step.top_k ?? 5}
                                    onChange={(event) =>
                                        onChange(label.id, {
                                            ...step,
                                            top_k: Number(event.target.value),
                                        })
                                    }
                                    className="w-14 px-1.5 py-0.5 text-[11px] border border-ln rounded bg-well text-t1"
                                />
                            </label>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function LabelModelPlanner({ labelsById, models, strategies, steps, onChange }) {
    const levels = groupLabelsByLevel(labelsById);
    const stepByLabel = new Map(steps.map((step) => [step.label_id, step]));

    if (levels.length === 0) {
        return (
            <p className="text-sm text-t3 p-4 border border-dashed border-ln2 rounded-xl">
                This dataset has no labels yet. Create the label hierarchy first.
            </p>
        );
    }

    return (
        <div className="space-y-5">
            {levels.map(({ level, labels }, index) => (
                <section key={level}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ac bg-acS px-2 py-0.5 rounded-full">
                            <Layers size={11} /> Level {level + 1}
                        </span>
                        <p className="text-[11px] text-t3">
                            {index === 0
                                ? "Runs first, across every image in scope."
                                : "Runs once the level above has finished the whole dataset, so predictions can be nested inside their parents."}
                        </p>
                    </div>
                    <div className="space-y-2">
                        {labels.map((label) => (
                            <ModelRow
                                key={label.id}
                                label={label}
                                step={stepByLabel.get(label.id) || null}
                                models={models}
                                strategies={strategies}
                                onChange={onChange}
                            />
                        ))}
                    </div>
                </section>
            ))}

            <p className="flex items-start gap-2 text-[11px] text-t3">
                <Cpu size={13} className="shrink-0 mt-0.5" />
                Models marked ★ were trained on this dataset. A model that predicts several
                classes can be bound to more than one label — its output is filtered down to
                whichever label it is bound to, so mixing specialists and multiclass models in
                one run is fine.
            </p>
            {models.some((model) => model.task === "cross-image-suggestion") && (
                <p className="flex items-start gap-2 text-[11px] text-t3">
                    <Sparkles size={13} className="shrink-0 mt-0.5" />
                    In-context models annotate by example: they pull exemplars of the label from
                    other images in the dataset instead of relying on trained weights.
                </p>
            )}
        </div>
    );
}
