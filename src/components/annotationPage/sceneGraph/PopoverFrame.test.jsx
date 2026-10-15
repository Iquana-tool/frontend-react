import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { render, screen, act } from '@testing-library/react';
import PopoverFrame from './PopoverFrame';

/** An option that removes itself on mousedown, as picking from the autocomplete does. */
const SelfRemovingOption = () => {
  const [picked, setPicked] = useState(false);
  if (picked) return <span>picked</span>;
  return (
    <div
      role="option"
      aria-selected={false}
      // flushSync detaches the row before the document listener runs, which is what
      // React 18 does in a browser (it flushes between the two listeners).
      onMouseDown={() => flushSync(() => setPicked(true))}
    >
      Define Thickness
    </div>
  );
};

const mouseDown = (node) =>
  node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

describe('PopoverFrame', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const open = (onClose) => {
    render(
      <div>
        <button type="button">outside</button>
        <PopoverFrame x={0} y={0} title="Add attribute" onClose={onClose}>
          <SelfRemovingOption />
        </PopoverFrame>
      </div>
    );
    // The outside-click listener is attached after a short delay.
    act(() => { vi.advanceTimersByTime(150); });
  };

  test('a click on a row that the click itself removes does not close it', () => {
    const onClose = vi.fn();
    open(onClose);

    mouseDown(screen.getByRole('option'));

    expect(screen.getByText('picked')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('a click outside closes it', () => {
    const onClose = vi.fn();
    open(onClose);

    mouseDown(screen.getByRole('button', { name: 'outside' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
