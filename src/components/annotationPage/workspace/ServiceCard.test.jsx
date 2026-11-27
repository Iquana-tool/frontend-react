import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ServiceCard from './ServiceCard';

vi.mock('../../../stores/selectors/annotationSelectors', () => ({
  useModelFavorites: () => ({}),
  useSetFavoriteModel: () => vi.fn(),
  useClearFavoriteModel: () => vi.fn(),
}));

const makeService = (overrides = {}) => ({
  key: 'instance',
  task: 'instance-segmentation',
  name: 'Instance Segmentation',
  models: [{ id: 'ready-model', name: 'Ready model', model_status: 'ready' }],
  selectedModel: null,
  setSelectedModel: vi.fn(),
  isLoading: false,
  isRunning: false,
  onRun: vi.fn(),
  canRun: false,
  ...overrides,
});

const openCard = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Instance Segmentation' }));
};

describe('ServiceCard instance runs', () => {
  it('keeps the Run button visible but disabled without a usable selection', () => {
    render(<ServiceCard service={makeService()} />);

    openCard();

    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
  });

  it('shows a non-blocking override note for a runnable manual selection', () => {
    render(
      <ServiceCard
        service={makeService({
          selectedModel: 'ready-model',
          canRun: true,
          selectionNotice: 'Session override for this image — dataset default remains unchanged.',
        })}
      />
    );

    openCard();

    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled();
    expect(screen.getByText(/session override for this image/i)).toBeInTheDocument();
    expect(screen.getByText(/dataset default remains unchanged/i)).toBeInTheDocument();
  });
});

describe('ServiceCard model parameters', () => {
  const granularity = {
    key: 'granularity', label: 'Granularity', type: 'float',
    default_value: 0.2, min_value: 0.1, max_value: 1, step: 0.05,
  };
  const prompted = (overrides = {}) => makeService({
    key: 'prompted',
    task: 'prompted-segmentation',
    name: 'Prompted Segmentation',
    models: [{ id: 'unsamv2', name: 'UnSAMv2', model_status: 'ready' }],
    selectedModel: 'unsamv2',
    onRun: undefined,
    parameters: [granularity],
    parameterValues: {},
    onParameterChange: vi.fn(),
    onParameterCommit: vi.fn(),
    ...overrides,
  });

  it('shows a slider for a float parameter, starting at its default', () => {
    render(<ServiceCard service={prompted()} />);

    const slider = screen.getByRole('slider', { name: 'Granularity' });
    expect(slider).toHaveValue('0.2');
  });

  it('shows nothing new for a model without parameters', () => {
    render(<ServiceCard service={prompted({ parameters: [] })} />);

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('changes the value while dragging and re-runs only on release', () => {
    const service = prompted();
    render(<ServiceCard service={service} />);
    const slider = screen.getByRole('slider', { name: 'Granularity' });

    fireEvent.change(slider, { target: { value: '0.75' } });
    expect(service.onParameterChange).toHaveBeenCalledWith('granularity', 0.75);
    expect(service.onParameterCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(slider);
    expect(service.onParameterCommit).toHaveBeenCalledTimes(1);
  });

  it('re-runs when an arrow key on the slider is released', () => {
    const service = prompted({ parameterValues: { granularity: 0.5 } });
    render(<ServiceCard service={service} />);

    fireEvent.keyUp(screen.getByRole('slider', { name: 'Granularity' }), { key: 'ArrowRight' });
    fireEvent.keyUp(screen.getByRole('slider', { name: 'Granularity' }), { key: 'a' });

    expect(service.onParameterCommit).toHaveBeenCalledTimes(1);
  });
});
