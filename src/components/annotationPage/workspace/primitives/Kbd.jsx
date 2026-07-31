import React from 'react';

/**
 * Monospace shortcut badge. `tone` picks a background that reads on the
 * surface it sits on: `well` inside panels and tooltips, `solid` on top of a
 * filled primary/ok button where the well token would disappear.
 */
const Kbd = ({ children, tone = 'well', className = '' }) => (
  <span
    className={`font-mono text-meta leading-none px-[5px] py-[1px] rounded-4 ${
      tone === 'solid' ? 'bg-black/20 text-current' : 'bg-well text-t2'
    } ${className}`}
  >
    {children}
  </span>
);

export default Kbd;
