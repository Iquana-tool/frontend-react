import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * The shell of the relate/describe popovers: placed where the object menu was, kept
 * inside the canvas container the same way the menu keeps itself in, closed by Escape
 * or a click outside.
 */
const PopoverFrame = ({ x, y, width = 288, title, icon: Icon, badge, onClose, children }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const node = ref.current;
    const container = node?.parentElement;
    if (!node || !container) return;
    const box = node.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    const left = Math.max(10, Math.min(x + 10, bounds.width - box.width - 10));
    const top = Math.max(10, Math.min(y + 10, bounds.height - box.height - 10));
    setPosition({ left, top });
  }, [x, y]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
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
      className="absolute z-[85] p-[10px] rounded-9 bg-p2 border border-ln2 shadow-ctx animate-dcPop flex flex-col gap-[10px]"
      style={{ left: position.left, top: position.top, width }}
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
