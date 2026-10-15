import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * The shell of the relate/describe popovers: placed where the object menu was, kept
 * inside the canvas container the same way the menu keeps itself in, closed by Escape
 * or a click outside.
 *
 * The popover grows as it is filled in (picking an attribute adds the value and the
 * current values), so it is placed again whenever its size changes, and scrolls once it
 * is taller than the canvas.
 */
const PopoverFrame = ({ x, y, width = 288, title, icon: Icon, badge, onClose, children }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ left: x, top: y, maxHeight: undefined });

  // Always from the anchor, never from the last position, so it moves back down
  // when it shrinks again.
  const place = useCallback(() => {
    const node = ref.current;
    const container = node?.parentElement;
    if (!node || !container) return;
    const bounds = container.getBoundingClientRect();
    const maxHeight = Math.max(120, bounds.height - 20);
    const height = Math.min(node.scrollHeight, maxHeight);
    const left = Math.max(10, Math.min(x + 10, bounds.width - node.offsetWidth - 10));
    const top = Math.max(10, Math.min(y + 10, bounds.height - height - 10));
    setPosition((previous) => (
      previous.left === left && previous.top === top && previous.maxHeight === maxHeight
        ? previous
        : { left, top, maxHeight }
    ));
  }, [x, y]);

  useLayoutEffect(() => {
    place();
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => place());
    observer.observe(node);
    if (node.parentElement) observer.observe(node.parentElement);
    return () => observer.disconnect();
  }, [place]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    // The path is fixed when the event is dispatched. `contains(target)` is not enough:
    // React re-renders between its own listener and this one, so a clicked row that
    // the click itself removes (an autocomplete option) is already detached here and
    // would read as a click outside.
    const onDown = (event) => {
      const node = ref.current;
      if (!node) return;
      const path = event.composedPath?.() || [];
      if (!path.includes(node) && !node.contains(event.target)) onClose();
    };
    // The same delay the object menu uses, so the click that opened it does not close it.
    const timer = setTimeout(() => document.addEventListener('mousedown', onDown), 100);
    window.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={title}
      className="absolute z-[85] p-[10px] rounded-9 bg-p2 border border-ln2 shadow-ctx animate-dcPop flex flex-col gap-[10px] overflow-y-auto"
      style={{ left: position.left, top: position.top, maxHeight: position.maxHeight, width }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="flex items-center gap-[7px]">
        {Icon && <Icon size={14} className="flex-none text-ac" />}
        <span className="flex-1 text-modaltitle font-semibold text-t1">{title}</span>
        {badge && (
          <span className="h-[16px] px-[6px] inline-flex items-center rounded-4 bg-acS text-ac text-meta font-bold">
            {badge}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-t1"
        >
          <X size={12} />
        </button>
      </div>
      {children}
    </div>
  );
};

/** Small uppercase section label, the workspace's `text-sect` style. */
export const FieldLabel = ({ htmlFor, id, children }) => {
  const Tag = htmlFor ? 'label' : 'span';
  return (
    <Tag htmlFor={htmlFor} id={id} className="text-sect font-bold tracking-[.08em] uppercase text-t3">
      {children}
    </Tag>
  );
};

/** Cancel + primary action, right-aligned, with an optional hint on the left. */
export const PopoverActions = ({ hint, onCancel, onConfirm, confirmLabel, disabled, busy }) => (
  <div className="flex items-center gap-[6px]">
    <span className="flex-1 text-meta text-t3">{hint}</span>
    <button
      type="button"
      onClick={onCancel}
      className="h-7 px-[10px] rounded-6 border border-ln2 text-btn text-t2 hover:bg-hv"
    >
      Cancel
    </button>
    <button
      type="button"
      onClick={onConfirm}
      disabled={disabled || busy}
      className="h-7 px-[12px] rounded-6 bg-accent text-onAccent text-btn font-semibold shadow-primary disabled:opacity-50 disabled:shadow-none"
    >
      {busy ? 'Saving…' : confirmLabel}
    </button>
  </div>
);

export default PopoverFrame;
