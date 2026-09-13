import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useStudyView, STUDY_KNOBS } from './useStudyView';

/**
 * The knobs are the study's independent variable, so what matters is that a condition is
 * fully described by the URL: the same link must always produce the same view, and setting
 * a knob must change the link. A knob that only lived in component state would make a
 * condition unassignable and unreproducible.
 */

let latest = null;

const Probe = () => {
  latest = useStudyView();
  const location = useLocation();
  return <span data-testid="search">{location.search}</span>;
};

const renderAt = (search) => {
  latest = null;
  return render(
    <MemoryRouter initialEntries={[`/x${search}`]}>
      <Probe />
    </MemoryRouter>
  );
};

describe('useStudyView', () => {
  test('shows every layer when the URL says nothing', () => {
    renderAt('');
    expect(latest.segmentations).toBe(true);
    expect(latest.table).toBe(true);
    expect(latest.isDefault).toBe(true);
  });

  test('reads each condition out of the URL', () => {
    renderAt('?segmentations=off');
    expect(latest.segmentations).toBe(false);
    expect(latest.table).toBe(true);
    expect(latest.isDefault).toBe(false);

    renderAt('?segmentations=off&table=off');
    expect(latest.segmentations).toBe(false);
    expect(latest.table).toBe(false);
  });

  test('only "off" turns a layer off, so a typo shows more rather than less', () => {
    // Failing open matters here: a mangled link that silently hid the evidence would
    // produce a participant in a condition nobody assigned them to.
    renderAt('?table=0');
    expect(latest.table).toBe(true);
  });

  test('writes the condition into the URL', () => {
    renderAt('');
    act(() => latest.setKnob('table', false));
    expect(screen.getByTestId('search').textContent).toContain('table=off');
  });

  test('leaves no trace once a layer is turned back on', () => {
    renderAt('?table=off');
    act(() => latest.setKnob('table', true));
    // A URL with no study parameters is the ordinary page, not "the study with everything
    // enabled" — so turning things back on has to remove them, not set them to "on".
    expect(screen.getByTestId('search').textContent).not.toContain('table');
  });

  test('preserves unrelated query parameters', () => {
    renderAt('?mode=calibrate');
    act(() => latest.setKnob('segmentations', false));
    const search = screen.getByTestId('search').textContent;
    expect(search).toContain('mode=calibrate');
    expect(search).toContain('segmentations=off');
  });

  test('reset clears every knob at once', () => {
    renderAt('?segmentations=off&table=off&mode=calibrate');
    act(() => latest.reset());
    const search = screen.getByTestId('search').textContent;
    STUDY_KNOBS.forEach((knob) => expect(search).not.toContain(knob.key));
    expect(search).toContain('mode=calibrate');
  });
});
