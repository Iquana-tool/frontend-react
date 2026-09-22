import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReviewDrawer from './ReviewDrawer';
import * as annotationSelectors from '../../../stores/selectors/annotationSelectors';

const measurements = vi.hoisted(() => ({ current: null }));

vi.mock('./useImageMeasurements', () => ({
  default: () => measurements.current,
}));

vi.mock('../../../hooks/useZoomToObject', () => ({
  useZoomToObject: () => ({ zoomToObject: vi.fn() }),
}));

/**
 * The drawer's job is to make a comparison readable, so these drive it with the
 * hierarchy case the standardization exists for: a handful of large parents and
 * many small children, whose aggregate hides that they disagree.
 */
const areaRow = {
  metricKey: 'area',
  label: 'Area',
  image: { mean: 40, unit: 'cm' },
  comparison: {
    observed: 40,
    expected: 50,
    delta: -0.2,
    unit: 'cm',
    count: 10,
    droppedLabels: 0,
    labels: [],
  },
  labels: [
    { labelId: '2', name: 'Polyp', count: 8, imageMean: 5, datasetMean: 4, delta: 0.25 },
    { labelId: '1', name: 'Coral', count: 2, imageMean: 180, datasetMean: 240, delta: -0.25 },
  ],
};

const singleLabelRow = {
  metricKey: 'perimeter',
  label: 'Perimeter',
  image: { mean: 12, unit: 'cm' },
  comparison: {
    observed: 12,
    expected: 12,
    delta: 0,
    unit: 'cm',
    count: 2,
    droppedLabels: 0,
    labels: [],
  },
  labels: [{ labelId: '1', name: 'Coral', count: 2, imageMean: 12, datasetMean: 12, delta: 0 }],
};

const colorRow = {
  metricKey: 'mean_color_lab',
  label: 'Mean color (CIELAB)',
  space: 'opencv_lab',
  image: { mean: 128, unit: null },
  comparison: {
    kind: 'color',
    observed: { L: 50, a: 40, b: -30 },
    expected: { L: 52, a: 2, b: 4 },
    deltaE: 34.6,
    space: 'opencv_lab',
    count: 4,
    droppedLabels: 0,
    labels: [],
  },
  labels: [
    {
      labelId: '1',
      name: 'Coral',
      count: 3,
      observed: { L: 50, a: 40, b: -30 },
      expected: { L: 52, a: 2, b: 4 },
      deltaE: 34.6,
    },
    {
      labelId: '2',
      name: 'Polyp',
      count: 1,
      observed: { L: 60, a: 1, b: 1 },
      expected: { L: 60, a: 1, b: 1 },
      deltaE: 0.4,
    },
  ],
};

const setMeasurements = (overrides = {}) => {
  measurements.current = {
    rows: [areaRow],
    baseline: null,
    loading: false,
    error: null,
    ...overrides,
  };
};

