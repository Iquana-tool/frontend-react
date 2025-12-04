import React from 'react';

/**
 * A single menu item in a context menu
 * 
 * @param {Function} onClick - Click handler
 * @param {boolean} disabled - Whether the item is disabled
 * @param {string} className - Additional CSS classes for hover colors
 * @param {string} title - Tooltip text
 * @param {ReactNode} icon - SVG icon element
 * @param {string} label - Menu item label text
 * @param {boolean} hasBorder - Whether to show bottom border
 */
const ContextMenuItem = ({ 
  onClick, 
  disabled = false, 
  className = 'hover:bg-blue-50 hover:text-blue-700',
  title,
  icon,
  label,
  hasBorder = true
}) => {
  const baseClasses = "w-full text-left px-3 py-2 text-sm transition-colors duration-150 flex items-center";
  const borderClasses = hasBorder ? "border-b border-gray-100" : "";
  const disabledClasses = disabled 
    ? "text-gray-400 cursor-not-allowed opacity-50" 
    : `text-gray-700 ${className}`;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${borderClasses} ${disabledClasses}`}
      title={title}
    >
      {icon && <span className="w-4 h-4 mr-2 flex-shrink-0">{icon}</span>}
      {label}
    </button>
  );
};

export default ContextMenuItem;

