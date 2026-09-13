import React from 'react';
import Kbd from './primitives/Kbd';

const VARIANT = {
  primary: 'bg-accent text-onAccent font-bold shadow-primary',
  ok: 'bg-ok text-[#052e13] font-bold',
  // `err`, not `rev`: this is destructive, not review. The two shared a red-ish
  // family before the phase palette gave Review its own hue.
  danger: 'border border-errLn bg-errBg2 text-err',
  chip: 'border border-ln2 bg-well text-t1',
  ghost: 'bg-transparent text-t2 hover:bg-hv hover:text-t1',
};

const SOLID = new Set(['primary', 'ok']);

/** A button in the floating action bar. Icon-only when no label is given. */
const BarButton = ({
  icon: Icon,
  label,
  shortcut,
  variant = 'ghost',
  disabled = false,
  title,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={label || title}
    className={`h-[30px] flex items-center gap-[6px] rounded-8 text-btn font-semibold transition-[filter,background-color] duration-150 hover:brightness-110
      ${label ? 'px-[11px]' : 'w-[30px] justify-center'}
      ${VARIANT[variant]}
      ${disabled ? 'opacity-40 cursor-not-allowed hover:brightness-100 hover:bg-transparent' : ''}`}
  >
    {Icon && <Icon size={13} strokeWidth={1.9} />}
    {label && <span>{label}</span>}
    {shortcut && <Kbd tone={SOLID.has(variant) ? 'solid' : 'well'}>{shortcut}</Kbd>}
  </button>
);

export default BarButton;
