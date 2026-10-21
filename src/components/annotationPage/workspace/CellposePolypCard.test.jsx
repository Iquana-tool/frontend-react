import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CellposePolypCard from './CellposePolypCard';
import { getModelLabelMapping, saveModelLabelMapping } from '../../../api/modelLabelMappings';

const mock = vi.hoisted(() => ({
  flow: null,
  labelsMap: null,
}));

vi.mock('../../../stores/selectors/annotationSelectors', () => ({
  useDatasetLabelsMap: () => mock.labelsMap,
  useRemoveCellposePreviewPrediction: () => vi.fn(),
}));

vi.mock('./CellposePolypPreviewContext', () => ({
  useCellposePolypPreviewContext: () => mock.flow,
}));

vi.mock('../../../hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));

vi.mock('../../../api/modelLabelMappings', () => ({
  getModelLabelMapping: vi.fn(),
  saveModelLabelMapping: vi.fn(),
}));

const makeFlow = (overrides = {}) => ({
  datasetId: 15,
  model: null,
  projectLabel: null,
  catalogLoading: false,
  catalogError: null,
  enabled: true,
  setEnabled: vi.fn(),
  scope: 'fragments',
  setScope: vi.fn(),
  roiContourIds: [],
  canUseTool: true,
  isRunning: false,
  jobStatus: null,
  jobError: null,
  preview: null,
  isAccepting: false,
  run: vi.fn(),
  cancel: vi.fn(),
  discard: vi.fn(),
  acceptIncluded: vi.fn(),
  toggleIncluded: vi.fn(),
  setEditingPredictionId: vi.fn(),
  refreshModelCatalog: vi.fn(),
  ...overrides,
});

describe('CellposePolypCard availability and project mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.labelsMap = new Map([[431, 'Existing polyp label'], [432, 'Other label']]);
    mock.flow = makeFlow();
    getModelLabelMapping.mockResolvedValue({ classes: [] });
    saveModelLabelMapping.mockResolvedValue({ classes: [] });
  });

  it('explains that the provider is missing from the available inference catalog', () => {
    render(<CellposePolypCard />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The inference service has not advertised the experimental Cellpose-SAM provider as available.'
    );
    expect(screen.queryByText(/project has no active label mapping/i)).not.toBeInTheDocument();
  });

  it('lets an authorized user explicitly map polyp to a loaded project label', async () => {
    const model = {
      registry_key: 'cpsam_polyp_v3_b_seed17',
      name: 'Cellpose-SAM Polyp',
      classes: [{ key: 'polyp', name: 'Polyp' }],
      class_mappings: [{
        model_class: { key: 'polyp', name: 'Polyp' },
        action: 'unmapped',
        label_id: null,
        source: 'none',
      }],
    };
    mock.flow = makeFlow({ model });
    getModelLabelMapping.mockResolvedValue({
      dataset_id: 15,
      model_registry_key: model.registry_key,
      model_name: model.name,
      classes: [{
        model_class: { key: 'polyp', name: 'Polyp' },
        action: 'unmapped',
        label_id: null,
        source: 'none',
      }],
    });
    saveModelLabelMapping.mockResolvedValue({
      dataset_id: 15,
      model_registry_key: model.registry_key,
      model_name: model.name,
      classes: [{
        model_class: { key: 'polyp', name: 'Polyp' },
        action: 'map',
        label_id: 431,
        source: 'saved',
      }],
    });

    render(<CellposePolypCard />);

    const labelSelect = await screen.findByRole('combobox', { name: 'Label for Polyp' });
    expect(screen.getByRole('option', { name: 'Existing polyp label' })).toHaveValue('label:431');
    fireEvent.change(labelSelect, { target: { value: 'label:431' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save 1 change' }));

    await waitFor(() => expect(saveModelLabelMapping).toHaveBeenCalledWith(
      15,
      model.registry_key,
      [{ model_class: 'polyp', action: 'map', label_id: 431 }]
    ));
    expect(mock.flow.refreshModelCatalog).toHaveBeenCalledTimes(1);
  });
});
