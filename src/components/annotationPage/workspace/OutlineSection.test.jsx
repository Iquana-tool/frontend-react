import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import OutlineSection from './OutlineSection';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { OUTLINE_STORAGE_KEY } from '../../../stores/slices/workspaceSlice';

/**
 * Driven through the real store rather than mocked selectors, because the thing
 * worth proving is that the control, the slice and the persisted blob agree —
 * each of them is trivial alone.
 */
const outline = () => useAnnotationStore.getState().workspace.outline;

const expand = () => fireEvent.click(screen.getByRole('button', { name: /outlines/i }));

describe('OutlineSection', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAnnotationStore.getState().setOutlinePreset('fill');
  });

  it('names the active preset in the collapsed header', () => {
    render(<OutlineSection />);
    expect(screen.getByRole('button', { name: /outlines/i })).toHaveTextContent('Fill');
  });

  it('applies a preset to both sliders at once', () => {
    render(<OutlineSection />);
    expand();

    fireEvent.click(screen.getByRole('button', { name: 'Hairline' }));

    expect(outline()).toMatchObject({
      preset: 'hairline',
      fillScale: 0,
      strokeWidth: 0.25,
      hoverFill: false,
    });
  });

  // The presets are only shortcuts for the sliders, so a preset that no longer
  // describes the canvas must stop claiming to.
  it('falls back to custom once a slider moves off the preset', () => {
    render(<OutlineSection />);
    expand();

    fireEvent.change(screen.getByLabelText('Fill opacity'), { target: { value: '0.5' } });

    expect(outline().preset).toBe('custom');
    expect(screen.getByRole('button', { name: /outlines/i })).toHaveTextContent('Custom');
    expect(screen.getByRole('button', { name: 'Fill' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('re-lights the preset when the slider comes back to its value', () => {
    render(<OutlineSection />);
    expand();

    const fill = screen.getByLabelText('Fill opacity');
    fireEvent.change(fill, { target: { value: '0.5' } });
    fireEvent.change(fill, { target: { value: '0' } });

    expect(outline().preset).toBe('outline');
  });

  it('leaves the preset alone when only the zoom behaviour changes', () => {
    render(<OutlineSection />);
    expand();

    fireEvent.click(screen.getByLabelText(/same width at every zoom/i));

    expect(outline()).toMatchObject({ preset: 'fill', constantWidth: false });
  });

  it('persists the settings without the held peek key', () => {
    render(<OutlineSection />);
    expand();
    fireEvent.click(screen.getByRole('button', { name: 'Outline' }));

    const stored = JSON.parse(window.localStorage.getItem(OUTLINE_STORAGE_KEY));
    expect(stored).toMatchObject({ fillScale: 0, strokeWidth: 0.5, preset: 'outline' });
    expect(stored).not.toHaveProperty('peek');
  });
});
