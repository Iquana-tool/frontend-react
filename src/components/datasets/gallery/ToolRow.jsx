import React from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { paletteFor } from './cardPalette';

/**
 * One tool on the dataset page, as a single compact row in a grouped list.
 *
 * Tools are plain navigation with no live status, so they get a row rather
 * than a tile: the space goes to the workflow and activity, which do carry
 * status, and a group of four tools fits in the height of one old card.
 */
const ToolRow = ({
  icon: Icon,
  title,
  description,
  onClick,
  color = 'accent',
  // A placeholder: rendered dimmed with a "Soon" tag and no click handler, so
  // it reads as not-yet-available rather than broken.
  disabled = false,
  // Opens outside the app (e.g. the documentation site); shows an external
  // link icon instead of the chevron so the new tab is not a surprise.
  external = false,
}) => {
  const c = paletteFor(color);
  const TrailingIcon = external ? ExternalLink : ChevronRight;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`group w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
        focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ac
        ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-hv'}`}
    >
      <div className={`w-8 h-8 flex-none ${c.iconBg} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${c.icon}`} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-t1 truncate">{title}</span>
          {disabled && (
            <span className="flex-none text-[11px] font-medium text-t3 bg-well rounded-full px-2 py-px">
              Soon
            </span>
          )}
        </div>
        <p className="text-xs text-t2 truncate" title={description}>
          {description}
        </p>
      </div>
      {!disabled && (
        <TrailingIcon
          className="w-4 h-4 flex-none text-t3 group-hover:text-t1 transition-colors"
          aria-hidden="true"
        />
      )}
    </button>
  );
};

export default ToolRow;
