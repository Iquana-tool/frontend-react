import React from 'react';

/** 30×17 track switch used by AI assist and the per-service instant-mode toggles. */
const Switch = ({ checked, onChange, disabled = false, label, id }) => (
  <button
    type="button"
    id={id}
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onChange?.(!checked);
    }}
    className={`relative block w-[30px] h-[17px] flex-none rounded-9 transition-colors
      ${checked ? 'bg-accent' : 'bg-hv2'}
      ${disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className="absolute top-[2px] left-[2px] w-[13px] h-[13px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.35)] transition-transform duration-[180ms] ease-out"
      style={{ transform: `translateX(${checked ? 13 : 0}px)` }}
    />
  </button>
);

export default Switch;
