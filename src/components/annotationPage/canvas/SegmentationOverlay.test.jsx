import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import SegmentationOverlay from './SegmentationOverlay';
import {
  ReviewSessionProvider,
  useReviewFeedback,
  useReviewSession,
} from '../../../contexts/ReviewSessionContext';
import { SENT_BACK_COLOR } from './reviewFeedback';
import * as annotationSelectors from '../../../stores/selectors/annotationSelectors';
import { OUTLINE_PRESETS } from '../../../utils/outlineSettings';

describe('SegmentationOverlay refinement fill regression', () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      constructor(cb) {
        this.cb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      value: 600,
    });
  });

  const activeObject = {
    id: 1,
    contour_id: 101,
    color: '#3b82f6',
    parent_id: null,
    status: 'approved',
    x: [0.1, 0.2, 0.2, 0.1],
    y: [0.1, 0.1, 0.2, 0.2],
  };

  const descendantObject = {
    id: 2,
    contour_id: 102,
    color: '#10b981',
    parent_id: 1,
    status: 'approved',
    x: [0.12, 0.18, 0.18, 0.12],
    y: [0.12, 0.12, 0.18, 0.18],
  };

  const isTransparentFill = (fill) => {
    if (!fill) return false;
    if (fill === 'none' || fill === 'transparent') return true;
    const rgbaMatch = fill.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
    if (rgbaMatch) {
      return parseFloat(rgbaMatch[1]) === 0;
    }
    return false;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(annotationSelectors, 'useCurrentMask').mockReturnValue(null);
    vi.spyOn(annotationSelectors, 'useObjectsList').mockReturnValue([activeObject, descendantObject]);
    vi.spyOn(annotationSelectors, 'useImageObject').mockReturnValue({ width: 800, height: 600 });
    vi.spyOn(annotationSelectors, 'useShowContextMenu').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useEnterFocusMode').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useCurrentTool').mockReturnValue('ai_annotation');
    vi.spyOn(annotationSelectors, 'useSelectedObjects').mockReturnValue([]);
    vi.spyOn(annotationSelectors, 'useSelectObject').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useDeselectObject').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useClearSelection').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useFocusModeActive').mockReturnValue(false);
    vi.spyOn(annotationSelectors, 'useFocusModeObjectId').mockReturnValue(null);
    vi.spyOn(annotationSelectors, 'useEnterRefinementMode').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useSetCurrentTool').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useExitFocusMode').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useObjectsVisibility').mockReturnValue({ showAll: true, labels: {} });
    vi.spyOn(annotationSelectors, 'useEnterEditMode').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useExitEditMode').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useUpdateObject').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useHoveredObjectId').mockReturnValue(null);
    vi.spyOn(annotationSelectors, 'useSetHoveredObjectId').mockReturnValue(vi.fn());
    vi.spyOn(annotationSelectors, 'useWorkspaceMode').mockReturnValue('annotate');
    vi.spyOn(annotationSelectors, 'useShowApproved').mockReturnValue(true);
    vi.spyOn(annotationSelectors, 'useChipMode').mockReturnValue('off');
    vi.spyOn(annotationSelectors, 'useHiddenObjectIds').mockReturnValue({});
  });

  it('renders active and contextual contours with transparent fill and distinct strokes in refinement mode', () => {
    vi.spyOn(annotationSelectors, 'useRefinementModeActive').mockReturnValue(true);
    vi.spyOn(annotationSelectors, 'useRefinementModeObjectId').mockReturnValue(1);

    const { container } = render(<SegmentationOverlay />);

    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(2);

    const activePath = paths[0];
    const descendantPath = paths[1];

    // Assert active and contextual paths have transparent interiors
    expect(isTransparentFill(activePath.getAttribute('fill'))).toBe(true);
    expect(isTransparentFill(descendantPath.getAttribute('fill'))).toBe(true);

    // Assert active stroke is stronger than contextual stroke
    const activeStrokeWidth = parseFloat(activePath.getAttribute('stroke-width'));
    const descendantStrokeWidth = parseFloat(descendantPath.getAttribute('stroke-width'));
    expect(activeStrokeWidth).toBeGreaterThan(descendantStrokeWidth);

    // Assert paths are pointer-inert in refinement mode
    expect(activePath.style.pointerEvents).toBe('none');
    expect(descendantPath.style.pointerEvents).toBe('none');
  });

  it('restores state-based fill when refinement mode is deactivated', () => {
    vi.spyOn(annotationSelectors, 'useRefinementModeActive').mockReturnValue(false);
    vi.spyOn(annotationSelectors, 'useRefinementModeObjectId').mockReturnValue(null);

    const { container } = render(<SegmentationOverlay />);

    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(2);

    const normalPath = paths[0];
    const fill = normalPath.getAttribute('fill');

    // Normal mode must retain solid/state fill rather than transparent
    expect(isTransparentFill(fill)).toBe(false);
  });

  describe('outline settings', () => {
    beforeEach(() => {
      vi.spyOn(annotationSelectors, 'useRefinementModeActive').mockReturnValue(false);
      vi.spyOn(annotationSelectors, 'useRefinementModeObjectId').mockReturnValue(null);
    });

    const withOutline = (overrides) =>
      vi.spyOn(annotationSelectors, 'useOutlineSettings').mockReturnValue({
        ...OUTLINE_PRESETS.fill,
        preset: 'fill',
        constantWidth: true,
        peek: false,
        ...overrides,
      });

    // Losing the fill must not lose the click target: 'auto' hit-tests only
    // where something is painted, which would leave a 1px hairline as the only
    // way to select an object.
    it('keeps the whole shape clickable when the fill is switched off', () => {
      withOutline({ ...OUTLINE_PRESETS.hairline, preset: 'hairline' });

      const { container } = render(<SegmentationOverlay />);
      const path = container.querySelector('svg path');

      expect(isTransparentFill(path.getAttribute('fill'))).toBe(true);
      expect(path.style.pointerEvents).toBe('all');
    });

    it('measures the stroke in screen pixels while constant width is on', () => {
      withOutline({});
      const { container } = render(<SegmentationOverlay />);
      expect(container.querySelector('svg path').getAttribute('vector-effect'))
        .toBe('non-scaling-stroke');
    });

    it('measures the stroke in image pixels once it is off', () => {
      withOutline({ constantWidth: false });
      const { container } = render(<SegmentationOverlay />);
      expect(container.querySelector('svg path').getAttribute('vector-effect')).toBe('none');
    });

    // The peek key takes the annotation layer off the image entirely — chips
    // included, since they are planned from the same list.
    it('renders nothing at all while peek is held', () => {
      withOutline({ peek: true });
      vi.spyOn(annotationSelectors, 'useChipMode').mockReturnValue('all');

      const { container } = render(<SegmentationOverlay />);
      expect(container.querySelectorAll('svg path').length).toBe(0);
    });
  });

  describe('review feedback', () => {
    // Points the review at an object and records verdicts, as the action bar does.
    const ReviewDriver = ({ targetId, marks = [] }) => {
      const session = useReviewSession();
      const { markVerdict } = useReviewFeedback();
      useEffect(() => {
        session.spotlightObject(targetId);
        marks.forEach(markVerdict);
        // Once, on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    };

    const renderInReview = (driver) =>
      render(
        <ReviewSessionProvider>
          {driver}
          <SegmentationOverlay />
        </ReviewSessionProvider>
      );

    beforeEach(() => {
      vi.spyOn(annotationSelectors, 'useRefinementModeActive').mockReturnValue(false);
      vi.spyOn(annotationSelectors, 'useRefinementModeObjectId').mockReturnValue(null);
      vi.spyOn(annotationSelectors, 'useWorkspaceMode').mockReturnValue('review');
      vi.spyOn(annotationSelectors, 'useCurrentMaskId').mockReturnValue(7);
      // The outline tests above leave their settings (peek among them) behind.
      vi.spyOn(annotationSelectors, 'useOutlineSettings').mockReturnValue({
        ...OUTLINE_PRESETS.fill,
        preset: 'fill',
        constantWidth: true,
        peek: false,
      });
    });

    it('circles the object under review with the comet and dims the others', () => {
      renderInReview(<ReviewDriver targetId={1} />);

      const targetSvg = screen.getByTestId('review-comet').closest('svg');
      expect(targetSvg.style.opacity).toBe('');

      const otherSvg = Array.from(document.querySelectorAll('svg[viewBox]')).find(
        (svg) => svg !== targetSvg && svg.querySelector(':scope > g > path')
      );
      expect(otherSvg.style.opacity).toBe('0.35');
    });

    it('shows no comet outside review mode', () => {
      vi.spyOn(annotationSelectors, 'useWorkspaceMode').mockReturnValue('annotate');
      renderInReview(<ReviewDriver targetId={1} />);
      expect(screen.queryByTestId('review-comet')).toBeNull();
    });

    it('turns a sent-back object purple and dashed', () => {
      renderInReview(
        <ReviewDriver
          targetId={2}
          marks={[{ kind: 'sentBack', maskId: 7, contourId: 101, reason: 'Bad outline' }]}
        />
      );

      const sentBack = Array.from(document.querySelectorAll('svg path')).find(
        (path) => path.getAttribute('stroke') === SENT_BACK_COLOR
      );
      expect(sentBack).toBeTruthy();
      const [dash, gap] = sentBack.getAttribute('stroke-dasharray').split(' ').map(Number);
      expect(dash / gap).toBeCloseTo(1.5);
      expect(screen.getByTestId('review-badge-sentBack')).toBeTruthy();
    });
  });
});
