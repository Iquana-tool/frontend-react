import React, { useEffect, useRef } from 'react';
import Kbd from './Kbd';

/**
 * Dropdown menu for the app and account menus.
 *
 * Closes on outside click and on Escape. The outside-click listener is bound in
 * the capture phase so a click on another menu's trigger closes this one before
 * that trigger's own handler runs — otherwise both menus end up open.
 */
export const Menu = ({ open, onClose, align = 'left', width = 238, children }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      style={{ width }}
      className={`absolute top-[34px] z-[80] p-[5px] rounded-9 bg-p2 border border-ln2 shadow-dropdown animate-dcPop
        ${align === 'right' ? 'right-0' : 'left-0'}`}
    >
      {children}
    </div>
  );
};

export const MenuItem = ({
  icon: Icon,
  label,
  shortcut,
  title,
  danger = false,
  disabled = false,
  onClick,
}) => (
  <button
    type="button"
    role="menuitem"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={`w-full h-7 px-[7px] flex items-center gap-[8px] rounded-6 text-btn text-left transition-colors
      ${danger ? 'text-err hover:bg-errBg' : 'text-t1 hover:bg-hv'}
      ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
  >
    {Icon && (
      <span className={`w-[15px] flex ${danger ? 'text-err' : 'text-t2'}`}>
        <Icon size={14} strokeWidth={1.7} />
      </span>
    )}
    <span className="flex-1 truncate">{label}</span>
    {shortcut && <Kbd>{shortcut}</Kbd>}
  </button>
);

export const MenuHeader = ({ title, subtitle }) => (
  <div className="px-[7px] py-[6px] mb-[3px] border-b border-ln">
    <div className="text-btn font-semibold text-t1 truncate">{title}</div>
    {subtitle && <div className="text-meta text-t3 truncate">{subtitle}</div>}
  </div>
);

export const MenuDivider = () => <div className="my-[4px] h-px bg-ln" />;

export default Menu;
