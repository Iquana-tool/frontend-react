import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReviewFeedbackLayer from './ReviewFeedbackLayer';
import { REJECT_COLOR, TRANSIENT_MS } from './reviewFeedback';

const imageDimensions = { x: 0, y: 0, width: 800, height: 600 };

const object = {
  id: 1,
  contour_id: 101,
  color: '#3b82f6',
  label: 'Pore',
  x: [0.1, 0.2, 0.2, 0.1],
  y: [0.1, 0.1, 0.2, 0.2],
};

const renderLayer = (marks, objects = [object]) =>
  render(
    <ReviewFeedbackLayer
      marks={marks}
      objects={objects}
      imageDimensions={imageDimensions}
      imgW={800}
      imgH={600}
      zoomLevel={1}
    />
  );

describe('ReviewFeedbackLayer', () => {
  it('renders nothing without marks', () => {
    const { container } = renderLayer([]);
    expect(container.firstChild).toBeNull();
  });

  it('shows a tick and a solid outline for an accepted object', () => {
    const { container } = renderLayer([
      { id: 1, kind: 'accepted', maskId: 7, contourId: 101, at: Date.now() },
    ]);
    expect(screen.getByTestId('review-badge-accepted')).toBeTruthy();
    const settle = container.querySelector('.review-fb-settle');
    expect(settle.getAttribute('stroke')).toBe(object.color);
  });

  it('draws a rejected object from its snapshot as a red ghost', () => {
    renderLayer(
      [
        {
          id: 1,
          kind: 'rejected',
          maskId: 7,
          contourId: 101,
          x: object.x,
          y: object.y,
          at: Date.now(),
        },
      ],
      []
    );
    const ghost = screen.getByTestId('review-ghost');
    expect(ghost.querySelector('.review-fb-ghost').getAttribute('stroke')).toBe(REJECT_COLOR);
    expect(ghost.querySelector('.review-fb-reject-flash')).toBeTruthy();
    expect(screen.getByTestId('review-badge-rejected')).toBeTruthy();
  });

  it('keeps an old ghost still and without a badge', () => {
    renderLayer(
      [
        {
          id: 1,
          kind: 'rejected',
          maskId: 7,
          contourId: 101,
          x: object.x,
          y: object.y,
          at: Date.now() - TRANSIENT_MS - 1,
        },
      ],
      []
    );
    const ghost = screen.getByTestId('review-ghost');
    expect(ghost.querySelector('.review-fb-ghost-still')).toBeTruthy();
    expect(ghost.querySelector('.review-fb-reject-flash')).toBeNull();
    expect(screen.queryByTestId('review-badge-rejected')).toBeNull();
  });

  it('names the send-back reason next to the badge', () => {
    renderLayer([
      { id: 1, kind: 'sentBack', maskId: 7, contourId: 101, reason: 'Bad outline', at: Date.now() },
    ]);
    expect(screen.getByTestId('review-badge-sentBack').textContent).toContain('Bad outline');
  });

  it('shows the old and the new label after a relabel', () => {
    renderLayer([
      {
        id: 1,
        kind: 'relabelled',
        maskId: 7,
        contourId: 101,
        fromLabel: 'Crack',
        fromColor: '#f59e0b',
        at: Date.now(),
      },
    ]);
    const badge = screen.getByTestId('review-badge-relabelled');
    expect(badge.textContent).toContain('Crack');
    expect(badge.textContent).toContain('Pore');
  });

  it('draws the old outline as a ghost and the new one on top after an edit', () => {
    const { container } = renderLayer([
      {
        id: 1,
        kind: 'edited',
        maskId: 7,
        contourId: 101,
        fromX: [0.05, 0.25, 0.25, 0.05],
        fromY: [0.05, 0.05, 0.25, 0.25],
        at: Date.now(),
      },
    ]);
    expect(container.querySelector('.review-fb-old')).toBeTruthy();
    expect(container.querySelector('.review-fb-draw').getAttribute('stroke')).toBe(object.color);
  });
});