describe('ReviewDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMeasurements();

    vi.spyOn(annotationSelectors, 'useObjectsList').mockReturnValue([]);
    vi.spyOn(annotationSelectors, 'useSelectedObjects').mockReturnValue([]);
    vi.spyOn(annotationSelectors, 'useSelectObject').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useClearSelection').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useSetHoveredObjectId').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useToggleLeftDrawer').mockReturnValue(vi.fn());
  });

  it('shows the standardized value rather than the raw image mean', () => {
    setMeasurements({
      rows: [{ ...areaRow, image: { mean: 999, unit: 'cm' } }],
    });
    render(<ReviewDrawer />);
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.queryByText('999')).not.toBeInTheDocument();
  });

  it('renders the delta against the standardized expectation', () => {
    render(<ReviewDrawer />);
    expect(screen.getByText('-20.0 %')).toBeInTheDocument();
  });

  it('says what the expectation was built from', () => {
    render(<ReviewDrawer />);
    expect(screen.getByTitle(/Expected 50 cm for this image's mix of 2 labels/)).toBeInTheDocument();
  });

  it('names excluded labels rather than quietly narrowing the claim', () => {
    setMeasurements({
      rows: [{ ...areaRow, comparison: { ...areaRow.comparison, droppedLabels: 1 } }],
    });
    render(<ReviewDrawer />);
    expect(screen.getByTitle(/1 label\(s\) on this image have no dataset figure/)).toBeInTheDocument();
  });

  describe('the per-label breakdown', () => {
    it('stays collapsed until asked for', () => {
      render(<ReviewDrawer />);
      expect(screen.queryByText(/Polyp/)).not.toBeInTheDocument();
    });

    // The point of the breakdown: the aggregate reads -20 %, but the two labels
    // behind it disagree in opposite directions.
    it('reveals each label against its own dataset figure', () => {
      render(<ReviewDrawer />);
      fireEvent.click(screen.getByRole('button', { name: /Area/ }));

      expect(screen.getByText(/Polyp/)).toBeInTheDocument();
      expect(screen.getByText(/Coral/)).toBeInTheDocument();
      expect(screen.getByText('+25.0 %')).toBeInTheDocument();
      expect(screen.getByText('-25.0 %')).toBeInTheDocument();
    });

    it('shows how many of each label the image carries', () => {
      render(<ReviewDrawer />);
      fireEvent.click(screen.getByRole('button', { name: /Area/ }));
      expect(screen.getByText(/×8/)).toBeInTheDocument();
      expect(screen.getByText(/×2/)).toBeInTheDocument();
    });

    it('attributes each label row to that label’s dataset mean', () => {
      render(<ReviewDrawer />);
      fireEvent.click(screen.getByRole('button', { name: /Area/ }));
      expect(screen.getByTitle('Dataset mean for Polyp: 4')).toBeInTheDocument();
    });

    it('collapses again', () => {
      render(<ReviewDrawer />);
      const row = screen.getByRole('button', { name: /Area/ });
      fireEvent.click(row);
      fireEvent.click(row);
      expect(screen.queryByText(/Polyp/)).not.toBeInTheDocument();
    });

    // One label has no breakdown to show — expanding would reveal the same
    // number twice.
    it('offers no expansion for a single-label metric', () => {
      setMeasurements({ rows: [singleLabelRow] });
      render(<ReviewDrawer />);
      expect(screen.getByRole('button', { name: /Perimeter/ })).toBeDisabled();
    });
  });

  describe('when the comparison cannot be made', () => {
    it('still shows the measurement, without a delta', () => {
      setMeasurements({
        rows: [{
          ...areaRow,
          comparison: { ...areaRow.comparison, expected: null, delta: null },
          labels: [],
        }],
      });
      render(<ReviewDrawer />);
      expect(screen.getByText('40')).toBeInTheDocument();
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it('falls back to the image aggregate with no comparison at all', () => {
      setMeasurements({
        rows: [{ ...areaRow, comparison: null, labels: [] }],
      });
      render(<ReviewDrawer />);
      expect(screen.getByText('40')).toBeInTheDocument();
    });
  });

  describe('outliers', () => {
    const object = { id: 7, label: 'Coral', labelId: 1, color: '#3b82f6', quantification: { area: 500 } };

    beforeEach(() => {
      setMeasurements({
        baseline: { metricKey: 'area', label: 'Area', mean: 100, std: 10, unit: 'cm', byLabel: {} },
      });
    });

    it('lists an object that is far from its label, with its distance', () => {
      vi.spyOn(annotationSelectors, 'useObjectsList').mockReturnValue([object]);
      render(<ReviewDrawer />);
      const list = screen.getByText(/Coral #7/).closest('button');
      expect(within(list).getByText(/\+40\.0σ/)).toBeInTheDocument();
    });

    // Every review action in the bar acts on the selection, so revealing an
    // outlier has to leave it selected, not merely on screen.
    it('selects the object it reveals', () => {
      const selectObject = vi.fn();
      vi.spyOn(annotationSelectors, 'useObjectsList').mockReturnValue([object]);
      vi.spyOn(annotationSelectors, 'useSelectObject').mockReturnValue(selectObject);

      render(<ReviewDrawer />);
      fireEvent.click(screen.getByText(/Coral #7/).closest('button'));
      expect(selectObject).toHaveBeenCalledWith(7);
    });

    it('says so plainly when there are none', () => {
      vi.spyOn(annotationSelectors, 'useObjectsList').mockReturnValue([]);
      render(<ReviewDrawer />);
      expect(screen.getByText(/No object is more than 2σ/)).toBeInTheDocument();
    });
  });

  /**
   * A percentage on a colour is not a quantity — the channels are signed and
   * cross zero. These pin the perceptual presentation in its place.
   */
  describe('colour metrics', () => {
    it('reports a perceptual difference, not a percentage', () => {
      setMeasurements({ rows: [colorRow] });
      render(<ReviewDrawer />);
      expect(screen.getByText('ΔE 34.6')).toBeInTheDocument();
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    // The measured numbers are in an encoding nobody reads by eye, and the whole
    // claim is about how the two look.
    it('shows the measured colour beside the expected one', () => {
      setMeasurements({ rows: [colorRow] });
      render(<ReviewDrawer />);
      expect(screen.getByTitle('This image')).toBeInTheDocument();
      expect(screen.getByTitle("Expected for this image's labels")).toBeInTheDocument();
    });

    it('never prints a raw channel mean as if it were the colour', () => {
      setMeasurements({ rows: [colorRow] });
      render(<ReviewDrawer />);
      expect(screen.queryByText('128')).not.toBeInTheDocument();
    });

    it('explains the scale it is using', () => {
      setMeasurements({ rows: [colorRow] });
      render(<ReviewDrawer />);
      expect(
        screen.getByTitle(/CIEDE2000 colour difference.*very different.*threshold of a visible/s)
      ).toBeInTheDocument();
    });

    it('gives each label its own difference in the breakdown', () => {
      setMeasurements({ rows: [colorRow] });
      render(<ReviewDrawer />);
      fireEvent.click(screen.getByRole('button', { name: /Mean color/ }));
      expect(screen.getByText('ΔE 0.4')).toBeInTheDocument();
      expect(screen.getAllByText('ΔE 34.6')).toHaveLength(2);
    });

    it('withholds the difference when there is nothing to compare against', () => {
      setMeasurements({
        rows: [{
          ...colorRow,
          comparison: { ...colorRow.comparison, expected: null, deltaE: null },
          labels: [],
        }],
      });
      render(<ReviewDrawer />);
      expect(screen.queryByText(/ΔE/)).not.toBeInTheDocument();
      expect(screen.getByTitle('This image')).toBeInTheDocument();
    });

    it('still renders scalar rows proportionally alongside', () => {
      setMeasurements({ rows: [areaRow, colorRow] });
      render(<ReviewDrawer />);
      expect(screen.getByText('-20.0 %')).toBeInTheDocument();
      expect(screen.getByText('ΔE 34.6')).toBeInTheDocument();
    });
  });

  it('reports a failure instead of an empty drawer', () => {
    setMeasurements({ rows: [], error: 'Could not load measurements for this image.' });
    render(<ReviewDrawer />);
    expect(screen.getByText('Could not load measurements for this image.')).toBeInTheDocument();
  });

  it('distinguishes loading from nothing measured', () => {
    setMeasurements({ rows: [], loading: true });
    const { rerender } = render(<ReviewDrawer />);
    expect(screen.getByText(/Measuring/)).toBeInTheDocument();

    setMeasurements({ rows: [], loading: false });
    rerender(<ReviewDrawer />);
    expect(screen.getByText(/Nothing is measured on this image yet/)).toBeInTheDocument();
  });
});
