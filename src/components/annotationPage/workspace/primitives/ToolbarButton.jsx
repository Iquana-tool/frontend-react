import React from 'react';
import Tooltip from './Tooltip';

/**
 * 26×26 icon button used throughout the top toolbar, including inside the
 * inset `well` groups (undo/redo, zoom, mode switch).
 */
const ToolbarButton = React.forwardRef(
  (
    {
      icon: Icon,
      label,
      shortcut,
      active = false,
      disabled = false,
      onClick,
      tooltipPlacement = 'bottom',
      className = '',
      children,
      ...rest
    },
    ref
  ) => {
    const button = (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active || undefined}
        className={`w-[26px] h-[26px] flex items-center justify-center rounded-6 transition-colors
          ${active ? 'bg-acS text-ac' : 'text-t2 hover:bg-hv hover:text-t1'}
          ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-t2' : ''}
          ${className}`}
        {...rest}
      >
        {children || (Icon && <Icon size={15} strokeWidth={1.7} />)}
      </button>
    );

    if (!label) return button;
    return (
      <Tooltip label={label} shortcut={shortcut} placement={tooltipPlacement} disabled={disabled}>
        {button}
      </Tooltip>
    );
  }
);

ToolbarButton.displayName = 'ToolbarButton';

export default ToolbarButton;
