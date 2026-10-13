import React from 'react';
import { paletteFor } from './cardPalette';

/**
 * One step of the annotation workflow on the dataset page.
 *
 * Kept compact on purpose: the four steps sit side by side in one row, so the
 * whole pipeline and its progress can be read at a glance without scrolling.
 * The description is clamped to two lines; the full text stays available as a
 * tooltip and to screen readers.
 */
const WorkflowCard = ({
  icon: Icon,
  title,
  description,
  // A short status line, e.g. "There are 3 instances to review".
  stat = null,
  // `attention` colours the status line in the card's hue because it asks for
  // action. `muted` is for empty states ("Nothing sent back"), which are good
  // news and must not look like an alert.
  statTone = 'attention',
  onClick,
  color = 'accent',
  // Any node; in practice a <PhaseProgressBar compact />. Pinned to the bottom
  // so the bars line up across cards of different content height.
  progress = null,
}) => {
  const c = paletteFor(color);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full h-full text-left bg-p1 rounded-xl border ${c.border} ${c.hoverBorder}
        shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col
        focus:outline-none focus-visible:ring-2 focus-visible:ring-ac`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 flex-none ${c.iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-t1 leading-tight">{title}</h3>
          <p className="mt-0.5 text-xs text-t2 line-clamp-2" title={description}>
            {description}
          </p>
        </div>
      </div>

      {stat && (
        <p className={`mt-3 text-sm font-medium ${statTone === 'muted' ? 'text-t3' : c.stat}`}>
          {stat}
        </p>
      )}

      {progress && <div className="mt-auto pt-3">{progress}</div>}
    </button>
  );
};

export default WorkflowCard;
