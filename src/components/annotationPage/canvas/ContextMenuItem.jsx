import React from 'react';

/**
 * A single row in the canvas context menu.
 *
 * `tone` selects the hover treatment: `default` for ordinary actions, `danger`
 * for destructive ones. Callers used to pass raw Tailwind hover classes, which
 * hard-coded the light palette into every call site.
 */
const TONE = {
  default: 'text-t1 hover:bg-hv',
  danger: 'text-err hover:bg-errBg',
};

const ContextMenuItem = ({ onClick, disabled = false, tone = 'default', title, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`w-full h-7 px-[8px] flex items-center gap-[8px] rounded-6 text-btn text-left transition-colors
      ${disabled ? 'text-t3 cursor-not-allowed opacity-50' : TONE[tone] || TONE.default}`}
  >
    {icon && <span className="w-[14px] h-[14px] flex-none flex items-center">{icon}</span>}
    <span className="truncate">{label}</span>
  </button>
);

export default ContextMenuItem;
