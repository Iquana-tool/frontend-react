import React, { useState } from 'react';
import Kbd from './Kbd';

/**
 * Hover tooltip with an optional shortcut badge.
 *
 * Rendered inside the trigger's stacking context rather than a portal: every
 * caller sits in the toolbar, rail or panels, none of which clip, and keeping
 * it inline means the tooltip follows a scrolling row for free.
 *
 * `placement` covers the two cases the design uses — `right` for the vertical
 * tool rail, `bottom` for the horizontal toolbar.
 */
const PLACEMENT = {
  right: 'left-[44px] top-[2px]',
  bottom: 'top-[34px] left-1/2 -translate-x-1/2',
  bottomRight: 'top-[34px] right-0',
};

const Tooltip = ({ label, shortcut, placement = 'right', disabled = false, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative flex flex-none"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open && !disabled && label && (
        <div
          role="tooltip"
          className={`absolute z-[90] flex items-center gap-[7px] h-7 px-[9px] rounded-7 bg-tip border border-ln2 shadow-tip animate-dcFade pointer-events-none whitespace-nowrap ${PLACEMENT[placement]}`}
        >
          <span className="text-btn font-semibold text-t1">{label}</span>
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
