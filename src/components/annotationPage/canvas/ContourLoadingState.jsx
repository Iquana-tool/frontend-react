import React, { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

/**
 * How long a contour load may run before the user is told it is unusual. Long enough
 * that a normal load never shows the line, short enough to arrive before someone starts
 * wondering whether the app is stuck.
 */
const SLOW_LOAD_MS = 5000;

/**
 * Shown over the new image while its contours are on their way.
 *
 * The canvas is wiped the moment an image switch starts, so without this the user would
 * see a bare image and have no way to tell "no annotations yet" apart from "still
 * loading" — the reason the previous contours used to be left on screen instead.
 *
 * The canvas is not blurred or dimmed: the image itself has already loaded and is worth
 * looking at while the objects catch up. That makes the card's own background carry the
 * legibility, so it is fully opaque (`bg-p2`) rather than a translucent scrim — over a
 * bright or busy micrograph a see-through panel left the text unreadable. Same card
 * treatment as the workspace's other canvas overlays (`ObjectStatsPopover`,
 * `ObjectContextMenu`), so it reads as part of the UI in either theme.
 */
const ContourLoadingState = ({ error = null, onRetry = null }) => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (error) return undefined;
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center gap-[6px] rounded-9 bg-p2 border border-ln2 shadow-picker px-[20px] py-[14px] text-center max-w-[280px]">
        {error ? (
          <>
            <AlertTriangle size={20} className="text-err" />
            <p className="text-btn font-bold text-t1">Could not load contours</p>
            <p className="text-row text-t3">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-[4px] h-7 px-[12px] rounded-7 bg-accent text-onAccent text-btn font-bold hover:brightness-110 transition-[filter]"
              >
                Retry
              </button>
            )}
          </>
        ) : (
          <>
            <Loader2 size={20} className="text-ac animate-spin" />
            <p className="text-btn font-bold text-t1">Loading contours</p>
            {slow && (
              <p className="text-row text-t3">…this is taking longer than usual</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContourLoadingState;
