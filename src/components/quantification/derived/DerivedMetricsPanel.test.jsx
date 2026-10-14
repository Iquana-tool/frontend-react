import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DerivedMetricsPanel from './DerivedMetricsPanel';
import {
  createDerivedMetric,
  deleteDerivedMetric,
  previewDerivedMetric,
} from '../../../api/derivedMetrics';

vi.mock('../../../api/derivedMetrics', () => ({
  listDerivedMetrics: vi.fn(),
  createDerivedMetric: vi.fn(),
  updateDerivedMetric: vi.fn(),
  deleteDerivedMetric: vi.fn(),
  previewDerivedMetric: vi.fn(),
  copyDerivedMetrics: vi.fn(),
}));

vi.mock('../../../api/datasets', () => ({
  fetchDatasets: vi.fn().mockResolvedValue({ datasets: [] }),
}));

const catalog = [
  { key: 'area', name: 'Area', unit_kind: 'area', value_dim: 1, tier: 'geometry' },
  { key: 'perimeter', name: 'Perimeter', unit_kind: 'length', value_dim: 1, tier: 'geometry' },
];
const labels = {
  root_level_labels: [{ id: 50, name: 'Choroidea', children: [{ id: 51, name: 'Vessel', children: [] }] }],
};
const cvi = {
  id: 7,
  key: 'cvi',
  name: 'Choroidal vascularity index',
  description: '',
  label_ids: [50],
  expression: {
    type: 'binary',
    op: '/',
    left: { type: 'rollup', scope: 'children', agg: 'sum', label_ids: [51], metric: 'area', component: 0 },
    right: { type: 'metric', metric: 'area', component: 0 },
  },
  unit_exponent: 0,
  problems: [],
};

const renderPanel = (props = {}) =>
  render(
    <DerivedMetricsPanel
      datasetId={9}
      definitions={[]}
      catalog={catalog}
      labels={labels}
      canEdit
      filters={{ excludeNotFullyAnnotated: true, excludeUnreviewed: true }}
      displayUnit="mm"
      onChanged={vi.fn().mockResolvedValue(undefined)}
      onClose={vi.fn()}
      {...props}
    />
  );

describe('DerivedMetricsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    previewDerivedMetric.mockResolvedValue({
      ok: true,
      problems: [],
      unit: '',
      unit_exponent: 0,
      objects_in_scope: 70,
      objects_without_value: 0,
      summary: { count: 70, mean: 0.515, std: 0.127, min: 0.242, max: 0.922 },
      per_label: {},
      samples: [{ contour_id: 3085, label: 'Choroidea', file_name: 'frame_0001.png', value: 0.4728 }],
    });
  });

  it('lists a definition as a readable formula with its unit', () => {
    renderPanel({ definitions: [cvi] });
    expect(screen.getByText('Choroidal vascularity index')).toBeInTheDocument();
    expect(screen.getByText('Total Area of children [Vessel] ÷ Area')).toBeInTheDocument();
    expect(screen.getByText('unitless')).toBeInTheDocument();
    expect(screen.getByText(/Reported on Choroidea/)).toBeInTheDocument();
  });

  it('builds a measurement from a template, previews it and saves the formula', async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    createDerivedMetric.mockResolvedValue({ derived_metric: { id: 8 } });
    renderPanel({ onChanged });

    fireEvent.click(screen.getByText('New measurement'));
    fireEvent.change(screen.getByPlaceholderText('Choroidal vascularity index'), {
      target: { value: 'Vascularity index' },
    });
    // Column name follows the name until edited.
    expect(screen.getByPlaceholderText('cvi')).toHaveValue('vascularity_index');

    // The template leaves its label slot empty; pick Vessel there, and Choroidea as the
    // label it is reported on. Each label appears twice: once per chip row.
    const [reportedOnChoroidea] = screen.getAllByRole('button', { name: 'Choroidea' });
    fireEvent.click(reportedOnChoroidea);
    const vesselChips = screen.getAllByRole('button', { name: 'Vessel' });
    fireEvent.click(vesselChips[vesselChips.length - 1]);

    await waitFor(() => expect(screen.getByText(/70 objects in scope/)).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText('Choroidea #3085')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Add measurement')).not.toBeDisabled());
    fireEvent.click(screen.getByText('Add measurement'));

    await waitFor(() => expect(createDerivedMetric).toHaveBeenCalledTimes(1));
    const [datasetId, body] = createDerivedMetric.mock.calls[0];
    expect(datasetId).toBe(9);
    expect(body.key).toBe('vascularity_index');
    expect(body.label_ids).toEqual([50]);
    expect(body.expression.left).toMatchObject({ type: 'rollup', agg: 'sum', label_ids: [51] });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('shows the problems the backend finds instead of a number, and blocks saving', async () => {
    previewDerivedMetric.mockResolvedValue({ ok: false, problems: ['Cannot add values of different units.'] });
    renderPanel();
    fireEvent.click(screen.getByText('New measurement'));
    fireEvent.change(screen.getByPlaceholderText('Choroidal vascularity index'), { target: { value: 'Bad' } });
    await waitFor(() => expect(screen.getByText('Cannot add values of different units.')).toBeInTheDocument(), {
      timeout: 2000,
    });
    expect(screen.getByText('Add measurement')).toBeDisabled();
  });

  it('asks before deleting', async () => {
    deleteDerivedMetric.mockResolvedValue({ success: true });
    renderPanel({ definitions: [cvi] });
    fireEvent.click(screen.getByLabelText('Delete Choroidal vascularity index'));
    expect(deleteDerivedMetric).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(deleteDerivedMetric).toHaveBeenCalledWith(9, 7));
  });

  it('is read-only without the curator permission', () => {
    renderPanel({ definitions: [cvi], canEdit: false });
    expect(screen.queryByText('New measurement')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit Choroidal vascularity index')).not.toBeInTheDocument();
    expect(screen.getByText(/Only curators and owners/)).toBeInTheDocument();
  });
});
