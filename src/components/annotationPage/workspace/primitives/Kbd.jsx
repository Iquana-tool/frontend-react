import React from 'react';

/**
 * Monospace shortcut badge. `tone` picks a background that reads on the
 * surface it sits on: `well` inside panels, `solid` on top of a filled
 * primary/ok button where the well token would disappear, `tip` inside the
 * Tooltip primitive, whose bg-tip surface stays a dark chip in both themes.
 */
const Kbd = ({ children, tone = 'well', className = '' }) => (
  <span
    className={`font-mono text-meta leading-none px-[5px] py-[1px] rounded-4 ${
      tone === 'solid'
        ? 'bg-scrim text-current'
        : tone === 'tip'
        ? 'bg-white/10 text-onTip'
        : 'bg-well text-t2'
    } ${className}`}
  >
    {children}
  </span>
);

export default Kbd;
