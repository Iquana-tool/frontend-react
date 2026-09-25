/**
 * Per-dataset AI tool switches (mirrors `app/services/ai_tools.py`).
 *
 * The dataset stores only what is switched off (`disabled_ai_tools`, a
 * comma-separated list), so every tool is on unless named there. The backend
 * refuses a switched-off tool on its own; hiding it here only saves the user
 * a click that would fail.
 */

/** Every switchable tool, in the order the settings panel lists them. */
export const AI_TOOLS = [
  { id: 'prompted', label: 'Prompted segmentation', hint: 'Run AI on placed points, boxes or polygons to create an object' },
  { id: 'refine', label: 'AI refinement', hint: 'Add prompts to an existing object to fix its outline with AI' },
  { id: 'instance_suggestion', label: 'Suggest similar', hint: 'Find more instances like the selected ones on the same image' },
  { id: 'instance_segmentation', label: 'Instance segmentation', hint: 'Run a model over the whole image' },
  { id: 'cross_image', label: 'Cross-image suggestion', hint: 'Suggest instances from examples on other images' },
  { id: 'training', label: 'Model training', hint: 'Train a model on this dataset' },
  { id: 'batch_inference', label: 'Batch inference', hint: 'Run models over the whole dataset' },
];

/** @param {Object|null} dataset @returns {Set<string>} */
export const disabledAiTools = (dataset) =>
  new Set(
    String(dataset?.disabled_ai_tools ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  );

/** @param {Object|null} dataset @param {string} tool */
export const isAiToolEnabled = (dataset, tool) => !disabledAiTools(dataset).has(tool);

/** Message shown when a switched-off tool is reached anyway (e.g. by a shortcut). */
export const aiToolOffReason = (tool) => {
  const label = AI_TOOLS.find((t) => t.id === tool)?.label ?? 'This AI tool';
  return `${label} is switched off for this dataset`;
};
