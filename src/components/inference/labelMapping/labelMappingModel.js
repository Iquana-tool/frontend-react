/**
 * Pure logic behind the model label mapping editor.
 *
 * The editor holds one choice per model class:
 *   "label:<id>"  map to that dataset label
 *   "discard"     drop the class's predictions
 *   "create"      add the class as a new dataset label
 *   "unmapped"    nothing chosen -- predictions stay unlabelled
 *   "reset"       forget a saved choice (fall back to the same-name label, if any)
 * Only choices that differ from what the class currently resolves to are sent.
 */

export const DISCARD = "discard";
export const CREATE = "create";
export const UNMAPPED = "unmapped";
export const RESET = "reset";

export const labelChoice = (labelId) => `label:${labelId}`;

const labelIdOf = (choice) =>
  typeof choice === "string" && choice.startsWith("label:") ? Number(choice.slice(6)) : null;

/** The choice a resolved class entry stands for right now. */
export const choiceOf = (entry) => {
  if (entry.action === "map" && entry.label_id != null) return labelChoice(entry.label_id);
  if (entry.action === DISCARD) return DISCARD;
  return UNMAPPED;
};

/** `{classKey: choice}` for every class of a mapping response. */
export const draftFromMapping = (mapping) =>
  Object.fromEntries((mapping?.classes || []).map((entry) => [entry.model_class.key, choiceOf(entry)]));

/** The PUT body entries for whatever the draft changes. */
export const changesFromDraft = (mapping, draft) => {
  const changes = [];
  for (const entry of mapping?.classes || []) {
    const key = entry.model_class.key;
    const choice = draft[key];
    if (choice == null || choice === choiceOf(entry)) continue;
    if (choice === RESET) {
      changes.push({ model_class: key, action: UNMAPPED });
    } else if (choice === DISCARD) {
      changes.push({ model_class: key, action: DISCARD });
    } else if (choice === CREATE) {
      changes.push({ model_class: key, action: CREATE });
    } else if (labelIdOf(choice) != null) {
      changes.push({ model_class: key, action: "map", label_id: labelIdOf(choice) });
    } else if (choice === UNMAPPED && entry.source === "saved") {
      changes.push({ model_class: key, action: UNMAPPED });
    }
  }
  return changes;
};

/**
 * Classes ordered parent first, each with its depth in the model's `part_of` tree, so the
 * editor can show vessels indented under the choroid.
 */
export const orderedClasses = (entries) => {
  const list = entries || [];
  const keys = new Set(list.map((e) => e.model_class.key));
  const children = {};
  const roots = [];
  for (const entry of list) {
    const parent = entry.model_class.part_of;
    if (parent && keys.has(parent) && parent !== entry.model_class.key) {
      (children[parent] = children[parent] || []).push(entry);
    } else {
      roots.push(entry);
    }
  }
  const out = [];
  const seen = new Set();
  const walk = (entry, depth) => {
    if (seen.has(entry.model_class.key)) return;
    seen.add(entry.model_class.key);
    out.push({ entry, depth });
    for (const child of children[entry.model_class.key] || []) walk(child, depth + 1);
  };
  roots.forEach((entry) => walk(entry, 0));
  list.forEach((entry) => walk(entry, 0)); // anything left in a part_of cycle
  return out;
};

/** Dataset labels as `[{id, name, depth}]`, parents before their children. */
export const labelOptions = (labelsById) => {
  const labels = Object.values(labelsById || {});
  const byParent = {};
  for (const label of labels) {
    const parent = label.parent_id != null && labelsById[label.parent_id] ? label.parent_id : "root";
    (byParent[parent] = byParent[parent] || []).push(label);
  }
  const out = [];
  const walk = (parent, depth) => {
    for (const label of (byParent[parent] || []).sort((a, b) => a.name.localeCompare(b.name))) {
      out.push({ id: Number(label.id), name: label.name, depth });
      walk(label.id, depth + 1);
    }
  };
  walk("root", 0);
  return out;
};

/** "2 of 3 classes have a label" for a mapping response. */
export const mappingSummary = (mapping) => {
  const entries = mapping?.classes || [];
  const mapped = entries.filter((e) => e.action === "map").length;
  const discarded = entries.filter((e) => e.action === DISCARD).length;
  return { total: entries.length, mapped, discarded, unmapped: entries.length - mapped - discarded };
};
