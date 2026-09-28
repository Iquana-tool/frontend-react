import React, { useEffect, useState } from 'react';
import { AI_TOOLS, disabledAiTools } from '../../../utils/aiTools';
import { useDataset } from '../../../contexts/DatasetContext';

/**
 * Per-dataset AI tool switches.
 *
 * Every tool is on by default. Switching one off hides it in the annotation
 * workspace and makes the server refuse it, e.g. to keep a dataset manual-only
 * or to control which assistance a study's participants get.
 *
 * @param {Object} props
 * @param {Object} props.access - The `useDatasetAccess` return value.
 * @param {Object} props.dataset - Supplies the current stored value.
 */
const AiToolsPanel = ({ access, dataset }) => {
  const { busy, setDisabledAiTools } = access;
  const { currentDataset, selectDataset } = useDataset();
  const stored = dataset?.disabled_ai_tools ?? '';
  const [off, setOff] = useState(() => disabledAiTools(dataset));

  // Re-sync if the dataset is refetched while this panel is mounted.
  useEffect(() => {
    setOff(disabledAiTools({ disabled_ai_tools: stored }));
  }, [stored]);

  const toggle = async (toolId) => {
    const previous = off;
    const next = new Set(off);
    if (next.has(toolId)) next.delete(toolId);
    else next.add(toolId);
    // Optimistic, then rolled back if the request fails.
    setOff(next);
    const result = await setDisabledAiTools([...next]);
    if (!result) {
      setOff(previous);
      return;
    }
    // The annotation workspace reads the switches from the current dataset.
    if (currentDataset?.id === dataset?.id) {
      selectDataset({ ...currentDataset, disabled_ai_tools: [...next].join(',') || null });
    }
  };

  return (
    <fieldset className="space-y-2" disabled={busy === 'settings'}>
      <legend className="text-sm text-t2 mb-2">
        Switch off AI tools this dataset should not offer. Annotators will not see them, and
        the server refuses them.
      </legend>
      {AI_TOOLS.map((tool) => {
        const id = `ai-tool-${tool.id}`;
        return (
          <label
            key={tool.id}
            htmlFor={id}
            className="flex items-start gap-3 p-3 border border-ln rounded-lg cursor-pointer hover:bg-hv transition-colors"
          >
            <input
              id={id}
              type="checkbox"
              checked={!off.has(tool.id)}
              onChange={() => toggle(tool.id)}
              className="mt-1 w-4 h-4 text-ac rounded focus:ring-ac"
            />
            <span>
              <span className="block font-medium text-t1">{tool.label}</span>
              <span className="block text-sm text-t2 mt-0.5">{tool.hint}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
};

export default AiToolsPanel;
