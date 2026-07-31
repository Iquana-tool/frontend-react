// Shared task metadata for the model-centric zoo, cards, and filters.
//
// A model can serve several tasks (e.g. SAM 3 does prompted segmentation AND
// instance suggestion), so tasks are a first-class facet rather than a single
// "service" a model belongs to. `key` matches the ai-service task surface /
// backend task tag; `endpoint` is the gateway route the models are listed under.
//
// Tailwind class strings are written out in full (not interpolated) so the
// compiler keeps them.
export const TASKS = {
  "prompted-segmentation": {
    key: "prompted-segmentation",
    endpoint: "prompted_segmentation",
    short: "Prompted",
    label: "Prompted seg",
    chip: "bg-acS text-ac",
    dot: "bg-accent",
  },
  "instance-suggestion": {
    key: "instance-suggestion",
    endpoint: "suggestion_segmentation",
    short: "Suggestion",
    label: "Instance suggestion",
    chip: "bg-acS text-ac",
    dot: "bg-accent",
  },
  "instance-segmentation": {
    key: "instance-segmentation",
    endpoint: "instance_segmentation",
    short: "Instance",
    label: "Instance seg",
    chip: "bg-warnBg text-warn",
    dot: "bg-warn",
  },
};

// Stable display / iteration order.
export const TASK_ORDER = [
  "prompted-segmentation",
  "instance-suggestion",
  "instance-segmentation",
];

export const getTaskMeta = (key) => TASKS[key] || {
  key,
  short: key,
  label: key,
  chip: "bg-well text-t2",
  dot: "bg-t3",
};
