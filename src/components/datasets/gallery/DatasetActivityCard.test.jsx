import React from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DatasetActivityCard from './DatasetActivityCard';
import { fetchDatasetActivity } from '../../../api/datasets';

vi.mock('../../../api/datasets', () => ({ fetchDatasetActivity: vi.fn() }));

const row = (username, counts) => ({
  username, annotated: 0, annotated_ai: 0, finished: 0, reviewed: 0, sent_back: 0,
  resolved: 0, calibrated: 0, last_active: null, ...counts,
});

beforeEach(() => { fetchDatasetActivity.mockReset(); });

test('shows one line per active user, built from their counts', async () => {
  fetchDatasetActivity.mockResolvedValue({
    users: [row('ann', { annotated: 50, annotated_ai: 32, finished: 1 }), row('rev', { reviewed: 150 })],
  });
  render(<DatasetActivityCard datasetId={3} />);

  expect(await screen.findByText('ann')).toBeInTheDocument();
  expect(screen.getByText('annotated 50 objects')).toBeInTheDocument();
  expect(screen.getByText('(32 with AI)')).toBeInTheDocument();
  expect(screen.getByText('finished 1 image')).toBeInTheDocument();
  expect(screen.getByText('reviewed 150 objects')).toBeInTheDocument();
  expect(fetchDatasetActivity).toHaveBeenCalledWith(3, 7);
});

test('switching the range refetches with that window', async () => {
  fetchDatasetActivity.mockResolvedValue({ users: [] });
  render(<DatasetActivityCard datasetId={3} />);
  await screen.findByText('No activity in the last 7 days.');

  fireEvent.click(screen.getByRole('button', { name: 'All time' }));
  await waitFor(() => expect(fetchDatasetActivity).toHaveBeenLastCalledWith(3, 0));
  expect(await screen.findByText('No activity yet.')).toBeInTheDocument();
});

test('more than five people collapse behind "Show all"', async () => {
  fetchDatasetActivity.mockResolvedValue({
    users: Array.from({ length: 7 }, (_, i) => row(`user${i}`, { annotated: 1 })),
  });
  render(<DatasetActivityCard datasetId={3} />);
  await screen.findByText('user0');
  expect(screen.queryByText('user6')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Show all 7 people' }));
  expect(screen.getByText('user6')).toBeInTheDocument();
});

test('a failed load shows a message instead of breaking the page', async () => {
  fetchDatasetActivity.mockRejectedValue(new Error('boom'));
  render(<DatasetActivityCard datasetId={3} />);
  expect(await screen.findByText('Activity could not be loaded.')).toBeInTheDocument();
});
