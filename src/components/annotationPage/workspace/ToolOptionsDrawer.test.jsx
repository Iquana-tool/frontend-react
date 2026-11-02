import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ToolOptionsDrawer from './ToolOptionsDrawer';

const { state } = vi.hoisted(() => ({ state: {} }));
vi.mock('./useAnnotationServices', () => ({
  default: () => ({
    services: [{ key: 'prompted', name: 'Prompted Segmentation' }],
    policyLoading: state.loading,
    policyError: state.error,
  }),
}));
vi.mock('./useRailTools', () => ({
  default: () => ({ railTool: 'point', promptAction: 'nothing', changePromptAction: vi.fn() }),
}));
vi.mock('../../../stores/selectors/annotationSelectors', () => ({ useToggleLeftDrawer: () => vi.fn() }));
vi.mock('../../../hooks/useAiTools', () => ({ default: () => ({ isEnabled: () => true }) }));
vi.mock('./ConceptSegmentationPanel', () => ({ default: () => <div>Segment by label</div> }));
vi.mock('./ServiceCard', () => ({ default: ({ service }) => <div>{service.name}</div> }));

describe('ToolOptionsDrawer concept and prompted controls', () => {
  beforeEach(() => { Object.assign(state, { loading: false, error: null }); });

  it('renders prompted controls and the unified label segmentation panel', () => {
    render(<ToolOptionsDrawer />);
    expect(screen.getByText('Prompted Segmentation')).toBeInTheDocument();
    expect(screen.getByText('Segment by label')).toBeInTheDocument();
    expect(screen.queryByText('Within-Image Suggestion')).not.toBeInTheDocument();
  });

  it('shows policy failures alongside the available controls', () => {
    state.error = 'routing service unavailable';
    render(<ToolOptionsDrawer />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load model routing policy: routing service unavailable');
  });

  it('shows policy loading status', () => {
    state.loading = true;
    render(<ToolOptionsDrawer />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading model routing policy');
  });
});
