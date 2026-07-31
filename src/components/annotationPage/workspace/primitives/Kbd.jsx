import React from 'react';

/**
 * Monospace shortcut badge. `tone` picks a background that reads on the
 * surface it sits on: `well` inside panels, `solid` on top of a filled
 * primary/ok button where the well token would disappear, `tip` inside the
 * Tooltip primitive, whose bg-tip surface stays a dark chip in both themes.
 *
 * `solid` deliberately uses a fixed black scrim with white ink rather than the
 * themed `--scrim` token. It lands on `bg-accent` and on `bg-ok` (which differs
 * per theme), so a fixed dark wash is what normalises those beds; the themed
 * token previously paired a dark scrim with the button's own near-black ink and
 * rendered the glyph all but invisible (1.5:1 dark, 2.9:1 light). This pairing
 * clears 4.5:1 on all three beds.
 */
const Kbd = ({ children, tone = 'well', className = '' }) => (
  <span
    className={`font-mono text-meta leading-none px-[5px] py-[1px] rounded-4 ${
      tone === 'solid'
        ? 'bg-black/50 text-white'
        : tone === 'tip'
        ? 'bg-white/10 text-onTip'
        : 'bg-well text-t2'
    } ${className}`}
  >
    {children}
  </span>
);

export default Kbd;
