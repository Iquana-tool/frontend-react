import React from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import UsagePanel from './UsagePanel';
import { fetchUsageUsers, fetchUserUsage } from '../../api';

vi.mock('../../api', () => ({ fetchUsageUsers: vi.fn(), fetchUserUsage: vi.fn() }));
// Recharts needs ResizeObserver, which jsdom lacks; the chart's data shaping is
// covered by the `timelineSeries` tests.
vi.mock('./usage/UsageTimelineChart', () => ({ default: () => <div>timeline chart</div> }));

const USER = {
  username: 'ann', suggestions: 10, as_is: 5, edited: 3, rejected: 2, mean_edit_iou: 0.82,
  events: 40, sessions: 2, active_days: 3, images_visited: 7, active_ms: 3_720_000,
  last_seen: '2026-10-15T12:00:00',
};

const DETAIL = {
  username: 'ann',
  events_enabled: true,
  suggestions: [{
    model_key: 'sam2', total: 10, as_is: 5, edited: 3, rejected: 2, sources: ['prompted'],
    last_used: null, mean_edit_iou: 0.82, edits_with_iou: 3,
  }],
  iou_distribution: [
    { bucket: '≥ 0.95 (minor touch-up)', count: 1 }, { bucket: '0.80–0.95', count: 1 },
    { bucket: '0.50–0.80', count: 1 }, { bucket: '< 0.50 (largely redrawn)', count: 0 },
  ],
  workflows: [{ workflow: 'Annotation', time_ms: 3_600_000, visits: 4 }],
  tools: [{ tool: 'ai_annotation', count: 12 }],
  ai_features: [{ feature: 'Prompted segmentation', model: 'sam2', count: 9, failures: 1, median_ms: 420 }],
  model_selections: [{ tool: 'prompted', model: 'sam2', count: 2 }],
  images: {
    visits: 9, images: 7, total_active_ms: 3_720_000, mean_active_ms: 413_000,
    median_active_ms: 400_000, mean_idle_ms: 20_000, mean_ai_wait_ms: 1500, mean_open_ms: 434_500,
    interactions: { clicks: 0, prompts: 14, edits: 3, creates: 0, deletes: 2, relabels: 0, undos: 1 },
  },
  scene_graph: {
    actions: [{ action: 'relationship.add', count: 4, objects: 6 }],
    relationships: [{ name: 'touches', count: 6 }],
  },
  timeline: [{ date: '2026-10-15', events: 40, active_ms: 3_720_000, suggestions: 10,
               workflows: { Annotation: 3_600_000 } }],
};

describe('UsagePanel', () => {
  beforeEach(() => {
    fetchUsageUsers.mockReset();
    fetchUserUsage.mockReset();
  });

  test('lists users and opens one person\'s breakdown', async () => {
    fetchUsageUsers.mockResolvedValue({ events_enabled: true, users: [USER] });
    fetchUserUsage.mockResolvedValue(DETAIL);
    render(<UsagePanel />);

    expect(await screen.findByRole('button', { name: 'ann' })).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('1h 2m')).toBeInTheDocument();
    expect(fetchUsageUsers).toHaveBeenCalledWith(30);

    fireEvent.click(screen.getByRole('button', { name: 'ann' }));

    expect(await screen.findByText('AI suggestions by model')).toBeInTheDocument();
    expect(fetchUserUsage).toHaveBeenCalledWith('ann', 30);
    expect(screen.getByText('Prompted segmentation')).toBeInTheDocument();
    expect(screen.getByText('AI annotation')).toBeInTheDocument();
    expect(screen.getByText(/Models picked: sam2 \(2×\)/)).toBeInTheDocument();
    expect(screen.getByText('(1 failed)')).toBeInTheDocument();
    expect(screen.getByText('Relationships added')).toBeInTheDocument();
    expect(screen.getByText(/Relationships used: touches \(6×\)/)).toBeInTheDocument();
  });

  test('explains that only suggestion outcomes exist while capture is off', async () => {
    fetchUsageUsers.mockResolvedValue({ events_enabled: false, users: [USER] });
    render(<UsagePanel />);
    expect(await screen.findByText(/Activity capture is off on this deployment/)).toBeInTheDocument();
  });

  test('changing the time range reloads', async () => {
    fetchUsageUsers.mockResolvedValue({ events_enabled: true, users: [] });
    render(<UsagePanel />);
    expect(await screen.findByText('No usage recorded in this window.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All time' }));
    expect(fetchUsageUsers).toHaveBeenLastCalledWith(0);
  });
});
