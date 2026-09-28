import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ModelSuggestionsCard from './ModelSuggestionsCard';
import { fetchSuggestionStats } from '../../../api/datasets';
import { percentages } from '../../../utils/suggestionStats';

vi.mock('../../../api/datasets', () => ({ fetchSuggestionStats: vi.fn() }));

describe('percentages', () => {
  test('always add up to 100', () => {
    expect(percentages([1, 1, 1])).toEqual([34, 33, 33]);
    expect(percentages([5, 3, 2])).toEqual([50, 30, 20]);
    expect(percentages([0, 0, 0])).toEqual([0, 0, 0]);
    expect(percentages([2, 1, 0]).reduce((a, b) => a + b)).toBe(100);
  });
});

describe('ModelSuggestionsCard', () => {
  beforeEach(() => { fetchSuggestionStats.mockReset(); });

  test('shows one row per model with its tools and outcome split', async () => {
    fetchSuggestionStats.mockResolvedValue({
      models: [{
        model_key: 'sam2-1-base-plus', total: 10, as_is: 5, edited: 3, rejected: 2,
        sources: ['prompted', 'refine'],
      }],
    });
    render(<ModelSuggestionsCard datasetId={1} days={30} />);

    expect(await screen.findByText('sam2-1-base-plus')).toBeInTheDocument();
    expect(screen.getByText('10 suggestions')).toBeInTheDocument();
    expect(screen.getByText('Run AI · AI refinement')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label', '50% accepted as-is, 30% accepted with edits, 20% rejected',
    );
    expect(fetchSuggestionStats).toHaveBeenCalledWith(1, 30);
  });

  test('says so when there were no suggestions in the range', async () => {
    fetchSuggestionStats.mockResolvedValue({ models: [] });
    render(<ModelSuggestionsCard datasetId={1} days={7} />);
    expect(await screen.findByText('No AI suggestions in the last 7 days.')).toBeInTheDocument();
  });

  test('a failed load shows a message', async () => {
    fetchSuggestionStats.mockRejectedValue(new Error('boom'));
    render(<ModelSuggestionsCard datasetId={1} days={0} />);
    expect(await screen.findByText('Model suggestions could not be loaded.')).toBeInTheDocument();
  });
});
