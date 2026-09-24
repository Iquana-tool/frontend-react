import React from 'react';

/**
 * An on/off switch.
 *
 * `role="switch"` rather than a styled checkbox: screen readers announce it as
 * "on"/"off" instead of "checked", which is what the control actually means.
 *
 * The knob uses `t1` (the ink colour) rather than a white puck. White reads
 * conventionally but drops to roughly 1.4:1 against the light theme's `ln2`
 * track; `t1` inverts with the theme and so stays high-contrast in all four
 * combinations of theme and state.
 */
const Switch = ({
  checked,
  onChange,
  disabled = false,
  pending = false,
  labelledBy,
  describedBy,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-labelledby={labelledBy}
    aria-describedby={describedBy}
    aria-label={labelledBy ? undefined : label}
    disabled={disabled || pending}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
      transition-colors duration-150 motion-reduce:transition-none
      focus:outline-none focus-visible:ring-2 focus-visible:ring-ac focus-visible:ring-offset-2
      focus-visible:ring-offset-p1
      disabled:opacity-50 disabled:cursor-not-allowed
      ${checked ? 'bg-accent' : 'bg-ln2'}
      ${pending ? 'animate-pulse motion-reduce:animate-none' : ''}`}
  >
    <span
      aria-hidden="true"
      className={`inline-block h-3.5 w-3.5 rounded-full bg-t1
        transition-transform duration-150 motion-reduce:transition-none
        ${checked ? 'translate-x-[19px]' : 'translate-x-[3px]'}`}
    />
  </button>
);

export default Switch;
