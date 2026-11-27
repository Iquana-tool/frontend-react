import { render } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import InferenceScanOverlay from './InferenceScanOverlay';

let mockRun = null;

vi.mock('../../../stores/selectors/annotationSelectors', () => ({
  useInferenceRun: () => mockRun,
  useImageObject: () => ({ width: 1600, height: 900 }),
  useObjectsList: () => [],
}));

vi.mock('../../../hooks/useImageDisplayRect', () => ({
  default: () => ({ x: 0, y: 50, width: 800, height: 450 }),
}));

vi.mock('../../../hooks/useInferenceRunTracker', () => ({ default: () => {} }));
vi.mock('./useInferenceColors', () => ({ default: () => ['#14b8a6'] }));

const RUN = {
  id: 1,
  kind: 'segment',
  phase: 'running',
  startedAt: Date.now(),
  etaS: 3,
  positives: [],
  negatives: [],
  seedContourIds: [],
  knownContourIds: [],
  labelIds: [],
  scopeContourId: null,
};

const renderOverlay = () =>
  render(
    <InferenceScanOverlay
      containerRef={{ current: document.createElement('div') }}
      zoomLevel={2.5}
      panOffset={{ x: 12, y: -8 }}
    />
  );

describe('InferenceScanOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun = RUN;
  });

  test('tracks the image zoom and pan transform', () => {
    const { container } = renderOverlay();
    expect(container.firstChild).toHaveStyle({
      transform: 'scale(2.5) translate(12px, -8px)',
      transformOrigin: 'center center',
    });
  });

  test('sits on the painted image', () => {
    const { container } = renderOverlay();
    expect(container.querySelector('canvas')).toHaveStyle({ left: '0px', top: '50px', width: '800px', height: '450px' });
  });

  test('renders nothing without a run', () => {
    mockRun = null;
    const { container } = renderOverlay();
    expect(container.firstChild).toBeNull();
  });
});
