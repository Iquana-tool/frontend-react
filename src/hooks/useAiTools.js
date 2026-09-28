import { useCallback, useMemo } from 'react';
import { useDataset } from '../contexts/DatasetContext';
import { disabledAiTools } from '../utils/aiTools';

/**
 * The current dataset, or null outside a DatasetProvider.
 *
 * The workspace hooks that ask about AI tools are also rendered on their own (in
 * tests, and in views without a dataset), where `useDataset` throws. No switches
 * means every tool is on, which is the right answer there. The hook call itself
 * runs on every render either way, so hook order is unaffected.
 */
const useCurrentDatasetOrNull = () => {
  try {
    return useDataset()?.currentDataset ?? null;
  } catch {
    return null;
  }
};

/**
 * Which AI tools the current dataset offers.
 *
 * @returns {{isEnabled: (tool: string) => boolean, disabled: Set<string>}}
 */
export default function useAiTools() {
  const currentDataset = useCurrentDatasetOrNull();
  const raw = currentDataset?.disabled_ai_tools ?? '';
  const disabled = useMemo(() => disabledAiTools({ disabled_ai_tools: raw }), [raw]);
  const isEnabled = useCallback((tool) => !disabled.has(tool), [disabled]);
  return { isEnabled, disabled };
}
