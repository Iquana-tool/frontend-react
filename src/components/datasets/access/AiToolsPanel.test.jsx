import React from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AiToolsPanel from './AiToolsPanel';
import { aiToolOffReason, disabledAiTools, isAiToolEnabled } from '../../../utils/aiTools';

const selectDataset = vi.fn();
vi.mock('../../../contexts/DatasetContext', () => ({
  useDataset: () => ({ currentDataset: { id: 1, disabled_ai_tools: 'training' }, selectDataset }),
}));

describe('aiTools helpers', () => {
  test('every tool is on unless the dataset names it', () => {
    const dataset = { disabled_ai_tools: 'training, cross_image' };
    expect(disabledAiTools(dataset)).toEqual(new Set(['training', 'cross_image']));
    expect(isAiToolEnabled(dataset, 'prompted')).toBe(true);
    expect(isAiToolEnabled(dataset, 'training')).toBe(false);
    expect(isAiToolEnabled(null, 'training')).toBe(true);
  });

  test('the off message names the tool', () => {
    expect(aiToolOffReason('instance_suggestion')).toBe('Suggest similar is switched off for this dataset');
  });
});

describe('AiToolsPanel', () => {
  beforeEach(() => { selectDataset.mockReset(); });

  test('shows stored switches and saves the full list of switched-off tools', async () => {
    const setDisabledAiTools = vi.fn().mockResolvedValue({ success: true });
    render(<AiToolsPanel access={{ busy: null, setDisabledAiTools }}
                         dataset={{ id: 1, disabled_ai_tools: 'training' }} />);

    expect(screen.getByLabelText(/Model training/)).not.toBeChecked();
    expect(screen.getByLabelText(/Suggest similar/)).toBeChecked();

    fireEvent.click(screen.getByLabelText(/Suggest similar/));

    await waitFor(() => expect(setDisabledAiTools).toHaveBeenCalledWith(['training', 'instance_suggestion']));
    await waitFor(() => expect(selectDataset).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, disabled_ai_tools: 'training,instance_suggestion' }),
    ));
  });

  test('a failed save puts the switch back', async () => {
    const setDisabledAiTools = vi.fn().mockResolvedValue(null);
    render(<AiToolsPanel access={{ busy: null, setDisabledAiTools }}
                         dataset={{ id: 1, disabled_ai_tools: '' }} />);

    fireEvent.click(screen.getByLabelText(/Batch inference/));

    await waitFor(() => expect(screen.getByLabelText(/Batch inference/)).toBeChecked());
    expect(selectDataset).not.toHaveBeenCalled();
  });
});
